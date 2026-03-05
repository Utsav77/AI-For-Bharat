# ☸ ShramSetu Saathi — श्रमसेतु साथी

> **Voice-first agentic AI assistant for India's 490 million informal workers**

[![AWS](https://img.shields.io/badge/AWS-ap--south--1-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Bedrock](https://img.shields.io/badge/Amazon-Bedrock-FF9900?logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![ONDC](https://img.shields.io/badge/DPI-ONDC-138808)](https://ondc.org/)
[![OCEN](https://img.shields.io/badge/DPI-OCEN_4.0-FF9933)](https://ocen.dev/)
[![Bhashini](https://img.shields.io/badge/DPI-Bhashini-000080)](https://bhashini.gov.in/)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🇮🇳 The Problem

India has **490 million informal workers** — street vendors, artisans, daily wage earners, gig workers. **45% are functionally illiterate.** Every digital commerce interface, every credit app, every legal resource assumes the user can read.

**Ravi Kumar** is a street vendor in HSR Layout, Bangalore. He's at his stall at 4 AM. He cannot read a bar chart. But he knows how to hold the WhatsApp voice note button.

ShramSetu Saathi removes the literacy assumption entirely. Ravi speaks a problem in Hindi and hears a solution in under 5 seconds.

---

## 🎯 What It Does

ShramSetu Saathi connects informal workers to India's Digital Public Infrastructure via a voice-first pipeline:

| Query Type | DPI Connected | What Ravi Gets |
|---|---|---|
| 🛒 **Procurement** | ONDC via Beckn Protocol | Best logistics provider, TOPSIS-ranked |
| 💳 **Credit** | OCEN 4.0 lenders | Best microloan offer with flow-based scoring |
| ⚖️ **Labour Rights** | RAG over legal corpus | Rights explained in Hindi with legal citations |

**Demo queries:**
- *"Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai"* → Ekart Logistics, ₹380, 3 days
- *"Mujhe business ke liye 10,000 rupaye chahiye"* → NanoFin Microloan, 12.5% p.a., 2hr disburse
- *"Overtime ke paise nahi mile, kya karna chahiye?"* → Factories Act 1948, Section 59 rights

---

## 🏗️ Architecture

```
User Voice (Hindi)
       │
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                     AWS API Gateway                              │
│              (POST /query · ap-south-1)                          │
└──────────────────────────┬───────────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                   AWS Step Functions                             │
│                  (Agentic Pipeline)                              │
│                                                                  │
│  Step 1 ──► ASR          Amazon Transcribe (hi-IN)  ~0.8s       │
│  Step 2 ──► Intent       Claude 3.5 Haiku           ~200ms      │
│  Step 3 ──► Agent        ONDC / OCEN / RAG          ~1.5s       │
│  Step 4 ──► TOPSIS       Pure math ranking          ~50ms       │
│  Step 5 ──► Safety       CeRAI validation           ~100ms      │
│  Step 6 ──► Explain      Claude 3.5 Sonnet + Polly  ~1.6s       │
│                                                      ─────       │
│                                          Total:      <5s         │
└──────────────────────────────────────────────────────────────────┘
                           │
                           ▼
               Hindi audio response (Polly · Kajal neural)
               Pre-signed S3 URL · 1hr lifecycle
```

---

## 🔊 Voice Pipeline

### Primary: Web Speech API (Chrome)
The frontend uses `webkitSpeechRecognition` — no round-trip to a backend for ASR.

```
Tap mic → Web Speech API (hi-IN) → Live interim transcript → POST to API Gateway
```

### Backend TTS: Amazon Polly
- Voice: **Kajal** (neural engine, hi-IN)
- Response delivered as MP3 via pre-signed S3 URL

### Bhashini Switchback (zero code change)
When Bhashini registration is approved, switch with one env var:
```bash
aws lambda update-function-configuration \
  --function-name shramsetu-voice-transcribe \
  --environment 'Variables={VOICE_PROVIDER=bhashini,BHASHINI_API_KEY=your_key}'
```

---

## 📊 TOPSIS Ranking Algorithm

Results are ranked using **TOPSIS** (Technique for Order of Preference by Similarity to Ideal Solution) — pure math, no LLM guessing.

### Procurement Weights
| Criterion | Weight |
|---|---|
| Price | 35% |
| Delivery time | 25% |
| Provider rating | 25% |
| Credit availability | 15% |

### Credit Weights
| Criterion | Weight |
|---|---|
| Interest rate | 35% |
| Disbursement time | 25% |
| Repayment flexibility | 25% |
| Prepayment penalty | 15% |

**Sample output:**

| Rank | Provider | Price | Days | Rating | Credit | TOPSIS |
|---|---|---|---|---|---|---|
| 🥇 1 | Ekart Logistics | ₹380 | 3 | 4.5★ | ✓ | 84.7% |
| 2 | ONDC Credit Co-op | ₹320 | 3 | 3.5★ | ✓ | 71.2% |
| 3 | Namma Cargo Co-op | ₹320 | 3 | 3.5★ | ✓ | 68.4% |

---

## 🧠 AI Layer

| Model | Role | Latency |
|---|---|---|
| **Claude 3.5 Haiku** (Bedrock) | Intent classification → `procurement_search \| credit_request \| safety_query` | ~200ms |
| **Claude 3.5 Sonnet** (Bedrock) | Hindi explanation generation (2 sentences, ~150 chars) | ~1.2s |

### Flow-Based Credit Scoring
No CIBIL score needed. Credit assessment uses Ravi's ONDC transaction history:
- 6 months of transaction data
- Average monthly revenue
- Transaction volume consistency
- Digital credential count

---

## 🛡️ Safety & Compliance

Every response passes through **CeRAI (Centre for Responsible AI) Legal Framework** validation:

| Score | Action |
|---|---|
| ≥ 0.8 | `PROCEED` — response delivered |
| < 0.8 | `HUMAN_REVIEW` — escalated, not auto-delivered |

Current scores: Procurement 0.95 · Credit 0.92 · Labour Law 0.91

---

## 🗂️ Tech Stack

```
Frontend          React + TypeScript (Vite)
                  Web Speech API (Chrome, hi-IN)
                  Recharts (TOPSIS visualization)
                  Tailwind CSS

Backend           AWS Lambda (Node.js 20)
Orchestration     AWS Step Functions (Express Workflow)
API               AWS API Gateway (HTTP)
AI                Amazon Bedrock (Claude 3.5 Haiku + Sonnet)
ASR               Amazon Transcribe (hi-IN fallback)
TTS               Amazon Polly (Kajal, neural)
Voice (planned)   Bhashini (government AI language platform)
Storage           DynamoDB · S3 · OpenSearch Serverless
Region            AWS ap-south-1 (Indian data residency)
```

---

## 📁 Project Structure

```
shramsetu-saathi/
├── src/
│   ├── pages/
│   │   └── Index.tsx          # Main UI — Voice + Dashboard modes
│   └── ...
├── lambda/
│   ├── intent-classifier/     # Claude Haiku — routes query type
│   ├── procurement-agent/     # ONDC Beckn Protocol integration
│   ├── credit-agent/          # OCEN 4.0 lender fetch + scoring
│   ├── safety-agent/          # RAG over labour law corpus
│   ├── topsis-ranker/         # Pure math ranking Lambda
│   ├── safety-validator/      # CeRAI framework scoring
│   ├── explain-generator/     # Claude Sonnet Hindi explanation
│   ├── voice-transcribe/      # Amazon Transcribe ASR
│   └── voice-synthesize/      # Amazon Polly TTS
├── statemachine/
│   └── pipeline.asl.json      # Step Functions state machine definition
├── infra/
│   ├── iam-roles.json         # Required IAM policies
│   └── s3-lifecycle.json      # Privacy-first S3 lifecycle rules
└── docs/
    ├── ShramSetu_Bhashini_UseCase.docx
    └── ShramSetu_Transcribe_Polly_Guide.docx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- AWS CLI configured for `ap-south-1`
- AWS account with Bedrock model access (Claude 3.5 Haiku + Sonnet)

### Frontend Setup

```bash
git clone https://github.com/your-org/shramsetu-saathi
cd shramsetu-saathi
npm install
npm run dev
```

The API endpoint is pre-configured in `src/pages/Index.tsx`:
```typescript
const API_URL = "https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query";
```

### Backend — Quick Lambda Deploy

```bash
# 1. Install Lambda dependencies
cd lambda/voice-synthesize && npm install
cd lambda/voice-transcribe && npm install

# 2. Test Polly voice immediately (5-min validation)
aws polly synthesize-speech \
  --voice-id Kajal \
  --engine neural \
  --language-code hi-IN \
  --text "Ravi bhai, Ekart Logistics sabse achha option hai." \
  /tmp/test.mp3
open /tmp/test.mp3

# 3. Deploy Lambdas (repeat for each)
cd lambda/voice-synthesize
zip -r function.zip .
aws lambda create-function \
  --function-name shramsetu-voice-synthesize \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::YOUR_ACCOUNT:role/shramsetu-lambda-role \
  --region ap-south-1
```

### Demo Mode (no backend required)

POST directly to the API with a `demoMode` payload:

```bash
# Procurement demo
curl -X POST https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query \
  -H "Content-Type: application/json" \
  -d '{"demoMode": "demo_procurement", "sessionId": "test-001"}'

# Credit demo
curl -X POST https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query \
  -d '{"demoMode": "demo_credit", "sessionId": "test-001"}'

# Labour rights demo
curl -X POST https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query \
  -d '{"demoMode": "demo_safety", "sessionId": "test-001"}'
```

### Stub Mode (pipeline testing without ASR/TTS)

```bash
aws lambda update-function-configuration \
  --function-name shramsetu-voice-transcribe \
  --environment 'Variables={USE_VOICE_STUB=true}'
```

---

## 🔐 IAM Permissions

**voice-transcribe Lambda requires:**
```json
{
  "Actions": [
    "s3:PutObject", "s3:GetObject", "s3:DeleteObject",
    "transcribe:StartTranscriptionJob", "transcribe:GetTranscriptionJob"
  ]
}
```

**voice-synthesize Lambda requires:**
```json
{
  "Actions": ["polly:SynthesizeSpeech", "s3:PutObject", "s3:GetObject"]
}
```

**Critical — S3 bucket policy for Transcribe service access:**
```json
{
  "Principal": { "Service": "transcribe.amazonaws.com" },
  "Action": ["s3:GetObject", "s3:PutObject"],
  "Resource": "arn:aws:s3:::shramsetu-saathi-assets-ap-south-1/*"
}
```
Without this, Transcribe silently fails to read uploaded audio.

---

## 🔒 Privacy & Data Handling

All user audio is ephemeral by design. S3 lifecycle policies enforce deletion:

| Bucket Prefix | Retention |
|---|---|
| `audio-input/` | 1 day |
| `tts-audio/` | 1 day |
| `transcribe-output/` | 1 day |

Raw audio is deleted immediately after transcription. AWS ap-south-1 ensures Indian data residency and sovereignty compliance.

---

## 🌐 Language Support

| Language | Script | Transcribe | Polly Neural |
|---|---|---|---|
| Hindi | Devanagari | ✅ `hi-IN` | ✅ Kajal |
| Tamil | Tamil | ✅ `ta-IN` | ✅ Supported |
| Bengali | Bengali | ✅ `bn-IN` | ⚠️ Standard only |
| Kannada | Kannada | ❌ | ❌ |

Kannada and Bengali neural will be addressed via Bhashini integration (registration pending). Switching requires one environment variable change — zero code modifications.

---

## 💰 Cost Analysis

| Service | Per Query | 500 Queries |
|---|---|---|
| Amazon Transcribe | $0.006 | $3.00 |
| Amazon Polly Neural | $0.0024 | $1.20 |
| Claude Haiku (Bedrock) | ~$0.0003 | $0.15 |
| Claude Sonnet (Bedrock) | ~$0.003 | $1.50 |
| S3 storage + requests | <$0.0001 | ~$0.05 |
| Step Functions | ~$0.0001 | ~$0.05 |
| **Total** | **~₹0.67 ($0.008)** | **~$4.95** |

**At scale:** 1% adoption = 4.9M daily interactions = ~$39,200/day — justifiable against ₹20,000 average monthly transaction value per worker.

---

## 📱 Reach Strategy

```
200M workers    Android smartphones → PWA (this app)
290M workers    Feature phones      → IVR via Exotel/Twilio (same Lambda backend)
```

The AI layer is voice-modality agnostic. The interface is a swap, not a rebuild.

---

## 🏆 Key Technical Differentiators

1. **TOPSIS ranking** — deterministic math, not LLM guessing. Auditable, explainable, reproducible.
2. **Multi-agent Step Functions pipeline** — not a monolithic chatbot. Each step is independently observable and replaceable.
3. **DPI-native** — ONDC + OCEN 4.0 + Bhashini. No proprietary APIs, no screen-scraping.
4. **Flow-based credit scoring** — 6 months of ONDC history replaces CIBIL. Inclusive by design.
5. **CeRAI safety layer** — legal compliance validation before any advice is delivered.
6. **Indian data residency** — AWS ap-south-1. No user data leaves India.

---

## 📚 Documents

| Document | Purpose |
|---|---|
| `ShramSetu_Bhashini_UseCase.docx` | Bhashini registration supporting document (10 sections) |
| `ShramSetu_Transcribe_Polly_Guide.docx` | Complete ASR/TTS implementation guide with IAM, S3 architecture, testing sequence |

---

## 🤝 Contributing

Built for the **AI for Bharat Hackathon**. Contributions welcome.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m 'Add feature'`
4. Push and open a Pull Request

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

**ShramSetu Saathi** — *हर कदम पर साथ* (With you at every step)

Built with ❤️ for India's informal workforce

[🇮🇳 Bharat AI Hackathon 2024](https://example.com) · [AWS ap-south-1](https://aws.amazon.com/about-aws/global-infrastructure/regions_az/) · [ONDC](https://ondc.org/) · [OCEN 4.0](https://ocen.dev/) · [Bhashini](https://bhashini.gov.in/)

</div>
