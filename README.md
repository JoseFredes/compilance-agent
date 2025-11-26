# Compliance Q&A Agent - Skyward Interview Challenge

An AI agent that answers questions about regulatory compliance in Chile, analyzing laws related to personal data protection and other relevant legal aspects.

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
- `selectLawsStep`: Usa LLM para seleccionar leyes relevantes
- `extractObligationsStep`: Extrae obligaciones legales de cada ley
- `draftAnswerStep`: Genera respuesta final consolidada

#### 4. **Tools System**
Sistema de tools composables y reutilizables:

```typescript
interface Tool<TInput, TOutput> {
  name: string;
  description: string;
  execute: (input: TInput, context: ToolContext) => Promise<TOutput>;
}
```

**Tools disponibles:**
- `search_law_text`: Búsqueda dentro de documentos legales
- `extract_keywords`: Extracción de conceptos clave
- `analyze_company_context`: Análisis del contexto empresarial

#### 5. **LLM Integration (Cloudflare Workers AI)**
- Modelo: `@cf/meta/llama-3-8b-instruct`
- Configuración: max_tokens=1500 (aumentado para respuestas completas)
- Tracking de métricas: latencia, número de llamadas

#### 6. **Validación (Zod + JSON Schema)**
- Validación de requests con Zod
- JSON Schemas documentados en `/schemas`
- Mensajes de error detallados

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

### 5. **¿Por qué Textos de Muestra vs PDFs Reales?**

**Decisión pragmática:**
- Problemas de compatibilidad con `pdf-parse` en ES modules
- Tiempo limitado para el challenge
- Los samples son **suficientes** para demostrar funcionalidad

**Samples mejorados incluyen:**
- Artículos relevantes sobre protección de datos
- Obligaciones específicas
- Sanciones y plazos
- Suficiente detalle para generar respuestas útiles

**Próximo paso:** Implementar ingesta real usando librería compatible o API externa (ej: Cloudflare PDF parser).

### 6. **¿Por qué Zod + JSON Schema?**

**Zod:**
- Validación en runtime
- Type-safe (TypeScript)
- Mensajes de error claros

**JSON Schema:**
- Documentación estándar de la API
- Compatible con herramientas de generación de clientes
- Autodocumentación

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
│   ├── index.ts                  # Main entry point (exports Hono app)
│   ├── api/
│   │   ├── routes.ts            # API endpoint handlers
│   │   └── validators.ts        # Request validation logic
│   ├── agent/
│   │   └── executor.ts          # Agent pipeline orchestration
│   ├── pipeline/
│   │   └── steps.ts             # Modular pipeline steps
│   ├── services/
│   │   ├── llm.ts               # LLM service
│   │   ├── law-loader.ts        # Law text loading service
│   │   └── run-manager.ts       # Run persistence and lifecycle
│   ├── utils/
│   │   ├── metrics.ts           # Metrics tracking utilities
│   │   └── text-processor.ts   # Text processing utilities
│   ├── config/
│   │   ├── laws.ts              # Law metadata and configuration
│   │   └── constants.ts         # Application constants
│   ├── data/
│   │   └── law-samples.ts       # Sample law texts (fallback)
│   ├── schemas.ts               # Zod validation schemas
│   ├── tools.ts                 # Reusable tool functions
│   ├── types.ts                 # Shared TypeScript types
│   └── law_text_ingested.ts    # Real law texts from PDFs
├── schemas/                      # JSON Schema documentation
│   ├── question-request.json
│   ├── run-response.json
│   └── answer-response.json
├── scripts/
│   └── ingest-with-unpdf.mjs    # Script to ingest PDFs
├── wrangler.toml                 # Cloudflare Workers config
├── package.json
├── tsconfig.json
└── README.md
```

### Key Files

- **`src/index.ts`**: Main entry point that exports the Hono application

- **`src/api/routes.ts`**: API endpoint handlers for the REST API

- **`src/agent/executor.ts`**: Agent pipeline orchestration and execution logic

- **`src/pipeline/steps.ts`**: Modular pipeline steps:
  - `selectLawsStep`: Selects relevant laws using LLM
  - `extractObligationsStep`: Extracts obligations from law texts
  - `draftAnswerStep`: Generates final response

- **`src/services/`**: Core services:
  - `llm.ts`: LLM interaction service
  - `law-loader.ts`: Law text loading with caching
  - `run-manager.ts`: Run lifecycle and persistence

- **`src/config/`**: Configuration:
  - `laws.ts`: Law metadata (LAW_DOCUMENTS)
  - `constants.ts`: Application constants (LLM config, text limits, etc.)

- **`src/schemas.ts`**: Zod validation schemas
  - QuestionRequestSchema
  - RunResponseSchema
  - AnswerResponseSchema

- **`src/tools.ts`**: Modular tool system
  - searchLawTextTool
  - extractKeywordsTool
  - analyzeCompanyContextTool

- **`src/types.ts`**: Shared TypeScript types
  - Run, Step, Obligation, LawDoc, Env, etc.

---

## Trade-offs y Limitaciones

### Limitaciones Actuales

1. **Textos de Leyes = Samples**
   - No se extraen los PDFs reales
   - Los samples son suficientes para demo pero no exhaustivos
   - **Solución futura:** Implementar PDF parsing compatible con Workers

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

- [ ] **Ingesta real de PDFs**: Usar librería compatible o API externa
- [ ] **Vector Search**: Embeddings para búsqueda semántica en leyes
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
