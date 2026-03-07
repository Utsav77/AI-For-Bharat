import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({ region: "ap-south-1" });

const LANG_NAMES: Record<string, string> = {
  hi: "Hindi", kn: "Kannada", ta: "Tamil", te: "Telugu",
  bn: "Bengali", gu: "Gujarati", ml: "Malayalam", mr: "Marathi",
  od: "Odia", pa: "Punjabi", en: "English"
};

const GENERAL_RESPONSES: Record<string, string> = {
  hi: "Namaste! Main Saathi hoon, aapka voice-first assistant. Aap mujhse logistics dhundhne, loan ke liye apply karne, ya apne worker rights ke baare mein puch sakte hain. Boliye, main sunn raha hoon!",
  kn: "Namaskara! Naanu Saathi, nimma voice-first assistant. Logistics, loan, worker rights bagge help maadaballu. Heli, naanu keluttiddene!",
  ta: "Vanakkam! Naan Saathi, ungal voice-first assistant. Logistics, loan, worker rights pathi ketka ennai payanpaduthungal!",
  bn: "Nomoshkar! Ami Saathi, apnar voice-first assistant. Logistics, loan, worker rights somporke jante amake bolun!",
  te: "Namaskaram! Nenu Saathi, mee voice-first assistant. Logistics, loan, worker rights gurinchi adagandi!",
  en: "Hello! I'm Saathi, your voice-first assistant. Ask me about logistics, loans, or worker rights. Go ahead, I'm listening!"
};

export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const topPick = event.topsisResult?.body?.top_pick || {};
  const criteria = event.topsisResult?.body?.criteria_weights || {};
  const intentType = event.intent?.body?.intent_type || "general";
  const safetyResult = event.safetyResult?.body || {};

  const detectedLang = event.intent?.body?.language || event.transcription?.body?.language || "hi";
  const langName = LANG_NAMES[detectedLang] || "Hindi";

  // Get the original user query
  const userQuery = event.transcription?.body?.text || event.text || "";

  // ── GENERAL INTENT → Instant greeting (hardcoded is fine here) ──
  if (intentType === "general") {
    const greeting = GENERAL_RESPONSES[detectedLang] || GENERAL_RESPONSES["hi"];
    const t_llm_explain = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_llm_explain", value: t_llm_explain }));
    return {
      statusCode: 200,
      body: { explanation_hindi: greeting, top_pick: topPick, t_llm_explain, language: detectedLang }
    };
  }

  // ── SAFETY QUERY → LLM answers with worker rights knowledge ──
  if (intentType === "safety_query") {
    try {
      const safetyPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Saathi, a worker rights assistant in India. You know these laws:
- Minimum Wages Act 1948: Workers must get at least ₹176/day
- Factories Act 1948 Section 59: Overtime must be paid at double rate
- Payment of Wages Act 1936: Salary must be paid monthly on time
- ESI Act: Medical insurance for workers earning under ₹21,000/month
- EPF Act: Provident fund contribution mandatory for establishments with 20+ workers
- Contract Labour Act: Contract workers have right to equal wages
- Building & Construction Workers Act: Registration entitles safety equipment, pension
- Unorganised Workers Social Security Act 2008: Street vendors, farmers, gig workers get social security
- MGNREGA: Guaranteed 100 days of work per year for rural households
- Farmer rights: MSP (Minimum Support Price), crop insurance under PMFBY, PM-KISAN ₹6000/year

Answer the worker's question in simple ${langName}. Be warm, practical. Give specific law names and helpline 14434. Keep it to 3-4 sentences.<|eot_id|><|start_header_id|>user<|end_header_id|>
Worker's question: "${userQuery}"

Answer in ${langName}:<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

      const response = await bedrock.send(new InvokeModelCommand({
        modelId: "meta.llama3-8b-instruct-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({ prompt: safetyPrompt, max_gen_len: 500 })
      }));

      const result = JSON.parse(new TextDecoder().decode(response.body));
      const t_llm_explain = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_llm_explain", value: t_llm_explain }));

      return {
        statusCode: 200,
        body: { explanation_hindi: result.generation.trim(), top_pick: topPick, t_llm_explain, language: detectedLang }
      };
    } catch (error) {
      console.error("Safety LLM failed, using fallback", error);
      const fallback = detectedLang === "kn"
        ? "Nimma hakku bagge Labour Commissioner office ge complaint maadi. Helpline: 14434."
        : "Aapke adhikar ke liye Labour Commissioner office mein complaint karein. Helpline: 14434.";
      return {
        statusCode: 200,
        body: { explanation_hindi: fallback, top_pick: topPick, t_llm_explain: Date.now() - startTime, language: detectedLang, fallback: true }
      };
    }
  }

  // ── PROCUREMENT / CREDIT → LLM explains TOPSIS result ──
  try {
    const prompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Saathi, a helpful assistant for Indian workers. You MUST respond in ${langName}. Be warm and practical. Keep it to exactly 2 sentences.<|eot_id|><|start_header_id|>user<|end_header_id|>
Explain why this is the best option for the worker. Respond ONLY in ${langName}.
Top recommendation: ${JSON.stringify(topPick)}
Criteria weights: ${JSON.stringify(criteria)}
Request type: ${intentType}
Safety score: ${safetyResult.safety_score || 1.0}

Two sentences in ${langName} only.<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

    const response = await bedrock.send(new InvokeModelCommand({
      modelId: "meta.llama3-8b-instruct-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({ prompt, max_gen_len: 500 })
    }));

    const result = JSON.parse(new TextDecoder().decode(response.body));
    const t_llm_explain = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_llm_explain", value: t_llm_explain }));

    return {
      statusCode: 200,
      body: { explanation_hindi: result.generation.trim(), top_pick: topPick, t_llm_explain, language: detectedLang }
    };
  } catch (error) {
    console.error("Bedrock failed, using stub", error);
    return {
      statusCode: 200,
      body: {
        explanation_hindi: `${topPick.name || "This"} aapke liye sabse achha option hai.`,
        top_pick: topPick, t_llm_explain: Date.now() - startTime, language: detectedLang, fallback: true
      }
    };
  }
};
