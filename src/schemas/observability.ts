import { z } from "zod";

const optionalLimitedString = (max: number) =>
  z
    .string()
    .max(max)
    .optional();

const optionalTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional();

const optionalStringRecord = z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional();

export const ClientErrorReportSchema = z
  .object({
    name: optionalTrimmedString(256),
    message: optionalLimitedString(2048),
    stack: optionalLimitedString(8192),
    componentStack: optionalLimitedString(8192),
    userAgent: optionalLimitedString(1024),
    url: optionalLimitedString(2048),
    timestamp: optionalTrimmedString(64),
    release: optionalTrimmedString(128),
    tags: optionalStringRecord,
    extras: z.unknown().optional(),
  })
  .extend({
    user: z
      .object({
        email: optionalTrimmedString(320),
        roles: z.array(optionalTrimmedString(128)).optional(),
        clientIds: z.array(optionalTrimmedString(128)).optional(),
      })
      .optional(),
  })
  .passthrough();

export type ClientErrorReport = z.infer<typeof ClientErrorReportSchema>;
