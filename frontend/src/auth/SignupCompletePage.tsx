import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";

type SignupCompleteState = {
  email?: string;
};

export function SignupCompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as SignupCompleteState | null) ?? {};
  const submittedEmail = state.email ?? "";

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
        <p>
          Need help? <a href="mailto:support@greenbro.com">Contact support</a> and mention the
          email address you used during signup.
        </p>
      </div>
    </AuthLayout>
  );
}
