import type { PropsWithChildren, ReactNode } from "react";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  notice?: ReactNode;
}

export function AuthLayout({ title, subtitle, children, footer, notice }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-card">
        <header className="auth-header">
          <h1 className="auth-title">{title}</h1>
          {subtitle ? <p className="auth-subtitle">{subtitle}</p> : null}
        </header>
        {notice ? <div className="auth-notice">{notice}</div> : null}
        <div className="auth-body">{children}</div>
        {footer ? <footer className="auth-footer">{footer}</footer> : null}
      </div>
    </div>
  );
}
