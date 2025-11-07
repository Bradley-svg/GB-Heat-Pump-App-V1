import { subscribePendingLogoutWatchers } from "../../src/utils/pending-logout";
import { AppState } from "react-native";
import NetInfo from "@react-native-community/netinfo";

describe("subscribePendingLogoutWatchers", () => {
  beforeEach(() => {
    (AppState.addEventListener as jest.Mock).mockClear();
    (NetInfo.addEventListener as jest.Mock).mockClear();
  });

  it("invokes callback when app state returns to active", () => {
    const callback = jest.fn();
    const cleanup = subscribePendingLogoutWatchers(callback);
    const appStateHandler = (AppState.addEventListener as jest.Mock).mock.calls[0]?.[1];
    expect(typeof appStateHandler).toBe("function");
    appStateHandler?.("background");
    expect(callback).not.toHaveBeenCalled();
    appStateHandler?.("active");
    expect(callback).toHaveBeenCalledTimes(1);
    cleanup();
  });

  it("invokes callback when connectivity recovers", () => {
    const callback = jest.fn();
    subscribePendingLogoutWatchers(callback);
    const netInfoHandler = (NetInfo.addEventListener as jest.Mock).mock.calls[0]?.[0];
    expect(typeof netInfoHandler).toBe("function");
    netInfoHandler?.({ isConnected: false, isInternetReachable: false });
    callback.mockReset();
    netInfoHandler?.({ isConnected: true, isInternetReachable: true });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
