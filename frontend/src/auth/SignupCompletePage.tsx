import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";
import { useApiClient } from "../app/contexts";
import { resendVerification } from "../services/auth-service";
import { ApiError } from "../services/api-client";
import { trackClientEvent } from "../services/telemetry";

type SignupCompleteState = {
  email?: string;
};

export function SignupCompletePage() {
  const api = useApiClient();
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as SignupCompleteState | null) ?? {};
  const submittedEmail = state.email ?? "";
  const [emailInput, setEmailInput] = useState(submittedEmail);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [resendError, setResendError] = useState<string | null>(null);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed) {
      setResendError("Enter the email you used during signup.");
      setResendStatus("error");
      return;
    }
    setResendError(null);
    setResendStatus("sending");
    try {
      await resendVerification(api, trimmed);
      setResendStatus("success");
      trackClientEvent("signup_flow.resend", { status: "ok" });
    } catch (err) {
      const message =
        err instanceof ApiError && err.status === 400 ?
          "That email address looked invalid." :
          "We couldn't resend the verification email. Try again shortly.";
      setResendError(message);
      setResendStatus("error");
      trackClientEvent("signup_flow.resend", {
        status: err instanceof ApiError ? err.status : "error",
      });
    }
  }

  return (
    <AuthLayout
      title="Check your inbox"
      subtitle="We sent verification instructions to finish creating your account."
      footer={
        <div className="auth-footer-links">
          <button
            className="link"
            type="button"
            onClick={() => navigate("/auth/login", { replace: true })}
          >
            Return to login
          </button>
          <Link to="/auth/signup" className="link">
            Start another signup
          </Link>
        </div>
      }
    >
      <div className="card callout" role="status">
        <strong>Next step:</strong>{" "}
        {submittedEmail ?
          <>Open <span style={{ fontFamily: "monospace" }}>{submittedEmail}</span> and follow the verification link.</> :
          "Open your inbox and follow the verification link we just sent."}
      </div>
      <div className="auth-message-card">
        <p>Finish setup in three quick steps:</p>
        <ol style={{ marginLeft: "1.2rem" }}>
          <li>Open the "Verify your GREENBRO account" email.</li>
          <li>Select the button inside the message to confirm your address.</li>
          <li>
            Prefer to paste the token manually?{" "}
            <Link to="/auth/verify" className="link">
              Enter it here
            </Link>.
          </li>
        </ol>
        <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.08)", margin: "1rem 0" }} />
        <form onSubmit={handleResend} className="resend-form">
          <label className="auth-field">
            <span>Need another email?</span>
            <input
              type="email"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="you@example.com"
            />
          </label>
          {resendError ? <div className="auth-error">{resendError}</div> : null}
          {resendStatus === "success" ? (
            <div className="callout" role="status">
              Verification email sent. Check your inbox.
            </div>
          ) : null}
          <button className="button secondary" type="submit" disabled={resendStatus === "sending"}>
            {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
          </button>
        </form>
        <p>
          Need help? <a href="mailto:support@greenbro.com">Contact support</a> and mention the
          email address you used during signup.
        </p>
      </div>
    </AuthLayout>
  );
}
