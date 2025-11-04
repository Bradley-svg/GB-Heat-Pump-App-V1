import type { Env } from "../env";
import { chunk } from "../utils";
import { systemLogger, type Logger } from "../utils/logging";

const DEFAULT_RETENTION_DAYS = 90;
const MIN_RETENTION_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TELEMETRY_BATCH_SIZE = 250;

export const TELEMETRY_RETENTION_CRON = "15 2 * * *";

type Nullable<T> = T | null | undefined;

type TelemetryRow = {
  device_id: string;
  ts: number | string;
  metrics_json: string;
  deltaT: number | string | null;
  thermalKW: number | string | null;
  cop: number | string | null;
  cop_quality: string | null;
  status_json: string | null;
  faults_json: string | null;
};

type RetentionTableSummary = {
  scanned: number;
  deleted: number;
  batches: number;
  backups: string[];
};

export type RetentionSummary = {
  retentionDays: number;
  cutoffMs: number;
  cutoffIso: string;
  telemetry: RetentionTableSummary;
  opsMetricsDeleted: number;
};

export interface RetentionOptions {
  dryRun?: boolean;
  now?: Date;
  logger?: Logger;
  jobId?: string;
}

type ArchiveTarget = {
  bucket: R2Bucket;
  prefix: string;
};

const BOOLEAN_TRUE = new Set(["1", "true", "yes", "on"]);

export async function runTelemetryRetention(env: Env, options: RetentionOptions = {}): Promise<RetentionSummary> {
  const now = options.now ?? new Date();
  const retentionDays = parseRetentionDays(env.TELEMETRY_RETENTION_DAYS);
  const cutoffMs = now.getTime() - retentionDays * MS_PER_DAY;
  const cutoffIso = new Date(cutoffMs).toISOString();
  const jobId = options.jobId ?? generateJobId(now);

  const baseLogger = options.logger ?? systemLogger({ task: "data-retention" });
  const log = baseLogger.with({
    job_id: jobId,
    retention_days: retentionDays,
    cutoff_iso: cutoffIso,
  });

  const archiveTarget = resolveArchiveTarget(env);
  const backupRequired = isTruthy(env.RETENTION_BACKUP_BEFORE_DELETE);
  const shouldBackup = !options.dryRun && archiveTarget !== null;

  if (backupRequired && archiveTarget === null) {
    const err = new Error("Data retention job requires backup but no R2 archive bucket is configured");
    log.error("retention.backup_missing", { error: err });
    throw err;
  }

  if (!options.dryRun && archiveTarget === null) {
    log.warn("retention.backup_skipped", {
      reason: "archive bucket not configured",
    });
  }

  log.info("retention.started", {
    dry_run: Boolean(options.dryRun),
    backup_enabled: shouldBackup,
  });

  const telemetrySummary = await pruneTelemetry(env, {
    cutoffMs,
    cutoffIso,
    jobId,
    log: log.with({ table: "telemetry" }),
    archive: shouldBackup ? archiveTarget : null,
    dryRun: Boolean(options.dryRun),
  });

  const opsDeleted = await pruneOpsMetrics(env, {
    cutoffIso,
    dryRun: Boolean(options.dryRun),
    log: log.with({ table: "ops_metrics" }),
  });

  log.info("retention.completed", {
    telemetry_deleted: telemetrySummary.deleted,
    telemetry_batches: telemetrySummary.batches,
    telemetry_backups: telemetrySummary.backups.length,
    ops_metrics_deleted: opsDeleted,
  });

  return {
    retentionDays,
    cutoffMs,
    cutoffIso,
    telemetry: telemetrySummary,
    opsMetricsDeleted: opsDeleted,
  };
}

function parseRetentionDays(raw: string | undefined): number {
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_RETENTION_DAYS;
  const coerced = Math.floor(parsed);
  if (coerced <= 0) return DEFAULT_RETENTION_DAYS;
  return Math.max(MIN_RETENTION_DAYS, coerced);
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return BOOLEAN_TRUE.has(value.trim().toLowerCase());
}

function sanitizePrefix(prefix: string): string {
  const trimmed = prefix.trim().replace(/^[\/]+|[\/]+$/g, "");
  return trimmed ? trimmed : "data-retention";
}

