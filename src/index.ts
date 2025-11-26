import { Hono } from "hono";

type Env = {
  RUNS_KV: KVNamespace;
  AI: Ai;
};

interface QuestionRequestBody {
  question: string;
}

enum RunStatus {
  CREATED = "created",
  RUNNING = "running",
  COMPLETED = "completed",
  FAILED = "failed",
}

interface ToolMetric {
  name: string;
  calls: number;
  totalMs: number;
}

interface Run {
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

interface Step {
  name: string;
  run: (run: Run, env: Env) => Promise<void>;
}

interface LawDoc {
  id: string;
  name: string;
  url: string;
}

interface Obligation {
  id: string;
  lawId: string;
  title: string;
  summary: string;
}

const LAW_DOCS: LawDoc[] = [
  {
    id: "LEY_19886",
    name: "Ley 19.886 (Compras Públicas)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19886.pdf",
  },
  {
    id: "LEY_19496",
    name: "Ley 19.496 (Protección de los consumidores)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19496.pdf",
  },
  {
    id: "LEY_20393",
    name: "Ley 20.393 (Responsabilidad penal de personas jurídicas)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-20393.pdf",
  },
  {
    id: "LEY_19913",
    name: "Ley 19.913 (UAF; sujetos obligados y reportes)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-19913.pdf",
  },
  {
    id: "LEY_21521",
    name: "Ley 21.521 (Fintec)",
    url: "https://pub-0e0e9ca0d502436bbf25ba03d6046c82.r2.dev/Ley-21521.pdf",
  },
];

const LAW_TEXT_SAMPLES: Record<string, string> = {
  LEY_21521: `
  La Ley 21.521 (Ley Fintec) regula a los Proveedores de Servicios Financieros (PSF) y crea un marco general para el uso de plataformas tecnológicas en servicios financieros.
  
  Entre otras materias, establece obligaciones en torno a:
  - Gobierno corporativo y gestión de riesgos.
  - Requisitos de transparencia y entrega de información a clientes.
  - Protección de datos personales y seguridad de la información.
  - Coordinación con la CMF y otras autoridades.
  
  En materia de datos personales, la ley exige que los PSF adopten medidas razonables para proteger la confidencialidad, integridad y disponibilidad de la información de los clientes, así como respetar los principios de finalidad, proporcionalidad y seguridad en el tratamiento de datos.
  `,

  LEY_19496: `
  La Ley 19.496 sobre Protección de los Derechos de los Consumidores regula la relación entre proveedores y consumidores, incluyendo el deber de información veraz y oportuna, la responsabilidad por daños y la prohibición de cláusulas abusivas.
  
  En relación con la información de los consumidores, el proveedor debe:
  - Entregar información veraz, suficiente y fácilmente accesible.
  - Proteger los datos personales y no utilizarlos para finalidades distintas a las informadas.
  - Implementar mecanismos para que el consumidor pueda ejercer sus derechos de información, rectificación, cancelación u oposición, según corresponda.
  
  La infracción de estas obligaciones puede dar lugar a sanciones administrativas y acciones de indemnización de perjuicios.
  `,

  LEY_20393: `
  La Ley 20.393 establece la responsabilidad penal de las personas jurídicas en Chile, por determinados delitos como lavado de activos, financiamiento del terrorismo, cohecho y otros.
  
  Para efectos de cumplimiento, la ley:
  - Exige la adopción e implementación efectiva de modelos de prevención de delitos.
  - Define la necesidad de políticas, procedimientos y controles internos.
  - Establece la figura del encargado de prevención de delitos.
  
  Cuando el modelo de prevención considera el tratamiento de datos personales (por ejemplo, en monitoreo de operaciones, debida diligencia u otros factores de riesgo), la entidad debe respetar la normativa aplicable en materia de protección de datos, garantizando confidencialidad, integridad y acceso restringido.
  `,

  LEY_19886: `
  La Ley 19.886 regula las bases sobre contratos administrativos de suministro y prestación de servicios, estableciendo el marco de compras públicas en Chile.
  
  Dentro de este contexto, pueden manejarse datos personales de oferentes, contratistas y funcionarios, por lo que las entidades deben observar las normas de protección de datos, limitando el uso de la información a los fines asociados a la contratación pública.
  `,

  LEY_19913: `
  La Ley 19.913 crea la Unidad de Análisis Financiero (UAF) y establece obligaciones de reporte para sujetos obligados en materia de lavado de activos y financiamiento del terrorismo.
  
  El tratamiento de datos personales en este contexto se vincula a:
  - Reporte de operaciones sospechosas.
  - Conservación de antecedentes.
  - Intercambio de información con autoridades competentes.
  
  Dicho tratamiento debe armonizarse con los principios de necesidad, proporcionalidad y seguridad de la información.
  `,
};

const LAW_TEXT_PREFIX = "law_text:";

const app = new Hono<{ Bindings: Env }>();

const recordToolMetric = (run: Run, name: string, ms: number) => {
  if (!run.tools) {
    run.tools = [];
  }

  const existing = run.tools.find((t) => t.name === name);
  if (!existing) {
    run.tools.push({ name, calls: 1, totalMs: ms });
  } else {
    existing.calls += 1;
    existing.totalMs += ms;
  }
};

const measureTool = async <T>(
  run: Run,
  name: string,
  fn: () => Promise<T>
): Promise<T> => {
  const start = Date.now();
  const result = await fn();
  const ms = Date.now() - start;

  recordToolMetric(run, name, ms);
  appendLog(run, `[metrics] Tool "${name}" took ${ms}ms`);

  return result;
};

const callLlm = async (env: Env, run: Run, prompt: string): Promise<string> => {
  return measureTool(run, "llm", async () => {
    if (!env.AI) {
      appendLog(
        run,
        "[llm] No env.AI binding found, returning dummy LLM response."
      );
      return `Respuesta dummy de LLM basada en el prompt:\n---\n${prompt.slice(
        0,
        400
      )}...`;
    }

    const model = "@cf/meta/llama-3-8b-instruct";

    const response = await env.AI.run(model, {
      prompt,
      max_tokens: 300,
    } as any);

    if (typeof response === "string") {
      return response;
    }

    if (response && typeof response === "object" && "response" in response) {
      return (response as any).response as string;
    }

    return JSON.stringify(response);
  });
};

const getLawById = (id: string): LawDoc | undefined => {
  return LAW_DOCS.find((l) => l.id === id);
};

const loadLawText = async (
  env: Env,
  run: Run,
  lawId: string
): Promise<string> => {
  return measureTool(run, "loadLawText", async () => {
    const cacheKey = `${LAW_TEXT_PREFIX}${lawId}`;

    const cached = await env.RUNS_KV.get(cacheKey);
    if (cached) {
      return cached;
    }

    const law = getLawById(lawId);
    if (!law) {
      throw new Error(`Law not found for id: ${lawId}`);
    }

    const sample = LAW_TEXT_SAMPLES[lawId];
    const text = sample
      ? sample.trim()
      : `Texto no disponible para ${law.name}. URL: ${law.url}`;

    await env.RUNS_KV.put(cacheKey, text);

    return text;
  });
};

const extractObligationsStep: Step = {
  name: "extract_obligations",
  async run(run: Run, env: Env) {
    appendLog(
      run,
      "[extract_obligations] Extrayendo obligaciones (con IA dummy/real)..."
    );

    if (!run.selectedLawIds || run.selectedLawIds.length === 0) {
      appendLog(
        run,
        "[extract_obligations] No hay leyes seleccionadas, nada que extraer."
      );
      run.obligations = [];
      return;
    }

    const obligations: Obligation[] = [];

    for (const lawId of run.selectedLawIds) {
      const law = getLawById(lawId);
      if (!law) {
        appendLog(
          run,
          `[extract_obligations] Ley no encontrada para id: ${lawId}`
        );
        continue;
      }

      const lawText = await loadLawText(env, run, lawId);
      appendLog(
        run,
        `[extract_obligations] Texto cargado para ${law.name} (longitud: ${lawText.length}).`
      );

      const prompt = [
        "Eres un asistente de cumplimiento normativo en Chile.",
        "Dado el siguiente extracto de una ley y la pregunta del usuario,",
        "resume en 2-3 frases, en español claro, las principales obligaciones",
        "que tendría una empresa como la descrita por el usuario,",
        "en relación con protección de datos o cumplimiento en general.",
        "",
        `Ley: ${law.name}`,
        "",
        "Extracto de la ley:",
        lawText,
        "",
        "Pregunta del usuario:",
        run.question,
        "",
        "Respuesta (solo el resumen de obligaciones, sin preámbulos):",
      ].join("\n");

      const llmSummary = (await callLlm(env, run, prompt)).trim();

      const obligation: Obligation = {
        id: `${lawId}::1`,
        lawId,
        title: `Obligaciones clave según ${law.name}`,
        summary: llmSummary,
      };

      obligations.push(obligation);
    }

    run.obligations = obligations;

    appendLog(
      run,
      `[extract_obligations] Obligaciones generadas: ${obligations.length}.`
    );
  },
};

const pickLawsForQuestion = (question: string): LawDoc[] => {
  const q = question.toLowerCase();

  const picked: LawDoc[] = [];

  if (q.includes("fintec") || q.includes("fintech")) {
    picked.push(LAW_DOCS.find((l) => l.id === "LEY_21521")!);
  }

  if (q.includes("consumidor") || q.includes("consumidores")) {
    picked.push(LAW_DOCS.find((l) => l.id === "LEY_19496")!);
  }

  if (
    q.includes("personas jurídicas") ||
    q.includes("persona jurídica") ||
    q.includes("responsabilidad penal")
  ) {
    picked.push(LAW_DOCS.find((l) => l.id === "LEY_20393")!);
  }

  if (picked.length === 0) {
    picked.push(LAW_DOCS.find((l) => l.id === "LEY_19496")!);
  }

  const unique = new Map(picked.map((doc) => [doc.id, doc]));
  return Array.from(unique.values());
};

const validateBody = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;

