# @greenbro/ui-react

Shared React components and theming helpers that enforce the GreenBro tokens by default.

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
