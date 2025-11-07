import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient, useCurrentUserState } from "../app/contexts";
import { verifyEmail } from "../services/auth-service";
import { ApiError } from "../services/api-client";

export function VerifyEmailPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const navigate = useNavigate();
  const location = useLocation();
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryToken = params.get("token");
    if (queryToken && queryToken !== token) {
      setToken(queryToken);
    }
  }, [location.search, token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Enter the verification code from your email.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await verifyEmail(api, token.trim());
      await currentUser.refresh();
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("That link is invalid or expired. Request a new verification email.");
      } else {
        setError("Unable to verify email. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Paste the code from your inbox to finish setting up your account."
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        {error ? <div className="auth-error">{error}</div> : null}
        <label className="auth-field">
          <span>Verification token</span>
          <input
            type="text"
            required
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="paste token"
          />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Verifying..." : "Verify email"}
        </button>
      </form>
    </AuthLayout>
  );
}
