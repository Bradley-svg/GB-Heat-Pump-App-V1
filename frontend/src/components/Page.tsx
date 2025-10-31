import type { PropsWithChildren, ReactNode } from "react";

interface PageProps extends PropsWithChildren {
  title: string;
  actions?: ReactNode;
}

export function Page({ title, actions = null, children }: PageProps) {
  return (
    <div className="wrap">
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}
