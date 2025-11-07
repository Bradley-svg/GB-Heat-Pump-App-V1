import { Link, useLocation, useNavigate } from "react-router-dom";

import { AuthLayout } from "./AuthLayout";

type SignupCompleteState = {
  status?: "authenticated" | "pending_email";
};

export function SignupCompletePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state as SignupCompleteState | null) ?? {};
  const status = state.status ?? "pending_email";

  const title =
    status === "authenticated" ?
      "You're all set!" :
      "Check your inbox to finish signing up";
  const body =
    status === "authenticated" ?
      "We've created your dashboard and signed you in. You can start exploring devices right away." :
      "If that email matches an existing account, you'll receive next steps shortly. Follow the link in your inbox to complete setup.";

  return (
    <AuthLayout
      title={title}
      subtitle={body}
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
      <div className="auth-message-card">
        <p>
          Need help? <a href="mailto:support@greenbro.com">Contact support</a> and mention the
          email address you used during signup.
        </p>
      </div>
    </AuthLayout>
  );
}

