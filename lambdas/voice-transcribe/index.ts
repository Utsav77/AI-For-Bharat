export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  // Path 1: Text provided directly (from frontend text input or Web Speech API)
  if (event.text) {
    const t_asr = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_asr", value: t_asr }));
    return {
      statusCode: 200,
      body: { text: event.text, language: event.language || "hi", t_asr }
    };
  }

  // Path 2: Stub mode (hardcoded demo transcripts)
  const USE_STUB = process.env.USE_BHASHINI_STUB === "true";
  if (USE_STUB) {
    const stubTranscripts: Record<string, string> = {
      "demo_procurement": "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
      "demo_credit": "Mujhe business ke liye 10,000 rupaye chahiye"
    };
    const text = stubTranscripts[event.demoMode] || stubTranscripts["demo_procurement"];
    const t_asr = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_asr", value: t_asr }));
    return { statusCode: 200, body: { text, language: "hi", t_asr } };
  }

  // Path 3: Real Sarvam AI STT (when audio is provided)
  if (event.audioBase64) {
    try {
      const audioBuffer = Buffer.from(event.audioBase64, "base64");
      const boundary = "----FormBoundary" + Date.now();
      
      // Build multipart/form-data manually (no external deps needed)
      const formParts: Buffer[] = [];
      
      // File field
      formParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.wav"\r\nContent-Type: audio/wav\r\n\r\n`
      ));
      formParts.push(audioBuffer);
      formParts.push(Buffer.from("\r\n"));
      
      // Language field
      formParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language_code"\r\n\r\n${event.language || "hi-IN"}\r\n`
      ));
      
      // Model field
      formParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\nsaaras:v3\r\n`
      ));
      
      // Mode field
      formParts.push(Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="mode"\r\n\r\ntranscribe\r\n`
      ));
      
      // Closing boundary
      formParts.push(Buffer.from(`--${boundary}--\r\n`));
      
      const bodyBuffer = Buffer.concat(formParts);

      const sarvamResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY!,
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: bodyBuffer
      });

      const result = await sarvamResponse.json() as any;
      const t_asr = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_asr", value: t_asr }));

      return {
        statusCode: 200,
        body: {
          text: result.transcript,
          language: event.language || "hi",
          t_asr,
          source: "sarvam"
        }
      };
    } catch (error) {
      console.error("Sarvam STT failed, falling back to stub", error);
      const t_asr = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_asr", value: t_asr }));
      return {
        statusCode: 200,
        body: {
          text: "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
          language: "hi",
          t_asr,
          fallback: true
        }
      };
    }
  }

  // Path 4: No text and no audio — default to stub
  const t_asr = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_asr", value: t_asr }));
  return {
    statusCode: 200,
    body: {
      text: "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
      language: "hi",
      t_asr,
      fallback: true
    }
  };
};
