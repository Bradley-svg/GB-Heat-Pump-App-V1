import { z } from "zod";

function coerceNumber(input: unknown) {
  if (input === undefined || input === null) return undefined;
  if (typeof input === "number") return input;
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (trimmed === "") return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }
  return Number.NaN;
}

export function numericParam(options: {
  min?: number;
  max?: number;
  integer?: boolean;
  defaultValue?: number;
}) {
  let schema = z.number();
  if (options.integer) schema = schema.int();
  if (options.min !== undefined) schema = schema.min(options.min);
  if (options.max !== undefined) schema = schema.max(options.max);

  const withPreprocess = z.preprocess(coerceNumber, schema);
  return options.defaultValue !== undefined
    ? withPreprocess.default(options.defaultValue)
    : withPreprocess.optional();
}

export function optionalNumericParam(options: {
  min?: number;
  max?: number;
  integer?: boolean;
}) {
  let schema = z.number();
  if (options.integer) schema = schema.int();
  if (options.min !== undefined) schema = schema.min(options.min);
  if (options.max !== undefined) schema = schema.max(options.max);
  return z.preprocess(coerceNumber, schema).optional();
}

export function booleanFlagParam(defaultValue: boolean) {
  return z
    .preprocess((input: unknown) => {
      if (input === undefined || input === null) return undefined;
      if (typeof input === "boolean") return input;
      if (typeof input === "number") return input !== 0;
      if (typeof input === "string") {
        const trimmed = input.trim().toLowerCase();
        if (trimmed === "") return undefined;
        if (trimmed === "1" || trimmed === "true" || trimmed === "yes") return true;
        if (trimmed === "0" || trimmed === "false" || trimmed === "no") return false;
      }
      return input;
    }, z.boolean())
    .default(defaultValue);
}

export const optionalBooleanFlag = z
  .preprocess((input: unknown) => {
    if (input === undefined || input === null) return undefined;
    if (typeof input === "boolean") return input;
    if (typeof input === "number") return input !== 0;
    if (typeof input === "string") {
      const trimmed = input.trim().toLowerCase();
      if (trimmed === "") return undefined;
      if (trimmed === "1" || trimmed === "true" || trimmed === "yes") return true;
      if (trimmed === "0" || trimmed === "false" || trimmed === "no") return false;
    }
    return input;
  }, z.boolean())
  .optional();

export const optionalTrimmedString = z
  .preprocess((input: unknown) => {
    if (input === undefined || input === null) return undefined;
    if (typeof input !== "string") return input;
    const trimmed = input.trim();
    return trimmed === "" ? undefined : trimmed;
  }, z.string().min(1, "Must not be empty"))
  .optional();
