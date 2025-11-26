import type { Env, Run } from "../types";
import { RunStatus } from "../types";

const getCurrentTimestamp = (): string => new Date().toISOString();

export const createRun = (question: string): Run => {
  const runId = crypto.randomUUID();
  const now = getCurrentTimestamp();

  return {
    id: runId,
    question,
    status: RunStatus.CREATED,
    createdAt: now,
    updatedAt: now,
    logs: [],
  };
};

export const loadRun = async (env: Env, runId: string): Promise<Run | null> => {
  const data = await env.RUNS_KV.get(runId);

  if (!data) {
    return null;
  }

  return JSON.parse(data) as Run;
};

export const saveRun = async (env: Env, run: Run): Promise<void> => {
  run.updatedAt = getCurrentTimestamp();
  await env.RUNS_KV.put(run.id, JSON.stringify(run));
};

export const appendLog = (run: Run, message: string): void => {
  const timestamp = getCurrentTimestamp();
  const logEntry = `[${timestamp}] ${message}`;
  run.logs.push(logEntry);
};
