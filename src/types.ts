/**
 * Shared type definitions
 */

export enum RunStatus {
  CREATED = "created",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

export interface ToolMetric {
  name: string;
  calls: number;
  totalMs: number;
}

export interface Obligation {
  id: string;
  lawId: string;
  title: string;
  summary: string;
}

export interface Run {
  id: string;
  question: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  logs: string[];

  selectedLawIds?: string[];
  selectedLaws?: string[];
  draftAnswer?: string;

  obligations?: Obligation[];

  tools?: ToolMetric[];
  totalMs?: number;
}

export interface Step {
  name: string;
  run: (run: Run, env: Env) => Promise<void>;
}

export interface LawDoc {
  id: string;
  name: string;
  url: string;
}

export type Env = {
  RUNS_KV: KVNamespace;
  AI: Ai;
};
