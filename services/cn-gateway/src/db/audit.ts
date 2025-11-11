import { getKmsAdapter } from "../kms/index.js";
import { getPool } from "./pool.js";

export async function recordAuditLog(
  actor: string,
  action: string,
  details: Record<string, unknown>,
  requestIp?: string
): Promise<void> {
  let ipHmac: string | null = null;
  if (requestIp) {
    const digest = await getKmsAdapter().signHmacSHA256(Buffer.from(requestIp, "utf8"));
    ipHmac = digest
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/u, "");
  }

  await getPool().query(
    `INSERT INTO audit_log (actor, action, details, ip_hmac)
     VALUES ($1, $2, $3::jsonb, $4)`,
    [actor, action, JSON.stringify(details), ipHmac]
  );
}

export async function recordErrorEvent(params: {
  deviceIdRaw?: string;
  seq?: number;
  errorCode: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  await getPool().query(
    `INSERT INTO errors (device_id_raw, seq, error_code, payload)
     VALUES ($1, $2, $3, $4::jsonb)`,
    [params.deviceIdRaw ?? null, params.seq ?? null, params.errorCode, JSON.stringify(params.payload ?? {})]
  );
}
