import type { ReactNode } from "react";
import { useTheme } from "./theme";

export interface GBButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  testId?: string;
}

export function GBButton({ variant = "primary", onClick, disabled, icon, children, testId }: GBButtonProps) {
  const { colors, tokens } = useTheme();
  const base = {
    background:
      variant === "secondary"
        ? "transparent"
        : variant === "ghost"
          ? "transparent"
          : colors.primary,
    color: variant === "primary" ? "#fff" : colors.text,
    border: variant === "primary" ? "none" : `1px solid ${colors.border}`,
    opacity: disabled ? 0.5 : 1,
  };
  return (
    <button
      data-testid={testId}
      type="button"
      onClick={disabled ? undefined : onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: tokens.spacing.sm,
        padding: `${tokens.spacing.sm}px ${tokens.spacing.md}px`,
        borderRadius: tokens.radius.md,
        fontSize: tokens.typography.scale.md,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "transform 120ms ease",
        ...base,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

export interface GBCardProps {
  title?: string;
  children: ReactNode;
  elevation?: "sm" | "md";
}

export function GBCard({ title, children, elevation = "sm" }: GBCardProps) {
  const { colors, tokens } = useTheme();
  return (
    <section
      style={{
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.lg,
        background: colors.surface,
        boxShadow: tokens.shadow[elevation],
        border: `1px solid ${colors.border}`,
      }}
    >
      {title && <h3 style={{ marginTop: 0, marginBottom: tokens.spacing.sm }}>{title}</h3>}
      {children}
    </section>
  );
}

export interface GBKpiTileProps {
  label: string;
  value: string;
  trend?: "up" | "down" | "flat";
}

export function GBKpiTile({ label, value, trend = "flat" }: GBKpiTileProps) {
  const { colors, tokens } = useTheme();
  const trendColor =
    trend === "up" ? tokens.color.success : trend === "down" ? tokens.color.danger : colors.text;
  const trendSymbol = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  return (
    <div
      style={{
        padding: tokens.spacing.md,
        borderRadius: tokens.radius.md,
        border: `1px solid ${colors.border}`,
      }}
    >
      <p style={{ margin: 0, color: tokens.color.neutral }}>{label}</p>
      <div style={{ display: "flex", alignItems: "center", gap: tokens.spacing.sm }}>
        <strong style={{ fontSize: tokens.typography.scale.xl }}>{value}</strong>
        <span style={{ color: trendColor }}>{trendSymbol}</span>
      </div>
    </div>
  );
}

export interface GBStatusPillProps {
  status: "OK" | "WARN" | "ALERT";
  label?: string;
}

export function GBStatusPill({ status, label }: GBStatusPillProps) {
  const { tokens } = useTheme();
  const colors = {
    OK: "#2E7D32",
    WARN: "#F9A825",
    ALERT: "#C62828",
  } as const;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: tokens.spacing.xs,
        padding: `${tokens.spacing.xs}px ${tokens.spacing.sm}px`,
        borderRadius: tokens.radius.lg,
        fontWeight: 600,
        background: `${colors[status]}22`,
        color: colors[status],
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: colors[status],
          display: "inline-block",
        }}
      />
      {label ?? status}
    </span>
  );
}

export interface GBListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
}

export function GBListItem({ title, subtitle, meta, onClick }: GBListItemProps) {
  const { colors, tokens } = useTheme();
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: `1px solid ${colors.border}`,
        borderRadius: tokens.radius.md,
        padding: tokens.spacing.md,
        background: "transparent",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontWeight: 600 }}>{title}</p>
          {subtitle && <small style={{ color: tokens.color.neutral }}>{subtitle}</small>}
        </div>
        {meta && <small>{meta}</small>}
      </div>
    </button>
  );
}
