import { useCallback } from "react";
import * as Haptics from "expo-haptics";

type FeedbackType = "success" | "warning" | "impact";

export function useHaptics() {
  return useCallback(async (type: FeedbackType) => {
    switch (type) {
      case "warning":
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case "impact":
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      default:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);
}
