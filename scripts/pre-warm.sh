#!/bin/bash

# ShramSetu Saathi - Lambda Pre-Warm Script
# This script warms up all Lambda functions before demo recording
# Usage: ./pre-warm.sh

set -e

# Configuration
REGION="ap-south-1"
LAMBDA_FUNCTIONS=(
    "shramsetu-voice-transcribe"
    "shramsetu-intent-extractor"
    "shramsetu-procurement-agent"
    "shramsetu-credit-agent"
    "shramsetu-topsis-engine"
    "shramsetu-safety-validator"
    "shramsetu-explanation-gen"
    "shramsetu-voice-synthesize"
)

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  ShramSetu Saathi - Lambda Pre-Warm Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Step 1: Warm up individual Lambda functions in parallel
echo -e "${YELLOW}[STEP 1] Warming up Lambda functions in parallel...${NC}"
echo ""

declare -A pids
declare -A results

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    echo -e "  Invoking ${BLUE}${func}${NC}..."
    
    # Create warmup payload
    warmup_payload=$(cat <<PAYLOAD
{
  "action": "warmup",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
PAYLOAD
)
    
    # Invoke Lambda asynchronously and capture PID
    aws lambda invoke \
        --function-name "${func}" \
        --region "${REGION}" \
        --cli-binary-format raw-in-base64-out \
        --payload "${warmup_payload}" \
        --invocation-type RequestResponse \
        "/tmp/${func}_warmup_result.json" > /dev/null 2>&1 &
    
    pids["${func}"]=$!
done

echo ""
echo -e "${YELLOW}Waiting for all Lambda invocations to complete...${NC}"

# Wait for all background jobs and check results
success_count=0
fail_count=0

for func in "${LAMBDA_FUNCTIONS[@]}"; do
    pid=${pids["${func}"]}
    if wait $pid 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} ${func}"
        ((success_count++))
    else
        echo -e "  ${RED}✗${NC} ${func}"
        ((fail_count++))
    fi
done

echo ""
echo -e "${BLUE}Lambda Warmup Summary:${NC} ${GREEN}${success_count} succeeded${NC}, ${RED}${fail_count} failed${NC}"
echo ""

# Step 2: Run full procurement flow
echo -e "${YELLOW}[STEP 2] Running full procurement flow...${NC}"
echo ""

procurement_payload=$(cat <<'PAYLOAD'
{
  "action": "procurement_flow",
  "user_input": "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
  "user_id": "DEMO_USER_001",
  "location": "HSR Layout, Bangalore",
  "demo_mode": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
PAYLOAD
)

echo "  Testing procurement flow: 'Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai'"

procurement_response=$(aws lambda invoke \
    --function-name "shramsetu-procurement-agent" \
    --region "${REGION}" \
    --cli-binary-format raw-in-base64-out \
    --payload "${procurement_payload}" \
    --invocation-type RequestResponse \
    /tmp/procurement_result.json)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Procurement flow executed successfully"
    echo "  Response:"
    cat /tmp/procurement_result.json | jq '.' 2>/dev/null || cat /tmp/procurement_result.json
else
    echo -e "  ${RED}✗${NC} Procurement flow failed"
fi

echo ""

# Step 3: Run full credit flow
echo -e "${YELLOW}[STEP 3] Running full credit flow...${NC}"
echo ""

credit_payload=$(cat <<'PAYLOAD'
{
  "action": "credit_flow",
  "user_input": "Mujhe business ke liye 10,000 rupaye chahiye",
  "user_id": "DEMO_USER_001",
  "location": "HSR Layout, Bangalore",
  "demo_mode": true,
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
PAYLOAD
)

echo "  Testing credit flow: 'Mujhe business ke liye 10,000 rupaye chahiye'"

credit_response=$(aws lambda invoke \
    --function-name "shramsetu-credit-agent" \
    --region "${REGION}" \
    --cli-binary-format raw-in-base64-out \
    --payload "${credit_payload}" \
    --invocation-type RequestResponse \
    /tmp/credit_result.json)

if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓${NC} Credit flow executed successfully"
    echo "  Response:"
    cat /tmp/credit_result.json | jq '.' 2>/dev/null || cat /tmp/credit_result.json
else
    echo -e "  ${RED}✗${NC} Credit flow failed"
fi

echo ""

# Step 4: Summary and recommendations
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}Pre-warm completed!${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${YELLOW}Ready for demo recording. Recommendations:${NC}"
echo "  1. ✓ All Lambda functions have been invoked"
echo "  2. ✓ Full procurement and credit flows have been tested"
echo "  3. → Close browser developer tools before recording"
echo "  4. → Use incognito/private window for clean session"
echo "  5. → Record backup take first before live demo"
echo "  6. → Keep failsafe responses ready (see demo-script.md)"
echo ""
echo -e "${BLUE}Failsafe responses available in:${NC}"
echo "  ~/Documents/shramsetu-saathi/docs/demo-script.md"
echo ""

# Cleanup
rm -f /tmp/shramsetu-*_warmup_result.json /tmp/procurement_result.json /tmp/credit_result.json

echo -e "${GREEN}Happy recording! 🎬${NC}"
echo ""
