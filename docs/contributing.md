## Contributing Workflow Checklist

The repository uses the **Full CI** GitHub Actions workflow to protect the `main` branch. The pipeline runs automatically on every pull request targeting `main` and on pushes to `main`. To keep contributions smooth, mirror the workflow locally before opening a PR.

### CI pipeline steps

1. **Install dependencies with caching**  
   - `npm ci` (root worker)  
   - `npm ci` in `frontend/`  
   The workflow reuses the Node.js cache provided by `actions/setup-node` for faster installs.
2. **Static analysis**  
   - `npm run typecheck`  
   - `npm run frontend:lint`
3. **Automated tests**  
   - `npm run test:ci`
4. **Build verification**  
   - `npm run build`

### Local pre-flight checklist

Run the same commands locally before opening a PR:

```bash
npm ci
npm ci --prefix frontend
npm run typecheck
npm run frontend:lint
npm run test:ci
npm run build
```

### Requiring the workflow before merges

Repository admins should make the **Full CI** workflow required in GitHub branch protection settings:

1. Navigate to *Settings > Branches > Branch protection rules*.
2. Edit (or create) the rule for `main`.
3. Under *Require status checks to pass before merging*, select **Full CI**.

With that rule in place, pull requests cannot merge until the workflow succeeds.