  const maybe = body as Partial<QuestionRequestBody>;

  return typeof maybe.question === "string" && maybe.question.trim().length > 0;
};

const nowISO = () => new Date().toISOString();

const createRun = (question: string): Run => {
  const uuid = crypto.randomUUID();
  const status: RunStatus = RunStatus.CREATED;
  const now = nowISO();

  return {
    id: uuid,
    question,
    status,
    createdAt: now,
    updatedAt: now,
    logs: [],
  };
};

const loadRun = async (env: Env, id: string): Promise<Run | null> => {
  const data = await env.RUNS_KV.get(id);

  if (!data) return null;

  return JSON.parse(data as string) as Run;
};

const saveRun = async (env: Env, run: Run): Promise<void> => {
  run.updatedAt = nowISO();
  await env.RUNS_KV.put(run.id, JSON.stringify(run));
};

const appendLog = (run: Run, message: string) => {
  const line = `[${nowISO()}] ${message}`;
  run.logs.push(line);
};

const selectLawsStep: Step = {
  name: "select_laws",
  async run(run: Run, env: Env) {
    appendLog(
      run,
      "[select_laws] Seleccionando leyes relevantes según la pregunta..."
    );

    const picked = pickLawsForQuestion(run.question);

    run.selectedLawIds = picked.map((l) => l.id);
    run.selectedLaws = picked.map((l) => l.name);

    appendLog(
      run,
      `[select_laws] Leyes seleccionadas: ${run.selectedLaws.join(", ")}`
    );
  },
};

