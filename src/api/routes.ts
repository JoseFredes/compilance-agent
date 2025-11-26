/**
 * API route handlers
 */

import { Hono } from "hono";
import type { Env } from "../types";
import { createRun, loadRun, saveRun } from "../services/run-manager";
import { executeAgent } from "../agent/executor";
import { validateQuestionRequest } from "./validators";
import { getLawById } from "../config/laws";

const app = new Hono<{ Bindings: Env }>();

/**
 * Health check endpoint
 */
app.get("/", (c) => c.json({ status: "ok" }));

/**
 * Create a new question/run and start agent execution
 */
app.post("/question", async (c) => {
  try {
    const body = await c.req.json();

    // Validate request
    const validation = validateQuestionRequest(body);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }

    const { question } = validation.data;

    // Create new run
    const run = createRun(question);
    await saveRun(c.env, run);

    // Execute agent asynchronously
    c.executionCtx.waitUntil(executeAgent(c.env, run.id));

    console.log(`[POST /question] Created run: ${run.id}`);

    return c.json(
      {
        message: "Run created and agent started",
        runId: run.id,
        status: run.status,
      },
      202
    );
  } catch (error) {
    console.error("[POST /question] Error:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Get run details including logs and status
 */
app.get("/run/:id", async (c) => {
  try {
    const runId = c.req.param("id");
    console.log(`[GET /run/${runId}] Fetching run details`);

    if (!runId) {
      return c.json({ error: "Invalid ID" }, 400);
    }

    const run = await loadRun(c.env, runId);

    if (!run) {
      console.log(`[GET /run/${runId}] Run not found`);
      return c.json({ error: "Run not found" }, 404);
    }

    return c.json(run);
  } catch (error) {
    console.error("[GET /run/:id] Error:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * Get final answer in simplified format
 */
app.get("/answer/:id", async (c) => {
  try {
    const runId = c.req.param("id");
    if (!runId) {
      return c.json({ error: "Invalid ID" }, 400);
    }

    const run = await loadRun(c.env, runId);
    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    return c.json({
      runId: run.id,
      status: run.status,
      question: run.question,
      answer: run.draftAnswer ?? null,
      obligations: run.obligations ?? [],
      laws: (run.selectedLawIds ?? []).map((lawId) => getLawById(lawId)),
      metrics: {
        totalMs: run.totalMs ?? null,
        tools: run.tools ?? [],
      },
    });
  } catch (error) {
    console.error("[GET /answer/:id] Error:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * List all runs (useful for debugging)
 */
app.get("/runs", async (c) => {
  try {
    const runs = await c.env.RUNS_KV.list();
    return c.json(runs);
  } catch (error) {
    console.error("[GET /runs] Error:", error);
    return c.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export default app;
