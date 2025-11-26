/**
 * Law text loading service
 */

import type { Env, Run } from "../types";
import { getLawById } from "../config/laws";
import { LAW_TEXT_SAMPLES } from "../data/law-samples";
import { LAW_TEXT_REAL } from "../law_text_ingested";
import { KV_PREFIX } from "../config/constants";
import { measureTool } from "../utils/metrics";

/**
 * Loads law text from cache or storage
 * Priority: KV cache -> Real PDF text -> Sample text
 */
export const loadLawText = async (
  env: Env,
  run: Run,
  lawId: string,
  logFn: (message: string) => void
): Promise<string> => {
  return measureTool(run, "loadLawText", logFn, async () => {
    const cacheKey = `${KV_PREFIX.LAW_TEXT}${lawId}`;

    // Try to load from cache first
    const cachedText = await env.RUNS_KV.get(cacheKey);
    if (cachedText) {
      logFn(`[loadLawText] Loaded from cache: ${lawId}`);
      return cachedText;
    }

    // Validate law exists
    const law = getLawById(lawId);
    if (!law) {
      throw new Error(`Law not found for id: ${lawId}`);
    }

    // Try to use real ingested PDF text
    const realText = LAW_TEXT_REAL[lawId];
    if (realText) {
      logFn(`[loadLawText] Using real PDF text for ${lawId} (${realText.length} chars)`);
      await env.RUNS_KV.put(cacheKey, realText);
      return realText;
    }

    // Fallback to sample text
    const sampleText = LAW_TEXT_SAMPLES[lawId];
    const text = sampleText?.trim() || `Text not available for ${law.name}. URL: ${law.url}`;

    logFn(`[loadLawText] Using fallback sample for ${lawId}`);
    await env.RUNS_KV.put(cacheKey, text);

    return text;
  });
};
