export const serviceVersion =
  process.env.npm_package_version ?? process.env.GIT_COMMIT ?? "dev-snapshot";
