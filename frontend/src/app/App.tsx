import { AppProviders } from "./AppProviders";
import { AppShell } from "./AppShell";

export default function App() {
  return (
    <AppProviders>
      <AppShell />
    </AppProviders>
  );
}
