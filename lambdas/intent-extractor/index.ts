import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const bedrock = new BedrockRuntimeClient({ region: "ap-south-1" });
const dynamo = new DynamoDBClient({ region: "ap-south-1" });

// Keyword-based fallback — ONLY used when LLM fails to parse
function keywordClassify(text: string): { intent_type: string; confidence: number } {
  const lower = text.toLowerCase();

  const procurementKeywords = [
    "logistics", "saman", "bhejni", "bhejn", "transport", "delivery", "courier",
    "parcel", "shipping", "supplier", "order",
    "ಲಾಜಿಸ್ಟಿಕ್ಸ್", "ಕಳುಹಿಸ", "ಸಾಮಾನು", "ಸಾಗಾಣಿಕೆ", "ಡೆಲಿವರಿ", "ಟ್ರಾನ್ಸ್ಪೋರ್ಟ್",
    "லாஜிஸ்டிக்ஸ்", "அனுப்ப", "பொருள்", "போக்குவரத்து",
    "লজিস্টিক", "পাঠা", "জিনিস", "পরিবহন",
    "లాజిస్టిక్స్", "పంపించ", "సామాను", "రవాణా",
    "send", "ship", "deliver", "goods", "supply", "cargo", "freight"
  ];

  const creditKeywords = [
    "loan", "rupaye", "paisa", "credit", "udhar", "karz",
    "ಸಾಲ", "ಹಣ", "ರೂಪಾಯಿ", "ಕ್ರೆಡಿಟ್",
    "கடன்", "பணம்", "ரூபாய்",
    "ঋণ", "টাকা", "লোন",
    "రుణం", "డబ్బు", "లోన్",
    "money", "finance", "borrow", "lend", "interest"
  ];

  const safetyKeywords = [
    "kanoon", "adhikar", "haq", "suraksha", "safety",
    "ಕಾನೂನು", "ಹಕ್ಕು", "ಸುರಕ್ಷತೆ",
    "சட்டம்", "உரிமை", "பாதுகாப்பு",
    "law", "rights", "safety", "labor", "legal", "minimum wage", "overtime"
  ];

  for (const kw of procurementKeywords) {
    if (text.includes(kw) || lower.includes(kw)) {
      return { intent_type: "procurement_search", confidence: 0.85 };
    }
  }
  for (const kw of creditKeywords) {
    if (text.includes(kw) || lower.includes(kw)) {
      return { intent_type: "credit_request", confidence: 0.85 };
    }
  }
  for (const kw of safetyKeywords) {
    if (text.includes(kw) || lower.includes(kw)) {
      return { intent_type: "safety_query", confidence: 0.85 };
    }
  }

  // No keywords matched → genuinely general
  return { intent_type: "general", confidence: 0.7 };
}

// Detect script/language from text
function detectLanguage(text: string): string {
  if (/[\u0C80-\u0CFF]/.test(text)) return "kn";
  if (/[\u0B80-\u0BFF]/.test(text)) return "ta";
  if (/[\u0C00-\u0C7F]/.test(text)) return "te";
  if (/[\u0980-\u09FF]/.test(text)) return "bn";
  if (/[\u0A80-\u0AFF]/.test(text)) return "gu";
  if (/[\u0B00-\u0B7F]/.test(text)) return "od";
  if (/[\u0A00-\u0A7F]/.test(text)) return "pa";
  if (/[\u0D00-\u0D7F]/.test(text)) return "ml";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  return "en";
}

function extractJSON(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.substring(start, end + 1));
  } catch {
    return null;
  }
}

export const handler = async (event: any) => {
  const startTime = Date.now();
  const { text, sessionId, language } = event;

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const detectedLang = detectLanguage(text);
  let intentJson: any;

  try {
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are an intent classifier for an Indian worker assistance app. You handle text in ANY Indian language. Return ONLY valid JSON.<|eot_id|><|start_header_id|>user<|end_header_id|>
Classify this text into one intent type.
Text: "${text}"

Intent types:
- procurement_search: logistics, shipping, sending goods, suppliers, delivery, transport
- credit_request: loan, money, credit, borrowing, financial help
- safety_query: labor laws, worker rights, safety regulations, legal help
- general: greetings, casual chat, questions about the app, anything else

Return ONLY: {"intent_type":"...","entities":{},"confidence":0.0-1.0,"language":"${detectedLang}"}<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "meta.llama3-8b-instruct-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ prompt, max_gen_len: 200 })
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    intentJson = extractJSON(result.generation);

    // LLM failed to return valid JSON → use keyword fallback
    if (!intentJson) {
      const kwResult = keywordClassify(text);
      intentJson = {
        intent_type: kwResult.intent_type,
        entities: {},
        confidence: kwResult.confidence,
        language: detectedLang
      };
    }

    // LLM returned "general" → double-check with keywords
    // (catches Kannada/Tamil logistics that LLM can't understand)
    if (intentJson.intent_type === "general") {
      const kwResult = keywordClassify(text);
      if (kwResult.intent_type !== "general") {
        // Keywords found a real intent → override LLM
        intentJson.intent_type = kwResult.intent_type;
        intentJson.confidence = kwResult.confidence;
      }
      // else: keywords also say "general" → keep it as "general"
    }

  } catch (error) {
    console.error("LLM classification failed, using keyword fallback", error);
    const kwResult = keywordClassify(text);
    intentJson = {
      intent_type: kwResult.intent_type,
      entities: {},
      confidence: kwResult.confidence,
      language: detectedLang
    };
  }

  intentJson.language = detectedLang;

  const t_llm_intent = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_llm_intent", value: t_llm_intent }));

  await dynamo.send(new PutItemCommand({
    TableName: "shramsetu-sessions",
    Item: {
      sessionId: { S: sessionId },
      text: { S: text },
      intent: { S: JSON.stringify(intentJson) },
      timestamp: { S: new Date().toISOString() },
      ttl: { N: String(Math.floor(Date.now() / 1000) + 86400) }
    }
  }));

  return { statusCode: 200, body: { ...intentJson, t_llm_intent, sessionId } };
};
