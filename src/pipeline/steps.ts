/**
 * Pipeline steps for the compliance agent
 * Each step is a modular, composable unit that processes the run
 */

import type { Env, Run, Step, Obligation, LawDoc } from "../types";
import { LAW_DOCUMENTS, getLawById } from "../config/laws";
import { LLM_CONFIG } from "../config/constants";
import { callLlm } from "../services/llm";
import { appendLog } from "../services/run-manager";
import { getObligationsForLaw } from "../config/law-obligations";
import { loadLawText } from "../services/law-loader";
import { truncateLawText } from "../utils/text-processor";

/**
 * Fallback law selection based on keywords
 * Used when LLM selection fails or returns invalid results
 */
const selectLawsByKeywords = (question: string): LawDoc[] => {
  const questionLower = question.toLowerCase();
  const selectedLaws: LawDoc[] = [];

  // Fintech-related keywords
  if (questionLower.includes("fintec") || questionLower.includes("fintech")) {
    const law = LAW_DOCUMENTS.find((l) => l.id === "LEY_21521");
    if (law) selectedLaws.push(law);
  }

  // Consumer-related keywords
  if (questionLower.includes("consumidor") || questionLower.includes("consumer")) {
    const law = LAW_DOCUMENTS.find((l) => l.id === "LEY_19496");
    if (law) selectedLaws.push(law);
  }

  // Corporate liability keywords
  if (
    questionLower.includes("personas jurídicas") ||
    questionLower.includes("legal entities") ||
    questionLower.includes("responsabilidad penal") ||
    questionLower.includes("criminal liability")
  ) {
    const law = LAW_DOCUMENTS.find((l) => l.id === "LEY_20393");
    if (law) selectedLaws.push(law);
  }

  // Default to consumer protection law if no matches
  if (selectedLaws.length === 0) {
    const defaultLaw = LAW_DOCUMENTS.find((l) => l.id === "LEY_19496");
    if (defaultLaw) selectedLaws.push(defaultLaw);
  }

  // Remove duplicates
  const uniqueLaws = new Map(selectedLaws.map((law) => [law.id, law]));
  return Array.from(uniqueLaws.values());
};

/**
 * Step 1: Select relevant laws based on the user's question
 * Uses LLM to intelligently match the question to applicable laws
 */
export const selectLawsStep: Step = {
  name: "select_laws",
  async run(run: Run, env: Env) {
    appendLog(run, "[select_laws] Selecting relevant laws using LLM...");

    // Build list of available laws
    const lawsList = LAW_DOCUMENTS.map(
      (law, index) => `${index + 1}. ${law.id}: ${law.name}`
    ).join("\n");

    // Prompt for law selection
    const selectionPrompt = [
      "You are an expert legal assistant specializing in Chilean laws.",
      "Given the following user question, select the most relevant laws from the list.",
      "Respond ONLY with the law IDs separated by commas (e.g., LEY_19496,LEY_21521).",
      "Do not add explanations, only the IDs.",
      "",
      "Available laws:",
      lawsList,
      "",
      "User question:",
      run.question,
      "",
      "Relevant law IDs (comma-separated):",
    ].join("\n");

    const llmResponse = await callLlm(
      env,
      run,
      selectionPrompt,
      (msg) => appendLog(run, msg),
      LLM_CONFIG.SELECTION_MAX_TOKENS
    );

    appendLog(run, `[select_laws] LLM response: ${llmResponse}`);

    // Parse LLM response to extract law IDs
    const selectedIds = llmResponse
      .split(/[,\n\s]+/)
      .map((id) => id.trim())
      .filter((id) => LAW_DOCUMENTS.some((law) => law.id === id));

    // Use LLM-selected laws or fallback to keyword-based selection
    const selectedLaws =
      selectedIds.length > 0
        ? LAW_DOCUMENTS.filter((law) => selectedIds.includes(law.id))
        : selectLawsByKeywords(run.question);

    run.selectedLawIds = selectedLaws.map((law) => law.id);
    run.selectedLaws = selectedLaws.map((law) => law.name);

    appendLog(run, `[select_laws] Selected laws: ${run.selectedLaws.join(", ")}`);
  },
};

