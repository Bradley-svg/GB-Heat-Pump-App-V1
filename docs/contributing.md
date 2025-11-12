## Contributing Workflow Checklist

The repository uses the **Full CI** GitHub Actions workflow to protect the `main` branch. The pipeline runs automatically on every pull request targeting `main` and on pushes to `main`. To keep contributions smooth, mirror the workflow locally before opening a PR.

### CI pipeline steps

1. **Install dependencies with caching**  
   - `pnpm install` (workspace-aware)  
   Node modules are cached via `actions/setup-node` + `pnpm/action-setup`.
2. **Static analysis**  
   - `pnpm typecheck`  
   - `pnpm --filter @greenbro/dashboard-web run lint`
3. **Automated tests**  
   - `pnpm test`
4. **Build verification**  
   - `pnpm build`

### Local pre-flight checklist

Run the same commands locally before opening a PR:

```bash
pnpm install
pnpm typecheck
pnpm --filter @greenbro/dashboard-web run lint
pnpm test
pnpm build
node scripts/test-install-frontend.mjs
```

`node scripts/test-install-frontend.mjs` temporarily removes `npm` from `PATH` and ensures `scripts/install-frontend.mjs` fails loudly. Run this when you make installer-related tweaks to keep the failure path covered.

### Requiring the workflow before merges

Repository admins should make the **Full CI** workflow required in GitHub branch protection settings:

1. Navigate to *Settings > Branches > Branch protection rules*.
2. Edit (or create) the rule for `main`.
3. Under *Require status checks to pass before merging*, select **Full CI**.

With that rule in place, pull requests cannot merge until the workflow succeeds.
