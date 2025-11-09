# @greenbro/sdk-web

React/SPA-friendly client that calls the overseas Mode A API using the shared schemas from `@greenbro/sdk-core`.

```ts
import { ModeAWebClient } from "@greenbro/sdk-web";

const client = new ModeAWebClient({
  apiBase: import.meta.env.VITE_APP_API_BASE,
  accessToken: () => window?.MODEA_ACCESS_TOKEN,
});

const devices = await client.getDevices();
```

Run `pnpm --filter @greenbro/sdk-web test` to execute the Vitest suite.