const draftAnswerStep: Step = {
  name: "draft_answer",
  async run(run: Run, env: Env) {
    appendLog(
      run,
      "[draft_answer] Generando respuesta en base a leyes y obligaciones extraídas..."
    );
    const lawsText = run.selectedLaws?.length
      ? run.selectedLaws.join("; ")
      : "sin leyes seleccionadas aún";
    const obligationsText = run.obligations?.length
      ? run.obligations
          .map((o) => `- (${o.lawId}) ${o.title}:\n  ${o.summary}`)
          .join("\n\n")
      : "No se detectaron obligaciones específicas (o no se pudo extraer información relevante).";
    run.draftAnswer = [
      `Pregunta del usuario:`,
      run.question,
      "",
      `Leyes consideradas por el agente:`,
      lawsText,
      "",
      `Obligaciones relevantes identificadas:`,
      obligationsText,
      "",
      `Nota: Esta respuesta no constituye asesoría legal y es generada por un agente AI.`,
    ].join("\n");
    appendLog(run, "[draft_answer] Respuesta final generada.");
  },
};

const pipeline: Step[] = [
  selectLawsStep,
  extractObligationsStep,
  draftAnswerStep,
];

const runAgent = async (env: Env, runId: string): Promise<void> => {
  const run = await loadRun(env, runId);
  if (!run) return;
  const startTotal = Date.now();
  try {
    run.status = RunStatus.RUNNING;
    run.startedAt = nowISO();
    appendLog(run, "Starting agent...");
    await saveRun(env, run);
    for (const step of pipeline) {
      appendLog(run, `[pipeline] Iniciando step: ${step.name}`);
      await saveRun(env, run);
      await step.run(run, env);
      appendLog(run, `[pipeline] Step completado: ${step.name}`);
      await saveRun(env, run);
    }
    run.status = RunStatus.COMPLETED;
    run.completedAt = nowISO();
    run.totalMs = Date.now() - startTotal;
    appendLog(run, `Agent completed en ${run.totalMs}ms`);
    await saveRun(env, run);
    return;
  } catch (error) {
    run.status = RunStatus.FAILED;
    run.error = error instanceof Error ? error.message : "Unknown error";
    appendLog(run, `Agent failed: ${run.error}`);
    run.totalMs = Date.now() - startTotal;
    await saveRun(env, run);
    throw error;
  }
};

