# Production API Test Commands

Direct curl commands to test the deployed Skyward Compliance Agent.

**Production URL:** https://skyward-compliance-agent.josebmxfredes.workers.dev

---

## Quick Start

### 1. Health Check

```bash
curl https://skyward-compliance-agent.josebmxfredes.workers.dev/
```

Expected response:
```json
{"status":"ok"}
```

---

## Full Test Flow

### 2. Create a Question (English)

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What data protection obligations do I have as a fintech company in Chile?"}'
```

Expected response:
```json
{
  "message": "Run created and agent started",
  "runId": "uuid-here",
  "status": "created"
}
```

**Save the `runId` for next steps!**

---

### 3. Create a Question (Spanish - Challenge Example)

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "Si tengo una empresa de software medioambiental para salmoneras, en el sur de chile, que sugerencias tienes de como puedo cumplir con la ley de protección de datos personales?"
  }'
```

---

### 4. Check Run Status

**Replace `RUN_ID` with the actual runId from step 2:**

```bash
curl https://skyward-compliance-agent.josebmxfredes.workers.dev/run/RUN_ID
```

Example with jq to see summary:
```bash
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/run/RUN_ID | jq '{
  status,
  question,
  selectedLaws,
  totalMs,
  logsCount: (.logs | length)
}'
```

---

### 5. Get Final Answer

**Replace `RUN_ID` with the actual runId:**

```bash
curl https://skyward-compliance-agent.josebmxfredes.workers.dev/answer/RUN_ID
```

With jq formatting:
```bash
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/answer/RUN_ID | jq
```

See just the answer text:
```bash
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/answer/RUN_ID | jq -r '.answer'
```

---

### 6. List All Runs

```bash
curl https://skyward-compliance-agent.josebmxfredes.workers.dev/runs
```

Count total runs:
```bash
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/runs | jq '.keys | length'
```

---

## One-Liner Test (Complete Flow)

Run a complete test in one command:

```bash
RUN_ID=$(curl -sS -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are my data protection obligations as a Chilean fintech?"}' \
  | jq -r '.runId') && \
echo "Created run: $RUN_ID" && \
echo "Waiting for agent..." && \
sleep 8 && \
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/answer/$RUN_ID | jq
```

---

## Test Different Scenarios

### Consumer Protection Law

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are my obligations regarding consumer data protection in Chile?"}'
```

### Corporate Criminal Liability

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What compliance requirements exist for preventing corporate crimes in Chile?"}'
```

### AML/Financial Intelligence

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What are the anti-money laundering reporting requirements for financial institutions in Chile?"}'
```

### Public Procurement

```bash
curl -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What data protection rules apply when bidding for government contracts in Chile?"}'
```

---

## Advanced: Streaming Output with Watch

Monitor a run in real-time (requires `watch` and `jq`):

```bash
# Create run
RUN_ID=$(curl -sS -X POST https://skyward-compliance-agent.josebmxfredes.workers.dev/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"Your question here"}' | jq -r '.runId')

# Watch status
watch -n 2 "curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/run/$RUN_ID | jq '{status, logsCount: (.logs | length), totalMs}'"
```

---

## Automated Test Script

A bash script is available to run all tests automatically:

```bash
./TEST_PRODUCTION.sh
```

This script will:
1. ✅ Check health endpoint
2. ✅ Create multiple questions
3. ✅ Wait for processing
4. ✅ Retrieve and display answers
5. ✅ Show metrics and performance data

---

## Response Time Examples

- **Health check:** ~50-100ms
- **Create question:** ~100-200ms
- **Agent execution:** ~5-8 seconds
- **Get answer:** ~50-100ms

---

## Troubleshooting

### Run not found (404)
Wait a few more seconds - the agent may still be processing.

### Connection timeout
Check your internet connection and try again.

### Invalid question error
Ensure question is between 10-2000 characters.

### Status "failed"
Check the run logs:
```bash
curl -sS https://skyward-compliance-agent.josebmxfredes.workers.dev/run/RUN_ID | jq '.error, .logs'
```

---

**Need help?** See `DEPLOYMENT.md` for full documentation.
