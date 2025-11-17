# @greenbro/ui-react

Shared React components and theming helpers that enforce the GreenBro tokens by default. Target React 19 in consuming apps to avoid pulling multiple React majors into the bundle.

```tsx
import { ThemeProvider, GBButton } from "@greenbro/ui-react";

export function App() {
  return (
    <ThemeProvider>
      <GBButton onClick={() => console.log("ok")}>Dispatch Alert</GBButton>
    </ThemeProvider>
  );
}
```
