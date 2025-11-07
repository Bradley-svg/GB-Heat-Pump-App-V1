import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { GBButton } from "../components/GBButton";
import { GBCard } from "../components/GBCard";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../theme/GBThemeProvider";
import { resendVerification } from "../services/auth-service";
import { ApiError } from "../services/api-client";
import { reportClientEvent } from "../services/telemetry";

interface LoginScreenProps {
  onSuccess?: () => void;
  onError?: (message: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onSuccess,
  onError,
}) => {
  const { login, status, error } = useAuth();
  const { colors, spacing, radii } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const emitResendEvent = (status: string) => {
    void reportClientEvent("signup_flow.resend", { status }).catch((err) => {
      console.warn("signup_flow.resend.telemetry_failed", err);
    });
  };

  const handleSubmit = async () => {
    setLocalError(null);
    try {
      await login(email.trim(), password);
      setEmail("");
      setPassword("");
      onSuccess?.();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to sign in. Try again.";
      setLocalError(message);
      onError?.(message);
    }
  };

  const submitDisabled =
    status === "authenticating" ||
    email.trim().length === 0 ||
    password.length < 8;

  const helperText = localError ?? error;
  const handleResend = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setResendError("Enter your email to resend the verification link.");
      setResendMessage(null);
      emitResendEvent("missing_email");
      return;
    }
    setResendPending(true);
    setResendError(null);
    setResendMessage(null);
    try {
      await resendVerification(trimmed);
      setResendMessage("Check your inbox for a fresh verification email.");
      emitResendEvent("ok");
    } catch (err) {
      const statusCode = err instanceof ApiError ? err.status : "error";
      const message =
        err instanceof ApiError && err.status === 429 ?
          "Please wait before requesting another verification email." :
          "We couldn't resend the verification email. Try again soon.";
      setResendError(message);
      setResendMessage(null);
      emitResendEvent(
        typeof statusCode === "number" ? String(statusCode) : statusCode,
      );
    } finally {
      setResendPending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.surface }]}
    >
      <GBCard title="Sign in" tone="default" testID="login-card">
        <View style={{ gap: spacing.md }}>
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Email</Text>
            <TextInput
              testID="login-email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: radii.md,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
            />
          </View>
          <View>
            <Text style={[styles.label, { color: colors.text }]}>Password</Text>
            <TextInput
              testID="login-password"
              secureTextEntry
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: radii.md,
                },
              ]}
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>
          {helperText ? (
            <Text style={[styles.errorText, { color: colors.error }]}>
              {helperText}
            </Text>
          ) : null}
          <GBButton
            label="Sign in"
            testID="login-submit"
            onPress={handleSubmit}
            disabled={submitDisabled}
            loading={status === "authenticating"}
            accessibilityHint="Signs in to the GreenBro mobile console"
          />
          <View style={styles.resendContainer}>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Need another verification email?
            </Text>
            <GBButton
              label="Resend verification"
              testID="login-resend"
              tone="secondary"
              onPress={handleResend}
              disabled={resendPending}
              loading={resendPending}
              accessibilityHint="Sends a new verification email"
            />
            {resendError ? (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {resendError}
              </Text>
            ) : null}
            {resendMessage ? (
              <Text style={[styles.successText, { color: colors.success }]}>
                {resendMessage}
              </Text>
            ) : null}
          </View>
        </View>
      </GBCard>
      {status === "loading" ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  errorText: {
    fontSize: 13,
  },
  loading: {
    position: "absolute",
    top: 32,
    right: 32,
  },
  resendContainer: {
    gap: 8,
    marginTop: 16,
  },
  successText: {
    fontSize: 13,
  },
});
