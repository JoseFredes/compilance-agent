import type { Env, Run } from "../types";
import { LLM_CONFIG } from "../config/constants";
import { measureTool } from "../utils/metrics";

export const callLlm = async (
  env: Env,
  run: Run,
  prompt: string,
  logFn: (message: string) => void,
  maxTokens: number = LLM_CONFIG.DEFAULT_MAX_TOKENS
): Promise<string> => {
  return measureTool(run, "llm", logFn, async () => {
    if (!env.AI) {
      logFn("[llm] No AI binding found, returning dummy response");
      return `Dummy LLM response based on prompt:\n---\n${prompt.slice(0, 400)}...`;
    }

    const response = await env.AI.run(LLM_CONFIG.MODEL, {
      prompt,
      max_tokens: maxTokens,
    } as any);

    if (typeof response === "string") return response;
    if (response && typeof response === "object" && "response" in response) {
      return (response as any).response as string;
    }
    return JSON.stringify(response);
  });
};
