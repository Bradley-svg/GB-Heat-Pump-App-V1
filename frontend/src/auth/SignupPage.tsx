import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient } from "../app/contexts";
import { signup } from "../services/auth-service";
import { ApiError } from "../services/api-client";
import { trackClientEvent } from "../services/telemetry";

export function SignupPage() {
  const api = useApiClient();
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
    try {
      await signup(api, {
        email,
        password,
        firstName,
        lastName,
        phone: phone || undefined,
        company: company || undefined,
      });
      void trackClientEvent("signup_flow.result", {
        status: "pending_verification",
      });
      navigate("/auth/signup/complete", {
        replace: true,
        state: { email },
      });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 400 ?
          "Some of the submitted information was invalid. Please check and try again." :
          "We couldn't create your account. Please try again.";
      setError(message);
      void trackClientEvent("signup_flow.error", {
        status: err instanceof ApiError ? err.status : "unknown",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Create your GREENBRO account"
      subtitle="We'll tailor the dashboard to your role once inside."
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
