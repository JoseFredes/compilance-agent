import { Hono } from 'hono'

type Env = {
    RUNS_KV: KVNamespace
}

interface QuestionRequestBody {
    question: string
}

type RunStatus = 'created';

interface Run {
    id: string;
    question: string;
    status: RunStatus;
}

const app = new Hono<{ Bindings: Env }>()


const validateBody = (body: unknown): boolean => {
    const { question } = body as QuestionRequestBody;
    return (
        typeof question === 'string' &&
        question.trim().length > 0
    );
}


const createRun = (question: string) : Run => {
    const uuid = crypto.randomUUID();
    const status:RunStatus = 'created';

    return {
        id: uuid,
        question, 
        status
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

    await c.env.RUNS_KV.put(run.id, JSON.stringify(run));

    console.log(run)

    return c.json({ message: 'Question received', question: body.question })
})

app.get('/run/:id', async (c) => {
    const id = c.req.param("id");
    
    const run = await c.env.RUNS_KV.get(id);

    if (!run) {
        return c.json({ message: 'Run not found' }, 404);
    }
    
    return c.json(JSON.parse(run as string));
})

app.get('/runs', async (c) => {
    const runs = await c.env.RUNS_KV.get('runs');
    if (!runs) {
        return c.json({ message: 'No runs found' }, 404);
    } 
       
    return c.json(JSON.parse(runs as string));
    
})

export default app