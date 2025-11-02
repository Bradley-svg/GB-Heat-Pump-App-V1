import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { useAppConfig, useCurrentUserState } from "./contexts";
import type { CurrentUser } from "./hooks/use-current-user";
import { AppLayout } from "./components/AppLayout";
import { LoadingScreen } from "./components/LoadingScreen";
import { UnauthorizedScreen } from "./components/UnauthorizedScreen";

const OverviewPage = lazy(() => import("../pages/overview/OverviewPage"));
const CompactDashboardPage = lazy(() => import("../pages/compact/CompactDashboardPage"));
const DevicesPage = lazy(() => import("../pages/devices/DevicesPage"));
const DeviceDetailPage = lazy(() => import("../pages/device-detail/DeviceDetailPage"));
const AlertsPage = lazy(() => import("../pages/alerts/AlertsPage"));
const CommissioningPage = lazy(() => import("../pages/commissioning/CommissioningPage"));
const AdminPage = lazy(() => import("../pages/admin/AdminPage"));
const OpsPage = lazy(() => import("../pages/ops/OpsPage"));
const AdminArchivePage = lazy(() => import("../pages/admin/AdminArchivePage"));
const AdminMqttMappingsPage = lazy(() => import("../pages/admin/MqttMappingsPage"));

export function AppShell() {
  const config = useAppConfig();
  const currentUser = useCurrentUserState();

  if (currentUser.status === "loading" || currentUser.status === "idle") {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (currentUser.status === "error" || !currentUser.user) {
    return <UnauthorizedScreen returnUrl={config.returnDefault} />;
  }

  const user = currentUser.user;
  const normalizedRoles = user.roles.map((role) => role.toLowerCase());
  const isAdmin = normalizedRoles.includes("admin");

  return (
    <BrowserRouter
      basename="/app"
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AppLayout user={user}>
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Routes>
            <Route index element={<Navigate to={landingPathFor(user)} replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="compact" element={<CompactDashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="device" element={<DeviceDetailPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route
              path="ops"
              element={
                isAdmin ? (
                  <OpsPage />
                ) : (
                  <UnauthorizedScreen returnUrl={config.returnDefault} />
                )
              }
            />
            <Route path="commissioning" element={<CommissioningPage />} />
            <Route
              path="admin"
              element={
                isAdmin ? (
                  <AdminPage />
                ) : (
                  <UnauthorizedScreen returnUrl={config.returnDefault} />
                )
              }
            />
            <Route
              path="admin/archive"
              element={
                isAdmin ? (
                  <AdminArchivePage />
                ) : (
                  <UnauthorizedScreen returnUrl={config.returnDefault} />
                )
              }
            />
            <Route
              path="admin/mqtt"
              element={
                isAdmin ? (
                  <AdminMqttMappingsPage />
                ) : (
                  <UnauthorizedScreen returnUrl={config.returnDefault} />
                )
              }
            />
            <Route
              path="unauthorized"
              element={<UnauthorizedScreen returnUrl={config.returnDefault} />}
            />
            <Route path="*" element={<Navigate to="overview" replace />} />
          </Routes>
        </Suspense>
      </AppLayout>
    </BrowserRouter>
  );
}

function landingPathFor(user: CurrentUser): string {
  const roles = user.roles.map((role) => role.toLowerCase());
  if (roles.includes("admin")) return "overview";
  if (roles.includes("client")) return "compact";
  if (roles.includes("contractor")) return "devices";
  return "unauthorized";
}


