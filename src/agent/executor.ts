import type { Env } from "../types";
import { RunStatus } from "../types";
import { loadRun, saveRun, appendLog } from "../services/run-manager";
import { PIPELINE } from "../pipeline/steps";

export const executeAgent = async (env: Env, runId: string): Promise<void> => {
  const run = await loadRun(env, runId);
  if (!run) {
    console.error(`[executeAgent] Run not found: ${runId}`);
    return;
  }

  const startTime = Date.now();

  try {
    run.status = RunStatus.RUNNING;
    run.startedAt = new Date().toISOString();
    appendLog(run, "Agent execution started");
    await saveRun(env, run);

    for (const step of PIPELINE) {
      appendLog(run, `[pipeline] Starting step: ${step.name}`);
      await saveRun(env, run);
      await step.run(run, env);
      appendLog(run, `[pipeline] Completed step: ${step.name}`);
      await saveRun(env, run);
    }

    run.status = RunStatus.COMPLETED;
    run.completedAt = new Date().toISOString();
    run.totalMs = Date.now() - startTime;
    appendLog(run, `Agent completed successfully in ${run.totalMs}ms`);
    await saveRun(env, run);

  } catch (error) {
    run.status = RunStatus.FAILED;
    run.error = error instanceof Error ? error.message : "Unknown error";
    run.totalMs = Date.now() - startTime;
    appendLog(run, `Agent failed: ${run.error}`);
    await saveRun(env, run);
    console.error(`[executeAgent] Error executing run ${runId}:`, error);
    throw error;
  }
};
