export function formatNumber(value: number | null | undefined, dp = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const mult = Math.pow(10, dp);
  return String(Math.round(value * mult) / mult);
}

export function formatPercent(value: number | null | undefined, dp = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, dp)}%`;
}

export function formatRelative(input: string | number | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "number" ? new Date(input) : new Date(String(input));
  if (Number.isNaN(date.getTime())) return String(input);
  const diff = Date.now() - date.getTime();
  const suffix = diff >= 0 ? "ago" : "from now";
  const deltaMs = Math.abs(diff);
  if (deltaMs < 60_000) return "just now";
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return `${minutes}m ${suffix}`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h ${suffix}`;
  const days = Math.round(hours / 24);
  return `${days}d ${suffix}`;
}

export function formatDate(input: string | number | null | undefined): string {
  if (!input) return "—";
  const date = typeof input === "number" ? new Date(input) : new Date(String(input));
  if (Number.isNaN(date.getTime())) return String(input);
  return date.toLocaleString();
}
