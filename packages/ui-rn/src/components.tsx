import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "./theme";

export interface GBButtonProps {
  label: string;
  variant?: "primary" | "secondary" | "ghost";
  onPress?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  testID?: string;
}

export function GBButton({ label, variant = "primary", onPress, disabled, icon, testID }: GBButtonProps) {
  const { colors, tokens } = useTheme();
  const background =
    variant === "primary" ? colors.primary : variant === "secondary" ? colors.surface : "transparent";
  const color = variant === "primary" ? "#fff" : colors.text;
  return (
    <Pressable
      testID={testID}
      disabled={disabled}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: tokens.spacing.sm,
        paddingVertical: tokens.spacing.sm,
        paddingHorizontal: tokens.spacing.lg,
        backgroundColor: background,
        borderRadius: tokens.radius.md,
        opacity: disabled ? 0.5 : 1,
        borderWidth: variant === "ghost" ? 0 : 1,
        borderColor: variant === "primary" ? background : colors.border,
      }}
    >
      {icon}
      <Text style={{ color, fontWeight: "600", fontSize: tokens.typography.scale.md }}>{label}</Text>
    </Pressable>
  );
}

export interface GBCardProps {
  title?: string;
  children: ReactNode;
}

export function GBCard({ title, children }: GBCardProps) {
  const { colors, tokens } = useTheme();
  return (
    <View
      style={{
        padding: tokens.spacing.lg,
        borderRadius: tokens.radius.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {title && <Text style={{ fontWeight: "600", marginBottom: tokens.spacing.sm }}>{title}</Text>}
      {children}
    </View>
  );
}

export interface GBStatusPillProps {
  status: "OK" | "WARN" | "ALERT";
  label?: string;
}

export function GBStatusPill({ status, label }: GBStatusPillProps) {
  const palette = {
    OK: "#2E7D32",
    WARN: "#F9A825",
    ALERT: "#C62828",
  } as const;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: `${palette[status]}20`,
      }}
    >
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: palette[status],
        }}
      />
      <Text style={{ color: palette[status], fontWeight: "600" }}>{label ?? status}</Text>
    </View>
  );
}
