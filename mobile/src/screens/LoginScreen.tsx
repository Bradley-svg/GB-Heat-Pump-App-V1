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
            onPress={handleSubmit}
            disabled={submitDisabled}
            loading={status === "authenticating"}
            accessibilityHint="Signs in to the GreenBro mobile console"
          />
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
});
