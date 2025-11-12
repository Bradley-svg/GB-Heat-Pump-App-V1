import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient, useCurrentUserState } from "../app/contexts";
import { login } from "../services/auth-service";
import { ApiError } from "../services/api-client";

interface LocationState {
  unauthorized?: boolean;
}

export function LoginPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notice = useMemo(() => {
    const state = location.state as LocationState | null;
    if (state?.unauthorized) {
      return "Your session has ended. Please log in to return to the dashboard.";
    }
    return null;
  }, [location.state]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setError("Enter both email and password to continue.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await login(api, { email, password });
      await currentUser.refresh();
      navigate("/app", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("We couldn't find a match for those credentials. Try again.");
      } else {
        setError("We couldn't log you in. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Dashboard Login"
      subtitle="Access GREENBRO heat-pump insights"
      notice={notice ? <div className="auth-alert">{notice}</div> : null}
      footer={
        <div className="auth-footer-links">
          <span>New here?</span>
          <Link to="/auth/signup" className="link">
            Create an account
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
          <span>Email</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Log In"}
        </button>
        <div className="auth-links">
          <Link to="/auth/forgot" className="link">
            Forgot password?
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
}
