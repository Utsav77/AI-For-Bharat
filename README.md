# ShramSetu Saathi — श्रमसेतु साथी

> **Voice-first agentic AI for India's 490 million informal workers**  
> Built for the AWS AI for Bharat Hackathon 2026

[![Live Demo](https://img.shields.io/badge/Live%20Demo-CloudFront-FF9900?style=for-the-badge&logo=amazonaws)](https://ds0hix0ovs1t0.cloudfront.net/)
[![Demo Video](https://img.shields.io/badge/Demo%20Video-YouTube-CC0000?style=for-the-badge&logo=youtube)](https://youtube.com/shorts/zc_-zXduHIU?si=c-7HZji1p6oJtWW6)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![AWS](https://img.shields.io/badge/AWS-ap--south--1-FF9900?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com)

---

## The Problem

India's informal workforce — street vendors, daily-wage workers, migrant labourers — has no financial advisor, no logistics agent, no legal help.

- **490M workers** with no access to government services
- **₹500B+** lost annually to predatory lending and poor procurement decisions
- **Zero** voice-native tools in their language that understand their context

## The Solution

ShramSetu Saathi is a **voice-first, multilingual AI agent**. A worker speaks a question in Hindi, Kannada, or Bengali and hears a ranked, explainable answer back in their own language — in under 2.1 seconds.

No app download. No literacy required. Just speak.

```
Worker speaks → Sarvam AI STT → Llama 3 8B (Bedrock) → TOPSIS Ranking
→ CeRAI Safety Validation → Sarvam AI TTS → Worker hears the answer
```

---

## Live Flows

| Flow | Language | What it does |
|------|----------|--------------|
| **Procurement** | हिंदी / ಕನ್ನಡ | Finds and ranks ONDC logistics providers via Beckn Protocol |
| **Credit** | हिंदी | Ranks OCEN micro-lenders by flexibility, penalty, and rate |
| **Labour Law** | বাংলা | Answers legal queries grounded in the Labour Law database |
| **General** | Any | Conversational AI for any informal worker question |

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  CLIENT                                              │
│  React + TypeScript  ←→  CloudFront  ←→  S3 (ui/)   │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS
┌────────────────────────▼─────────────────────────────┐
│  AWS CLOUD  (ap-south-1)                             │
│                                                      │
│  API Gateway v2                                      │
│       │                                              │
│  Step Functions (Express)                            │
│       │                                              │
│  lambdas/                                            │
│  ├── intent-classifier   ├── topsis-ranker           │
│  ├── ondc-agent          ├── safety-validator        │
│  ├── ocen-agent          ├── explanation-generator   │
│  ├── labour-law-agent    ├── tts-polly (fallback)    │
│  └── session-manager                                 │
│                                                      │
│  Amazon Bedrock (Llama 3 8B Instruct)                │
│  DynamoDB  │  S3  │  CloudWatch  │  IAM              │
└────────────────────────┬─────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────┐
│  EXTERNAL APIs                                       │
│  Sarvam AI — STT (saarika:v2.5) · TTS (bulbul:v3)   │
│  ONDC / Beckn  │  OCEN  │  CeRAI Engine              │
└──────────────────────────────────────────────────────┘
```

---

## Tech Stack

### AI & Intelligence

| Component | Technology |
|-----------|------------|
| LLM | Llama 3 8B Instruct via Amazon Bedrock |
| Ranking | TOPSIS Algorithm (custom TypeScript) |
| Safety | CeRAI Validator — predatory lending detection |

### Voice & Language — Sarvam AI

| Component | Model | Detail |
|-----------|-------|--------|
| Speech-to-Text | `saarika:v2.5` | 11 Indic languages, auto-detect |
| Text-to-Speech | `bulbul:v3` | Streaming MP3 |
| Translation | `mayura:v1` | Indic ↔ English |
| Hindi speaker | `kavya` | |
| Kannada speaker | `suhani` | |
| Bengali speaker | `neha` | |

### AWS Services

| Service | Role |
|---------|------|
| Lambda ×9 | All business logic, Node.js 20 |
| Step Functions | Express workflow orchestration |
| API Gateway v2 | HTTP API endpoint |
| Amazon Bedrock | Llama 3 8B inference |
| DynamoDB | Session state, on-demand pricing |
| S3 | Audio files, frontend build |
| CloudFront | CDN, global edge delivery |
| CloudWatch | 6 custom metrics |
| IAM | Least-privilege roles per Lambda |

### Frontend

```
React 18 + TypeScript · Tailwind CSS · Vite + esbuild
Web Audio API (waveform visualizer)
```

---

## Project Structure

```
AI-For-Bharat/
├── ui/                        # React + TypeScript frontend
│   └── Index.tsx              # Main app — voice UI, all flows
├── lambdas/                   # AWS Lambda functions (Node.js 20)
│   ├── intent-classifier/     # Llama 3 intent routing
│   ├── ondc-agent/            # Beckn Protocol logistics lookup
│   ├── ocen-agent/            # OCEN micro-lender lookup
│   ├── topsis-ranker/         # Deterministic TOPSIS scoring
│   ├── safety-validator/      # CeRAI predatory content check
│   ├── explanation-generator/ # Indic explanation via Llama 3
│   ├── labour-law-agent/      # Legal query handler
│   ├── tts-polly/             # Amazon Polly fallback TTS
│   └── session-manager/       # DynamoDB session state
├── data/                      # Static data — providers, lenders, legal corpus
├── infra/                     # IAM roles, S3 lifecycle, Step Functions ASL
├── scripts/                   # Deploy and utility scripts
├── Index.tsx                  # Root entry (symlinked to ui/)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- AWS CLI v2 configured for `ap-south-1`
- Sarvam AI API key — get one at [sarvam.ai](https://sarvam.ai)
- Amazon Bedrock access enabled for `meta.llama3-8b-instruct-v1` in `ap-south-1`

### Environment Variables

```bash
# .env.local
VITE_API_ENDPOINT=https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query
VITE_SARVAM_API_KEY=your_sarvam_key_here
```

### Install & Run

```bash
git clone https://github.com/Utsav77/AI-For-Bharat.git
cd AI-For-Bharat
npm install
npm run dev
```

### Deploy Frontend

```bash
npm run build
aws s3 sync dist/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### Deploy a Lambda

```bash
cd lambdas/intent-classifier
npm install
zip -r function.zip .
aws lambda update-function-code \
  --function-name shramsetu-intent-classifier \
  --zip-file fileb://function.zip \
  --region ap-south-1
```

### Test the API directly

```bash
# Procurement query
curl -X POST https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Bangalore se Delhi logistics chahiye", "language": "hi-IN", "sessionId": "test-001"}'

# Credit query
curl -X POST https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query \
  -d '{"query": "Mujhe 5000 rupaye ka loan chahiye", "language": "hi-IN", "sessionId": "test-002"}'
```

---

## API Reference

### POST `/query`

**Request:**
```json
{
  "query": "Bangalore se Delhi logistics chahiye",
  "language": "hi-IN",
  "sessionId": "session-1234567890",
  "asrLatencyMs": 200
}
```

**Response:**
```json
{
  "intent": "procurement",
  "rankedOptions": [
    {
      "name": "XpressBees",
      "topsisScore": 0.609,
      "price": 520,
      "deliveryDays": 1,
      "rating": 4.6,
      "creditAvailable": true,
      "ondcVerified": true
    }
  ],
  "hindiExplanation": "मेरे दोस्त, XpressBees आपके लिए सबसे अच्छा विकल्प है...",
  "safetyScore": 0.97,
  "ttsResult": {
    "audioUrl": "https://...",
    "t_tts": 580
  }
}
```

---

## TOPSIS Ranking

Every ranking is deterministic and explainable — no black box.

**Procurement weights:**

| Criterion | Weight | Direction |
|-----------|--------|-----------|
| Price | 25% | Minimize |
| Delivery speed | 35% | Minimize |
| Rating | 25% | Maximize |
| Credit available | 15% | Maximize |

**Sample result — "Bangalore se Delhi logistics chahiye":**

| Rank | Provider | Score | Why |
|------|----------|-------|-----|
| 1 | XpressBees | 0.609 | Fastest + highest rating + credit |
| 2 | Delhivery | 0.609 | Good balance of speed + credit |
| 3 | Namma Cargo | 0.598 | Cheapest with credit |
| 7 | ShipRocket | 0.318 | Slow + no credit — penalised correctly |

XpressBees wins despite being the most expensive. Speed and credit availability outweigh price in the weighted criteria. The worker always knows *why*.

**Credit weights — "Mujhe 5000 rupaye ka loan chahiye":**

| Rank | Lender | Score | Why |
|------|--------|-------|-----|
| 1 | NanoFin | 0.856 | Zero prepayment penalty + highest flexibility |
| 2 | ONDC Co-op | 0.809 | Low penalty + good flexibility |
| 4 | Jan Dhan | 0.254 | Lowest rate (10%) but worst flexibility — ranks last |

---

## Performance

| Pipeline Stage | Latency | Target |
|----------------|---------|--------|
| Voice ASR (Sarvam) | ~200ms | < 500ms |
| Intent Classification (Llama 3) | ~450ms | < 1,000ms |
| ONDC / OCEN Agent lookup | ~1ms | < 500ms |
| TOPSIS Ranking | ~1ms | < 100ms |
| Safety Validation (CeRAI) | ~0ms | < 100ms |
| Explanation (Llama 3) | ~800ms | < 1,500ms |
| TTS (Sarvam AI) | ~600ms | < 2,000ms |
| **Total E2E** | **~2.1s** | **< 5s** |

| Accuracy Metric | Score | Test Size |
|-----------------|-------|-----------|
| Intent — Hindi | 95% | 20 queries |
| Intent — Kannada | 85% | 10 queries |
| TOPSIS consistency | 100% | Deterministic |
| Safety catch rate | 100% | 5 predatory cases |
| Language detection | 100% | 11 scripts |

---

## Cost

| Environment | Monthly Cost | Notes |
|-------------|-------------|-------|
| Prototype | **< $8** | 3 of 7 services on AWS Free Tier |
| Production (10K daily users) | **~$305** | ~₹2.5 / user / month |

Viable for government deployment under **Digital India / MeitY**.

---

## Roadmap

### Phase 2 — 3 Months
- [ ] Live ONDC integration via real Beckn Protocol providers
- [ ] OCEN live lenders — real micro-loan disbursement
- [ ] Aadhaar eKYC for credit identity verification
- [ ] WhatsApp integration — 600M+ users, no new app needed
- [ ] Call-in / IVR via PSTN — any feature phone can access
- [ ] RAG-based safety — grounded on 400+ labour law documents

### Phase 3 — 6 Months
- [ ] ABDM Health Records — voice access to medical history
- [ ] AgriStack — crop data, weather alerts, MSP for farmers
- [ ] BharatGen sovereign LLM — replace Llama 3 with India-built model
- [ ] Offline mode (ONNX) — works without internet in rural areas
- [ ] Federated learning — model improves without sharing personal data
- [ ] All 22 official Indian languages

### Vision
Government platform under MeitY / Digital India — 1M+ workers, pan-India.

---

## The Persona

> **Ravi Kumar** — Street vendor, HSR Layout, Bengaluru.  
> Sells vegetables. Speaks Hindi. Owns a feature phone.  
> Needs logistics to send goods to Delhi. Needs a ₹5,000 microloan to restock.  
> Has never used a bank app. Has never filled a government form online.

ShramSetu Saathi is built for Ravi.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*"Every feature phone can be a gateway to government services — no smartphone, no app, no literacy required."*