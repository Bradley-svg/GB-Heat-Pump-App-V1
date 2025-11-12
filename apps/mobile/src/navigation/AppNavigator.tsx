import { MaterialIcons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";

import { AlertsScreen } from "../screens/AlertsScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { DeviceDetailScreen } from "../screens/DeviceDetailScreen";
import { useTheme } from "../theme/GBThemeProvider";

export type RootTabsParamList = {
  Dashboard: undefined;
  Device: undefined;
  Alerts: undefined;
};

const Tab = createBottomTabNavigator<RootTabsParamList>();

interface Props {
  onShowToast: (message: string, type: "success" | "warn" | "error") => void;
}

const AppNavigator: React.FC<Props> = ({ onShowToast }) => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.surface },
        tabBarIcon: ({ color, size }) => {
          const icon =
            route.name === "Dashboard"
              ? "dashboard"
              : route.name === "Device"
                ? "device-hub"
                : "warning";
          return <MaterialIcons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard">
        {(props) => <DashboardScreen {...props} onShowToast={onShowToast} />}
      </Tab.Screen>
      <Tab.Screen name="Device" component={DeviceDetailScreen} />
      <Tab.Screen name="Alerts">
        {(props) => <AlertsScreen {...props} onShowToast={onShowToast} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
};

export default AppNavigator;
