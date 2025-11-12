import React, { useState } from "react";
import { NavigationContainer, DarkTheme, DefaultTheme } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import AppNavigator from "./src/navigation/AppNavigator";
import { linking } from "./src/navigation/linking";
import { GBThemeProvider, useColorScheme, useTheme } from "./src/theme/GBThemeProvider";
import { GBToast } from "./src/components/GBToast";
import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import { LoginScreen } from "./src/screens/LoginScreen";

export default function App() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "warn" | "error",
  });

  const showToast = (message: string, type: "success" | "warn" | "error") =>
    setToast({ visible: true, message, type });

  return (
    <AuthProvider>
      <GBThemeProvider>
        <SafeAreaProvider>
          <AuthGate onShowToast={showToast} />
          <GBToast
            visible={toast.visible}
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
          />
        </SafeAreaProvider>
      </GBThemeProvider>
    </AuthProvider>
  );
}

const AuthGate: React.FC<{
  onShowToast: (message: string, type: "success" | "warn" | "error") => void;
}> = ({ onShowToast }) => {
  const { status, user } = useAuth();
  const scheme = useColorScheme();
  const { colors } = useTheme();

  if (status === "loading") {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!user) {
    return (
      <LoginScreen
        onSuccess={() => onShowToast("Signed in", "success")}
        onError={(message) => onShowToast(message, "error")}
      />
    );
  }

  return (
    <>
      <View
        testID="theme-probe"
        accessibilityLabel={`theme-${scheme}`}
        style={{
          position: "absolute",
          width: 0,
          height: 0,
          opacity: 0,
          backgroundColor: colors.surface,
        }}
        pointerEvents="none"
      />
      <NavigationContainer
        linking={linking}
        theme={scheme === "dark" ? DarkTheme : DefaultTheme}
      >
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <AppNavigator onShowToast={onShowToast} />
      </NavigationContainer>
    </>
  );
};
