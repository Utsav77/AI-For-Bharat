"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/voice-transcribe/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var handler = async (event) => {
  const startTime = Date.now();
  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };
  if (event.text) {
    const t_asr2 = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_asr", value: t_asr2 }));
    return {
      statusCode: 200,
      body: { text: event.text, language: event.language || "hi", t_asr: t_asr2 }
    };
  }
  const USE_STUB = process.env.USE_BHASHINI_STUB === "true";
  if (USE_STUB) {
    const stubTranscripts = {
      "demo_procurement": "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
      "demo_credit": "Mujhe business ke liye 10,000 rupaye chahiye"
    };
    const text = stubTranscripts[event.demoMode] || stubTranscripts["demo_procurement"];
    const t_asr2 = Date.now() - startTime;
    console.log(JSON.stringify({ metric: "t_asr", value: t_asr2 }));
    return { statusCode: 200, body: { text, language: "hi", t_asr: t_asr2 } };
  }
  if (event.audioBase64) {
    try {
      const audioBuffer = Buffer.from(event.audioBase64, "base64");
      const boundary = "----FormBoundary" + Date.now();
      const formParts = [];
      formParts.push(Buffer.from(
        `--${boundary}\r
Content-Disposition: form-data; name="file"; filename="audio.wav"\r
Content-Type: audio/wav\r
\r
`
      ));
      formParts.push(audioBuffer);
      formParts.push(Buffer.from("\r\n"));
      formParts.push(Buffer.from(
        `--${boundary}\r
Content-Disposition: form-data; name="language_code"\r
\r
${event.language || "hi-IN"}\r
`
      ));
      formParts.push(Buffer.from(
        `--${boundary}\r
Content-Disposition: form-data; name="model"\r
\r
saaras:v3\r
`
      ));
      formParts.push(Buffer.from(
        `--${boundary}\r
Content-Disposition: form-data; name="mode"\r
\r
transcribe\r
`
      ));
      formParts.push(Buffer.from(`--${boundary}--\r
`));
      const bodyBuffer = Buffer.concat(formParts);
      const sarvamResponse = await fetch("https://api.sarvam.ai/speech-to-text", {
        method: "POST",
        headers: {
          "api-subscription-key": process.env.SARVAM_API_KEY,
          "Content-Type": `multipart/form-data; boundary=${boundary}`
        },
        body: bodyBuffer
      });
      const result = await sarvamResponse.json();
      const t_asr2 = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_asr", value: t_asr2 }));
      return {
        statusCode: 200,
        body: {
          text: result.transcript,
          language: event.language || "hi",
          t_asr: t_asr2,
          source: "sarvam"
        }
      };
    } catch (error) {
      console.error("Sarvam STT failed, falling back to stub", error);
      const t_asr2 = Date.now() - startTime;
      console.log(JSON.stringify({ metric: "t_asr", value: t_asr2 }));
      return {
        statusCode: 200,
        body: {
          text: "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
          language: "hi",
          t_asr: t_asr2,
          fallback: true
        }
      };
    }
  }
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
