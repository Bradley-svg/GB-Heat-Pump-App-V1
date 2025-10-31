import { z } from "zod";
import { json } from "./responses";

export type ValidationIssue = {
  path: string;
  message: string;
};

export function fromZodError(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length ? issue.path.join(".") : "root",
    message: issue.message,
  }));
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
