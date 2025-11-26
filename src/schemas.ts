import { z } from "zod";

export const QuestionRequestSchema = z.object({
  question: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(2000, "Question must be at most 2000 characters"),
});

export type QuestionRequest = z.infer<typeof QuestionRequestSchema>;

export const RunStatusSchema = z.enum([
  "created",
  "running",
  "completed",
  "failed",
]);

export const ToolMetricSchema = z.object({
  name: z.string(),
  calls: z.number(),
  totalMs: z.number(),
});

export const ObligationSchema = z.object({
  id: z.string(),
  lawId: z.string(),
  title: z.string(),
  summary: z.string(),
});

export const LawDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  url: z.string().url(),
});

export const RunResponseSchema = z.object({
  id: z.string().uuid(),
  question: z.string(),
  status: RunStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  logs: z.array(z.string()),
  selectedLawIds: z.array(z.string()).optional(),
  selectedLaws: z.array(z.string()).optional(),
  draftAnswer: z.string().optional(),
  obligations: z.array(ObligationSchema).optional(),
  tools: z.array(ToolMetricSchema).optional(),
  totalMs: z.number().optional(),
});

export const AnswerResponseSchema = z.object({
  runId: z.string().uuid(),
  status: RunStatusSchema,
  question: z.string(),
  answer: z.string().nullable(),
  obligations: z.array(ObligationSchema),
  laws: z.array(LawDocSchema.nullable()),
  metrics: z.object({
    totalMs: z.number().nullable(),
    tools: z.array(ToolMetricSchema),
  }),
});
