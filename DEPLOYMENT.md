# Deployment Guide

## Production Deployment

La aplicación está actualmente deployada y funcionando en producción:

**URL:** https://skyward-compliance-agent.josebmxfredes.workers.dev

**Specs:**
- Bundle size: 1.3 MB (incluye 760KB de textos de leyes)
- KV Namespace ID: `c4fe33282b764bef922f00f43ea508b8`
- Worker startup time: ~12ms
- Average run time: 25-30 segundos

**Prueba rápida:**
```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are my KYC obligations as a fintech?"}'
```

---

## Deploy Your Own Instance

Sigue estos pasos para tu propio deployment:

### Prerequisites

1. A Cloudflare account (free tier works)
2. Wrangler CLI installed: `npm install -g wrangler`
3. Authenticated with Cloudflare: `wrangler login`

### Step 1: Create KV Namespace

Create a KV namespace for storing runs and law texts:

```bash
wrangler kv:namespace create "RUNS_KV"
```

This will output something like:
```
{ binding = "RUNS_KV", id = "abc123def456" }
```

### Step 2: Update wrangler.toml

Edit `wrangler.toml` and replace the KV namespace ID:

```toml
[[kv_namespaces]]
binding = "RUNS_KV"
id = "abc123def456"  # Replace with your actual KV namespace ID
```

### Step 3: Deploy to Cloudflare

Deploy the application:

```bash
npm run deploy
```

This will:
1. Bundle your application
2. Upload it to Cloudflare Workers
3. Bind the KV namespace and AI binding
4. Return a URL where your app is deployed (e.g., `https://skyward-compliance-agent.your-subdomain.workers.dev`)

### Step 4: Test the Deployment

Test the deployed application:

```bash
# Health check
curl https://skyward-compliance-agent.your-subdomain.workers.dev/

# Create a question
curl -X POST https://skyward-compliance-agent.your-subdomain.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What data protection obligations do I have as a fintech company?"}'
```

## Configuration

### Environment Bindings

The application requires two bindings configured in `wrangler.toml`:

1. **KV Namespace** (`RUNS_KV`): For storing runs and law texts
2. **AI Binding** (`AI`): For accessing Cloudflare Workers AI

Both are automatically configured when you deploy.

### Workers AI Models

The application uses:
- Model: `@cf/meta/llama-3-8b-instruct`
- This model is available in the free tier
- No additional configuration needed

## Monitoring

### Viewing Logs

View real-time logs:
```bash
wrangler tail
```

### KV Storage Browser

View KV storage in the Cloudflare dashboard:
1. Go to Workers & Pages → KV
2. Select your `RUNS_KV` namespace
3. Browse stored runs

## Troubleshooting

### Issue: "KV namespace not found"

**Solution:** Make sure you've created the KV namespace and updated the ID in `wrangler.toml`

### Issue: "AI binding not available"

**Solution:** Ensure you're using a Cloudflare account with Workers AI access (free tier includes it)

### Issue: "Module not found" errors

**Solution:** Run `npm install` to ensure all dependencies are installed

## Cost Considerations

### Free Tier Limits

Cloudflare Workers free tier includes:
- 100,000 requests per day
- 10ms CPU time per request
- Workers AI: Limited requests per day (check current limits)
- KV: 100,000 reads/day, 1,000 writes/day

### Staying Within Limits

- Law texts are cached in KV to reduce AI processing
- LLM calls are optimized with token limits
- Runs are stored efficiently in KV

## Production Considerations

For production deployment, consider:

1. **Custom Domain**: Add a custom domain in Cloudflare dashboard
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Monitoring**: Set up Cloudflare Analytics and alerts
4. **KV Backups**: Regularly export KV data for backups
5. **Error Tracking**: Integrate with error tracking service (e.g., Sentry)

## Rollback

To rollback to a previous version:

```bash
# View deployments
wrangler deployments list

# Rollback to specific deployment
wrangler rollback [deployment-id]
```

## Local Development

For local development with KV:

```bash
# Start local dev server
npm run dev
```

This uses a local KV simulator. Data is not persisted between restarts.

---

## Law Text Ingestion

Los textos de las leyes ya están incluidos en `src/law_text_ingested.ts` (760KB).

**Para re-ingestar PDFs:**

1. Coloca los PDFs en un directorio accesible
2. Edita `scripts/ingest-with-unpdf.mjs` con las rutas correctas
3. Ejecuta el script:
```bash
node scripts/ingest-with-unpdf.mjs
```

Este script:
- Lee PDFs usando `unpdf`
- Extrae texto completo
- Genera `src/law_text_ingested.ts`

**Leyes incluidas:**
- LEY_21521 (Fintech): 156K chars
- LEY_19913 (AML): 64K chars
- LEY_19496 (Consumer Protection)
- LEY_20393 (Corporate Criminal Liability)
- LEY_19886 (Public Procurement)

---

## Bundle Size Optimization

**Current bundle:** 1.3 MB

Si el bundle size es un problema:
- Considera usar Workers Assets para servir los textos
- Implementa lazy loading de law texts
- Usa KV directamente sin incluir en el bundle

**Trade-off actual:** Incluimos los textos en el bundle para:
- Cold start más rápido (no espera KV lookup)
- Deployment más simple
- Mayor confiabilidad
