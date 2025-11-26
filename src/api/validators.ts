import { ZodError } from "zod";
import { QuestionRequestSchema } from "../schemas";
import type { QuestionRequest } from "../schemas";

export interface ValidationSuccess {
  valid: true;
  data: QuestionRequest;
}

export interface ValidationError {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationError;

export const validateQuestionRequest = (body: unknown): ValidationResult => {
  try {
    const validated = QuestionRequestSchema.parse(body);
    return { valid: true, data: validated };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        error: error.issues
          .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
          .join(", "),
      };
    }
    return { valid: false, error: "Invalid request body" };
  }
};
