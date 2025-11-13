import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { useTheme } from "../theme/GBThemeProvider";

type ToastType = "success" | "warn" | "error";

export interface GBToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  onDismiss?: () => void;
  durationMs?: number;
}

export const GBToast: React.FC<GBToastProps> = ({
  visible,
  message,
  type = "success",
  onDismiss,
  durationMs = 4000,
}) => {
  const { colors, spacing, radii, motion } = useTheme();
  const animation = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const palette = toastPalette(type, colors);
  const containerStyle = useMemo(
    () => ({
      bottom: spacing.xl,
      left: spacing.lg,
      right: spacing.lg,
      padding: spacing.md,
      borderRadius: radii.lg,
      backgroundColor: palette.bg,
    }),
    [palette.bg, radii.lg, spacing.lg, spacing.md, spacing.xl],
  );
  const textStyle = useMemo(
    () => ({
      color: palette.text,
      fontSize: 15,
      fontWeight: "600" as const,
    }),
    [palette.text],
  );
  const animatedStyle = useMemo(
    () => ({
      transform: [
        {
          translateY: animation.interpolate({
            inputRange: [0, 1],
            outputRange: [40, 0],
          }),
        },
      ],
      opacity: animation,
    }),
    [animation],
  );
  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);
  const dismiss = useCallback(() => {
    Animated.timing(animation, {
      toValue: 0,
      duration: motion.durations.tap,
      useNativeDriver: true,
    }).start(() => {
      clearTimer();
      onDismiss?.();
    });
  }, [animation, clearTimer, motion.durations.tap, onDismiss]);

  useEffect(() => {
    if (visible) {
      const hapticType =
        type === "error"
          ? Haptics.NotificationFeedbackType.Error
          : Haptics.NotificationFeedbackType.Success;
      Haptics.notificationAsync(hapticType).catch(() => undefined);

      Animated.timing(animation, {
        toValue: 1,
        duration: motion.durations.tap,
        useNativeDriver: true,
      }).start(() => {
        clearTimer();
        timeoutRef.current = setTimeout(() => dismiss(), durationMs);
      });
    } else {
      dismiss();
    }
    return clearTimer;
  }, [
    animation,
    clearTimer,
    dismiss,
    durationMs,
    motion.durations.tap,
    type,
    visible,
  ]);

  if (!visible) return null;

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, containerStyle, animatedStyle]}
    >
      <Text style={textStyle}>{message}</Text>
    </Animated.View>
  );
};

const toastPalette = (
  type: ToastType,
  colors: ReturnType<typeof useTheme>["colors"],
): { bg: string; text: string } => {
  switch (type) {
    case "warn":
      return { bg: "rgba(224,167,60,0.95)", text: "#1F1501" };
    case "error":
      return { bg: "rgba(194,59,59,0.95)", text: colors.onPrimary };
    default:
      return { bg: "rgba(57,181,74,0.95)", text: colors.onPrimary };
  }
};

const styles = StyleSheet.create({
  toast: { position: "absolute" },
});
