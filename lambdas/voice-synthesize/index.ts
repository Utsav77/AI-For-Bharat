import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "ap-south-1" });
const BUCKET = process.env.S3_BUCKET || "shramsetu-saathi-sk-2026";
const SARVAM_API_KEY = process.env.SARVAM_API_KEY || "";
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech/stream";

// Map short language codes to Sarvam format
const LANG_CODE_MAP: Record<string, string> = {
  hi: "hi-IN", kn: "kn-IN", ta: "ta-IN", te: "te-IN",
  bn: "bn-IN", gu: "gu-IN", ml: "ml-IN", mr: "mr-IN",
  od: "od-IN", pa: "pa-IN", en: "en-IN"
};

export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const explanation = event.explanation?.body?.explanation_hindi || "Maaf kijiye, koi result nahi mila.";

  // Detect language from explanation result or transcription
  const detectedLang = event.explanation?.body?.language
    || event.intent?.body?.language
    || event.transcription?.body?.language
    || "hi";
  const sarvamLangCode = LANG_CODE_MAP[detectedLang] || "hi-IN";

  const USE_STUB = process.env.USE_STUB === "true";

  if (USE_STUB) {
    const t_tts = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_tts", value: t_tts }));
    return {
      statusCode: 200,
      body: { text: explanation, audioUrl: null, t_tts, language: detectedLang, stub: true }
    };
  }

  try {
    // Call Sarvam AI TTS (bulbul:v3)
    const response = await fetch(SARVAM_TTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": SARVAM_API_KEY
      },
      body: JSON.stringify({
        text: explanation,
        target_language_code: sarvamLangCode,
        speaker: "priya",
        model: "bulbul:v3",
        pace: 1.0,
        speech_sample_rate: 22050,
        output_audio_codec: "mp3",
        enable_preprocessing: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Sarvam TTS failed: ${response.status} ${errorText}`);
    }

    // Get audio as buffer
    const audioBuffer = Buffer.from(await response.arrayBuffer());

    // Upload to S3
    const audioKey = `tts-audio/response-${Date.now()}.mp3`;
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: audioKey,
      Body: audioBuffer,
      ContentType: "audio/mpeg"
    }));

    const audioUrl = `https://${BUCKET}.s3.ap-south-1.amazonaws.com/${audioKey}`;
    const t_tts = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_tts", value: t_tts }));

    return {
      statusCode: 200,
      body: { text: explanation, audioUrl, t_tts, language: detectedLang, source: "sarvam" }
    };
  } catch (error) {
    console.error("Sarvam TTS failed, trying Polly fallback", error);

    // Fallback to Polly
    try {
      const { PollyClient, SynthesizeSpeechCommand } = await import("@aws-sdk/client-polly");
      const polly = new PollyClient({ region: "ap-south-1" });
      const pollyResponse = await polly.send(new SynthesizeSpeechCommand({
        Text: explanation,
        OutputFormat: "mp3",
        VoiceId: "Aditi",
        LanguageCode: "hi-IN"
      }));

      const audioKey = `tts-audio/response-${Date.now()}.mp3`;
      const audioBytes = await pollyResponse.AudioStream?.transformToByteArray();

      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: audioKey,
        Body: audioBytes,
        ContentType: "audio/mpeg"
      }));

      const audioUrl = `https://${BUCKET}.s3.ap-south-1.amazonaws.com/${audioKey}`;
      const t_tts = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_tts", value: t_tts }));

      return {
        statusCode: 200,
        body: { text: explanation, audioUrl, t_tts, language: detectedLang, fallback: "polly" }
      };
    } catch (pollyError) {
      console.error("Polly fallback also failed", pollyError);
      const t_tts = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_tts", value: t_tts }));
      return {
        statusCode: 200,
        body: { text: explanation, audioUrl: null, t_tts, language: detectedLang, fallback: true }
      };
    }
  }
};
