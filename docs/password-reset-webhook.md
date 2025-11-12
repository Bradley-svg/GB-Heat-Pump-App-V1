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
  "expiresAt": "2025-02-01T10:15:00.000Z"
}
```

Host the webhook inside GreenBro-controlled infrastructure (e.g., a Workers route protected by Cloudflare Access) so the `resetUrl` never leaves our perimeter. Downstream providers (SendGrid, SES, etc.) should only receive templated emails after your webhook validates `x-reset-signature`.

The signature header enables downstream verification:

```bash
# Example verification using OpenSSL
BODY='{"email":"demo@example.com","resetUrl":"https://app.greenbro.com/auth/reset?token=abc","token":"abc","expiresAt":"2025-02-01T10:15:00.000Z"}'
SECRET='dev-reset-secret'
printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" -binary | openssl base64 -A
```

---

## 2. Provisioning Steps

1. **Create the webhook endpoint** inside the GreenBro VPC/Workers account (protect it with Cloudflare Access if exposed). That handler can then call your email/SMS provider after verifying the HMAC signature.
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
- Your internal webhook should validate `x-reset-signature`, then call the provider (SendGrid, SES, Twilio). Enable their event hooks (bounces, complaints, delivery failures) and route alerts to the Ops Slack channel.

### Synthetic test
- Weekly cron (GitHub Action/Lambda) that hits `/api/auth/recover` with a sandbox email and asserts the provider sends a message. Alert if no email is received within 5 minutes.

---

## 5. AUTH_IP_BUCKETS KV Namespaces

Password flows share the auth rate limiter. Make sure the KV namespace backing `AUTH_IP_BUCKETS` exists in both environments:

```bash
wrangler kv namespace create greenbro-auth-ip --env production
wrangler kv namespace create greenbro-auth-ip --env preview
```

Copy the IDs into `services/overseas-api/wrangler.toml` (default block + `[env.production]`). Validation now fails fast if `AUTH_IP_LIMIT_PER_MIN > 0` without this binding, so deploys will stop rather than silently disable the limiter.

---

## 6. Email Verification Webhook (new requirement)

Email verification traffic now uses a **dedicated** webhook + secret so we can rotate credentials independently of password resets. The Worker refuses to send verifications unless the following env vars are populated:

```
EMAIL_VERIFICATION_WEBHOOK_URL=https://hooks.<your-domain>/email-verification
EMAIL_VERIFICATION_WEBHOOK_SECRET=<min 16 chars, unique per environment>
```

Provisioning/rotation steps mirror the password reset flow, but call out the secrets separately:

1. Bootstrap preview secrets with unique values (`wrangler secret put EMAIL_VERIFICATION_WEBHOOK_* --env preview`), deploy, and trigger `/api/auth/signup` to confirm the verification email lands.
2. Repeat for production (use the ticketed rotation checklist so we satisfy Prompt Bible Appendix C “Definition of Done”).
3. Record the rotation date + operator in the password manager entry for `EMAIL_VERIFICATION_WEBHOOK_SECRET`.
4. Rollback = re-run `wrangler secret put` with the previous secret and redeploy.

Because verification emails share the same downstream provider, your webhook handler should **validate `x-user-event-signature` with the verification secret**, then enqueue the provider call. Never log or forward the raw verification token outside GreenBro infrastructure.

### Rotation checklist (preview → production)
1. Generate a new verification secret in the password manager entry `EMAIL_VERIFICATION_WEBHOOK_SECRET` (note the rotation ticket).
2. Update **preview** (run from repo root in PowerShell for traceability):  
   ```bash
   Write-Host \"[preview] rotating verification webhook\" -ForegroundColor Cyan
   wrangler secret put EMAIL_VERIFICATION_WEBHOOK_URL --env preview
   wrangler secret put EMAIL_VERIFICATION_WEBHOOK_SECRET --env preview
   wrangler deploy --env preview
   ```  
   Issue a test signup (`curl -XPOST https://<preview>/api/auth/signup …`) and confirm the verification email flows through the new webhook path.
3. Update **production** with the same commands (swap `--env preview` for `--env production`). As soon as the deploy finishes, call `/api/auth/signup` with a sandbox account and confirm the provider sees the webhook.
4. Record the rotation (date, operator, ticket) in the password manager entry and archive the previous secret so rollback is possible.
5. If any step fails, rerun `wrangler secret put` with the previous value and redeploy—per Prompt Bible Appendix C (DoD), log the incident and add a postmortem note.

Keep this playbook next to the deployment runbook. When onboarding new engineers, walk through a full dry run (preview secrets, test email, Datadog dashboard) so they understand the surface area before touching production.
