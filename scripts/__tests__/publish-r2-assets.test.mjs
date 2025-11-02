import { describe, expect, it } from "vitest";
import { resolveBucketName } from "../publish-r2-assets.mjs";

const SAMPLE_WRANGLER = `
[[r2_buckets]]
binding = "APP_STATIC"
bucket_name = "default-bucket"

[[env.production.r2_buckets]]
binding = "APP_STATIC"
bucket_name = "prod-bucket"

[[env.staging.r2_buckets]]
binding = "APP_STATIC"
bucket_name = "staging-bucket" # trailing comment should be ignored
`;

describe("resolveBucketName", () => {
  it("prefers R2_BUCKET_NAME env variable when provided", () => {
    const bucket = resolveBucketName({
      env: "production",
      envVars: {
        R2_BUCKET_NAME: "explicit-bucket",
        APP_STATIC_BUCKET: "fallback-bucket",
      },
      configSource: SAMPLE_WRANGLER,
    });

    expect(bucket).toBe("explicit-bucket");
  });

  it("selects the env-specific bucket when available", () => {
    const bucket = resolveBucketName({
      env: "production",
      envVars: {},
      configSource: SAMPLE_WRANGLER,
    });

    expect(bucket).toBe("prod-bucket");
  });

  it("falls back to the default bucket when env block is missing", () => {
    const bucket = resolveBucketName({
      env: "qa",
      envVars: {},
      configSource: SAMPLE_WRANGLER,
    });

    expect(bucket).toBe("default-bucket");
  });

  it("uses APP_STATIC_BUCKET env variable when provided", () => {
    const bucket = resolveBucketName({
      env: "staging",
      envVars: {
        APP_STATIC_BUCKET: "env-bucket",
      },
      configSource: SAMPLE_WRANGLER,
    });

    expect(bucket).toBe("env-bucket");
  });
});
