import { Hono } from 'hono'

type Env = {}

interface QuestionRequestBody {
    question: string
}

type RunStatus = 'created';

interface run {
    id: string;
    question: string;
    status: RunStatus;
}

const app = new Hono<{ Bindings: Env }>()

app.get('/', (c) => c.json({ status: 'ok' }))

const validateBody = (body: unknown): boolean => {
    const { question } = body as QuestionRequestBody;
    return (
        typeof question === 'string' &&
        question.trim().length > 0
    );
}


const createRun = (question: string) : run => {
    const uuid = crypto.randomUUID();
    const status:RunStatus = 'created';

    return {
        id: uuid,
        question, 
        status
    }
}

app.post('/question', async (c) => {
    const body = await c.req.json();

    if (!validateBody(body)) {
        return c.json({ error: 'Invalid body' }, 400)
    }

    const { question } = body

    const run = createRun(question)

    console.log(run)

    return c.json({ message: 'Question received', question: body.question })

})

export default app