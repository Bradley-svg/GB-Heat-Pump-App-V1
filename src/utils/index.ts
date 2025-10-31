export async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function round(n: unknown, dp: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

export function nowISO() {
  return new Date().toISOString();
}

export function maskId(id: string | null | undefined) {
  if (!id) return "";
  if (id.length <= 4) return "****";
  return id.slice(0, 3) + "�?�" + id.slice(-2);
}

export function parseAndCheckTs(ts: string) {
  const ms = Date.parse(ts);
  if (Number.isNaN(ms)) return { ok: false as const, reason: "Invalid timestamp" };
  const now = Date.now();
  const ahead = 5 * 60 * 1000; // +5 min
  const behind = 365 * 24 * 60 * 60 * 1000; // ~1 year
  if (ms > now + ahead) return { ok: false as const, reason: "Timestamp too far in future" };
  if (ms < now - behind) return { ok: false as const, reason: "Timestamp too old" };
  return { ok: true as const, ms };
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function safeDecode(part: string | null): string | null {
  if (!part) return null;
  try {
    return decodeURIComponent(part);
  } catch {
    return null;
  }
}

export function base64UrlEncode(data: Uint8Array) {
  let binary = "";
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlDecode(input: string): Uint8Array | null {
  try {
    let normalized = input.replace(/-/g, "+").replace(/_/g, "/");
    while (normalized.length % 4) normalized += "=";
    const binary = atob(normalized);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function andWhere(where: string, clause: string) {
  return where ? `${where} AND ${clause}` : `WHERE ${clause}`;
}

export function parseFaultsJson(jsonStr: string | null | undefined): string[] {
  if (!jsonStr) return [];
  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed.filter((f) => typeof f === "string") : [];
  } catch {
    return [];
  }
}

export function parseMetricsJson(jsonStr: string | null | undefined): Record<string, any> {
  if (!jsonStr) return {};
  try {
    const parsed = JSON.parse(jsonStr);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, any>) : {};
  } catch {
    return {};
  }
}