/**
 * Step 2: Extract obligations from selected laws
 * Analyzes each law using REAL PDF text and extracts relevant compliance obligations
 */
export const extractObligationsStep: Step = {
  name: "extract_obligations",
  async run(run: Run, env: Env) {
    appendLog(run, "[extract_obligations] Extracting obligations from real PDF texts...");

    if (!run.selectedLawIds || run.selectedLawIds.length === 0) {
      appendLog(run, "[extract_obligations] No laws selected, nothing to extract");
      run.obligations = [];
      return;
    }

    const obligations: Obligation[] = [];

    for (const lawId of run.selectedLawIds) {
      const law = getLawById(lawId);
      if (!law) {
        appendLog(run, `[extract_obligations] Law not found for ID: ${lawId}`);
        continue;
      }

      appendLog(run, `[extract_obligations] Loading real PDF text for ${law.name}`);

      // Load real PDF text
      let lawText: string;
      try {
        lawText = await loadLawText(env, run, lawId, (msg) => appendLog(run, msg));
        appendLog(run, `[extract_obligations] Loaded ${lawText.length} chars from ${law.name}`);
      } catch (error) {
        appendLog(run, `[extract_obligations] Failed to load PDF text: ${error}`);
        lawText = "";
      }

      // Truncate to relevant sections based on keywords and question
      const relevantText = truncateLawText(lawText, 8000);
      appendLog(run, `[extract_obligations] Truncated to ${relevantText.length} chars of relevant content`);

      // Get structured obligations as backup
      const structuredObligations = getObligationsForLaw(lawId);

      // Use LLM to extract obligations from real PDF text
      const extractionPrompt = `You are a legal expert analyzing Chilean law text. Extract the key compliance obligations relevant to the user's question.

Law: ${law.name}

User's question: ${run.question}

Relevant law text:
${relevantText}

Based on the law text above, provide a concise summary (3-5 sentences) of the most important compliance obligations that apply to this user's question. Focus on actionable requirements.

Summary:`;

      let extractedSummary: string;
      try {
        extractedSummary = (await callLlm(env, run, extractionPrompt, (msg) => appendLog(run, msg), 800)).trim();
        appendLog(run, `[extract_obligations] Extracted ${extractedSummary.length} chars from LLM`);
      } catch (error) {
        appendLog(run, `[extract_obligations] LLM failed, using structured template`);
        extractedSummary = "";
      }

      // Use LLM response if good, otherwise use structured template
      const finalSummary = extractedSummary && extractedSummary.length > 100
        ? extractedSummary
        : structuredObligations;

      const obligation: Obligation = {
        id: `${lawId}::1`,
        lawId,
        title: `Key obligations according to ${law.name}`,
        summary: finalSummary,
      };

      obligations.push(obligation);
    }

    run.obligations = obligations;
    appendLog(run, `[extract_obligations] Generated ${obligations.length} obligations from real PDF texts`);
  },
};

/**
 * Step 3: Draft final answer
 * Combines selected laws and extracted obligations into a comprehensive response
 */
export const draftAnswerStep: Step = {
  name: "draft_answer",
  async run(run: Run, _env: Env) {
    appendLog(run, "[draft_answer] Generating final response based on laws and obligations...");

    const lawsText = run.selectedLaws?.length
      ? run.selectedLaws.join("; ")
      : "no laws selected";

    const obligationsText = run.obligations?.length
      ? run.obligations
          .map((obligation) => `- (${obligation.lawId}) ${obligation.title}:\n  ${obligation.summary}`)
          .join("\n\n")
      : "No specific obligations detected (or relevant information could not be extracted).";

    run.draftAnswer = [
      `User question:`,
      run.question,
      "",
      `Laws considered by the agent:`,
      lawsText,
      "",
      `Relevant obligations identified:`,
      obligationsText,
      "",
      `Note: This response does not constitute legal advice and is generated by an AI agent.`,
    ].join("\n");

    appendLog(run, "[draft_answer] Final response generated");
  },
};

/**
 * Pipeline: Ordered sequence of steps
 */
export const PIPELINE: Step[] = [
  selectLawsStep,
  extractObligationsStep,
  draftAnswerStep,
];
