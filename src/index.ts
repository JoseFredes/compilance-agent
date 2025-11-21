import { Hono } from 'hono'

type Env = {
    RUNS_KV: KVNamespace
}

interface QuestionRequestBody {
    question: string
}

enum RunStatus {
    CREATED = 'created',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed'
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
}

const app = new Hono<{ Bindings: Env }>()


const validateBody = (body: unknown): boolean => {
  if (!body || typeof body !== 'object') return false;
    
  const maybe = body as Partial<QuestionRequestBody>;

  return (
    typeof maybe.question === 'string' &&
    maybe.question.trim().length > 0
  );
}

const nowISO = () => new Date().toISOString();

const createRun = (question: string) : Run => {
    const uuid = crypto.randomUUID();
    const status:RunStatus = RunStatus.CREATED;
    const now = nowISO();

    return {
        id: uuid,
        question, 
        status,
        createdAt: now,
        updatedAt: now,
        logs: []
    };
}

const loadRun = async (env: Env, id: string) : Promise<Run | null> => {
   const data = await env.RUNS_KV.get(id);

   if (!data) return null;
   
   return JSON.parse(data as string) as Run;
}

const saveRun = async(env: Env, run: Run) : Promise<void> => {
    run.updatedAt = nowISO();
    await env.RUNS_KV.put(run.id, JSON.stringify(run));
}

const appendLog = (run: Run, message: string) => {
    const line = `[${nowISO()}] ${message}`;
    run.logs.push(line);
};

const runAgent = async (env: Env, runId: string) : Promise<void> => {
    const run = await loadRun(env, runId);
    if (!run) return;

    try {
        run.status = RunStatus.RUNNING;
        appendLog(run, 'Starting agent...');
        await saveRun(env, run);

        // TODO: Implement agent logic

        // #########################################################

        run.status = RunStatus.COMPLETED;
        appendLog(run, 'Agent completed');
        await saveRun(env, run);
        return;
    } catch (error) {
        run.status = RunStatus.FAILED;
        run.error = error instanceof Error ? error.message : 'Unknown error';
        appendLog(run, `Agent failed: ${run.error}`);
        await saveRun(env, run);
        throw error;
    }
}



app.get('/', (c) => c.json({ status: 'ok' }))


app.post('/question', async (c) => {
    const body = await c.req.json();

    if (!validateBody(body)) {
        return c.json({ error: 'Invalid body' }, 400)
    }

    const { question } = body

    const run = createRun(question)

    await saveRun(c.env, run);

    c.executionCtx.waitUntil(runAgent(c.env, run.id));

    console.log(run)

    return c.json(
        {
          message: 'Run created and agent started',
          runId: run.id,
          status: run.status,
        },
        202,
      );
})

app.get('/run/:id', async (c) => {
    const id = c.req.param('id');
    console.log(`[GET /run/${id}] Id received:`, id);
  
    if (!id) {
      return c.json({ message: 'Invalid ID' }, 400);
    }
  
    const run = await loadRun(c.env, id);
    console.log(`[GET /run/${id}] Run from storage:`, run);
  
    if (!run) {
      console.log(`[GET /run/${id}] Run not found for ID:`, id);
      return c.json({ message: 'Run not found' }, 404);
    }
  
    return c.json(run);
});

app.get('/runs', async (c) => {
    const runs = await c.env.RUNS_KV.list();
    return c.json(runs);
})

export default app