app.get("/", (c) => c.json({ status: "ok" }));

app.post("/question", async (c) => {
  const body = await c.req.json();

  if (!validateBody(body)) {
    return c.json({ error: "Invalid body" }, 400);
  }

  const { question } = body;

  const run = createRun(question);

  await saveRun(c.env, run);

  c.executionCtx.waitUntil(runAgent(c.env, run.id));

  console.log(run);

  return c.json(
    {
      message: "Run created and agent started",
      runId: run.id,
      status: run.status,
    },
    202
  );
});

app.get("/run/:id", async (c) => {
  const id = c.req.param("id");
  console.log(`[GET /run/${id}] Id received:`, id);

  if (!id) {
    return c.json({ message: "Invalid ID" }, 400);
  }

  const run = await loadRun(c.env, id);
  console.log(`[GET /run/${id}] Run from storage:`, run);

  if (!run) {
    console.log(`[GET /run/${id}] Run not found for ID:`, id);
    return c.json({ message: "Run not found" }, 404);
  }

  return c.json(run);
});

app.get("/runs", async (c) => {
  const runs = await c.env.RUNS_KV.list();
  return c.json(runs);
});

app.get("/answer/:id", async (c) => {
  const id = c.req.param("id");
  if (!id) return c.json({ error: "Invalid ID" }, 400);
  const run = await loadRun(c.env, id);
  if (!run) return c.json({ error: "Run not found" }, 404);
  return c.json({
    runId: run.id,
    status: run.status,
    question: run.question,
    answer: run.draftAnswer,
    obligations: run.obligations ?? [],
    laws: (run.selectedLawIds ?? []).map((lawId) => getLawById(lawId)),
    metrics: { totalMs: run.totalMs ?? null, tools: run.tools ?? [] },
  });
});

export default app;
