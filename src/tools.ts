/**
 * Tools module - Defines reusable tools for the agent
 * Tools are composable functions that can be used by the agent to perform specific tasks
 */

import type { Run, ToolMetric } from "./types";

export interface Tool<TInput = any, TOutput = any> {
  name: string;
  description: string;
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}

export interface ToolContext {
  env: {
    RUNS_KV: KVNamespace;
    AI: Ai;
  };
  run: Run;
  recordMetric: (name: string, ms: number) => void;
  log: (message: string) => void;
}

/**
 * Tool: Search Law Text
 * Searches within a specific law document for relevant content
 */
export const searchLawTextTool: Tool<
  { lawId: string; query: string },
  { found: boolean; excerpt: string }
> = {
  name: "search_law_text",
  description: "Searches within a law document for relevant content",
  async execute(input, context) {
    const startTime = Date.now();

    context.log(`[search_law_text] Searching in ${input.lawId} for: ${input.query.substring(0, 50)}...`);

    // Simulate search (in real impl, would use vector search or keyword search)
    const lawTextKey = `law_text:${input.lawId}`;
    const lawText = await context.env.RUNS_KV.get(lawTextKey);

    if (!lawText) {
      context.recordMetric("search_law_text", Date.now() - startTime);
      return { found: false, excerpt: "" };
    }

    // Simple substring search (could be improved with better search)
    const queryLower = input.query.toLowerCase();
    const textLower = lawText.toLowerCase();
    const matchIndex = textLower.indexOf(queryLower);

    if (matchIndex === -1) {
      context.recordMetric("search_law_text", Date.now() - startTime);
      return { found: false, excerpt: "" };
    }

    // Extract excerpt around match
    const excerptStart = Math.max(0, matchIndex - 200);
    const excerptEnd = Math.min(lawText.length, matchIndex + 200);
    const excerpt = lawText.substring(excerptStart, excerptEnd);

    context.recordMetric("search_law_text", Date.now() - startTime);
    return { found: true, excerpt };
  },
};

/**
 * Tool: Extract Keywords
 * Uses LLM to extract key concepts from user question
 */
export const extractKeywordsTool: Tool<
  { question: string },
  { keywords: string[] }
> = {
  name: "extract_keywords",
  description: "Extracts key legal concepts from user question",
  async execute(input, context) {
    const startTime = Date.now();

    const prompt = [
      "Extract the most important legal keywords from the following question.",
      "Respond ONLY with the keywords separated by commas.",
      "",
      "Question:",
      input.question,
      "",
      "Keywords:",
    ].join("\n");

    const model = "@cf/meta/llama-3-8b-instruct";
    const response = await context.env.AI.run(model, {
      prompt,
      max_tokens: 100,
    } as any);

    const text = typeof response === "string"
      ? response
      : (response as any).response || "";

    const keywords = text
      .split(/[,\n]/)
      .map((keyword: string) => keyword.trim())
      .filter((keyword: string) => keyword.length > 0);

    context.recordMetric("extract_keywords", Date.now() - startTime);
    return { keywords };
  },
};

/**
 * Tool: Analyze Company Context
 * Analyzes the company type and industry from the question
 */
export const analyzeCompanyContextTool: Tool<
  { question: string },
  { industry: string; companyType: string; location: string }
> = {
  name: "analyze_company_context",
  description: "Analyzes company context from question",
  async execute(input, context) {
    const startTime = Date.now();

    context.log("[analyze_company_context] Analyzing company context...");

    const prompt = [
      "Analyze the following question and identify:",
      "1. Company industry",
      "2. Company type (startup, SME, large corporation, etc.)",
      "3. Location (if mentioned)",
      "",
      "Respond in format: INDUSTRY|TYPE|LOCATION",
      "",
      "Question:",
      input.question,
      "",
      "Analysis:",
    ].join("\n");

    const model = "@cf/meta/llama-3-8b-instruct";
    const response = await context.env.AI.run(model, {
      prompt,
      max_tokens: 150,
    } as any);

    const text = typeof response === "string"
      ? response
      : (response as any).response || "";

    const parts = text.split("|").map((part: string) => part.trim());

    context.recordMetric("analyze_company_context", Date.now() - startTime);
    return {
      industry: parts[0] || "unknown",
      companyType: parts[1] || "unknown",
      location: parts[2] || "unknown",
    };
  },
};

/**
 * Tool Registry
 */
export const toolRegistry = {
  search_law_text: searchLawTextTool,
  extract_keywords: extractKeywordsTool,
  analyze_company_context: analyzeCompanyContextTool,
};

export type ToolName = keyof typeof toolRegistry;
