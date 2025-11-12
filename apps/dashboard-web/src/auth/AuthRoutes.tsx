import { Navigate, Route, Routes } from "react-router-dom";

import { LoginPage } from "./LoginPage";
import { SignupPage } from "./SignupPage";
import { SignupCompletePage } from "./SignupCompletePage";
import { VerifyEmailPage } from "./VerifyEmailPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { ResetPasswordPage } from "./ResetPasswordPage";

export function AuthRoutes() {
  return (
    <Routes>
      <Route index element={<Navigate to="login" replace />} />
      <Route path="login" element={<LoginPage />} />
      <Route path="signup" element={<SignupPage />} />
      <Route path="signup/complete" element={<SignupCompletePage />} />
      <Route path="verify" element={<VerifyEmailPage />} />
      <Route path="forgot" element={<ForgotPasswordPage />} />
      <Route path="reset" element={<ResetPasswordPage />} />
      <Route path="*" element={<Navigate to="login" replace />} />
    </Routes>
  );
}
