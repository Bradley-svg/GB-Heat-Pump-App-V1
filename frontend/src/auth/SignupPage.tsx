import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient, useCurrentUserState } from "../app/contexts";
import { signup } from "../services/auth-service";
import { ApiError } from "../services/api-client";

export function SignupPage() {
  const api = useApiClient();
  const currentUser = useCurrentUserState();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in the required fields.");
      return;
    }
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
    setSuccessMessage(null);
    try {
      await signup(api, {
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        company: company || undefined,
      });
      let refreshed = false;
      try {
        await currentUser.refresh();
        refreshed = true;
      } catch (refreshError) {
        console.warn("auth.signup.refresh_failed", refreshError);
      }
      if (refreshed) {
        navigate("/app", { replace: true });
      } else {
        setSuccessMessage("If that email is registered, check your inbox for next steps.");
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Some of the submitted information was invalid. Please check and try again.");
      } else {
        setError("We couldn't create your account. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your GREENBRO account"
      subtitle="We’ll tailor the dashboard to your role once inside."
      footer={
        <div className="auth-footer-links">
          <span>Already registered?</span>
          <Link to="/auth/login" className="link">
            Back to login
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
        {successMessage ? <div className="auth-info">{successMessage}</div> : null}
        <div className="auth-grid">
          <label className="auth-field">
            <span>First name</span>
            <input
              type="text"
              autoComplete="given-name"
              required
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Last name</span>
            <input
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
            />
          </label>
        </div>
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
        <div className="auth-grid">
          <label className="auth-field">
            <span>Company (optional)</span>
            <input
              type="text"
              autoComplete="organization"
              value={company}
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>
          <label className="auth-field">
            <span>Contact number (optional)</span>
            <input
              type="tel"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>
        <div className="auth-grid">
          <label className="auth-field">
            <span>Password</span>
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
        </div>
        <button className="button primary" type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