function generateJobId(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

function resolveArchiveTarget(env: Env): ArchiveTarget | null {
  const bucket = env.RETENTION_ARCHIVE ?? env.GB_BUCKET ?? null;
  if (!bucket) return null;
  const prefixInput = env.RETENTION_BACKUP_PREFIX ?? "data-retention";
  const prefix = sanitizePrefix(prefixInput);
  return { bucket, prefix };
}

async function pruneTelemetry(
  env: Env,
  params: {
    cutoffMs: number;
    cutoffIso: string;
    jobId: string;
    archive: ArchiveTarget | null;
    dryRun: boolean;
    log: Logger;
  },
): Promise<RetentionTableSummary> {
  const summary: RetentionTableSummary = {
    scanned: 0,
    deleted: 0,
    batches: 0,
    backups: [],
  };

  while (true) {
    const batch = await env.DB.prepare(
      `SELECT device_id, ts, metrics_json, deltaT, thermalKW, cop, cop_quality, status_json, faults_json
         FROM telemetry
        WHERE ts < ?1
        ORDER BY ts
        LIMIT ?2`,
    )
      .bind(params.cutoffMs, TELEMETRY_BATCH_SIZE)
      .all<TelemetryRow>();

    const rows = batch.results ?? [];
    if (!rows.length) break;

    summary.scanned += rows.length;
    summary.batches += 1;

    if (!params.dryRun && params.archive) {
      const key = buildArchiveKey(params.archive.prefix, params.jobId, "telemetry", summary.batches);
      const payload = rows
        .map((row) =>
          JSON.stringify({
            device_id: row.device_id,
            ts: toNumber(row.ts),
            metrics_json: row.metrics_json,
            deltaT: toNumberNullable(row.deltaT),
            thermalKW: toNumberNullable(row.thermalKW),
            cop: toNumberNullable(row.cop),
            cop_quality: row.cop_quality ?? null,
            status_json: row.status_json ?? null,
            faults_json: row.faults_json ?? null,
            retention_cutoff_iso: params.cutoffIso,
            retention_job_id: params.jobId,
          }),
        )
        .join("\n")
        .concat("\n");

      await params.archive.bucket.put(key, payload, {
        httpMetadata: { contentType: "application/x-ndjson" },
        customMetadata: {
          table: "telemetry",
          cutoff_iso: params.cutoffIso,
          job_id: params.jobId,
        },
      });
      summary.backups.push(key);
      params.log.info("retention.batch_backed_up", { key, rows: rows.length });
    }

    if (!params.dryRun) {
      const deletions = rows.map((row) =>
        env.DB.prepare(`DELETE FROM telemetry WHERE device_id = ?1 AND ts = ?2`).bind(
          row.device_id,
          toNumber(row.ts),
        ),
      );
      for (const statements of chunk(deletions, 20)) {
        await env.DB.batch(statements);
      }
      summary.deleted += rows.length;
    }
  }

  params.log.info("retention.table_completed", {
    scanned: summary.scanned,
    deleted: params.dryRun ? 0 : summary.deleted,
    batches: summary.batches,
  });

  return summary;
}

async function pruneOpsMetrics(
  env: Env,
  params: { cutoffIso: string; dryRun: boolean; log: Logger },
): Promise<number> {
  if (params.dryRun) {
    const countRow = await env.DB.prepare(
      `SELECT COUNT(*) AS cnt FROM ops_metrics WHERE ts < ?1`,
    )
      .bind(params.cutoffIso)
      .first<{ cnt: number | string | null }>();
    const raw = countRow?.cnt ?? 0;
    const count = typeof raw === "number" ? raw : Number(raw);
    params.log.info("retention.table_completed", {
      scanned: count,
      deleted: 0,
      batches: 0,
    });
    return 0;
  }

  const result = await env.DB.prepare(`DELETE FROM ops_metrics WHERE ts < ?1`)
    .bind(params.cutoffIso)
    .run();
  const deleted = Number(result.meta?.changes ?? 0);
  params.log.info("retention.table_completed", {
    scanned: deleted,
    deleted,
    batches: 1,
  });
  return deleted;
}

function buildArchiveKey(prefix: string, jobId: string, table: string, batch: number): string {
  const padded = batch.toString().padStart(4, "0");
  return `${prefix}/${jobId}/${table}/batch-${padded}.ndjson`;
}

function toNumber(value: number | string): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Failed to coerce numeric value from '${value}'`);
  }
  return parsed;
}

function toNumberNullable(value: Nullable<number | string>): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}
