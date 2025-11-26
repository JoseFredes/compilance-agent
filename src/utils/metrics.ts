import type { Run } from "../types";

export const recordToolMetric = (run: Run, toolName: string, durationMs: number): void => {
  if (!run.tools) {
    run.tools = [];
  }

  const existingMetric = run.tools.find((metric) => metric.name === toolName);

  if (!existingMetric) {
    run.tools.push({
      name: toolName,
      calls: 1,
      totalMs: durationMs
    });
  } else {
    existingMetric.calls += 1;
    existingMetric.totalMs += durationMs;
  }
};

export const measureTool = async <T>(
  run: Run,
  toolName: string,
  logFn: (message: string) => void,
  fn: () => Promise<T>
): Promise<T> => {
  const startTime = Date.now();
  const result = await fn();
  const durationMs = Date.now() - startTime;

  recordToolMetric(run, toolName, durationMs);
  logFn(`[metrics] Tool "${toolName}" executed in ${durationMs}ms`);

  return result;
};
