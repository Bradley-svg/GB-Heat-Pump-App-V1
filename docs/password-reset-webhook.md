# Password Reset Webhook Playbook

The Worker pushes every password-recovery request to an HTTPS webhook so downstream systems (SendGrid, SES, Twilio, etc.) can deliver the email/SMS. This document captures the expected payload, provisioning steps, rotation cadence, and monitoring hooks.

---

## 1. Payload Contract

```
POST <PASSWORD_RESET_WEBHOOK_URL>
Headers:
  content-type: application/json
  accept: application/json, */*
  authorization: Bearer <PASSWORD_RESET_WEBHOOK_SECRET>
  x-reset-signature: <base64 HMAC-SHA256 of body using PASSWORD_RESET_WEBHOOK_SECRET>
Body:
{
  "email": "demo@example.com",
  "resetUrl": "https://app.greenbro.com/auth/reset?token=...",
  "token": "<raw token>",
  "expiresAt": "2025-02-01T10:15:00.000Z"
}
```

Consumers should treat `token` as sensitive (never log it) and rely on `resetUrl` for end-user links. The signature header enables downstream verification:

```bash
# Example verification using OpenSSL
BODY='{"email":"demo@example.com","resetUrl":"https://app.greenbro.com/auth/reset?token=abc","token":"abc","expiresAt":"2025-02-01T10:15:00.000Z"}'
SECRET='dev-reset-secret'
printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64 -A
```

---

## 2. Provisioning Steps

1. **Create the webhook endpoint** with your delivery provider (SendGrid Inbound Parse, SES Lambda, internal service, etc.). Ensure it supports HTTPS and bearer-token auth.
2. **Bind secrets** via wrangler:
   ```bash
   # preview
   wrangler secret put PASSWORD_RESET_WEBHOOK_URL --env preview
   wrangler secret put PASSWORD_RESET_WEBHOOK_SECRET --env preview
   # production
   wrangler secret put PASSWORD_RESET_WEBHOOK_URL --env production
   wrangler secret put PASSWORD_RESET_WEBHOOK_SECRET --env production
   ```
3. **Smoke test** by calling `/api/auth/recover` against preview; verify an email lands in the sandbox inbox and Cloudflare logs show `password_reset.webhook_succeeded`.
4. **Repeat for production**, coordinating with support so customers are aware of the new reset flow.

---

## 3. Rotation & Change Management

- **Cadence**: quarterly or on vendor compromise.
- **Process**:
  1. Generate a new secret in the password manager entry “PASSWORD_RESET_WEBHOOK_SECRET”.
  2. Update preview secrets, deploy, send a recovery email, and confirm delivery.
  3. Update production secrets, deploy, send another recovery email (real or test account), confirm delivery.
  4. Update the password manager entry with rotation date, operator, and reference ticket.
- **Rollback**: Re-run `wrangler secret put` with the previous secret (kept in the password manager history) and redeploy. Because the Worker fetches secrets at start-up, redeploying is sufficient.

---

## 4. Monitoring

### Worker-side
- `password_reset.webhook_failed` → Datadog monitor `greenbro.password_reset.notifications`.
- `auth.password_reset.notify_failed` → indicates upstream failure bubbled to the API (User gets a 502).

### Provider-side
- Enable provider-specific hooks (SendGrid Event Webhook, SES complaints/bounces topic, Twilio SMS delivery receipts).
- Route failures to the Ops Slack channel for quick triage.

### Synthetic test
- Weekly cron (GitHub Action/Lambda) that hits `/api/auth/recover` with a sandbox email and asserts the provider sends a message. Alert if no email is received within 5 minutes.

---

## 5. AUTH_IP_BUCKETS KV Namespaces

Password flows share the auth rate limiter. Make sure the KV namespace backing `AUTH_IP_BUCKETS` exists in both environments:

```bash
wrangler kv namespace create greenbro-auth-ip --env production
wrangler kv namespace create greenbro-auth-ip --env preview
```

Copy the IDs into `wrangler.toml` (default block + `[env.production]`). Validation now fails fast if `AUTH_IP_LIMIT_PER_MIN > 0` without this binding, so deploys will stop rather than silently disable the limiter.

---

Keep this playbook next to the deployment runbook. When onboarding new engineers, walk through a full dry run (preview secrets, test email, Datadog dashboard) so they understand the surface area before touching production.

