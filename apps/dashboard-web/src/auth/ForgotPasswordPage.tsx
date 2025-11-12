import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient } from "../app/contexts";
import { recover } from "../services/auth-service";

export function ForgotPasswordPage() {
  const api = useApiClient();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email) {
      setError("Enter the email associated with your account.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await recover(api, email);
      setMessage(
        "If the email matches an account, you’ll receive a reset link shortly. Don’t forget to check spam.",
      );
    } catch {
      setError("We couldn't process the request. Please try again in a moment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Recover your password"
      subtitle="We’ll email you a secure link to reset your access."
      footer={
        <div className="auth-footer-links">
          <Link to="/auth/login" className="link">
            Return to login
          </Link>
        </div>
      }
    >
      <form
        className="auth-form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        {message ? <div className="auth-notice success">{message}</div> : null}
        {error ? <div className="auth-error">{error}</div> : null}
        <label className="auth-field">
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}
