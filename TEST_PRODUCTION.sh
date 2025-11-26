#!/bin/bash

# Test Production Deployment
# Skyward Compliance Agent - Cloudflare Workers
# Production URL: https://skyward-compliance-agent.josebmxfredes.workers.dev

PROD_URL="https://skyward-compliance-agent.josebmxfredes.workers.dev"

echo "🧪 Testing Skyward Compliance Agent in Production"
echo "=================================================="
echo ""

# Test 1: Health Check
echo "1️⃣  Health Check"
echo "Command: curl $PROD_URL/"
curl -sS $PROD_URL/
echo -e "\n"

# Test 2: Create Question (English)
echo "2️⃣  Create Question - English"
echo "Question: What data protection obligations do I have as a fintech company in Chile?"
RUN_ID_1=$(curl -sS -X POST $PROD_URL/question \
  -H 'Content-Type: application/json' \
  -d '{"question":"What data protection obligations do I have as a fintech company in Chile?"}' \
  | jq -r '.runId')

echo "Run ID: $RUN_ID_1"
echo ""

# Test 3: Create Question (Spanish - from challenge)
echo "3️⃣  Create Question - Spanish (Challenge Example)"
echo "Question: Si tengo una empresa de software medioambiental para salmoneras..."
RUN_ID_2=$(curl -sS -X POST $PROD_URL/question \
  -H 'Content-Type: application/json' \
  -d '{
    "question": "Si tengo una empresa de software medioambiental para salmoneras, en el sur de chile, que sugerencias tienes de como puedo cumplir con la ley de protección de datos personales?"
  }' | jq -r '.runId')

echo "Run ID: $RUN_ID_2"
echo ""

# Wait for processing
echo "⏳ Waiting 8 seconds for agent processing..."
sleep 8
echo ""

# Test 4: Check Run Status
echo "4️⃣  Check Run Status (First Question)"
curl -sS $PROD_URL/run/$RUN_ID_1 | jq '{
  status,
  question,
  selectedLaws,
  totalMs,
  toolMetrics: .tools
}'
echo ""

# Test 5: Get Final Answer
echo "5️⃣  Get Final Answer (First Question)"
curl -sS $PROD_URL/answer/$RUN_ID_1 | jq
echo ""

# Test 6: Get Answer for Spanish Question
echo "6️⃣  Get Answer (Spanish Question)"
curl -sS $PROD_URL/answer/$RUN_ID_2 | jq '{
  status,
  question,
  selectedLaws: [.laws[] | .name],
  obligationsCount: (.obligations | length),
  totalExecutionMs: .metrics.totalMs
}'
echo ""

# Test 7: List All Runs
echo "7️⃣  List All Runs"
curl -sS $PROD_URL/runs | jq '.keys | length' | xargs -I {} echo "Total runs in KV: {}"
echo ""

echo "✅ All tests completed!"
echo ""
echo "To view full answer for first question:"
echo "curl -sS $PROD_URL/answer/$RUN_ID_1 | jq '.answer'"
echo ""
echo "To view full answer for second question:"
echo "curl -sS $PROD_URL/answer/$RUN_ID_2 | jq '.answer'"
