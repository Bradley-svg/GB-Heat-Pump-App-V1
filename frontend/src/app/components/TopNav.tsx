import { Link, useLocation } from "react-router-dom";

import type { CurrentUser } from "../hooks/use-current-user";

interface TopNavProps {
  user: CurrentUser;
  assetBase: string;
  logoutReturn: string;
}

const NAV_LINKS: { to: string; label: string; role: string | null }[] = [
  { to: "/overview", label: "Overview", role: "admin" },
  { to: "/compact", label: "My Sites", role: "client" },
  { to: "/devices", label: "Devices", role: null },
  { to: "/alerts", label: "Alerts", role: null },
  { to: "/commissioning", label: "Commissioning", role: "contractor" },
  { to: "/admin", label: "Admin", role: "admin" },
  { to: "/admin/archive", label: "Archives", role: "admin" },
];

export function TopNav({ user, assetBase, logoutReturn }: TopNavProps) {
  const location = useLocation();
  const roles = user.roles.length ? user.roles.join(", ") : "no-role";
  const logoutHref = `/app/logout?return=${encodeURIComponent(logoutReturn)}`;
  const normalizedRoles = user.roles.map((role) => role.toLowerCase());

  const allowedLinks = NAV_LINKS.filter((link) => {
    if (!link.role) return true;
    const requiredRole = link.role.toLowerCase();
    return normalizedRoles.some((role) => role.includes(requiredRole));
  });

  return (
    <header className="nav">
      <div className="brand">
        <img src={`${assetBase}GREENBRO LOGO APP.svg`} height={24} alt="GreenBro" />
        <span>GreenBro Dashboard</span>
      </div>
      <nav className="nav-links">
        {allowedLinks.map((link) => (
          <Link
            key={link.to}
            className={`nav-link${location.pathname.startsWith(link.to) ? " active" : ""}`}
            to={link.to}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <span className="tag">{roles}</span>
      <div className="sp" />
      <a href={logoutHref} className="btn">
        Logout
      </a>
    </header>
  );
}
