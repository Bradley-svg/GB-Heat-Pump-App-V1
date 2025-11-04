# npm registry configuration

The CI runners sit behind an Envoy MITM proxy that blocks anonymous HTTPS CONNECT requests to `registry.npmjs.org`. When `npm ci` runs without credentials the proxy responds with `403 Forbidden`, which shows up as:

```
npm ERR! code E403
npm ERR! 403 403 Forbidden - GET https://registry.npmjs.org/eslint
```

Use the `scripts/install-frontend.mjs` helper (invoked automatically via `npm run frontend:install` and the root `postinstall`) to configure npm for private mirrors or authenticated proxies. The script accepts the following environment variables:

| Variable | Description |
| --- | --- |
| `NPM_REGISTRY_URL` | Registry base URL. Defaults to `https://registry.npmjs.org/`. |
| `NPM_REGISTRY_TOKEN` | Auth token injected as `//host/:_authToken` for private mirrors. |
| `NPM_REGISTRY_ALWAYS_AUTH` | Set to `true` to force `always-auth=true`. |
| `NPM_REGISTRY_NO_PROXY` | Comma-separated host list for `noproxy`. Useful when the corporate proxy blocks CONNECT to the public registry. |
| `NPM_REGISTRY_DISABLE_PROXY` | Set to `true` to remove all `*_proxy` variables from the child npm process. |
| `NPM_REGISTRY_CA_FILE` | Absolute path to the trusted CA bundle for the registry. Falls back to `SSL_CERT_FILE` or `NODE_EXTRA_CA_CERTS`. |
| `NPM_REGISTRY_STRICT_SSL` | Set to `false` to disable strict SSL verification. |
| `NPM_REGISTRY_PERSIST_NPMRC` | Keep the generated `.npmrc` after the run for debugging instead of removing it. |

The script writes `frontend/.npmrc` during the run and removes any proxy configuration when `NPM_REGISTRY_DISABLE_PROXY=true`. This prevents cached credentials or proxy settings from leaking into source control while ensuring `frontend/node_modules` contains the ESLint plugins and Vitest binaries required by `npm run frontend:lint` and `npm run frontend:test`.

When installation fails with 403 after providing credentials, confirm that the proxy allows outbound traffic to your mirror. In air-gapped CI environments ensure the mirror has the React, ESLint, Testing Library, and Vitest packages referenced in `frontend/package.json`.
