import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient, useCurrentUserState } from "../app/contexts";
import { resetPassword } from "../services/auth-service";
import { ApiError } from "../services/api-client";

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthLayout
        title="Reset link missing"
        subtitle="Your link may have expired or was copied incorrectly."
        footer={
          <div className="auth-footer-links">
            <Link to="/auth/forgot" className="link">
              Request a new email
            </Link>
          </div>
        }
      >
        <div className="auth-notice error">
          The reset token was not provided. Request another link to get back into your dashboard.
        </div>
      </AuthLayout>
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 8) {
      setError("Passwords must be at least 8 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(api, { token, password });
      currentUser.refresh();
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("That reset link is no longer valid. Request a fresh email and try again.");
      } else {
        setError("We couldn't update your password. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Secure your account with at least 8 characters."
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
        {error ? <div className="auth-error">{error}</div> : null}
        <label className="auth-field">
          <span>New password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save and continue"}
        </button>
      </form>
    </AuthLayout>
  );
}
