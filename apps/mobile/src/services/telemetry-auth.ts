export type TelemetryGrant = {
  token: string;
  expiresAt?: string | null;
};

let grant: TelemetryGrant | null = null;

export function setTelemetryGrant(next?: TelemetryGrant | null): void {
  if (next && typeof next.token === "string" && next.token.trim().length > 0) {
    grant = {
      token: next.token,
      expiresAt: next.expiresAt ?? null,
    };
    return;
  }
  grant = null;
}

export function getTelemetryGrant(): TelemetryGrant | null {
  return grant;
}
