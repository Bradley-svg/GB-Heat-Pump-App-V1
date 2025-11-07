import React, { useState } from "react";
import {
  NavigationContainer,
  DarkTheme,
  DefaultTheme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import AppNavigator from "./src/navigation/AppNavigator";
import { GBThemeProvider, useColorScheme } from "./src/theme/GBThemeProvider";
import { GBToast } from "./src/components/GBToast";

export default function App() {
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    type: "success" as "success" | "warn" | "error",
  });

  return (
    <GBThemeProvider>
      <SafeAreaProvider>
        <ThemedNavigation
          onShowToast={(message, type) =>
            setToast({ visible: true, message, type })
          }
        />
        <GBToast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </SafeAreaProvider>
    </GBThemeProvider>
  );
}

const ThemedNavigation: React.FC<{
  onShowToast: (message: string, type: "success" | "warn" | "error") => void;
}> = ({ onShowToast }) => {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={scheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <AppNavigator onShowToast={onShowToast} />
    </NavigationContainer>
  );
};
