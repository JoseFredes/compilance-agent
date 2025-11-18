import { Hono } from 'hono'

type Env = {}

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

// create temporal runs in memory
const runs: Map<string, Run> = new Map();

app.get('/', (c) => c.json({ status: 'ok' }))


app.post('/question', async (c) => {
    const body = await c.req.json();

    if (!validateBody(body)) {
        return c.json({ error: 'Invalid body' }, 400)
    }

    const { question } = body

    const run = createRun(question)

    runs.set(run.id, run);

    console.log(run)

    return c.json({ message: 'Question received', question: body.question })
})

app.get('/run/:id', async (c) => {
    const { id } = c.req.param();

    const run = runs.get(id);

    if (!run) {
        return c.json({ message: 'Run not found' }, 404);
    }

    return c.json(run);
})

export default app