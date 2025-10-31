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
const AdminArchivePage = lazy(() => import("../pages/admin/AdminArchivePage"));

export function AppShell() {
  const config = useAppConfig();
  const currentUser = useCurrentUserState();

  if (currentUser.status === "loading" || currentUser.status === "idle") {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (currentUser.status === "error" || !currentUser.user) {
    return <UnauthorizedScreen returnUrl={config.returnDefault} />;
  }

  return (
    <BrowserRouter basename="/app">
      <AppLayout user={currentUser.user}>
        <Suspense fallback={<LoadingScreen message="Loading page..." />}>
          <Routes>
            <Route index element={<Navigate to={landingPathFor(currentUser.user)} replace />} />
            <Route path="overview" element={<OverviewPage />} />
            <Route path="compact" element={<CompactDashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="device" element={<DeviceDetailPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="commissioning" element={<CommissioningPage />} />
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/archive" element={<AdminArchivePage />} />
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
  if (roles.some((role) => role.includes("admin"))) return "overview";
  if (roles.some((role) => role.includes("client"))) return "compact";
  if (roles.some((role) => role.includes("contractor"))) return "devices";
  return "unauthorized";
}
