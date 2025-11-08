import NetInfo from "@react-native-community/netinfo";
import { AppState, type AppStateStatus } from "react-native";

export type PendingLogoutCallback = () => void;

export function subscribePendingLogoutWatchers(
  callback: PendingLogoutCallback,
): () => void {
  const appStateSubscription = AppState.addEventListener(
    "change",
    (nextState: AppStateStatus) => {
      if (nextState === "active") {
        callback();
      }
    },
  );

  let lastOnline: boolean | null = null;
  const netInfoUnsubscribe = NetInfo.addEventListener((state) => {
    const isOnline =
      Boolean(state.isConnected) && state.isInternetReachable !== false;
    if (isOnline && (lastOnline === null || lastOnline === false)) {
      callback();
    }
    lastOnline = isOnline;
  });

  return () => {
    appStateSubscription?.remove?.();
    netInfoUnsubscribe?.();
  };
}
