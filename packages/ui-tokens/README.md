# @greenbro/ui-tokens

Design token source of truth shared across web and mobile Mode A surfaces. Tokens are stored as JSON so they can be consumed by build tooling or runtime theming libraries.

```ts
import { tokens, getColors } from "@greenbro/ui-tokens";

const { background, text } = getColors("dark");
```
