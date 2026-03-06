import { useState, useEffect, useRef, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  Mic, MicOff, Send, ShoppingCart, CreditCard, Scale, Shield, Volume2,
  ChevronRight, ChevronDown, BarChart2, Loader, CheckCircle, Circle,
  ArrowLeft, Wifi, ChevronUp, Menu, X, Zap, AlertCircle
} from "lucide-react";

// ─── TYPES ───
type UIMode = "voice" | "dashboard";
type AppState = "idle" | "recording" | "processing" | "results" | "error";
type ActiveTab = "procurement" | "credit" | "safety";

// ─── API RESPONSE TYPES ───
interface ApiProvider {
  providerId: string;
  name: string;
  price_inr: number;
  delivery_days: number;
  rating: number;
  accepts_credit: number | boolean;
  topsis_score: number;
  commission_pct?: number;
  coverage_pincode?: string;
}

interface ApiResponse {
  sessionId?: string;
  language?: string;
  text?: string;
  intent?: {
    statusCode: number;
    body: {
      intent_type: string;
      confidence: number;
      entities?: Record<string, unknown>;
      t_llm_intent?: number;
    };
  };
  agentResult?: {
    statusCode: number;
    body: {
      options: ApiProvider[];
      criteria_weights: Record<string, number>;
      source?: string;
    };
  };
  topsisResult?: {
    statusCode: number;
    body: {
      ranked_options: ApiProvider[];
      top_pick: ApiProvider;
      criteria_weights: Record<string, number>;
      t_topsis?: number;
    };
  };
  safetyResult?: {
    statusCode: number;
    body: {
      safety_score: number;
      is_safe: boolean;
      action: string;
      flags: string[];
    };
  };
  explanation?: {
    statusCode: number;
    body: {
      explanation_hindi: string;
      top_pick: ApiProvider;
      t_llm_explain?: number;
    };
  };
  ttsResult?: {
    statusCode: number;
    body: {
      audioUrl: string;
      text: string;
      t_tts?: number;
    };
  };
}

// ─── CONSTANTS ───
const API_URL = "https://ei1hvlz5vg.execute-api.ap-south-1.amazonaws.com/query";

// ─── SARVAM AI ───
const SARVAM_STT_URL = "https://api.sarvam.ai/speech-to-text";
const SARVAM_TTS_URL = "https://api.sarvam.ai/text-to-speech/stream";
const SARVAM_API_KEY = "sk_5xm1xivc_SAFLKMb679QQFVUJacJgXsNp";

// Best speaker per language for informal worker context (warm female voice)
const SARVAM_SPEAKER: Record<string, string> = {
  "हिंदी": "kavya",
  "ಕನ್ನಡ": "suhani",   // closest warm female for Kannada
  "தமிழ்": "priya",
  "বাংলা":  "neha",
};

const LANG_TO_BCP47: Record<string, string> = {
  "हिंदी": "hi-IN",
  "ಕನ್ನಡ": "kn-IN",
  "தமிழ்": "ta-IN",
  "বাংলা": "bn-IN",
};

const LANG_TO_CODE: Record<string, string> = {
  "हिंदी": "hi",
  "ಕನ್ನಡ": "kn",
  "தமிழ்": "ta",
  "বাংলা": "bn",
};

// ─── MOCK DATA ───
const RAVI = {
  name: "Ravi Kumar", nameHindi: "रवि कुमार",
  location: "HSR Layout, Bangalore",
  business: "Street Vendor", creditBand: "MEDIUM",
  maxLoan: 10000, ondcMonths: 6,
  avgMonthly: 20000, avgTxnCount: 45, creds: 3,
  txnHistory: [
    { month: "Aug", amt: 18500 }, { month: "Sep", amt: 21000 },
    { month: "Oct", amt: 19200 }, { month: "Nov", amt: 22100 },
    { month: "Dec", amt: 20800 }, { month: "Jan", amt: 18400 }
  ]
};

const ONDC = [
  { id: 1, name: "Ekart Logistics", price: 380, days: 3, rating: 4.5, credit: true, score: 84.7, rank: 1 },
  { id: 2, name: "ONDC Credit Co-op", price: 320, days: 3, rating: 3.5, credit: true, score: 71.2, rank: 2 },
  { id: 3, name: "Namma Cargo Co-op", price: 320, days: 3, rating: 3.5, credit: true, score: 68.4, rank: 3 },
  { id: 4, name: "DTDC Premium", price: 410, days: 2, rating: 4.0, credit: false, score: 54.1, rank: 4 },
  { id: 5, name: "Delhivery Express", price: 450, days: 2, rating: 4.2, credit: true, score: 49.8, rank: 5 },
  { id: 6, name: "ShipRocket Economy", price: 350, days: 4, rating: 4.1, credit: false, score: 44.2, rank: 6 },
  { id: 7, name: "Karnataka Local", price: 280, days: 4, rating: 3.8, credit: false, score: 38.9, rank: 7 },
];

const OCEN = [
  { id: 1, name: "NanoFin Microloan", rate: 12.5, tenure: "Flexible", penalty: "None", disburse: "2 hrs", score: 81.2, rank: 1 },
  { id: 2, name: "ONDC Credit Co-op", rate: 11.0, tenure: "Flexible", penalty: "1%", disburse: "3 hrs", score: 74.8, rank: 2 },
  { id: 3, name: "Jan Dhan Micro", rate: 10.0, tenure: "Fixed", penalty: "5%", disburse: "1 hr", score: 61.3, rank: 3 },
  { id: 4, name: "StreetCredit Finance", rate: 15.0, tenure: "Semi-flex", penalty: "2.5%", disburse: "4 hrs", score: 52.1, rank: 4 },
];

const DEMO_QUERIES: Record<ActiveTab, string> = {
  procurement: "Mujhe logistics chahiye, HSR Layout se Dilli bhejni hai",
  credit: "Mujhe business ke liye 10,000 rupaye chahiye",
  safety: "Overtime ke paise nahi mile, kya karna chahiye?"
};

const HINDI_RESPONSES: Record<ActiveTab, string> = {
  procurement: "Ekart Logistics sabse achha option hai — ₹380 mein 3 din mein delivery ho jayegi aur credit bhi milega. Rating 4.5 hai jo sabse zyada hai, isliye yahi aapke liye best choice hai Ravi bhai.",
  credit: "NanoFin se ₹10,000 ka loan 12.5% rate pe milega, sirf 2 ghante mein disburse hoga. Prepayment penalty bhi nahi hai, toh jab chaaho tab chuka sakte ho Ravi bhai.",
  safety: "Aapko overtime ke liye double rate milna chahiye jo Factories Act 1948 ke Section 59 mein clearly likha hai. Agar employer nahi de raha toh nearest Labour Commissioner office mein complaint karo.",
};

const ENGLISH_RESPONSES: Record<ActiveTab, string> = {
  procurement: "Ekart Logistics is the best option — delivery in 3 days for ₹380 with credit availability. Its 4.5 rating is the highest among all 7 providers.",
  credit: "NanoFin Microloan offers ₹10,000 at 12.5% p.a., disbursed in 2 hours with no prepayment penalty — the best terms available to you.",
  safety: "You are entitled to double pay for overtime under Section 59 of the Factories Act 1948. If your employer refuses, file a complaint at the nearest Labour Commissioner office.",
};

const PROCESSING_LABELS = [
  { label: "ASR", sub: "Web Speech · hi-IN" },
  { label: "Intent", sub: "procurement_search · 94%" },
  { label: "ONDC", sub: "7 providers · Beckn Protocol" },
  { label: "TOPSIS", sub: "Ranked · 4 criteria" },
  { label: "Safety", sub: "Score 0.95 · PROCEED" },
  { label: "Hindi", sub: "Claude Sonnet · 142 chars" },
];

const HINDI_SPEAKING: Record<ActiveTab, { steps: number[]; text: string }[]> = {
  procurement: [
    { steps: [0, 1], text: "समझ रहा हूँ..." },
    { steps: [2], text: "ONDC पर ढूंढ रहा हूँ..." },
    { steps: [3, 4], text: "बेहतरीन option चुन रहा हूँ..." },
    { steps: [5], text: "मिल गया! सुनिए..." },
  ],
  credit: [
    { steps: [0, 1], text: "समझ रहा हूँ..." },
    { steps: [2], text: "लोन options ढूंढ रहा हूँ..." },
    { steps: [3, 4], text: "सबसे अच्छा offer चुन रहा हूँ..." },
    { steps: [5], text: "मिल गया! सुनिए..." },
  ],
  safety: [
    { steps: [0, 1], text: "समझ रहा हूँ..." },
    { steps: [2, 3], text: "कानून देख रहा हूँ..." },
    { steps: [4, 5], text: "आपका जवाब तैयार है..." },
  ],
};

const EXAMPLE_CHIPS: Record<ActiveTab, string[]> = {
  procurement: ["Bangalore se Delhi logistics chahiye", "5kg parcel ka sabse sasta courier", "OCEN credit accept karne wala"],
  credit: ["₹5,000 ka business loan chahiye", "Mujhe ₹10,000 ki zaroorat hai", "Loan eligibility check karo"],
  safety: ["Overtime pay ke rules kya hain?", "Karnataka mein minimum wage?", "Employer paise kaat sakta hai?"],
};

// ─── STYLES ───
const S = {
  glass: {
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(20px) saturate(180%)",
    WebkitBackdropFilter: "blur(20px) saturate(180%)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 16,
  } as React.CSSProperties,
  saffronGlow: "0 0 0 1px rgba(249,115,22,0.3), 0 0 24px rgba(249,115,22,0.2), 0 0 48px rgba(249,115,22,0.1)",
  noise: `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/><feColorMatrix type='saturate' values='0'/></filter><rect width='200' height='200' filter='url(%23n)' opacity='0.03'/></svg>")`,
  tricolor: "linear-gradient(90deg, #FF9933 0%, #FF9933 33.3%, #FFFFFF 33.3%, #FFFFFF 66.6%, #138808 66.6%, #138808 100%)",
  mono: "'JetBrains Mono', monospace",
  hindi: "'Noto Sans Devanagari', 'Mangal', sans-serif",
  serif: "'DM Serif Display', Georgia, serif",
};

