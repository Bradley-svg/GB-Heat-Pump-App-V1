export function formatDelta(delta: number): string {
  const prefix = delta > 0 ? "+" : "";
  return `${prefix}${delta.toFixed(1)}`;
}
