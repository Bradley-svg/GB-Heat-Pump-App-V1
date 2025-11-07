import { NavLink } from "react-router-dom";
import { useState } from "react";

import type { CurrentUser } from "../hooks/use-current-user";
import { useApiClient } from "../contexts";
import { logout } from "../../services/auth-service";

interface TopNavProps {
  user: CurrentUser;
  assetBase: string;
  logoutReturn: string;
}

const NAV_LINKS: { to: string; label: string; role: string | null; exact?: boolean }[] = [
  { to: "overview", label: "Overview", role: "admin" },
  { to: "compact", label: "My Sites", role: "client" },
  { to: "devices", label: "Devices", role: null },
  { to: "alerts", label: "Alerts", role: null },
  { to: "ops", label: "Ops", role: "admin" },
  { to: "commissioning", label: "Commissioning", role: "contractor" },
  { to: "admin", label: "Admin", role: "admin", exact: true },
  { to: "admin/archive", label: "Archives", role: "admin" },
];

export function TopNav({ user, assetBase, logoutReturn }: TopNavProps) {
  const api = useApiClient();
  const roles = user.roles.length ? user.roles.join(", ") : "no-role";
  const logoutHref = `/app/logout?return=${encodeURIComponent(logoutReturn)}`;
  const normalizedRoles = user.roles.map((role) => role.toLowerCase());
  const [loggingOut, setLoggingOut] = useState(false);

  const allowedLinks = NAV_LINKS.filter((link) => {
    if (!link.role) return true;
    const requiredRole = link.role.toLowerCase();
    return normalizedRoles.includes(requiredRole);
  });

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout(api);
    } catch {
      // Ignore API errors and continue with Access logout.
    } finally {
      window.location.href = logoutHref;
    }
  };

  return (
    <header className="nav">
      <div className="brand">
        <img src={`${assetBase}GREENBRO LOGO APP.svg`} height={24} alt="GreenBro" />
        <span>GreenBro Dashboard</span>
      </div>
      <nav className="nav-links">
        {allowedLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            end={link.exact ?? false}
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
      <span className="tag">{roles}</span>
      <div className="sp" />
      <button
        type="button"
        className="btn"
        onClick={() => {
          void handleLogout();
        }}
        disabled={loggingOut}
      >
        {loggingOut ? "Signing out..." : "Logout"}
      </button>
    </header>
  );
}
