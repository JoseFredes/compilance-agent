# Compliance Q&A Agent

An AI agent that answers questions about regulatory compliance in Chile, analyzing real law texts to extract obligations related to personal data protection, AML, consumer protection, and corporate criminal liability.

## Table of Contents

- [Architecture](#architecture)
- [Design Decisions](#design-decisions)
- [Installation and Setup](#installation-and-setup)
- [How to Use](#how-to-use)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Trade-offs and Limitations](#trade-offs-and-limitations)
- [Next Steps](#next-steps)

---

## Architecture

### Overview

The system implements an **asynchronous agent** that processes legal compliance questions following a modular pipeline:

```
Usuario → POST /question → Crear Run → Ejecutar Agent (async) → Guardar resultados en KV
                                                ↓
                                         Pipeline Steps:
                                         1. Select Laws
                                         2. Extract Obligations
                                         3. Draft Answer
```

### Componentes Principales

#### 1. **API HTTP (Hono + Cloudflare Workers)**
- Framework ligero y rápido compatible con Workers
- Endpoints REST para interacción con el agente
- Ejecución asíncrona con `waitUntil` para runs largos

#### 2. **KV Storage**
- Persistencia de runs y estado del agente
- Cache de textos de leyes
- Permite consultar estado incluso si la conexión HTTP se cae

#### 3. **Agent Pipeline**
Arquitectura modular basada en **Steps**:

```typescript
interface Step {
  name: string;
  run: (run: Run, env: Env) => Promise<void>;
}
```

**Steps implementados:**
- `selectLawsStep`: Usa LLM para seleccionar leyes relevantes basado en la pregunta
- `extractObligationsStep`: Carga PDFs reales, trunca a secciones relevantes, y extrae obligations con LLM
- `draftAnswerStep`: Genera respuesta final consolidada

#### 4. **Real PDF Text Processing**
Sistema híbrido para analizar textos reales de las leyes:

```typescript
// 1. Load real PDF text (760KB total, cached in KV)
const lawText = await loadLawText(env, run, lawId);

// 2. Truncate to relevant sections (~8K chars)
const relevantText = truncateLawText(lawText, 8000);

// 3. LLM analyzes real text
const obligations = await extractFromText(relevantText, question);

// 4. Structured fallback if LLM fails
const finalObligations = obligations || getStructuredObligations(lawId);
```

**Leyes disponibles:**
- LEY_21521: Fintech (156K chars)
- LEY_19913: AML / Financial Intelligence Unit (64K chars)
- LEY_19496: Consumer Protection
- LEY_20393: Corporate Criminal Liability
- LEY_19886: Public Procurement

#### 5. **LLM Integration (Cloudflare Workers AI)**
- Modelo: `@cf/meta/llama-3-8b-instruct`
- Configuración: max_tokens=1500 (aumentado para respuestas completas)
- Tracking de métricas: latencia, número de llamadas

#### 6. **Validación (Zod)**
- Validación runtime con Zod schemas
- Type-safe validation con TypeScript
- Mensajes de error descriptivos

---

## Decisiones de Diseño

### 1. **¿Por qué Cloudflare Workers?**
- **Costo**: Free tier generoso (100k requests/día, 10ms CPU time por request)
- **Workers AI**: Modelos LLM sin costo adicional en el free tier
- **KV Storage**: Persistencia simple y escalable
- **Edge Computing**: Baja latencia global
- **Simplicidad**: No requiere gestión de infraestructura

### 2. **¿Por qué Ejecución Asíncrona?**
```typescript
c.executionCtx.waitUntil(runAgent(c.env, run.id));
```

**Razones:**
- Algunos runs pueden tomar minutos (análisis de múltiples leyes)
- El usuario no debe esperar bloqueado
- Permite polling o reconexión sin perder el progreso
- Modelo escalable para procesamiento batch

**Flujo:**
1. User hace POST /question
2. API retorna 202 Accepted con `runId`
3. Agent ejecuta en background
4. User consulta GET /run/:id para ver progreso
5. User obtiene respuesta final en GET /answer/:id

### 3. **¿Por qué Pipeline de Steps vs Single Agent?**

**Ventajas del Pipeline:**
- ✅ **Observabilidad**: Cada step genera logs independientes
- ✅ **Composabilidad**: Steps se pueden reordenar, agregar o remover
- ✅ **Testing**: Fácil testear steps individualmente
- ✅ **Debugging**: Logs detallados de cada etapa
- ✅ **Extensibilidad**: Agregar nuevos steps sin modificar lógica existente

**vs Single Agent Loop:**
- ❌ Más difícil de debuggear (caja negra)
- ❌ Menos predecible
- ❌ Difícil medir progreso

### 4. **¿Por qué LLM para Selección de Leyes?**

**Approach original (keywords):**
```typescript
if (q.includes("consumidor")) {
  picked.push(LEY_19496);
}
```

**Problemas:**
- No captura sinónimos o conceptos relacionados
- Requiere mantener keywords manualmente
- No funciona bien con preguntas complejas

**Approach con LLM:**
```typescript
const selectionPrompt = `
  Dada la siguiente pregunta, selecciona las leyes relevantes:
  [lista de leyes]

  Pregunta: ${question}

  IDs relevantes:
`;
```

**Ventajas:**
- ✅ Comprende contexto y sinónimos
- ✅ Puede razonar sobre múltiples criterios
- ✅ Se adapta a preguntas variadas sin cambiar código

**Fallback:** Si LLM no retorna IDs válidos, usa keyword-based approach.

### 5. **¿Por qué PDFs Reales + Structured Fallback?**

**Approach híbrido:**
Usamos los textos completos de los PDFs (760KB total) pero con sistema de fallback:

```typescript
// 1. Load real PDF (cached in KV)
const lawText = await loadLawText(env, run, lawId);

// 2. Truncate to relevant sections
const relevantText = truncateLawText(lawText, 8000);

// 3. LLM extracts from real text
const extracted = await llm.analyze(relevantText, question);

// 4. Fallback to structured template if LLM fails
return extracted || getStructuredObligations(lawId);
```

**Ventajas:**
- ✅ Usa texto real de las leyes (más preciso)
- ✅ Trunca inteligentemente basado en keywords
- ✅ Fallback estructurado si LLM falla o timeout
- ✅ Cache en KV para performance

**Trade-off:** Bundle size de 1.3MB pero mejor calidad de respuestas.

### 6. **¿Por qué Zod para Validación?**

**Beneficios:**
- ✅ Validación runtime + type safety
- ✅ Mensajes de error claros y descriptivos
- ✅ TypeScript inference automática
- ✅ Composable y reusable

**Ejemplo:**
```typescript
const QuestionRequestSchema = z.object({
  question: z.string().min(10).max(2000),
});

// Type inferred automatically
type QuestionRequest = z.infer<typeof QuestionRequestSchema>;
```

### 7. **Metrics & Observability**

**Tracking implementado:**
```typescript
interface ToolMetric {
  name: string;
  calls: number;
  totalMs: number;
}
```

**¿Por qué?**
- Identificar bottlenecks (ej: LLM calls lentos)
- Optimizar flujo del agente
- Debug de issues de performance

**Logs detallados:**
```typescript
appendLog(run, `[${step}] Mensaje con timestamp`);
```

---

## Instalación y Configuración

### Prerequisitos

- [Bun](https://bun.sh) >= 1.3.2 (o Node.js >= 18)
- Cuenta de Cloudflare (free tier funciona)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Paso 1: Instalar Dependencias

```bash
bun install
```

### Paso 2: Configurar Cloudflare

1. **Login a Cloudflare:**
```bash
npx wrangler login
```

2. **Crear KV Namespace:**
```bash
npx wrangler kv:namespace create "RUNS_KV"
```

Copia el `id` generado y actualiza `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "RUNS_KV"
id = "tu-kv-namespace-id-aqui"  # Reemplaza con el ID generado
```

3. **Verificar AI Binding:**

El binding de AI ya está configurado en `wrangler.toml`:
```toml
[ai]
binding = "AI"
```

No requiere configuración adicional en free tier.

### Paso 3: Desarrollo Local

```bash
npm run dev
```

Esto inicia el servidor en `http://127.0.0.1:8787`

### Paso 4 (Opcional): Deploy a Producción

```bash
npm run deploy
```

---

## Cómo Usar

### Opción 1: cURL (Recomendado para Testing)

#### 1. Crear una consulta

```bash
curl -sS -X POST http://127.0.0.1:8787/question \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "Si tengo una empresa de software medioambiental para salmoneras, en el sur de chile, que sugerencias tienes de como puedo cumplir con la ley de protección de datos personales?"
  }'
```

**Respuesta esperada:**
```json
{
  "message": "Run created and agent started",
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "created"
}
```

#### 2. Consultar estado del run

```bash
curl -sS http://127.0.0.1:8787/run/550e8400-e29b-41d4-a716-446655440000
```

**Respuesta:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",  // o "completed"
  "question": "...",
  "logs": [
    "[2025-01-15T10:30:00Z] Starting agent...",
    "[2025-01-15T10:30:01Z] [select_laws] Seleccionando leyes...",
    "..."
  ],
  "selectedLaws": ["Ley 19.496", "Ley 21.521"],
  ...
}
```

#### 3. Obtener respuesta final

```bash
curl -sS http://127.0.0.1:8787/answer/550e8400-e29b-41d4-a716-446655440000
```

**Respuesta:**
```json
{
  "runId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "question": "Si tengo una empresa...",
  "answer": "Pregunta del usuario:\nSi tengo una empresa...\n\nLeyes consideradas por el agente:\nLey 19.496 (Protección de los consumidores); Ley 21.521 (Fintec)\n\nObligaciones relevantes identificadas:\n- (LEY_19496) Obligaciones clave según Ley 19.496:\n  Debe implementar medidas de seguridad apropiadas...\n...",
  "obligations": [...],
  "laws": [...],
  "metrics": {
    "totalMs": 3450,
    "tools": [
      { "name": "llm", "calls": 3, "totalMs": 2800 },
      { "name": "loadLawText", "calls": 2, "totalMs": 450 }
    ]
  }
}
```

#### 4. Listar todos los runs

```bash
curl -sS http://127.0.0.1:8787/runs
```

### Opción 2: Navegador / Postman

Importa esta colección a Postman:

**Base URL:** `http://127.0.0.1:8787`

| Método | Endpoint | Body |
|--------|----------|------|
| POST | `/question` | `{"question": "Tu pregunta aquí"}` |
| GET | `/run/:id` | - |
| GET | `/answer/:id` | - |
| GET | `/runs` | - |

---

## Endpoints de la API

### `GET /`

Health check.

**Response:**
```json
{ "status": "ok" }
```

---

### `POST /question`

Crea un nuevo run y ejecuta el agente asíncronamente.

**Request:**
```json
{
  "question": "string (10-2000 chars)"
}
```

**Response:** `202 Accepted`
```json
{
  "message": "Run created and agent started",
  "runId": "uuid",
  "status": "created"
}
```

**Validación:**
- `question` es requerido
- Mínimo 10 caracteres
- Máximo 2000 caracteres

**Errors:**
- `400`: Invalid body (con detalles de validación)
- `500`: Internal server error

---

### `GET /run/:id`

Obtiene el estado completo de un run, incluyendo logs.

**Response:**
```json
{
  "id": "uuid",
  "question": "string",
  "status": "created | running | completed | failed",
  "createdAt": "ISO datetime",
  "updatedAt": "ISO datetime",
  "startedAt": "ISO datetime",
  "completedAt": "ISO datetime",
  "error": "string (if failed)",
  "logs": ["array of log messages"],
  "selectedLawIds": ["LEY_ID"],
  "selectedLaws": ["Law Name"],
  "draftAnswer": "string",
  "obligations": [
    {
      "id": "string",
      "lawId": "string",
      "title": "string",
      "summary": "string"
    }
  ],
  "tools": [
    {
      "name": "string",
      "calls": number,
      "totalMs": number
    }
  ],
  "totalMs": number
}
```

**Errors:**
- `400`: Invalid ID
- `404`: Run not found

---

### `GET /answer/:id`

Obtiene la respuesta final en formato simplificado.

**Response:**
```json
{
  "runId": "uuid",
  "status": "string",
  "question": "string",
  "answer": "string | null",
  "obligations": [...],
  "laws": [
    {
      "id": "string",
      "name": "string",
      "url": "string"
    }
  ],
  "metrics": {
    "totalMs": number | null,
    "tools": [...]
  }
}
```

**Errors:**
- `400`: Invalid ID
- `404`: Run not found

---

### `GET /runs`

Lista todos los runs (útil para debugging).

**Response:**
```json
{
  "keys": [
    { "name": "run-id-1" },
    { "name": "run-id-2" }
  ]
}
```

---

## Project Structure

```
compilance-agent/
├── src/
│   ├── index.ts                    # Main entry point (exports Hono app)
│   ├── api/
│   │   ├── routes.ts              # API endpoint handlers
│   │   └── validators.ts          # Request validation logic
│   ├── agent/
│   │   └── executor.ts            # Agent pipeline orchestration
│   ├── pipeline/
│   │   └── steps.ts               # Modular pipeline steps
│   ├── services/
│   │   ├── llm.ts                 # LLM service
│   │   ├── law-loader.ts          # Law text loading + caching
│   │   └── run-manager.ts         # Run persistence and lifecycle
│   ├── utils/
│   │   ├── metrics.ts             # Metrics tracking utilities
│   │   └── text-processor.ts     # Text truncation utilities
│   ├── config/
│   │   ├── laws.ts                # Law metadata (5 Chilean laws)
│   │   ├── constants.ts           # Application constants
│   │   └── law-obligations.ts    # Structured obligation templates
│   ├── data/
│   │   └── law-samples.ts         # Fallback law samples
│   ├── schemas.ts                 # Zod validation schemas
│   ├── types.ts                   # Shared TypeScript types
│   └── law_text_ingested.ts      # Real law texts from PDFs (760KB)
├── scripts/
│   └── ingest-with-unpdf.mjs      # PDF ingestion script
├── wrangler.toml                   # Cloudflare Workers config
├── package.json
├── tsconfig.json
├── README.md
└── DEPLOYMENT.md
```

### Key Files

- **`src/index.ts`**: Main entry point that exports the Hono application

- **`src/api/routes.ts`**: API endpoint handlers for the REST API

- **`src/agent/executor.ts`**: Agent pipeline orchestration and execution logic

- **`src/pipeline/steps.ts`**: Pipeline modular con 3 steps:
  - `selectLawsStep`: Selecciona leyes relevantes con LLM + keyword fallback
  - `extractObligationsStep`: Carga PDF real → trunca → extrae con LLM → fallback estructurado
  - `draftAnswerStep`: Genera respuesta final formateada

- **`src/services/`**: Servicios core:
  - `llm.ts`: Wrapper de Cloudflare Workers AI con métricas
  - `law-loader.ts`: Carga textos de PDFs con cache en KV
  - `run-manager.ts`: Lifecycle y persistencia de runs

- **`src/config/`**: Configuración:
  - `laws.ts`: Metadata de 5 leyes chilenas (LEY_DOCUMENTS)
  - `constants.ts`: Constantes (LLM config, límites de texto, keywords)
  - `law-obligations.ts`: Templates estructurados de obligations (fallback)

- **`src/utils/`**: Utilidades:
  - `metrics.ts`: Sistema de tracking de performance (tool calls, latencias)
  - `text-processor.ts`: Truncamiento inteligente basado en keywords

- **`src/law_text_ingested.ts`**: Textos completos extraídos de PDFs (760KB)

- **`src/schemas.ts`**: Schemas de validación Zod con type inference

- **`src/types.ts`**: Tipos compartidos (Run, Step, Obligation, LawDoc, Env, etc.)

---

## Trade-offs y Limitaciones

### Limitaciones Actuales

1. **Bundle Size**
   - 1.3MB debido a PDFs ingested (760KB de texto)
   - Trade-off aceptable: mejor precisión vs tamaño
   - Cache en KV reduce impacto en performance

2. **LLM = Llama 3 8B**
   - Modelo más pequeño (gratuito)
   - Puede dar respuestas menos precisas que GPT-4 o Claude
   - **Trade-off:** Costo $0 vs mayor precisión

3. **Búsqueda en Leyes = Naive**
   - Actualmente usa búsqueda por substring
   - **Mejor approach:** Vector embeddings + semantic search
   - **Trade-off:** Simplicidad vs precisión

4. **Sin Streaming de Respuesta**
   - El usuario debe hacer polling
   - **Mejor UX:** SSE (Server-Sent Events) o WebSockets
   - **Trade-off:** Workers tiene limitaciones para long-lived connections

5. **Validación Limitada**
   - No valida contenido semántico de la pregunta
   - **Mejora:** Detectar preguntas fuera de scope

### Decisiones Técnicas

| Decisión | Razón | Trade-off |
|----------|-------|-----------|
| Cloudflare Workers | Free tier, AI incluido, edge computing | Limitaciones de CPU time (10ms), no streaming |
| Hono | Ligero, compatible con Workers | Menos features que Express |
| KV Storage | Simple, escalable, persistente | No relacional, no queries complejos |
| Pipeline Steps | Modular, observable, extensible | Más código vs single agent |
| LLM selection | Mejor que keywords, adaptable | Más lento, consume tokens |
| Zod | Type-safe, mensajes claros | Runtime overhead (mínimo) |

---

## Próximos Pasos

### Mejoras de Funcionalidad

- [x] ~~**Ingesta real de PDFs**~~: ✅ Implementado con unpdf
- [ ] **Vector Search**: Embeddings para búsqueda semántica en leyes (mejoraría relevancia)
- [ ] **Multi-Agent System**: Agente coordinador + agentes especializados por ley
- [ ] **Streaming**: Implementar SSE para updates en tiempo real
- [ ] **Cache Inteligente**: Cache de respuestas similares
- [ ] **Confidence Scores**: Indicar confianza en las respuestas
- [ ] **Citations**: Referenciar artículos específicos en respuestas

### Mejoras de Arquitectura

- [ ] **Durable Objects**: Para state management más robusto
- [ ] **Queue System**: Para procesamiento batch de múltiples preguntas
- [ ] **Rate Limiting**: Protección contra abuse
- [ ] **Monitoring**: Integración con Cloudflare Analytics
- [ ] **Testing**: Unit tests, integration tests

### Mejoras de UX

- [ ] **Frontend simple**: UI para hacer preguntas y ver resultados
- [ ] **Notificaciones**: Email/webhook cuando run completa
- [ ] **Historial**: Ver preguntas anteriores y respuestas
- [ ] **Export**: Descargar respuestas en PDF/Markdown

---

## Testing del Sistema

### Test Básico (Quick Smoke Test)

```bash
# 1. Start dev server
npm run dev

# 2. Test health check
curl http://127.0.0.1:8787/

# 3. Create run
RUN_ID=$(curl -sS -X POST http://127.0.0.1:8787/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"Qué obligaciones tengo para proteger datos de clientes?"}' \
  | jq -r '.runId')

echo "Run ID: $RUN_ID"

# 4. Wait a few seconds
sleep 5

# 5. Check status
curl -sS http://127.0.0.1:8787/run/$RUN_ID | jq

# 6. Get answer
curl -sS http://127.0.0.1:8787/answer/$RUN_ID | jq
```

### Test Completo (Con pregunta del challenge)

```bash
curl -sS -X POST http://127.0.0.1:8787/question \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "Si tengo una empresa de software medioambiental para salmoneras, en el sur de chile, que sugerencias tienes de como puedo cumplir con la ley de protección de datos personales?"
  }' | jq
```

---

## Notas para la Entrevista

### Puntos Clave a Discutir

1. **Pipeline vs Single Agent**: ¿Cuándo usar cada approach?
2. **Asincronía**: ¿Cómo manejar runs muy largos (30+ min)?
3. **Escalabilidad**: ¿Qué pasa con 1000 requests/segundo?
4. **Precisión**: ¿Cómo mejorar quality de respuestas?
5. **Observability**: ¿Qué métricas adicionales son útiles?

### Features para Live Coding

Algunas ideas de lo que podríamos agregar en vivo:

- Implementar un nuevo tool (ej: `summarize_obligation`)
- Agregar un nuevo step al pipeline (ej: `validate_answer`)
- Implementar cache de respuestas
- Agregar filtros por región/industria
- Implementar scoring de relevancia

---

## Contacto

Para cualquier duda sobre el código o la implementación, estoy disponible para discutir en la entrevista en vivo.

**Tiempo invertido aproximado:** 3-4 horas
- 30min: Setup y exploración de Workers AI
- 1h: Implementación core (pipeline, endpoints)
- 1h: Mejoras (LLM selection, tools, validation)
- 1h: Documentación (README, schemas, comments)

---

**Gracias por revisar mi solución! 🚀**
