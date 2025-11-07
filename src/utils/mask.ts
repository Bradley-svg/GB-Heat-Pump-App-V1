export function maskEmail(email: string): string {
  const trimmed = email?.trim().toLowerCase();
  if (!trimmed) return "***";
  const parts = trimmed.split("@");
  if (parts.length !== 2) {
    return "***";
  }
  const [local, domain] = parts;
  if (!domain) {
    return "***";
  }
  if (!local) {
    return `*@${domain}`;
  }
  if (local.length === 1) {
    return `*@${domain}`;
  }
  if (local.length === 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}***${local.slice(-1)}@${domain}`;
}
