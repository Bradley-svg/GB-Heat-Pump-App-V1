import { createHash, randomUUID } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { fetch } from "undici";
import { config } from "../config.js";
import { logger } from "../logging.js";
import { exporterBatches, exporterQueueSize } from "../metrics.js";
import { signBatch } from "../crypto/ed25519.js";
import { getPool } from "../db/pool.js";
import type { TelemetryPayload } from "../validators/common.js";

export interface ExportRecord {
  didPseudo: string;
  seq: number;
  timestamp: string;
  metrics: TelemetryPayload["metrics"];
  keyVersion: string;
}

export class BatchExporter {
  private readonly queue: ExportRecord[] = [];
  private flushing = false;
  private timer?: NodeJS.Timeout;
  private backoffMs = config.EXPORT_FLUSH_INTERVAL_MS;

  enqueue(record: ExportRecord) {
    if (!config.EXPORT_ENABLED) {
      return;
    }
    this.queue.push(record);
    exporterQueueSize.set(this.queue.length);
    if (this.queue.length >= config.EXPORT_BATCH_SIZE) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush() {
    if (this.timer || this.flushing) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.backoffMs);
  }

  private async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0 || !config.EXPORT_ENABLED) {
      return;
    }
    this.flushing = true;
    const batch = this.queue.splice(0, config.EXPORT_BATCH_SIZE);
    exporterQueueSize.set(this.queue.length);

    const payload = {
      batchId: randomUUID(),
      count: batch.length,
      records: batch
    };
    const bodyBuffer = Buffer.from(JSON.stringify(payload));
    const checksum = createHash("sha256").update(bodyBuffer).digest("hex");

    try {
      const signature = await signBatch(bodyBuffer, config.EXPORT_SIGNING_KEY_PATH);
      const response = await fetch(`${config.APP_API_BASE}/api/ingest/${config.EXPORT_PROFILE_ID}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-batch-signature": signature,
          "x-checksum-sha256": checksum
        },
        body: bodyBuffer
      });
      const status = response.status;
      if (status >= 200 && status < 300) {
        exporterBatches.inc({ status: "success" });
        this.backoffMs = config.EXPORT_FLUSH_INTERVAL_MS;
        await this.recordExport(payload.batchId, batch.length, "success", status, checksum);
      } else {
        throw new Error(`export_failed_${status}`);
      }
    } catch (err) {
      exporterBatches.inc({ status: "failed" });
      logger.error({ err }, "Failed to export batch, will retry");
      this.queue.unshift(...batch);
      exporterQueueSize.set(this.queue.length);
      this.backoffMs = Math.min(this.backoffMs * 2, 60_000);
      await sleep(this.backoffMs);
    } finally {
      this.flushing = false;
      this.scheduleFlush();
    }
  }

  private async recordExport(
    batchId: string,
    recordCount: number,
    status: string,
    responseCode: number,
    checksum: string
  ) {
    await getPool().query(
      `INSERT INTO export_log (batch_id, record_count, status, transmitted_at, response_code, checksum)
       VALUES ($1, $2, $3, now(), $4, $5)`,
      [batchId, recordCount, status, responseCode, checksum]
    );
  }
}
