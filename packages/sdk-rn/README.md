# @greenbro/sdk-rn

React Native/Expo client for Mode A telemetry APIs. The client mirrors the web SDK but avoids DOM dependencies and allows a pluggable storage adapter for offline caching.

```ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ModeARNClient } from "@greenbro/sdk-rn";

const client = new ModeARNClient({ apiBase: process.env.APP_API_BASE!, storage: AsyncStorage });
const alerts = await client.getAlerts();
```
