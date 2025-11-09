# @greenbro/ui-rn

React Native component kit mirroring the web UI primitives while relying on the shared Mode A design tokens.

```tsx
import { ThemeProvider, GBButton } from "@greenbro/ui-rn";

export function MobileScreen() {
  return (
    <ThemeProvider>
      <GBButton label="Acknowledge" onPress={() => console.log("ack")} />
    </ThemeProvider>
  );
}
```
