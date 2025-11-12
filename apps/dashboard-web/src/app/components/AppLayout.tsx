import type { PropsWithChildren } from "react";

import type { CurrentUser } from "../hooks/use-current-user";
import { useAppConfig } from "../contexts";
import { resolveReturnUrl } from "../config";
import { TopNav } from "./TopNav";

export interface AppLayoutProps extends PropsWithChildren {
  user: CurrentUser;
}

export function AppLayout({ user, children }: AppLayoutProps) {
  const config = useAppConfig();
  const logoutReturn = resolveReturnUrl(config);

  return (
    <div className="app-shell">
      <TopNav user={user} assetBase={config.assetBase} logoutReturn={logoutReturn} />
      <main>{children}</main>
    </div>
  );
}