// ─── COMPONENT ───
export default function ShramSetuSaathi() {
  // ── State ──
  const [uiMode, setUiMode] = useState<UIMode>("voice");
  const [appState, setAppState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState<ActiveTab>("procurement");
  const [currentQuery, setCurrentQuery] = useState("");
  const [textInput, setTextInput] = useState("");
  const [interimText, setInterimText] = useState("");   // live speech transcript
  const [processingStep, setProcessingStep] = useState(0);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioReadyToPlay, setAudioReadyToPlay] = useState(false); // triggers autoplay when TTS arrives
  const [hindiCharIndex, setHindiCharIndex] = useState(0);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState("हिंदी");
  const [showEnglish, setShowEnglish] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latencyData, setLatencyData] = useState<{ total: string; asr: string; ai: string; tts: string } | null>(null);
  const [showLatency, setShowLatency] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [apiAudioUrl, setApiAudioUrl] = useState<string | null>(null);

  // ── Live API data (populated from response, fallback to hardcoded) ──
  const [apiRankedOptions, setApiRankedOptions] = useState<ApiProvider[] | null>(null);
  const [apiTopPick, setApiTopPick] = useState<ApiProvider | null>(null);
  const [apiHindiExplanation, setApiHindiExplanation] = useState<string | null>(null);
  const [apiSafetyScore, setApiSafetyScore] = useState<number | null>(null);
  const [apiConfidence, setApiConfidence] = useState<number | null>(null);
  const [apiIntentType, setApiIntentType] = useState<string | null>(null);
  const [apiCriteriaWeights, setApiCriteriaWeights] = useState<Record<string, number> | null>(null);
  const [apiLatencies, setApiLatencies] = useState<{ topsis: number; llm: number; tts: number } | null>(null);

  // Sidebar count-up
  const [countMonths, setCountMonths] = useState(0);
  const [countTxns, setCountTxns] = useState(0);
  const [countAvg, setCountAvg] = useState(0);
  const [countCreds, setCountCreds] = useState(0);

  // Score ring animation
  const [scoreAnimated, setScoreAnimated] = useState(false);
  const [needleAnimated, setNeedleAnimated] = useState(false);

  // ── Refs ──
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef(`session-${Date.now()}`);
  const finalTranscriptRef = useRef("");
  const asrStartRef = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Ref that always points to the latest callAPI — breaks the circular
  // useCallback dependency (startRecording is declared before callAPI)
  const callAPIRef = useRef<((query: string, asrMs?: number) => Promise<void>) | null>(null);

  // Sarvam STT — show "Transcribing..." between stop-tap and backend call
  const [sarvamSTTStatus, setSarvamSTTStatus] = useState<"idle" | "transcribing" | "done">("idle");

  // ─────────────────────────────────────────────
  //  SARVAM STT — call speech-to-text API
  // ─────────────────────────────────────────────
  const callSarvamSTT = useCallback(async (audioBlob: Blob): Promise<string | null> => {
    setSarvamSTTStatus("transcribing");
    try {
      // Derive file extension from blob type ("audio/webm" → "webm", "audio/mp4" → "mp4")
      const ext = audioBlob.type.split("/")[1] || "webm";
      const formData = new FormData();
      formData.append("file", audioBlob, `recording.${ext}`);
      formData.append("language_code", LANG_TO_BCP47[selectedLang] || "hi-IN");
      formData.append("model", "saarika:v2.5");
      formData.append("mode", "transcribe");

      const res = await fetch(SARVAM_STT_URL, {
        method: "POST",
        headers: { "api-subscription-key": SARVAM_API_KEY },
        body: formData,
      });

      if (!res.ok) throw new Error(`Sarvam STT ${res.status}`);
      const data = await res.json();
      const transcript = data.transcript?.trim() ?? "";
      setSarvamSTTStatus("done");
      return transcript || null;
    } catch (err) {
      console.warn("Sarvam STT failed, trying Web Speech fallback:", err);
      setSarvamSTTStatus("idle");
      return null;
    }
  }, [selectedLang]);

  // ─────────────────────────────────────────────
  //  SARVAM TTS — call text-to-speech API
  // ─────────────────────────────────────────────
  const callSarvamTTS = useCallback(async (text: string): Promise<HTMLAudioElement | null> => {
    try {
      const payload = {
        text,
        target_language_code: LANG_TO_BCP47[selectedLang] || "hi-IN",
        speaker: SARVAM_SPEAKER[selectedLang] || "kavya",
        model: "bulbul:v3",
        pace: 1.0,
        speech_sample_rate: 22050,
        output_audio_codec: "mp3",
        enable_preprocessing: true,
      };

      const res = await fetch(SARVAM_TTS_URL, {
        method: "POST",
        headers: {
          "api-subscription-key": SARVAM_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Sarvam TTS ${res.status}`);

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const audio = new Audio(objectUrl);
      audio.onended = () => {
        setAudioPlaying(false);
        URL.revokeObjectURL(objectUrl);   // clean up blob URL after playback
      };
      return audio;
    } catch (err) {
      console.warn("Sarvam TTS failed:", err);
      return null;
    }
  }, [selectedLang]);

  // ─────────────────────────────────────────────
  //  MEDIARECORDER — start / stop recording
  // ─────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setSpeechError(null);
    setInterimText("");
    setSarvamSTTStatus("idle");
    audioChunksRef.current = [];

    // ── AUTOPLAY UNLOCK ──
    const silent = new Audio("data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA");
    silent.play().catch(() => {});

    // Request mic permission
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err: any) {
      const msg = err?.name === "NotAllowedError"
        ? "Microphone permission denied. Click 🔒 in Chrome's address bar to allow."
        : "Microphone not available. Please check your device.";
      setSpeechError(msg);
      setAppState("error");
      return;
    }

    const recorderMime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
      ? "audio/webm"
      : "audio/mp4";
    const sarvamMime = recorderMime.split(";")[0];

    const recorder = new MediaRecorder(stream, { mimeType: recorderMime });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach(t => t.stop());

      const blob = new Blob(audioChunksRef.current, { type: sarvamMime });
      if (blob.size < 1000) {
        setInterimText("");
        setAppState("idle");
        setSarvamSTTStatus("idle");
        return;
      }

      setInterimText("सुन रहा हूँ... / Transcribing...");

      const asrMs = Date.now() - asrStartRef.current;
      const transcript = await callSarvamSTT(blob);

      if (transcript) {
        setCurrentQuery(transcript);
        setTextInput(transcript);
        setInterimText(transcript);
        setAppState("processing");
        callAPIRef.current?.(transcript, asrMs);
      } else {
        setInterimText("");
        setSpeechError("Could not understand audio. Please speak clearly and try again.");
        setAppState("error");
      }
    };

    // ── VOICE ACTIVITY DETECTION ──
    // Mirror webkitSpeechRecognition UX: auto-stop after 1.5s of silence.
    // Uses Web Audio AnalyserNode to measure RMS volume 30× per second.
    const VAD_SILENCE_MS   = 1500;  // stop after this much continuous silence
    const VAD_SPEECH_MS    = 300;   // must hear speech for this long before VAD activates
    const VAD_THRESHOLD    = 10;    // RMS below this = silence (0–255 scale)

    const audioCtx  = new AudioContext();
    const source    = audioCtx.createMediaStreamSource(stream);
    const analyser  = audioCtx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    const dataArray  = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = 0;
    let speechDetected = false;   // VAD only activates after user has spoken
    let speechStart  = 0;
    let vadActive    = true;

    const checkVAD = () => {
      if (!vadActive) return;

      analyser.getByteFrequencyData(dataArray);
      // RMS of frequency bins
      const rms = Math.sqrt(dataArray.reduce((s, v) => s + v * v, 0) / dataArray.length);
      const now = Date.now();

      if (rms > VAD_THRESHOLD) {
        // Sound detected
        silenceStart = 0;
        if (!speechDetected) {
          if (speechStart === 0) speechStart = now;
          if (now - speechStart >= VAD_SPEECH_MS) {
            speechDetected = true;   // user has spoken long enough — VAD now armed
          }
        }
      } else {
        // Silence
        if (speechDetected) {
          if (silenceStart === 0) silenceStart = now;
          if (now - silenceStart >= VAD_SILENCE_MS) {
            // Auto-stop: user spoke then went silent
            vadActive = false;
            audioCtx.close();
            if (mediaRecorderRef.current?.state === "recording") {
              mediaRecorderRef.current.stop();
              mediaRecorderRef.current = null;
            }
            return;
          }
        } else {
          // Reset speech detection if silence before speech
          speechStart = 0;
        }
      }

      requestAnimationFrame(checkVAD);
    };

    // Give the recorder a 300ms head start before VAD begins sampling
    setTimeout(() => requestAnimationFrame(checkVAD), 300);

    asrStartRef.current = Date.now();
    recorder.start();
    mediaRecorderRef.current = recorder;
    setAppState("recording");
  }, [callSarvamSTT, selectedLang]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    // Legacy Web Speech fallback cleanup
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  // ─────────────────────────────────────────────
  //  API CALL — POST transcript to backend
  // ─────────────────────────────────────────────
  const callAPI = useCallback(async (query: string, asrMs?: number) => {
    const asrSec = asrMs ? (asrMs / 1000).toFixed(1) : "0.8";

    try {
      const payload = {
        query,
        sessionId: sessionIdRef.current,
        language: LANG_TO_CODE[selectedLang] || "hi",
        workerId: "ravi_kumar_hsr",
      };

      const t0 = Date.now();
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`API ${response.status}`);

      const data: ApiResponse = await response.json();
      const apiMs = Date.now() - t0;

      // ── 1. Intent → active tab ──
      const intentType = data.intent?.body?.intent_type ?? "";
      setApiIntentType(intentType);
      setApiConfidence(data.intent?.body?.confidence ?? null);

      if (intentType.includes("credit") || intentType.includes("loan")) {
        setActiveTab("credit");
      } else if (
        intentType.includes("safety") ||
        intentType.includes("labour") ||
        intentType.includes("legal")
      ) {
        setActiveTab("safety");
      } else {
        setActiveTab("procurement");
      }

      // ── 2. TOPSIS ranked options ──
      const ranked = data.topsisResult?.body?.ranked_options ?? null;
      const topPick = data.topsisResult?.body?.top_pick ?? null;
      setApiRankedOptions(ranked);
      setApiTopPick(topPick);
      setApiCriteriaWeights(data.topsisResult?.body?.criteria_weights ?? null);

      // ── 3. Safety score ──
      setApiSafetyScore(data.safetyResult?.body?.safety_score ?? null);

      // ── 4. Hindi explanation ──
      const hindiText = data.explanation?.body?.explanation_hindi ?? null;
      setApiHindiExplanation(hindiText);

      // ── 5. TTS via Sarvam AI — generate audio from Hindi explanation ──
      // We use Sarvam TTS (not backend Polly) for richer Indian language voices.
      // callSarvamTTS is called here — still within the user gesture call stack —
      // so the resulting Audio element is pre-unlocked for autoplay.
      if (hindiText) {
        const sarvamAudio = await callSarvamTTS(hindiText);
        if (sarvamAudio) {
          audioRef.current = sarvamAudio;
          setApiAudioUrl("sarvam");
          setAudioReadyToPlay(true); // signal useEffect — audio is ready
        } else {
          // Sarvam TTS failed — fall back to backend Polly URL if present
          const pollyUrl = data.ttsResult?.body?.audioUrl ?? null;
          if (pollyUrl) {
            setApiAudioUrl(pollyUrl);
            const audio = new Audio(pollyUrl);
            audio.preload = "auto";
            audio.onended = () => setAudioPlaying(false);
            audioRef.current = audio;
            setAudioReadyToPlay(true);
          }
        }
      } else {
        // No explanation text — try backend Polly URL
        const pollyUrl = data.ttsResult?.body?.audioUrl ?? null;
        if (pollyUrl) {
          setApiAudioUrl(pollyUrl);
          const audio = new Audio(pollyUrl);
          audio.preload = "auto";
          audio.onended = () => setAudioPlaying(false);
          audioRef.current = audio;
          setAudioReadyToPlay(true);
        }
      }

      // ── 6. Internal latencies from response ──
      const topsisMs  = data.topsisResult?.body?.t_topsis ?? 0;
      const llmMs     = data.explanation?.body?.t_llm_explain ?? 529;
      const ttsMs     = data.ttsResult?.body?.t_tts ?? 257;
      setApiLatencies({ topsis: topsisMs, llm: llmMs, tts: ttsMs });

      // ── 7. Latency ticker ──
      const aiSec  = (apiMs / 1000).toFixed(1);
      const ttsSec = (ttsMs / 1000).toFixed(2);
      setLatencyData({
        total: (parseFloat(asrSec) + parseFloat(aiSec) + parseFloat(ttsSec)).toFixed(1),
        asr: asrSec, ai: aiSec, tts: ttsSec,
      });
      setShowLatency(true);
      setTimeout(() => setShowLatency(false), 8000);

    } catch (err) {
      // Non-fatal — demo data will display, just show simulated latency
      console.warn("API call failed, falling back to demo data:", err);
      const aiSec  = (1.2 + Math.random() * 0.5).toFixed(1);
      const ttsSec = (0.4 + Math.random() * 0.3).toFixed(1);
      setLatencyData({
        total: (parseFloat(asrSec) + parseFloat(aiSec) + parseFloat(ttsSec)).toFixed(1),
        asr: asrSec, ai: aiSec, tts: ttsSec,
      });
      setShowLatency(true);
      setTimeout(() => setShowLatency(false), 8000);
    }
  }, [selectedLang]);

  // Keep callAPIRef in sync so startRecording (declared before callAPI) can call it
  callAPIRef.current = callAPI;

  // ─────────────────────────────────────────────
  //  TEXT SUBMIT (chips / input bar)
  // ─────────────────────────────────────────────
  const submitQuery = useCallback((q: string) => {
    if (!q.trim()) return;
    setCurrentQuery(q);
    setTextInput(q);
    setInterimText(q);
    setTimeout(() => {
      setAppState("processing");
      callAPI(q);
    }, 200);
  }, [callAPI]);

  // ─────────────────────────────────────────────
  //  PROCESSING PIPELINE ANIMATION
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (appState !== "processing") return;
    setProcessingStep(0);
    setHindiCharIndex(0);
    setAudioPlaying(false);
    setShowEnglish(false);
    setScoreAnimated(false);
    setNeedleAnimated(false);
    let step = 0;
    const iv = setInterval(() => {
      step++;
      setProcessingStep(step);
      if (step >= 6) {
        clearInterval(iv);
        setTimeout(() => {
          setAppState("results");
          setTimeout(() => setScoreAnimated(true), 100);
          setTimeout(() => setNeedleAnimated(true), 100);
        }, 400);
      }
    }, 400);
    return () => clearInterval(iv);
  }, [appState]);

  // ─────────────────────────────────────────────
  //  AUTO-PLAY TTS AUDIO when results appear
  //  Fires when BOTH conditions are true:
  //    1. appState === "results"  (animation done)
  //    2. audioReadyToPlay       (TTS download done)
  //  Whichever arrives last triggers the play.
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (appState !== "results" || !audioReadyToPlay) return;

    const audio = audioRef.current;
    if (audio) {
      const triggerPlay = () => {
        audio.currentTime = 0;
        setAudioPlaying(true);
        audio.play().catch(() => {
          setTimeout(() => setAudioPlaying(false), 3000);
        });
      };
      if (audio.readyState >= 4) {
        triggerPlay();
      } else {
        audio.addEventListener("canplaythrough", triggerPlay, { once: true });
      }
    } else {
      // No audio at all — just animate waveform
      setAudioPlaying(true);
      setTimeout(() => setAudioPlaying(false), 3000);
    }
  }, [appState, audioReadyToPlay]);

  // ─────────────────────────────────────────────
  //  TYPEWRITER for Hindi response
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (appState !== "results") return;
    setHindiCharIndex(0);
    // Prefer live API explanation; fall back to hardcoded
    const text = apiHindiExplanation || HINDI_RESPONSES[activeTab];
    const iv = setInterval(() => {
      setHindiCharIndex(prev => {
        if (prev >= text.length) { clearInterval(iv); return prev; }
        return prev + 1;
      });
    }, 25);
    return () => clearInterval(iv);
  }, [appState, activeTab, apiHindiExplanation]);

  // ─────────────────────────────────────────────
  //  SIDEBAR COUNT-UP
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (uiMode !== "dashboard") return;
    const targets = [
      { set: setCountMonths, target: RAVI.ondcMonths, delay: 0 },
      { set: setCountTxns, target: RAVI.avgTxnCount, delay: 150 },
      { set: setCountAvg, target: RAVI.avgMonthly, delay: 300 },
      { set: setCountCreds, target: RAVI.creds, delay: 450 },
    ];
    targets.forEach(({ set, target, delay }) => {
      setTimeout(() => {
        const steps = 30;
        const inc = target / steps;
        let current = 0;
        const iv = setInterval(() => {
          current += inc;
          if (current >= target) { set(target); clearInterval(iv); }
          else set(Math.floor(current));
        }, 1500 / steps);
      }, delay);
    });
  }, [uiMode]);

  const resetToIdle = useCallback(() => {
    stopRecording();
    // Stop MediaRecorder if still running
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    // Stop any playing audio immediately
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setSarvamSTTStatus("idle");
    setAudioReadyToPlay(false);
    setAppState("idle");
    setCurrentQuery("");
    setTextInput("");
    setInterimText("");
    setProcessingStep(0);
    setHindiCharIndex(0);
    setShowAllOptions(false);
    setShowEnglish(false);
    setSpeechError(null);
    setApiAudioUrl(null);
    // Clear live API data so next query starts fresh
    setApiRankedOptions(null);
    setApiTopPick(null);
    setApiHindiExplanation(null);
    setApiSafetyScore(null);
    setApiConfidence(null);
    setApiIntentType(null);
    setApiCriteriaWeights(null);
    setApiLatencies(null);
  }, [stopRecording]);

  const getCurrentSpeakingText = useCallback(() => {
    const msgs = HINDI_SPEAKING[activeTab];
    for (const m of msgs) {
      if (m.steps.includes(processingStep)) return m.text;
    }
    return msgs[0]?.text || "";
  }, [activeTab, processingStep]);

  // ─── TRICOLOR STRIP ───
  const TricolorStrip = () => (
    <div style={{ height: 3, background: S.tricolor, width: "100%" }} />
  );

  // ─── PIPELINE ICONS ───
  const PipelineIcon = ({ index, size = 16 }: { index: number; size?: number }) => {
    const icons = [Mic, Zap, ShoppingCart, BarChart2, Shield, Volume2];
    const Icon = icons[index];
    return <Icon size={size} />;
  };

  // ─── AUDIO WAVEFORM ───
  const AudioWaveform = ({ playing }: { playing: boolean }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 3, height: 40 }}>
      {[0, 0.1, 0.2, 0.1, 0].map((delay, i) => (
        <div key={i} style={{
          width: 6, borderRadius: 4, background: "var(--saffron)",
          animation: `audioBar 0.8s ease-in-out infinite ${delay}s`,
          animationPlayState: playing ? "running" : "paused",
          height: 8,
        }} />
      ))}
    </div>
  );

  // ─── SAFETY BADGE ───
  const SafetyBadge = ({ score = 0.95, delayed = true }: { score?: number; delayed?: boolean }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: score >= 0.8 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
      border: `1px solid ${score >= 0.8 ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      borderRadius: 999, padding: "5px 12px",
      animation: delayed ? "slideInRight 0.4s ease-out 0.6s both" : "none",
    }}>
      <Shield size={14} color={score >= 0.8 ? "var(--emerald)" : "var(--red)"} />
      <span style={{ fontFamily: S.mono, fontSize: 12, color: score >= 0.8 ? "var(--emerald)" : "var(--red)" }}>
        {score >= 0.8 ? "✓ Safe · " : "⚠ Review · "}{score}
      </span>
    </div>
  );

  // ─── TOPSIS SCORE RING ───
  const ScoreRing = ({ score, size = 100 }: { score: number; size?: number }) => {
    const r = (size / 2) - 12;
    const c = 2 * Math.PI * r;
    const offset = c - (score / 100) * c;
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#FCD34D" />
          </linearGradient>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="url(#saffronGrad)" strokeWidth={8}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={scoreAnimated ? offset : c}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x={size/2} y={size/2 - 2} textAnchor="middle" dominantBaseline="central"
          style={{ fontFamily: S.mono, fontSize: 16, fontWeight: 700, fill: "var(--text-primary)" }}>{score}</text>
        <text x={size/2} y={size/2 + 14} textAnchor="middle"
          style={{ fontFamily: S.mono, fontSize: 10, fill: "var(--text-muted)" }}>%</text>
      </svg>
    );
  };

  // ─── VOICE MODE HEADER ───
  const VoiceHeader = () => (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(6,11,24,0.97)", backdropFilter: "blur(16px)",
    }}>
      <TricolorStrip />
      <div style={{
        height: 53, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", maxWidth: 1200, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ color: "var(--saffron)", fontSize: 22, fontWeight: 700 }}>☸</span>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text-primary)" }}>ShramSetu Saathi</div>
            <div style={{ fontFamily: S.hindi, fontSize: 11, color: "var(--text-secondary)" }}>श्रमसेतु साथी</div>
          </div>
        </div>
        <button onClick={() => setUiMode("dashboard")} style={{
          background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.35)",
          borderRadius: 999, padding: "6px 14px", color: "var(--saffron)", fontSize: 12,
          cursor: "pointer", transition: "all 200ms",
        }}>📊 Dashboard →</button>
      </div>
    </header>
  );

  // ─── DASHBOARD HEADER ───
  const DashboardHeader = () => (
    <header style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
      background: "rgba(6,11,24,0.97)", backdropFilter: "blur(16px)",
    }}>
      <TricolorStrip />
      <div style={{
        height: 61, display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", maxWidth: 1400, margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setSidebarOpen(true)} className="md-hide-btn" style={{
            display: "none", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer",
          }}><Menu size={22} /></button>
          <button onClick={() => setUiMode("voice")} style={{
            background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer",
          }}>← Voice Mode</button>
          <span style={{ color: "var(--saffron)", fontSize: 20, fontWeight: 700 }}>☸</span>
          <span style={{ fontSize: 15, fontWeight: 600 }}>ShramSetu Saathi</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {(["procurement", "credit", "safety"] as ActiveTab[]).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              background: activeTab === tab ? "var(--saffron)" : "transparent",
              color: activeTab === tab ? "white" : "var(--text-secondary)",
              border: activeTab === tab ? "none" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
              cursor: "pointer", transition: "all 200ms",
              boxShadow: activeTab === tab ? "0 0 12px rgba(249,115,22,0.3)" : "none",
            }}>
              {tab === "procurement" ? "🛒 Procurement" : tab === "credit" ? "💳 Credit" : "⚖️ Safety"}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: "50%",
            background: appState === "processing" ? "var(--amber)" : appState === "error" ? "var(--red)" : "var(--emerald)",
            animation: appState !== "error" ? "activePulse 2s ease infinite" : "none",
          }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {appState === "processing" ? "Processing..." : appState === "error" ? "Error" : "System Online"}
          </span>
          <span style={{
            fontFamily: S.mono, fontSize: 11, color: "var(--emerald)",
            background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
            borderRadius: 999, padding: "3px 10px",
          }}>AWS ap-south-1 ✓</span>
        </div>
      </div>
    </header>
  );

  // ─── SIDEBAR ───
  const SidebarPanel = () => (
    <aside style={{
      width: 280, minWidth: 280, background: "rgba(10,16,30,0.6)",
      borderRight: "1px solid rgba(255,255,255,0.06)", height: "100%",
      overflowY: "auto", padding: "20px 16px", scrollbarWidth: "none" as any,
    }}>
      <div style={{ ...S.glass, padding: 16, textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 8px",
          background: "linear-gradient(135deg, #F97316, #7C3AED)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "white",
        }}>R</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{RAVI.name}</div>
        <div style={{ fontFamily: S.hindi, fontSize: 13, color: "var(--text-secondary)" }}>{RAVI.nameHindi}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>📍 {RAVI.location}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>🛒 {RAVI.business}</div>
      </div>
      <div style={{ ...S.glass, padding: 14, marginTop: 12 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Credit Band</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8,
          background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: 999, padding: "5px 14px",
        }}>
          <Zap size={14} color="var(--amber)" />
          <span style={{ fontFamily: S.mono, fontSize: 13, fontWeight: 500, color: "var(--amber)" }}>MEDIUM</span>
        </div>
        <div style={{ fontSize: 13, color: "var(--emerald)", marginTop: 6 }}>Eligible up to ₹{RAVI.maxLoan.toLocaleString("en-IN")}</div>
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>0% utilized</div>
          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
            <div style={{ height: "100%", width: "0%", background: "var(--amber)", borderRadius: 999 }} />
          </div>
        </div>
      </div>
      <div style={{ ...S.glass, padding: 14, marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { val: countMonths, unit: "months", label: "Active" },
          { val: countTxns, unit: "/month", label: "Avg Txns" },
          { val: `₹${countAvg.toLocaleString("en-IN")}`, unit: "", label: "Avg/Month" },
          { val: countCreds, unit: "", label: "Credentials" },
        ].map((s, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <div>
              <span style={{ fontFamily: S.mono, fontSize: 18, fontWeight: 500 }}>{s.val}</span>
              {s.unit && <span style={{ fontSize: 12, color: "var(--saffron)", marginLeft: 2 }}>{s.unit}</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ ...S.glass, padding: 14, marginTop: 12, overflow: "visible" }}>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>6-Month Sales (₹)</div>
        <ResponsiveContainer width="100%" height={120}>
          <BarChart data={RAVI.txnHistory} margin={{ top: 4, right: 4, bottom: 20, left: 0 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94A3B8", dy: 4 }} height={28} tickLine={false} axisLine={false} />
            <Bar dataKey="amt" fill="var(--saffron)" radius={[4, 4, 0, 0]} animationDuration={800} />
            <Tooltip contentStyle={{
              background: "#141B2D", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8, fontFamily: S.mono, color: "white", fontSize: 12,
            }} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Digital Public Infrastructure</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {[
            { name: "ONDC", active: true },
            { name: "OCEN 4.0", active: true },
            { name: "Bhashini", active: false },
          ].map(d => (
            <span key={d.name} style={{
              fontSize: 11, borderRadius: 999, padding: "4px 10px",
              background: d.active ? "rgba(16,185,129,0.1)" : "rgba(245,158,11,0.08)",
              border: `1px ${d.active ? "solid" : "dashed"} ${d.active ? "rgba(16,185,129,0.25)" : "rgba(245,158,11,0.3)"}`,
              color: d.active ? "var(--emerald)" : "var(--amber)",
            }}>● {d.name} {d.active ? "✓" : "⏳"}</span>
          ))}
        </div>
      </div>
    </aside>
  );

  // ─── PIPELINE VISUAL ───
  const PipelineVisual = ({ vertical = false }: { vertical?: boolean }) => {
    // Build labels dynamically from live API data where available
    const providerCount = apiRankedOptions?.length ?? 7;
    const confidence = apiConfidence != null ? `${Math.round(apiConfidence * 100)}%` : "94%";
    const safetyScore = apiSafetyScore != null ? apiSafetyScore.toFixed(2) : "0.95";
    const intentLabel = apiIntentType ?? "procurement_search";
    const dynamicLabels = [
      { label: "ASR",    sub: `Sarvam saarika:v2.5 · ${LANG_TO_BCP47[selectedLang] || "hi-IN"}` },
      { label: "Intent", sub: `${intentLabel} · ${confidence}` },
      { label: "ONDC",   sub: `${providerCount} providers · Beckn Protocol` },
      { label: "TOPSIS", sub: `Ranked · ${Object.keys(apiCriteriaWeights ?? {}).length || 4} criteria` },
      { label: "Safety", sub: `Score ${safetyScore} · PROCEED` },
      { label: "TTS",    sub: `Sarvam bulbul:v3 · ${SARVAM_SPEAKER[selectedLang] || "kavya"}` },
    ];
    return (
    <div style={{
      display: "flex", flexDirection: vertical ? "column" : "row",
      alignItems: "center", justifyContent: "center", gap: vertical ? 4 : 0,
      padding: "16px 0",
    }}>
      {dynamicLabels.map((step, i) => {
        const completed = processingStep > i;
        const active = processingStep === i;
        return (
          <div key={i} style={{ display: "flex", flexDirection: vertical ? "row" : "column", alignItems: "center", gap: vertical ? 8 : 4 }}>
            <div style={{ display: "flex", flexDirection: vertical ? "row" : "column", alignItems: "center" }}>
              {i > 0 && !vertical && (
                <div style={{
                  width: 32, height: 2, marginBottom: 0,
                  background: completed ? "var(--saffron)" : "rgba(255,255,255,0.08)",
                  transition: "background 0.4s ease",
                }} />
              )}
              <div style={{
                width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                background: completed ? "rgba(249,115,22,0.15)" : active ? "rgba(249,115,22,0.08)" : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${completed ? "var(--saffron)" : active ? "rgba(249,115,22,0.5)" : "rgba(255,255,255,0.08)"}`,
                color: completed ? "var(--saffron)" : active ? "var(--saffron)" : "var(--text-muted)",
                animation: completed ? "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)" : active ? "activePulse 1s ease infinite" : "none",
                transition: "all 0.3s ease",
              }}>
                {completed ? <CheckCircle size={16} /> : <PipelineIcon index={i} size={16} />}
              </div>
            </div>
            <div style={{ textAlign: vertical ? "left" : "center", minWidth: vertical ? 120 : 60 }}>
              <div style={{ fontSize: 10, color: completed ? "var(--saffron)" : "var(--text-muted)", fontWeight: completed ? 600 : 400 }}>{step.label}</div>
              {completed && <div style={{ fontSize: 9, color: "var(--text-muted)" }}>{step.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
    );
  };

  // ─── RESULT CARD ───
  const ResultCard = ({ compact = false }: { compact?: boolean }) => {
    // ── Resolve data: prefer live API, fall back to hardcoded ──
    const liveHindi  = apiHindiExplanation || HINDI_RESPONSES[activeTab];
    const displayText = liveHindi.slice(0, hindiCharIndex);
    const safetyScore = apiSafetyScore ?? (activeTab === "safety" ? 0.91 : 0.95);
    const pick = apiTopPick; // null = use hardcoded

    const topName = pick?.name
      ?? (activeTab === "procurement" ? "Ekart Logistics" : activeTab === "credit" ? "NanoFin Microloan" : "Overtime Rights");

    const statsRow = activeTab === "procurement" ? [
      { icon: "📦", val: pick ? `₹${pick.price_inr}` : "₹380",      label: "Price" },
      { icon: "💨", val: pick ? `${pick.delivery_days} days` : "3 days", label: "Delivery" },
      { icon: "⭐", val: pick ? String(pick.rating) : "4.5",          label: "Rating" },
      { icon: "💳", val: (pick ? Boolean(pick.accepts_credit) : true) ? "✓" : "–", label: "Credit" },
    ] : activeTab === "credit" ? [
      { icon: "💰", val: "12.5%",    label: "Rate p.a." },
      { icon: "📅", val: "Flexible", label: "Tenure" },
      { icon: "⚡", val: "2 hrs",    label: "Disburse" },
      { icon: "✅", val: "None",     label: "Penalty" },
    ] : [
      { icon: "⚖️", val: "§59",  label: "Section" },
      { icon: "📜", val: "1948", label: "Act Year" },
      { icon: "💰", val: "2×",   label: "OT Rate" },
      { icon: "📞", val: "1800", label: "Helpline" },
    ];

    return (
      <div style={{
        ...S.glass, padding: compact ? 20 : 24, maxWidth: compact ? 480 : "100%",
        margin: compact ? "0 auto" : 0,
        borderLeft: `4px solid ${activeTab === "safety" ? "var(--violet)" : activeTab === "credit" ? "var(--amber)" : "var(--saffron)"}`,
        animation: "fadeInUp 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <span style={{
              background: activeTab === "safety" ? "rgba(139,92,246,0.15)" : "rgba(249,115,22,0.15)",
              color: activeTab === "safety" ? "var(--violet)" : "var(--saffron)",
              fontSize: 11, borderRadius: 999, padding: "4px 10px", fontWeight: 600,
            }}>
              {activeTab === "safety" ? "⚖️ Your Rights" : "🏆 #1 Recommendation"}
            </span>
            <div style={{ fontFamily: S.serif, fontSize: compact ? 22 : 26, marginTop: 8 }}>
              {topName}
            </div>
            {activeTab !== "safety" && (
              <span style={{
                fontSize: 11, color: "var(--blue)", background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.2)", borderRadius: 999, padding: "2px 8px",
              }}>
                {activeTab === "procurement" ? "ONDC Verified · Beckn Protocol" : "OCEN 4.0 · Flow-Based"}
              </span>
            )}
          </div>
          <SafetyBadge score={safetyScore} />
        </div>

        <div style={{
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8,
          background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12, margin: "12px 0",
        }}>
          {statsRow.map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
              <div style={{ fontFamily: S.mono, fontSize: 15, fontWeight: 600 }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Volume2 size={16} color="var(--saffron)" />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saathi कह रहा है:</span>
          </div>
          <AudioWaveform playing={audioPlaying} />
          {!audioPlaying && appState === "results" && (
            <button
              onClick={() => {
                if (audioRef.current) {
                  // Restart from beginning
                  audioRef.current.currentTime = 0;
                  setAudioPlaying(true);
                  audioRef.current.play().catch(() => {
                    setTimeout(() => setAudioPlaying(false), 3000);
                  });
                } else if (apiAudioUrl) {
                  // Fallback: create new Audio if ref was lost
                  const audio = new Audio(apiAudioUrl);
                  audio.onended = () => setAudioPlaying(false);
                  audioRef.current = audio;
                  setAudioPlaying(true);
                  audio.play().catch(() => setTimeout(() => setAudioPlaying(false), 3000));
                } else {
                  setAudioPlaying(true);
                  setTimeout(() => setAudioPlaying(false), 3000);
                }
              }}
              style={{
                background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8,
                padding: "4px 12px", color: "var(--saffron)", fontSize: 12, cursor: "pointer", marginTop: 6,
              }}>🔊 फिर सुनें</button>
          )}
          <p style={{
            fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9",
            marginTop: 10, minHeight: 40,
          }}>
            {showEnglish ? ENGLISH_RESPONSES[activeTab] : displayText}
            {!showEnglish && hindiCharIndex < liveHindi.length && <span style={{ opacity: 0.5 }}>▌</span>}
          </p>
          {/* Show actual query spoken */}
          {interimText && (
            <div style={{
              fontSize: 11, color: "var(--text-muted)", marginTop: 6,
              fontFamily: S.mono, background: "rgba(255,255,255,0.03)",
              borderRadius: 6, padding: "4px 10px",
            }}>
              🎙 "{interimText}"
            </div>
          )}
          <button onClick={() => setShowEnglish(!showEnglish)} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer",
            color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6,
          }}>{showEnglish ? "हिंदी" : "EN"}</button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
          <button style={{
            background: "var(--saffron)", color: "white", border: "none", borderRadius: 10,
            padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer",
          }}>✓ Confirm & Proceed</button>
          <button onClick={resetToIdle} style={{
            background: "transparent", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10, padding: 12, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer",
          }}>← Ask Again</button>
        </div>

        {compact && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => setUiMode("dashboard")} style={{
              background: "none", border: "none", fontSize: 12, color: "var(--text-secondary)",
              cursor: "pointer",
            }}>See full TOPSIS analysis & agent pipeline →</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 8 }}>
              {(apiRankedOptions ?? ONDC).slice(0, 5).map((o, i) => {
                const s = "topsis_score" in o
                  ? Math.round((o as ApiProvider).topsis_score * 100)
                  : (o as typeof ONDC[0]).score;
                return (
                  <div key={i} style={{
                    height: 4, width: 32, borderRadius: 2,
                    background: i === 0 ? "var(--saffron)" : `rgba(249,115,22,${0.4 - i * 0.08})`,
                    title: String(s),
                  }} />
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── VOICE MODE ───
  const VoiceMode = () => (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", paddingTop: 56, paddingBottom: 80,
      background: `radial-gradient(ellipse 400px 300px at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 70%) var(--bg-base)`,
    }}>
      {/* Language pills */}
      <div style={{ display: "flex", gap: 6, marginBottom: 32 }}>
        {["हिंदी", "ಕನ್ನಡ", "தமிழ்"].map(l => (
          <button key={l} onClick={() => setSelectedLang(l)} style={{
            background: selectedLang === l ? "var(--saffron)" : "transparent",
            color: selectedLang === l ? "white" : "var(--text-secondary)",
            border: selectedLang === l ? "none" : "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "6px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
            boxShadow: selectedLang === l ? "0 0 12px rgba(249,115,22,0.3)" : "none",
            transition: "all 200ms",
          }}>🇮🇳 {l}</button>
        ))}
      </div>

      {/* ── IDLE STATE ── */}
      {appState === "idle" && (
        <>
          {/* Mic Button — rings have pointerEvents none so clicks reach the button */}
          <div style={{ position: "relative", width: 220, height: 220 }}>
            {[220, 170, 120].map((s, i) => (
              <div key={i} style={{
                position: "absolute", width: s, height: s, borderRadius: "50%",
                border: `1.5px solid rgba(249,115,22,${0.08 + i * 0.07})`,
                top: (220 - s) / 2, left: (220 - s) / 2,
                pointerEvents: "none",   // ← fix: don't intercept clicks
              }} />
            ))}
            <button
              onClick={startRecording}
              aria-label="Tap to speak"
              style={{
                position: "absolute", top: 60, left: 60, width: 100, height: 100, borderRadius: "50%",
                background: "linear-gradient(145deg, #F97316 0%, #EA580C 60%, #C2410C 100%)",
                border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: S.saffronGlow + ", inset 0 1px 0 rgba(255,255,255,0.2)",
                transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                zIndex: 1,
              }}
            >
              <Mic size={36} color="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div style={{ fontFamily: S.hindi, fontSize: "1.1rem", fontWeight: 600 }}>बोलो, Saathi सुनेगा</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Tap mic to speak · दबाकर बोलें</div>
          </div>
          {/* Example chips */}
          <div style={{ marginTop: 40, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Try asking →</div>
            {EXAMPLE_CHIPS[activeTab].map((chip, i) => (
              <button key={i} onClick={() => submitQuery(chip)} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 999, padding: "9px 20px", fontSize: 13, color: "var(--text-secondary)",
                cursor: "pointer", transition: "all 150ms", maxWidth: 320, opacity: 0.85,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)"; e.currentTarget.style.color = "var(--saffron)"; e.currentTarget.style.background = "rgba(249,115,22,0.05)"; e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.85"; }}
              >{chip}</button>
            ))}
          </div>
        </>
      )}

      {/* ── RECORDING STATE ── */}
      {appState === "recording" && (
        <>
          {/* Status line — changes to "Transcribing" while Sarvam processes */}
          <div style={{ fontSize: 13, marginBottom: 16, display: "flex", alignItems: "center", gap: 6,
            color: sarvamSTTStatus === "transcribing" ? "var(--amber)" : "var(--red)" }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: sarvamSTTStatus === "transcribing" ? "var(--amber)" : "var(--red)",
              animation: "activePulse 1s ease infinite",
            }} />
            {sarvamSTTStatus === "transcribing"
              ? "Sarvam AI transcribing... / लिख रहा हूँ..."
              : "सुन रहा हूँ... (Listening)"}
          </div>

          {/* Transcript box — shows interim text or transcribing indicator */}
          {interimText ? (
            <div style={{
              fontFamily: S.hindi, fontSize: "1.1rem", color: "var(--text-primary)",
              background: "rgba(249,115,22,0.06)", border: "1px solid rgba(249,115,22,0.2)",
              borderRadius: 12, padding: "10px 20px", maxWidth: 360, textAlign: "center",
              marginBottom: 16, minHeight: 48, transition: "all 200ms",
            }}>
              {interimText}
              {sarvamSTTStatus !== "transcribing" && <span style={{ opacity: 0.5 }}>▌</span>}
            </div>
          ) : (
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, fontFamily: S.hindi }}>
              {sarvamSTTStatus === "transcribing" ? "⏳ Sarvam AI सुन रहा है..." : "बोलना शुरू करें..."}
            </div>
          )}

          {/* Waveform — pulses orange when recording, amber when transcribing */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 20, height: 44 }}>
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((d, i) => (
              <div key={i} style={{
                width: 4, borderRadius: 2,
                background: sarvamSTTStatus === "transcribing" ? "var(--amber)" : "var(--saffron)",
                animation: `wave 0.8s ease-in-out infinite ${d}s`, height: 8,
              }} />
            ))}
          </div>

          {/* Stop button — hidden while Sarvam is transcribing */}
          {sarvamSTTStatus !== "transcribing" && (
            <div style={{ position: "relative", width: 220, height: 220 }}>
              {[220, 170, 120].map((s, i) => (
                <div key={i} style={{
                  position: "absolute", width: s, height: s, borderRadius: "50%",
                  border: "2px solid rgba(239,68,68,0.5)", top: (220 - s) / 2, left: (220 - s) / 2,
                  animation: `pulseOut 1.4s ease-out infinite ${i * 0.35}s`,
                  pointerEvents: "none",
                }} />
              ))}
              <button
                onClick={stopRecording}
                aria-label="Stop recording"
                style={{
                  position: "absolute", top: 60, left: 60, width: 100, height: 100, borderRadius: "50%",
                  background: "linear-gradient(145deg, #DC2626, #B91C1C)",
                  border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 1px rgba(239,68,68,0.4), 0 0 32px rgba(239,68,68,0.25)",
                  zIndex: 1,
                }}
              >
                <MicOff size={32} color="white" />
              </button>
            </div>
          )}

          {/* Sarvam badge */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
            <span style={{
              fontSize: 11, color: "var(--amber)",
              background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
              borderRadius: 999, padding: "3px 10px",
            }}>
              {sarvamSTTStatus === "transcribing"
                ? "⚡ Sarvam saarika:v2.5 · Transcribing"
                : "🎙 Sarvam AI STT · " + (LANG_TO_BCP47[selectedLang] || "hi-IN")}
            </span>
          </div>

          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8 }}>
            {sarvamSTTStatus === "transcribing" ? "" : "Tap to stop · रोकने के लिए दबाएँ"}
          </div>
        </>
      )}

      {/* ── PROCESSING STATE ── */}
      {appState === "processing" && (
        <div style={{ maxWidth: 480, width: "100%", padding: "0 20px", textAlign: "center" }}>
          <div style={{ fontFamily: S.hindi, fontSize: "1.3rem", color: "white", marginBottom: 16 }}>
            {getCurrentSpeakingText()}
          </div>
          {/* Show what was said */}
          {interimText && (
            <div style={{
              fontSize: 12, color: "var(--text-muted)", fontFamily: S.mono,
              background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "6px 14px",
              marginBottom: 16, display: "inline-block",
            }}>
              🎙 "{interimText}"
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 24, height: 40 }}>
            {[0, 0.1, 0.2, 0.1, 0].map((d, i) => (
              <div key={i} style={{
                width: 6, borderRadius: 4, background: "var(--saffron)",
                animation: `audioBar 1.2s ease-in-out infinite ${d}s`, height: 8,
              }} />
            ))}
          </div>
          <PipelineVisual />
          {/* Skeleton */}
          <div style={{ ...S.glass, padding: 24, maxWidth: 480, margin: "16px auto 0", borderLeft: "4px solid rgba(249,115,22,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ width: 140, height: 14, borderRadius: 999, background: "rgba(255,255,255,0.06)" }} />
                <div style={{ width: 200, height: 20, borderRadius: 8, background: "rgba(255,255,255,0.04)", marginTop: 10 }} />
              </div>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12 }}>
              {[0,1,2,3].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.05)" }} />
                  <div style={{ width: 40, height: 12, borderRadius: 4, background: "rgba(255,255,255,0.04)" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
              <Loader size={16} color="var(--saffron)" className="animate-spin" />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Preparing results...</span>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULTS STATE ── */}
      {appState === "results" && <ResultCard compact={true} />}

      {/* ── ERROR STATE ── */}
      {appState === "error" && (
        <div style={{ ...S.glass, border: "2px solid var(--red)", padding: 32, textAlign: "center", maxWidth: 400 }}>
          <AlertCircle size={40} color="var(--red)" style={{ margin: "0 auto 12px" }} />
          <div style={{ fontFamily: S.serif, fontSize: "1.4rem", marginBottom: 8 }}>कुछ गड़बड़ हो गई</div>
          {speechError && (
            <div style={{ fontSize: 13, color: "var(--red)", marginBottom: 12, padding: "8px 12px", background: "rgba(239,68,68,0.08)", borderRadius: 8 }}>
              {speechError}
            </div>
          )}
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
            {speechError?.includes("permission")
              ? "Click the 🔒 icon in Chrome's address bar to allow microphone."
              : "Something went wrong. Please try again."}
          </div>
          <button onClick={resetToIdle} style={{
            background: "var(--saffron)", color: "white", border: "none", borderRadius: 8, padding: "10px 20px",
            fontSize: 14, cursor: "pointer",
          }}>🔄 फिर कोशिश करें</button>
        </div>
      )}
    </div>
  );

  // ─── DASHBOARD IDLE ───
  const DashboardIdleState = () => {
    const capCards: { tab: ActiveTab; icon: React.ReactNode; title: string; sub: string; hoverBorder: string }[] = [
      { tab: "procurement", icon: <ShoppingCart size={20} color="#F97316" />, title: "ONDC Logistics", sub: "7 providers · TOPSIS ranked", hoverBorder: "rgba(249,115,22,0.3)" },
      { tab: "credit", icon: <CreditCard size={20} color="#F59E0B" />, title: "OCEN 4.0 Credit", sub: "4 lenders · flow-based scoring", hoverBorder: "rgba(245,158,11,0.3)" },
      { tab: "safety", icon: <Scale size={20} color="#8B5CF6" />, title: "Labour Rights", sub: "CeRAI framework · RAG validated", hoverBorder: "rgba(139,92,246,0.3)" },
    ];
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 64px - 80px)", padding: 24,
      }}>
        <div style={{
          ...S.glass, maxWidth: 560, width: "100%", padding: 24, borderLeft: "3px solid rgba(249,115,22,0.4)",
          animation: "fadeInUp 0.4s ease-out",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #F97316, #7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "white", flexShrink: 0 }}>R</div>
                <span style={{ fontSize: 15, fontWeight: 700 }}>{RAVI.name}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, marginLeft: 50 }}>📍 {RAVI.location}  ·  🛒 {RAVI.business}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "3px 10px", marginTop: 4 }}>
                <Zap size={12} color="var(--amber)" />
                <span style={{ fontFamily: S.mono, fontSize: 11, color: "var(--amber)", fontWeight: 500 }}>MEDIUM</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--emerald)", marginTop: 4 }}>Ready for next query</div>
            </div>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 560, width: "100%", marginTop: 24 }}>
          {capCards.map((c, i) => (
            <button key={c.tab} onClick={() => { setActiveTab(c.tab); submitQuery(EXAMPLE_CHIPS[c.tab][0]); }} style={{
              ...S.glass, padding: 16, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
              cursor: "pointer", textAlign: "left", transition: "all 200ms",
              animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.hoverBorder; e.currentTarget.style.transform = "scale(1.01)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <div style={{ marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.sub}</div>
            </button>
          ))}
        </div>
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 8 }}>Try asking →</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {EXAMPLE_CHIPS[activeTab].map((chip, i) => (
              <button key={i} onClick={() => submitQuery(chip)} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 999, padding: "9px 20px", fontSize: 13, color: "var(--text-secondary)",
                cursor: "pointer", transition: "all 150ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)"; e.currentTarget.style.color = "var(--saffron)"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
              >{chip}</button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── PROCUREMENT PANEL ───
  const ProcurementPanel = () => {
    if (appState === "idle" || appState === "recording") return <DashboardIdleState />;
    return (
      <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
        <div style={{ ...S.glass, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{currentQuery}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {apiIntentType ?? "procurement_search"} · {apiConfidence != null ? `${Math.round(apiConfidence * 100)}%` : "94%"} confidence
            </div>
          </div>
        </div>
        {(appState === "processing" || appState === "results") && <PipelineVisual />}
        {appState === "results" && (
          <>
            {/* ── TOPSIS Chart ── */}
            {(() => {
              // Use live ranked_options; fall back to hardcoded ONDC
              const chartData = (apiRankedOptions ?? ONDC).map(o => ({
                name: o.name.substring(0, 12),
                score: "topsis_score" in o
                  ? Math.round((o as ApiProvider).topsis_score * 100 * 10) / 10
                  : (o as typeof ONDC[0]).score,
              }));
              const topScore = chartData[0]?.score ?? 84.7;
              // Criteria weights label
              const weights = apiCriteriaWeights;
              const weightsLabel = weights
                ? Object.entries(weights).map(([k, v]) => `${k.replace("_inr","").replace("_"," ")} ${Math.round(v*100)}%`).join(" · ")
                : "Price 35% · Time 25% · Rating 25% · Credit 15%";
              return (
                <div style={{ ...S.glass, padding: 20, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                    <span style={{ fontFamily: S.serif, fontSize: 18 }}>TOPSIS Ranked Results</span>
                    <span style={{ fontSize: 11, color: "var(--saffron)", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)", borderRadius: 999, padding: "4px 12px" }}>{weightsLabel}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontFamily: S.mono, fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + "%"} />
                      <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                        <div style={{ background: "#141B2D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
                          <div style={{ fontSize: 12 }}>{(payload[0].payload as any).name}</div>
                          <div style={{ fontFamily: S.mono, fontSize: 14, color: "var(--saffron)" }}>Score: {payload[0].value}%</div>
                        </div>
                      ) : null} />
                      <ReferenceLine y={topScore} stroke="rgba(249,115,22,0.5)" strokeDasharray="4 4" />
                      <Bar dataKey="score" fill="#F97316" radius={[6, 6, 0, 0]} animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              );
            })()}

            {/* ── Top Pick Card ── */}
            {(() => {
              const p = apiTopPick;
              const name    = p?.name        ?? "Ekart Logistics";
              const price   = p?.price_inr   ?? 380;
              const days    = p?.delivery_days ?? 3;
              const rating  = p?.rating      ?? 4.5;
              const credit  = p ? Boolean(p.accepts_credit) : true;
              const score   = p ? Math.round(p.topsis_score * 100 * 10) / 10 : 84.7;
              const safety  = apiSafetyScore ?? 0.95;
              const hindiText = apiHindiExplanation || HINDI_RESPONSES.procurement;
              return (
                <div style={{ ...S.glass, borderLeft: "4px solid var(--saffron)", padding: 24, marginTop: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                    <div>
                      <span style={{ background: "rgba(249,115,22,0.15)", color: "var(--saffron)", fontSize: 11, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>🏆 #1 Recommendation</span>
                      <div style={{ fontFamily: S.serif, fontSize: 22, marginTop: 8 }}>{name}</div>
                      <span style={{ fontSize: 11, color: "var(--blue)", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 999, padding: "2px 8px" }}>ONDC Verified · Beckn Protocol</span>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <ScoreRing score={score} />
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>TOPSIS Score</div>
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12, marginTop: 16 }}>
                    {[
                      { icon: "📦", val: `₹${price}`,    label: "Price" },
                      { icon: "💨", val: `${days} days`,  label: "Delivery" },
                      { icon: "⭐", val: String(rating),  label: "Rating" },
                      { icon: "💳", val: credit ? "✓" : "–", label: "Credit" },
                    ].map((s, i) => (
                      <div key={i} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                        <div style={{ fontFamily: S.mono, fontSize: 16, fontWeight: 600 }}>{s.val}</div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12 }}>
                    <AudioWaveform playing={audioPlaying} />
                    <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9", marginTop: 8 }}>
                      {showEnglish ? ENGLISH_RESPONSES.procurement : hindiText.slice(0, hindiCharIndex)}
                      {!showEnglish && hindiCharIndex < hindiText.length && <span style={{ opacity: 0.5 }}>▌</span>}
                    </p>
                    <button onClick={() => setShowEnglish(!showEnglish)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer", color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6 }}>{showEnglish ? "हिंदी" : "EN"}</button>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}><SafetyBadge score={safety} delayed={false} /></div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                    <button style={{ background: "var(--saffron)", color: "white", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✓ Confirm & Proceed</button>
                    <button onClick={resetToIdle} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}>← Ask Again</button>
                  </div>
                </div>
              );
            })()}

            {/* ── All Options Table ── */}
            {(() => {
              const options = apiRankedOptions ?? ONDC;
              return (
                <div style={{ marginTop: 16 }}>
                  <button onClick={() => setShowAllOptions(!showAllOptions)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    View all {options.length} options {showAllOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  {showAllOptions && (
                    <div style={{ ...S.glass, marginTop: 8, overflow: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                        <thead>
                          <tr>{["Rank","Provider","Price","Days","Rating","Credit","TOPSIS"].map(h => (
                            <th key={h} style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px", textAlign: "left", fontWeight: 400 }}>{h}</th>
                          ))}</tr>
                        </thead>
                        <tbody>
                          {"topsis_score" in options[0]
                            ? (options as ApiProvider[]).map((o, i) => (
                                <tr key={o.providerId} style={{ background: i === 0 ? "rgba(249,115,22,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>{i + 1}</td>
                                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{o.name}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono }}>₹{o.price_inr}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono }}>{o.delivery_days}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--amber)" }}>{o.rating} ⭐</td>
                                  <td style={{ padding: "8px 12px", color: Boolean(o.accepts_credit) ? "var(--emerald)" : "var(--text-muted)" }}>{Boolean(o.accepts_credit) ? "✓" : "–"}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>
                                    {Math.round(o.topsis_score * 100 * 10) / 10}%
                                  </td>
                                </tr>
                              ))
                            : (options as typeof ONDC).map((o, i) => (
                                <tr key={o.id} style={{ background: i === 0 ? "rgba(249,115,22,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>{o.rank}</td>
                                  <td style={{ padding: "8px 12px", fontSize: 13 }}>{o.name}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono }}>₹{o.price}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono }}>{o.days}</td>
                                  <td style={{ padding: "8px 12px", color: "var(--amber)" }}>{o.rating} ⭐</td>
                                  <td style={{ padding: "8px 12px", color: o.credit ? "var(--emerald)" : "var(--text-muted)" }}>{o.credit ? "✓" : "–"}</td>
                                  <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>{o.score}%</td>
                                </tr>
                              ))
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    );
  };

  // ─── CREDIT PANEL ───
  const CreditPanel = () => {
    if (appState === "idle" || appState === "recording") return <DashboardIdleState />;
    return (
      <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
        <div style={{ ...S.glass, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{currentQuery}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>credit_inquiry · 91% confidence</div>
          </div>
        </div>
        {(appState === "processing" || appState === "results") && <PipelineVisual />}
        {appState === "results" && (
          <>
            <div style={{ ...S.glass, borderLeft: "4px solid var(--amber)", padding: 24, marginTop: 16 }}>
              <div style={{ fontFamily: S.serif, fontSize: 18, marginBottom: 16 }}>Flow-Based Credit Assessment</div>
              {[
                { label: "Monthly Avg", val: "₹20,000", pct: 80, color: "var(--emerald)" },
                { label: "Consistency", val: "Good", pct: 75, color: "var(--emerald)" },
                { label: "Credentials", val: "3", pct: 60, color: "var(--amber)" },
                { label: "ONDC Age", val: "6 months", pct: 80, color: "var(--emerald)" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 100, fontSize: 13 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", background: b.color, borderRadius: 999, width: scoreAnimated ? `${b.pct}%` : "0%", transition: `width 1s ease-out ${i * 0.15}s` }} />
                  </div>
                  <span style={{ fontFamily: S.mono, fontSize: 13, width: 70, textAlign: "right" }}>{b.val}</span>
                </div>
              ))}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <svg width={240} height={140} viewBox="0 0 240 140">
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth={12} strokeLinecap="round" strokeDasharray="157 314" />
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth={12} strokeLinecap="round" strokeDasharray="94 314" strokeDashoffset="-126" />
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth={12} strokeLinecap="round" strokeDasharray="94 314" strokeDashoffset="-220" />
                  <line x1="120" y1="130" x2="120" y2="40" stroke="white" strokeWidth={3} strokeLinecap="round"
                    style={{ transform: needleAnimated ? "rotate(36deg)" : "rotate(-90deg)", transformOrigin: "120px 130px", transition: "transform 1.5s ease-out" }} />
                  <circle cx="120" cy="130" r="5" fill="white" />
                  <text x="20" y="140" style={{ fontSize: 11, fill: "var(--text-muted)" }}>0</text>
                  <text x="218" y="140" style={{ fontSize: 11, fill: "var(--text-muted)" }}>100</text>
                </svg>
                <div><span style={{ fontFamily: S.mono, fontSize: 42, fontWeight: 700 }}>72</span><span style={{ fontSize: 16, color: "var(--text-muted)" }}> / 100</span></div>
                <div style={{ display: "inline-flex", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "4px 12px", color: "var(--amber)", fontWeight: 600, fontSize: 13, marginTop: 4 }}>MEDIUM Credit Band</div>
                <div style={{ color: "var(--emerald)", fontSize: 14, marginTop: 6 }}>Eligible up to ₹10,000</div>
              </div>
            </div>
            <div style={{ ...S.glass, borderLeft: "4px solid var(--amber)", padding: 24, marginTop: 16 }}>
              <span style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)", fontSize: 11, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>🏆 #1 Recommendation</span>
              <div style={{ fontFamily: S.serif, fontSize: 22, marginTop: 8 }}>NanoFin Microloan</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12, marginTop: 16 }}>
                {[
                  { icon: "💰", val: "12.5%", label: "Rate" },
                  { icon: "📅", val: "Flex", label: "Tenure" },
                  { icon: "⚡", val: "2 hrs", label: "Disburse" },
                  { icon: "✅", val: "None", label: "Penalty" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                    <div style={{ fontFamily: S.mono, fontSize: 16, fontWeight: 600 }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9", marginTop: 12 }}>
                {showEnglish ? ENGLISH_RESPONSES.credit : HINDI_RESPONSES.credit.slice(0, hindiCharIndex)}
              </p>
              <button onClick={() => setShowEnglish(!showEnglish)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer", color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6 }}>{showEnglish ? "हिंदी" : "EN"}</button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                <button style={{ background: "var(--saffron)", color: "white", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✓ Confirm & Proceed</button>
                <button onClick={resetToIdle} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}>← Ask Again</button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── SAFETY PANEL ───
  const SafetyPanel = () => {
    if (appState === "idle" || appState === "recording") return <DashboardIdleState />;
    return (
      <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
        <div style={{ ...S.glass, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{currentQuery}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>safety_inquiry · 89% confidence</div>
          </div>
        </div>
        {(appState === "processing" || appState === "results") && <PipelineVisual />}
        {appState === "results" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>📚 Legal corpus:</span>
              {["Factories Act 1948", "Min. Wages Act", "Contract Labour Act"].map(a => (
                <span key={a} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px", color: "var(--text-secondary)" }}>{a}</span>
              ))}
            </div>
            <div style={{ ...S.glass, borderLeft: "4px solid var(--violet)", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ fontFamily: S.serif, fontSize: 18 }}>⚖️ Your Rights</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 999, padding: "5px 12px" }}>
                  <Shield size={14} color="var(--violet)" />
                  <span style={{ fontSize: 12, color: "var(--violet)" }}>CeRAI Validated</span>
                </div>
              </div>
              <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9" }}>
                {showEnglish ? ENGLISH_RESPONSES.safety : HINDI_RESPONSES.safety.slice(0, hindiCharIndex)}
                {!showEnglish && hindiCharIndex < HINDI_RESPONSES.safety.length && <span style={{ opacity: 0.5 }}>▌</span>}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowEnglish(!showEnglish)} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer", color: showEnglish ? "var(--saffron)" : "var(--text-secondary)" }}>{showEnglish ? "हिंदी" : "EN"}</button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <Shield size={14} color="var(--emerald)" />
                <span style={{ fontFamily: S.mono, fontSize: 12, color: "var(--emerald)" }}>0.91</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Legally compliant</span>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
              {[
                { icon: "📞", title: "Helpline", desc: "1800-11-5555", btn: "Call Now", color: "var(--emerald)" },
                { icon: "📄", title: "File Complaint", desc: "Labour Commissioner Portal", btn: "Open Link", color: "var(--blue)" },
                { icon: "📍", title: "Nearest Office", desc: "Find in your area", btn: "Get Directions", color: "var(--violet)" },
              ].map((c, i) => (
                <div key={i} style={{ ...S.glass, padding: 16, textAlign: "center", cursor: "pointer" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 10 }}>{c.desc}</div>
                  <button style={{ background: "transparent", border: `1px solid ${c.color}`, color: c.color, borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", width: "100%" }}>{c.btn}</button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  // ─── DASHBOARD MODE ───
  const DashboardMode = () => (
    <div style={{ display: "flex", minHeight: "100vh", paddingTop: 64, paddingBottom: 80 }}>
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "relative", zIndex: 1, animation: "slideInRight 0.3s ease-out", width: 280 }}>
            <button onClick={() => setSidebarOpen(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", zIndex: 2 }}><X size={20} /></button>
            <SidebarPanel />
          </div>
        </div>
      )}
      <div className="sidebar-desktop" style={{ display: "block" }}>
        <SidebarPanel />
      </div>
      <main style={{ flex: 1, padding: 20, overflow: "auto" }}>
        {activeTab === "procurement" && <ProcurementPanel />}
        {activeTab === "credit" && <CreditPanel />}
        {activeTab === "safety" && <SafetyPanel />}
      </main>
    </div>
  );

  // ─── VOICE BAR (bottom) ───
  const VoiceBar = () => (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 80, zIndex: 50,
      background: "rgba(6,11,24,0.97)", backdropFilter: "blur(24px) saturate(180%)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{ maxWidth: 860, margin: "0 auto", height: "100%", display: "flex", alignItems: "center", gap: 10, padding: "0 16px" }}>
        {/* Language */}
        <div style={{ position: "relative" }}>
          <button onClick={() => setShowLangDropdown(!showLangDropdown)} style={{
            background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
            borderRadius: 999, padding: "6px 12px", color: "var(--saffron)", fontSize: 13,
            cursor: "pointer", display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
          }}>
            🇮🇳 {selectedLang} <ChevronDown size={12} color="var(--text-muted)" />
          </button>
          {showLangDropdown && (
            <div style={{ position: "absolute", bottom: 48, left: 0, ...S.glass, minWidth: 160, padding: 4, zIndex: 60 }}>
              {["हिंदी", "ಕನ್ನಡ", "தமிழ்", "বাংলা"].map(l => (
                <button key={l} onClick={() => { setSelectedLang(l); setShowLangDropdown(false); }} style={{
                  display: "block", width: "100%", textAlign: "left",
                  background: selectedLang === l ? "rgba(249,115,22,0.1)" : "transparent",
                  border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", cursor: "pointer",
                }}>{l} {selectedLang === l && "✓"}</button>
              ))}
            </div>
          )}
        </div>

        {/* Text input */}
        <input
          ref={inputRef}
          value={textInput}
          onChange={e => setTextInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && submitQuery(textInput)}
          placeholder="Apna sawaal pucho... (अपना सवाल पूछें)"
          style={{
            flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 12, padding: "12px 16px", fontSize: 14, color: "white", outline: "none",
            transition: "all 200ms", minWidth: 0,
          }}
          onFocus={e => { e.target.style.borderColor = "rgba(249,115,22,0.5)"; e.target.style.boxShadow = "0 0 0 3px rgba(249,115,22,0.1)"; }}
          onBlur={e => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; e.target.style.boxShadow = "none"; }}
        />

        {/* Mic button — tap to start / tap again to stop */}
        <div style={{ position: "relative" }}>
          {appState === "recording" && (
            <>
              {[80, 100, 120].map((s, i) => (
                <div key={i} style={{
                  position: "absolute", width: s, height: s, borderRadius: "50%",
                  border: `2px solid rgba(239,68,68,${0.5 - i * 0.15})`,
                  top: (56 - s) / 2, left: (56 - s) / 2,
                  animation: `pulseOut 1.4s ease-out infinite ${i * 0.35}s`,
                  pointerEvents: "none",   // ← fix
                }} />
              ))}
            </>
          )}
          <button
            onClick={() => {
              if (appState === "recording") {
                stopRecording();
              } else if (appState === "idle" || appState === "results" || appState === "error") {
                startRecording();
              }
            }}
            style={{
              width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
              background: appState === "recording"
                ? "var(--crimson)"
                : "linear-gradient(145deg, #F97316, #EA580C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: appState === "recording"
                ? "0 0 0 1px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.3)"
                : S.saffronGlow,
              transition: "all 200ms cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative", zIndex: 1,
            }}
            aria-label={appState === "recording" ? "Stop recording" : "Tap to speak"}
          >
            {appState === "recording" ? <MicOff size={22} color="white" /> : <Mic size={22} color="white" />}
          </button>
        </div>

        {/* Send */}
        <button
          onClick={() => submitQuery(textInput)}
          disabled={!textInput.trim()}
          style={{
            width: 40, height: 40, background: "transparent", border: "none",
            cursor: textInput.trim() ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8,
          }}
        >
          <Send size={20} color={textInput.trim() ? "var(--saffron)" : "#374151"} />
        </button>
      </div>
    </div>
  );

  // ─── LATENCY TICKER ───
  const LatencyTicker = () => {
    if (!showLatency || !latencyData) return null;
    return (
      <div style={{
        position: "fixed", bottom: 96, right: 16, zIndex: 40, width: 220, padding: "10px 14px",
        background: "rgba(12,18,32,0.97)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 10,
        backdropFilter: "blur(16px)", animation: "fadeInUp 0.4s ease-out",
      }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--emerald)" }}>⚡ Response: {latencyData.total}s</div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>ASR {latencyData.asr}s · AI {latencyData.ai}s · TTS {latencyData.tts}s</div>
        <div style={{ fontFamily: S.mono, fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>AWS ap-south-1</div>
      </div>
    );
  };

  // ─── CSS ───
  const responsiveStyles = `
    @media (max-width: 767px) {
      .sidebar-desktop { display: none !important; }
      .md-hide-btn { display: flex !important; }
    }
    @media (min-width: 768px) {
      .sidebar-desktop { display: block !important; }
      .md-hide-btn { display: none !important; }
    }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    .animate-spin { animation: spin 1s linear infinite; }
  `;

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{responsiveStyles}</style>
      {uiMode === "voice" ? <VoiceHeader /> : <DashboardHeader />}
      {uiMode === "voice" ? <VoiceMode /> : <DashboardMode />}
      <VoiceBar />
      <LatencyTicker />
    </div>
  );
}