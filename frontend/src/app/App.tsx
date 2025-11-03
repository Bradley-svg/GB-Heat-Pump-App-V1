import { ErrorBoundary } from "../components/ErrorBoundary";
import { AppProviders } from "./AppProviders";
import { AppShell } from "./AppShell";

export default function App() {
  return (
    <AppProviders>
      <ErrorBoundary>
        <AppShell />
      </ErrorBoundary>
    </AppProviders>
  );
}
