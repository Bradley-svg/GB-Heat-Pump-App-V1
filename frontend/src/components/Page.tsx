import type { PropsWithChildren, ReactNode } from "react";

interface PageProps extends PropsWithChildren {
  title: string;
  actions?: ReactNode;
}

export function Page({ title, actions = null, children }: PageProps) {
  return (
    <div className="wrap">
      <div className="page-header">
        <h1 className="page-title">{title}</h1>
        {actions}
      </div>
      {children}
    </div>
  );
}
