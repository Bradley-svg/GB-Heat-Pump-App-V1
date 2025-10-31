import type { PropsWithChildren, ReactNode } from "react";

interface PageProps extends PropsWithChildren {
  title: string;
  actions?: ReactNode;
}

export function Page({ title, actions = null, children }: PageProps) {
  return (
    <div className="wrap">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap",
          marginBottom: "1rem",
        }}
      >
        <h2 style={{ margin: 0 }}>{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}
