import { z } from "zod";
import { json } from "./responses";

export type ValidationIssue = {
  path: string;
  message: string;
};

export type SchemaParseResult<T> =
  | { success: true; data: T }
  | { success: false; issues: ValidationIssue[] };

export function fromZodError(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue: z.ZodIssue) => ({
    path: issue.path.length ? issue.path.join(".") : "root",
    message: issue.message,
  }));
}

export function validateWithSchema<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown> | undefined,
  payload: unknown,
): SchemaParseResult<T> {
  if (!schema) {
    return {
      success: false,
      issues: [{ path: "root", message: "Validation unavailable" }],
    };
  }

  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return { success: true, data: parsed.data };
  }
  return { success: false, issues: fromZodError(parsed.error) };
}

export function validationErrorResponse(
  issues: ValidationIssue[] | z.ZodError,
  init?: ResponseInit,
): Response {
  const details = issues instanceof z.ZodError ? fromZodError(issues) : issues;
  return json(
    {
      error: "Validation failed",
      details,
    },
    {
      status: 400,
      ...init,
    },
  );
}
