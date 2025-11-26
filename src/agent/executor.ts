/**
 * Agent executor
 * Orchestrates the execution of the agent pipeline
 */

import type { Env } from "../types";
import { RunStatus } from "../types";
import { loadRun, saveRun, appendLog } from "../services/run-manager";
import { PIPELINE } from "../pipeline/steps";

/**
 * Executes the agent pipeline for a given run
 * Handles error recovery and metrics tracking
 */
export const executeAgent = async (env: Env, runId: string): Promise<void> => {
  const run = await loadRun(env, runId);
  if (!run) {
    console.error(`[executeAgent] Run not found: ${runId}`);
    return;
  }

  const startTime = Date.now();

  try {
    // Mark run as running
    run.status = RunStatus.RUNNING;
    run.startedAt = new Date().toISOString();
    appendLog(run, "Agent execution started");
    await saveRun(env, run);

    // Execute each step in the pipeline
    for (const step of PIPELINE) {
      appendLog(run, `[pipeline] Starting step: ${step.name}`);
      await saveRun(env, run);

      await step.run(run, env);

      appendLog(run, `[pipeline] Completed step: ${step.name}`);
      await saveRun(env, run);
    }

    // Mark run as completed
    run.status = RunStatus.COMPLETED;
    run.completedAt = new Date().toISOString();
    run.totalMs = Date.now() - startTime;
    appendLog(run, `Agent completed successfully in ${run.totalMs}ms`);
    await saveRun(env, run);

  } catch (error) {
    // Handle execution failure
    run.status = RunStatus.FAILED;
    run.error = error instanceof Error ? error.message : "Unknown error";
    run.totalMs = Date.now() - startTime;
    appendLog(run, `Agent failed: ${run.error}`);
    await saveRun(env, run);

    console.error(`[executeAgent] Error executing run ${runId}:`, error);
    throw error;
  }
};
