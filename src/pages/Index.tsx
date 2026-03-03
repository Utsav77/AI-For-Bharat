import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts";
import {
  Mic, MicOff, Send, ShoppingCart, CreditCard, Scale, Shield, Volume2,
  ChevronRight, ChevronDown, BarChart2, Loader, CheckCircle, Circle,
  ArrowLeft, Wifi, ChevronUp, Menu, X, Zap
} from "lucide-react";

// ─── TYPES ───
type UIMode = "voice" | "dashboard";
type AppState = "idle" | "recording" | "processing" | "results" | "error";
type ActiveTab = "procurement" | "credit" | "safety";

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
  { label: "ASR", sub: "Amazon Transcribe · hi-IN" },
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
  // State
  const [uiMode, setUiMode] = useState<UIMode>("voice");
  const [appState, setAppState] = useState<AppState>("idle");
  const [activeTab, setActiveTab] = useState<ActiveTab>("procurement");
  const [currentQuery, setCurrentQuery] = useState("");
  const [textInput, setTextInput] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [hindiCharIndex, setHindiCharIndex] = useState(0);
  const [showLangDropdown, setShowLangDropdown] = useState(false);
  const [selectedLang, setSelectedLang] = useState("हिंदी");
  const [showEnglish, setShowEnglish] = useState(false);
  const [recordingCountdown, setRecordingCountdown] = useState(3);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [latencyData, setLatencyData] = useState<{ total: string; asr: string; ai: string; tts: string } | null>(null);
  const [showLatency, setShowLatency] = useState(false);

  // Sidebar count-up
  const [countMonths, setCountMonths] = useState(0);
  const [countTxns, setCountTxns] = useState(0);
  const [countAvg, setCountAvg] = useState(0);
  const [countCreds, setCountCreds] = useState(0);

  // Score ring animation
  const [scoreAnimated, setScoreAnimated] = useState(false);
  // Credit needle
  const [needleAnimated, setNeedleAnimated] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Count-up effect for sidebar
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
        const duration = 1500;
        const steps = 30;
        const inc = target / steps;
        let current = 0;
        const iv = setInterval(() => {
          current += inc;
          if (current >= target) { set(target); clearInterval(iv); }
          else set(Math.floor(current));
        }, duration / steps);
      }, delay);
    });
  }, [uiMode]);

  // Recording flow
  useEffect(() => {
    if (appState !== "recording") return;
    setRecordingCountdown(3);
    const iv = setInterval(() => {
      setRecordingCountdown(prev => {
        if (prev <= 1) {
          clearInterval(iv);
          setTimeout(() => {
            setCurrentQuery(DEMO_QUERIES[activeTab]);
            setTextInput(DEMO_QUERIES[activeTab]);
            setTimeout(() => setAppState("processing"), 500);
          }, 200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [appState, activeTab]);

  // Processing pipeline
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
          setAudioPlaying(true);
          // Generate latency
          const asr = (0.7 + Math.random() * 0.4).toFixed(1);
          const tts = (0.8 + Math.random() * 0.4).toFixed(1);
          const total = (3.1 + Math.random() * 1.1).toFixed(1);
          const ai = (parseFloat(total) - parseFloat(asr) - parseFloat(tts)).toFixed(1);
          setLatencyData({ total, asr, ai, tts });
          setShowLatency(true);
          setTimeout(() => setShowLatency(false), 8000);
          // Score animation
          setTimeout(() => setScoreAnimated(true), 100);
          setTimeout(() => setNeedleAnimated(true), 100);
          // Stop audio after 3s
          setTimeout(() => setAudioPlaying(false), 3000);
        }, 400);
      }
    }, 400);
    return () => clearInterval(iv);
  }, [appState]);

  // Typewriter
  useEffect(() => {
    if (appState !== "results") return;
    setHindiCharIndex(0);
    const text = HINDI_RESPONSES[activeTab];
    const iv = setInterval(() => {
      setHindiCharIndex(prev => {
        if (prev >= text.length) { clearInterval(iv); return prev; }
        return prev + 1;
      });
    }, 25);
    return () => clearInterval(iv);
  }, [appState, activeTab]);

  const submitQuery = useCallback((q: string) => {
    if (!q.trim()) return;
    setCurrentQuery(q);
    setTextInput(q);
    setTimeout(() => setAppState("processing"), 300);
  }, []);

  const resetToIdle = useCallback(() => {
    setAppState("idle");
    setCurrentQuery("");
    setTextInput("");
    setProcessingStep(0);
    setHindiCharIndex(0);
    setShowAllOptions(false);
    setShowEnglish(false);
  }, []);

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
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#saffronGrad)" strokeWidth={8}
          strokeLinecap="round" strokeDasharray={c}
          strokeDashoffset={scoreAnimated ? offset : c}
          style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 1s ease-out" }}
        />
        <text x={size / 2} y={size / 2 - 2} textAnchor="middle" dominantBaseline="central"
          style={{ fontFamily: S.mono, fontSize: 16, fontWeight: 700, fill: "var(--text-primary)" }}>{score}</text>
        <text x={size / 2} y={size / 2 + 14} textAnchor="middle"
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
  const Sidebar = () => (
    <aside style={{
      width: 280, minWidth: 280, background: "rgba(10,16,30,0.6)",
      borderRight: "1px solid rgba(255,255,255,0.06)", height: "100%",
      overflowY: "auto", padding: "20px 16px", scrollbarWidth: "none" as any,
    }}>
      {/* Avatar */}
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

      {/* Credit Band */}
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

      {/* Stats Grid */}
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

      {/* Transaction Chart */}
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

      {/* DPI Status */}
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
  const PipelineVisual = ({ vertical = false }: { vertical?: boolean }) => (
    <div style={{
      display: "flex", flexDirection: vertical ? "column" : "row",
      alignItems: "center", justifyContent: "center", gap: vertical ? 4 : 0,
      padding: "16px 0",
    }}>
      {PROCESSING_LABELS.map((step, i) => {
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
                  ...(completed ? {} : { backgroundImage: "repeating-linear-gradient(90deg, rgba(255,255,255,0.08) 0, rgba(255,255,255,0.08) 4px, transparent 4px, transparent 8px)" }),
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

  // ─── RESULT CARD ───
  const ResultCard = ({ compact = false }: { compact?: boolean }) => {
    const topPick = activeTab === "procurement" ? ONDC[0] : activeTab === "credit" ? OCEN[0] : null;
    const hindiText = HINDI_RESPONSES[activeTab];
    const displayText = hindiText.slice(0, hindiCharIndex);

    const procPick = ONDC[0];
    const credPick = OCEN[0];
    const statsRow = activeTab === "procurement" ? [
      { icon: "📦", val: `₹${procPick.price}`, label: "Price" },
      { icon: "💨", val: `${procPick.days} days`, label: "Delivery" },
      { icon: "⭐", val: `${procPick.rating}`, label: "Rating" },
      { icon: "💳", val: "✓", label: "Credit" },
    ] : activeTab === "credit" ? [
      { icon: "💰", val: `${credPick.rate}%`, label: "Rate p.a." },
      { icon: "📅", val: credPick.tenure, label: "Tenure" },
      { icon: "⚡", val: credPick.disburse, label: "Disburse" },
      { icon: "✅", val: credPick.penalty, label: "Penalty" },
    ] : [
      { icon: "⚖️", val: "§59", label: "Section" },
      { icon: "📜", val: "1948", label: "Act Year" },
      { icon: "💰", val: "2×", label: "OT Rate" },
      { icon: "📞", val: "1800", label: "Helpline" },
    ];

    return (
      <div style={{
        ...S.glass, padding: compact ? 20 : 24, maxWidth: compact ? 480 : "100%",
        margin: compact ? "0 auto" : 0,
        borderLeft: `4px solid ${activeTab === "safety" ? "var(--violet)" : activeTab === "credit" ? "var(--amber)" : "var(--saffron)"}`,
        animation: "fadeInUp 0.5s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
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
              {activeTab === "procurement" ? "Ekart Logistics" : activeTab === "credit" ? "NanoFin Microloan" : "Overtime Rights"}
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
          <SafetyBadge score={activeTab === "safety" ? 0.91 : 0.95} />
        </div>

        {/* Stats */}
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

        {/* Audio + Text */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Volume2 size={16} color="var(--saffron)" />
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saathi कह रहा है:</span>
          </div>
          <AudioWaveform playing={audioPlaying} />
          {!audioPlaying && appState === "results" && (
            <button onClick={() => { setAudioPlaying(true); setTimeout(() => setAudioPlaying(false), 3000); }}
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
            {!showEnglish && hindiCharIndex < hindiText.length && <span style={{ opacity: 0.5 }}>▌</span>}
          </p>
          <button onClick={() => setShowEnglish(!showEnglish)} style={{
            background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer",
            color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6,
          }}>{showEnglish ? "हिंदी" : "EN"}</button>
        </div>

        {/* Actions */}
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

        {/* Bridge */}
        {compact && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <button onClick={() => setUiMode("dashboard")} style={{
              background: "none", border: "none", fontSize: 12, color: "var(--text-secondary)",
              cursor: "pointer",
            }}>See full TOPSIS analysis & agent pipeline →</button>
            <div style={{ display: "flex", justifyContent: "center", gap: 2, marginTop: 8 }}>
              {[84.7, 71.2, 68.4, 54.1, 49.8].map((s, i) => (
                <div key={i} style={{
                  height: 4, width: 32, borderRadius: 2,
                  background: i === 0 ? "var(--saffron)" : `rgba(249,115,22,${0.4 - i * 0.08})`,
                }} />
              ))}
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
      backgroundImage: `radial-gradient(ellipse 400px 300px at 50% 50%, rgba(249,115,22,0.06) 0%, transparent 70%), ${S.noise}`,
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

      {appState === "idle" && (
        <>
          {/* Mic Button */}
          <div style={{ position: "relative", width: 220, height: 220 }}>
            {[220, 170, 120].map((s, i) => (
              <div key={i} style={{
                position: "absolute", width: s, height: s, borderRadius: "50%",
                border: `1.5px solid rgba(249,115,22,${0.08 + i * 0.07})`,
                top: (220 - s) / 2, left: (220 - s) / 2,
              }} />
            ))}
            <button onClick={() => setAppState("recording")} aria-label="Hold to speak" style={{
              position: "absolute", top: 60, left: 60, width: 100, height: 100, borderRadius: "50%",
              background: "linear-gradient(145deg, #F97316 0%, #EA580C 60%, #C2410C 100%)",
              border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: S.saffronGlow + ", inset 0 1px 0 rgba(255,255,255,0.2)",
              transition: "all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}>
              <Mic size={36} color="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }} />
            </button>
          </div>
          <div style={{ textAlign: "center", marginTop: 16 }}>
            <div style={{ fontFamily: S.hindi, fontSize: "1.1rem", fontWeight: 600 }}>बोलो, Saathi सुनेगा</div>
            <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Hold to speak · दबाकर बोलें</div>
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

      {appState === "recording" && (
        <>
          <div style={{ fontSize: 13, color: "var(--red)", marginBottom: 16, display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--red)", animation: "activePulse 1s ease infinite" }} />
            REC सुन रहा हूँ...
          </div>
          {recordingCountdown > 0 && (
            <div style={{ fontFamily: S.mono, fontSize: 48, fontWeight: 500, color: "var(--saffron)", marginBottom: 16, animation: "countFade 1s ease" }}>{recordingCountdown}</div>
          )}
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 16, height: 44 }}>
            {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((d, i) => (
              <div key={i} style={{
                width: 4, background: "var(--saffron)", borderRadius: 2,
                animation: `wave 0.8s ease-in-out infinite ${d}s`, height: 8,
              }} />
            ))}
          </div>
          <div style={{ position: "relative", width: 220, height: 220 }}>
            {[220, 170, 120].map((s, i) => (
              <div key={i} style={{
                position: "absolute", width: s, height: s, borderRadius: "50%",
                border: "2px solid rgba(239,68,68,0.5)", top: (220 - s) / 2, left: (220 - s) / 2,
                animation: `pulseOut 1.4s ease-out infinite ${i * 0.35}s`,
              }} />
            ))}
            <div style={{
              position: "absolute", top: 60, left: 60, width: 100, height: 100, borderRadius: "50%",
              background: "linear-gradient(145deg, #DC2626, #B91C1C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 0 1px rgba(239,68,68,0.4), 0 0 32px rgba(239,68,68,0.25)",
            }}>
              <Mic size={36} color="white" />
            </div>
          </div>
        </>
      )}

      {appState === "processing" && (
        <div style={{ maxWidth: 480, width: "100%", padding: "0 20px", textAlign: "center" }}>
          <div style={{ fontFamily: S.hindi, fontSize: "1.3rem", color: "white", marginBottom: 16, transition: "opacity 200ms" }}>
            {getCurrentSpeakingText()}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 3, marginBottom: 24, height: 40 }}>
            {[0, 0.1, 0.2, 0.1, 0].map((d, i) => (
              <div key={i} style={{
                width: 6, borderRadius: 4, background: "var(--saffron)",
                animation: `audioBar 1.2s ease-in-out infinite ${d}s`, height: 8,
              }} />
            ))}
          </div>
          <PipelineVisual />
        </div>
      )}

      {appState === "results" && <ResultCard compact />}

      {appState === "error" && (
        <div style={{ ...S.glass, border: "2px solid var(--red)", padding: 32, textAlign: "center", maxWidth: 400 }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontFamily: S.serif, fontSize: "1.4rem", marginBottom: 8 }}>कुछ गड़बड़ हो गई</div>
          <div style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>Something went wrong. Please try again.</div>
          <button onClick={resetToIdle} style={{
            background: "var(--saffron)", color: "white", border: "none", borderRadius: 8, padding: "10px 20px",
            fontSize: 14, cursor: "pointer",
          }}>🔄 फिर कोशिश करें</button>
        </div>
      )}
    </div>
  );

  // ─── DASHBOARD PROCUREMENT ───
  // Dashboard idle state shared across tabs
  const DashboardIdleState = () => {
    const capCards: { tab: ActiveTab; icon: React.ReactNode; title: string; sub: string; color: string; hoverBorder: string }[] = [
      { tab: "procurement", icon: <ShoppingCart size={20} color="#F97316" />, title: "ONDC Logistics", sub: "7 providers · TOPSIS ranked", color: "#F97316", hoverBorder: "rgba(249,115,22,0.3)" },
      { tab: "credit", icon: <CreditCard size={20} color="#F59E0B" />, title: "OCEN 4.0 Credit", sub: "4 lenders · flow-based scoring", color: "#F59E0B", hoverBorder: "rgba(245,158,11,0.3)" },
      { tab: "safety", icon: <Scale size={20} color="#8B5CF6" />, title: "Labour Rights", sub: "CeRAI framework · RAG validated", color: "#8B5CF6", hoverBorder: "rgba(139,92,246,0.3)" },
    ];
    return (
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        minHeight: "calc(100vh - 64px - 80px)", padding: 24,
      }}>
        {/* Worker Context Summary */}
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
              <div style={{ fontFamily: S.hindi, fontSize: 12, color: "var(--text-secondary)", marginTop: 2, marginLeft: 50 }}>{RAVI.nameHindi}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6, marginLeft: 50 }}>📍 {RAVI.location}  ·  🛒 {RAVI.business}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Last session: today</div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "3px 10px", marginTop: 4 }}>
                <Zap size={12} color="var(--amber)" />
                <span style={{ fontFamily: S.mono, fontSize: 11, color: "var(--amber)", fontWeight: 500 }}>MEDIUM</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--emerald)", marginTop: 4 }}>Ready for next query</div>
            </div>
          </div>
        </div>

        {/* Capability Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, maxWidth: 560, width: "100%", marginTop: 24 }}>
          {capCards.map((c, i) => (
            <button key={c.tab} onClick={() => { setActiveTab(c.tab); submitQuery(EXAMPLE_CHIPS[c.tab][0]); }} style={{
              ...S.glass, padding: 16, border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12,
              cursor: "pointer", textAlign: "left", transition: "all 200ms",
              animation: `fadeInUp 0.4s ease-out ${i * 0.08}s both`,
              background: "rgba(255,255,255,0.03)",
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = c.hoverBorder; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.transform = "scale(1.01)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "scale(1)"; }}
            >
              <div style={{ marginBottom: 8 }}>{c.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{c.title}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{c.sub}</div>
            </button>
          ))}
        </div>

        {/* Example Chips */}
        <div style={{ marginTop: 20, animation: "fadeInUp 0.3s ease-out 0.3s both" }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginBottom: 8 }}>Try asking →</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {EXAMPLE_CHIPS[activeTab].map((chip, i) => (
              <button key={i} onClick={() => submitQuery(chip)} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: 999, padding: "9px 20px", fontSize: 13, color: "var(--text-secondary)",
                cursor: "pointer", transition: "all 150ms", opacity: 0.85,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,0.45)"; e.currentTarget.style.color = "var(--saffron)"; e.currentTarget.style.background = "rgba(249,115,22,0.05)"; e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.opacity = "0.85"; }}
              >{chip}</button>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const ProcurementPanel = () => {
    if (appState === "idle" || appState === "recording") return <DashboardIdleState />;

    return (
      <div style={{ animation: "fadeInUp 0.3s ease-out" }}>
        {/* Query Echo */}
        <div style={{ ...S.glass, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#F97316,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "white", flexShrink: 0 }}>R</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14 }}>{currentQuery}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>procurement_search · 94% confidence</div>
          </div>
        </div>

        {/* Pipeline */}
        {(appState === "processing" || appState === "results") && <PipelineVisual />}

        {appState === "results" && (
          <>
            {/* TOPSIS Chart */}
            <div style={{ ...S.glass, padding: 20, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <span style={{ fontFamily: S.serif, fontSize: 18 }}>TOPSIS Ranked Results</span>
                <span style={{
                  fontSize: 11, color: "var(--saffron)", background: "rgba(249,115,22,0.08)",
                  border: "1px solid rgba(249,115,22,0.2)", borderRadius: 999, padding: "4px 12px",
                }}>Price 35% · Time 25% · Rating 25% · Credit 15%</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={ONDC.map((o, i) => ({ name: o.name.substring(0, 12), score: o.score, fill: i === 0 ? "#F97316" : i === 1 ? "#F59E0B" : "#374151" }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: S.mono, fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + "%"} />
                  <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: "#141B2D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 12 }}>{(payload[0].payload as any).name}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 14, color: "var(--saffron)" }}>Score: {payload[0].value}%</div>
                    </div>
                  ) : null} />
                  <ReferenceLine y={84.7} stroke="rgba(249,115,22,0.5)" strokeDasharray="4 4" />
                  <Bar dataKey="score" fill="#F97316" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", gap: 12, marginTop: 8, justifyContent: "center" }}>
                {[
                  { label: "Price 35%", color: "var(--saffron)" },
                  { label: "Delivery 25%", color: "var(--blue)" },
                  { label: "Rating 25%", color: "var(--violet)" },
                  { label: "Credit 15%", color: "var(--emerald)" },
                ].map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-secondary)" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: c.color }} />
                    {c.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Top Pick */}
            <div style={{ ...S.glass, borderLeft: "4px solid var(--saffron)", padding: 24, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span style={{ background: "rgba(249,115,22,0.15)", color: "var(--saffron)", fontSize: 11, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>🏆 #1 Recommendation</span>
                  <div style={{ fontFamily: S.serif, fontSize: 22, marginTop: 8 }}>Ekart Logistics</div>
                  <span style={{ fontSize: 11, color: "var(--blue)", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 999, padding: "2px 8px" }}>ONDC Verified · Beckn Protocol</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <ScoreRing score={84.7} />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>TOPSIS Score</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 12, marginTop: 16 }}>
                {[
                  { icon: "📦", val: "₹380", label: "Price" },
                  { icon: "💨", val: "3 days", label: "Delivery" },
                  { icon: "⭐", val: "4.5", label: "Rating" },
                  { icon: "💳", val: "✓", label: "Credit" },
                ].map((s, i) => (
                  <div key={i} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 14, marginBottom: 2 }}>{s.icon}</div>
                    <div style={{ fontFamily: S.mono, fontSize: 16, fontWeight: 600 }}>{s.val}</div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Criteria bars */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>Criteria Performance</div>
                {[
                  { label: "Price", val: 80 },
                  { label: "Delivery", val: 75 },
                  { label: "Rating", val: 90 },
                  { label: "Credit", val: 100 },
                ].map((b, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ width: 80, fontSize: 12, color: "var(--text-muted)" }}>{b.label}</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", background: "var(--saffron)", borderRadius: 999,
                        width: scoreAnimated ? `${b.val}%` : "0%",
                        transition: `width 0.8s ease-out ${i * 0.1}s`,
                      }} />
                    </div>
                    <span style={{ width: 40, fontFamily: S.mono, fontSize: 12, color: "var(--saffron)", textAlign: "right" }}>{b.val}%</span>
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Volume2 size={16} color="var(--saffron)" />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saathi कह रहा है:</span>
                </div>
                <AudioWaveform playing={audioPlaying} />
                {!audioPlaying && (
                  <button onClick={() => { setAudioPlaying(true); setTimeout(() => setAudioPlaying(false), 3000); }}
                    style={{ background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "4px 12px", color: "var(--saffron)", fontSize: 12, cursor: "pointer", marginTop: 4 }}>🔊 सुनें</button>
                )}
                <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9", marginTop: 10 }}>
                  {showEnglish ? ENGLISH_RESPONSES[activeTab] : HINDI_RESPONSES[activeTab].slice(0, hindiCharIndex)}
                  {!showEnglish && hindiCharIndex < HINDI_RESPONSES[activeTab].length && <span style={{ opacity: 0.5 }}>▌</span>}
                </p>
                <button onClick={() => setShowEnglish(!showEnglish)} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                  color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6,
                }}>{showEnglish ? "हिंदी" : "EN"}</button>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                <SafetyBadge delayed={false} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                <button style={{ background: "var(--saffron)", color: "white", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✓ Confirm & Proceed</button>
                <button onClick={resetToIdle} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}>← Ask Again</button>
              </div>
            </div>

            {/* All Options */}
            <div style={{ marginTop: 16 }}>
              <button onClick={() => setShowAllOptions(!showAllOptions)} style={{
                background: "none", border: "none", color: "var(--text-secondary)", fontSize: 13, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 4,
              }}>
                View all 7 options {showAllOptions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showAllOptions && (
                <div style={{ ...S.glass, marginTop: 8, overflow: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: "0 4px" }}>
                    <thead>
                      <tr>
                        {["Rank", "Provider", "Price", "Days", "Rating", "Credit", "TOPSIS"].map(h => (
                          <th key={h} style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", padding: "8px 12px", textAlign: "left", fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {ONDC.map((o, i) => (
                        <tr key={o.id} style={{
                          background: i === 0 ? "rgba(249,115,22,0.06)" : i % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent",
                          animation: `fadeInUp 0.3s ease-out ${i * 0.04}s both`,
                        }}>
                          <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>{o.rank}</td>
                          <td style={{ padding: "8px 12px", fontSize: 13 }}>{o.name}</td>
                          <td style={{ padding: "8px 12px", fontFamily: S.mono }}>₹{o.price}</td>
                          <td style={{ padding: "8px 12px", fontFamily: S.mono }}>{o.days}</td>
                          <td style={{ padding: "8px 12px", color: "var(--amber)" }}>{o.rating} ⭐</td>
                          <td style={{ padding: "8px 12px", color: o.credit ? "var(--emerald)" : "var(--text-muted)" }}>{o.credit ? "✓" : "–"}</td>
                          <td style={{ padding: "8px 12px", fontFamily: S.mono, color: i === 0 ? "var(--saffron)" : "var(--text-primary)" }}>{o.score}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
        {/* Query Echo */}
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
            {/* Credit Assessment */}
            <div style={{ ...S.glass, borderLeft: "4px solid var(--amber)", padding: 24, marginTop: 16 }}>
              <div style={{ fontFamily: S.serif, fontSize: 18, marginBottom: 4 }}>Flow-Based Credit Assessment</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>Powered by your ONDC transaction history</div>
              {[
                { label: "Monthly Avg", val: "₹20,000", pct: 80, badge: "HIGH", color: "var(--emerald)" },
                { label: "Consistency", val: "Good", pct: 75, badge: "HIGH", color: "var(--emerald)" },
                { label: "Credentials", val: "3", pct: 60, badge: "MEDIUM", color: "var(--amber)" },
                { label: "ONDC Age", val: "6 months", pct: 80, badge: "HIGH", color: "var(--emerald)" },
              ].map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                  <span style={{ width: 100, fontSize: 13 }}>{b.label}</span>
                  <div style={{ flex: 1, height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", background: b.color, borderRadius: 999,
                      width: scoreAnimated ? `${b.pct}%` : "0%",
                      transition: `width 1s ease-out ${i * 0.15}s`,
                    }} />
                  </div>
                  <span style={{ fontFamily: S.mono, fontSize: 13, width: 70, textAlign: "right" }}>{b.val}</span>
                  <span style={{
                    fontSize: 10, borderRadius: 999, padding: "2px 8px",
                    background: b.badge === "HIGH" ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                    color: b.color, fontWeight: 600,
                  }}>{b.badge}</span>
                </div>
              ))}

              {/* Semicircle meter */}
              <div style={{ textAlign: "center", marginTop: 24 }}>
                <svg width={240} height={140} viewBox="0 0 240 140">
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(239,68,68,0.3)" strokeWidth={12} strokeLinecap="round"
                    strokeDasharray="157 314" strokeDashoffset="0" />
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(245,158,11,0.3)" strokeWidth={12} strokeLinecap="round"
                    strokeDasharray="94 314" strokeDashoffset="-126" />
                  <path d="M 20 130 A 100 100 0 0 1 220 130" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth={12} strokeLinecap="round"
                    strokeDasharray="94 314" strokeDashoffset="-220" />
                  {/* Needle */}
                  <line x1="120" y1="130" x2="120" y2="40" stroke="white" strokeWidth={3} strokeLinecap="round"
                    style={{
                      transform: needleAnimated ? "rotate(36deg)" : "rotate(-90deg)",
                      transformOrigin: "120px 130px",
                      transition: "transform 1.5s ease-out",
                    }} />
                  <circle cx="120" cy="130" r="5" fill="white" />
                  <text x="20" y="140" style={{ fontSize: 11, fill: "var(--text-muted)" }}>0</text>
                  <text x="218" y="140" style={{ fontSize: 11, fill: "var(--text-muted)" }}>100</text>
                </svg>
                <div>
                  <span style={{ fontFamily: S.mono, fontSize: 42, fontWeight: 700 }}>72</span>
                  <span style={{ fontSize: 16, color: "var(--text-muted)" }}> / 100</span>
                </div>
                <div style={{ display: "inline-flex", background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 999, padding: "4px 12px", color: "var(--amber)", fontWeight: 600, fontSize: 13, marginTop: 4 }}>MEDIUM Credit Band</div>
                <div style={{ color: "var(--emerald)", fontSize: 14, marginTop: 6 }}>Eligible up to ₹10,000</div>
              </div>
            </div>

            {/* Lender Chart */}
            <div style={{ ...S.glass, padding: 20, marginTop: 16 }}>
              <div style={{ fontFamily: S.serif, fontSize: 18, marginBottom: 16 }}>Best Loan Offers via OCEN 4.0</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={OCEN.map((o, i) => ({ name: o.name.substring(0, 12), score: o.score, fill: i === 0 ? "#F59E0B" : i === 1 ? "#D97706" : "#374151" }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontFamily: S.mono, fontSize: 10, fill: "#475569" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => v + "%"} />
                  <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: "#141B2D", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "8px 12px" }}>
                      <div style={{ fontSize: 12 }}>{(payload[0].payload as any).name}</div>
                      <div style={{ fontFamily: S.mono, fontSize: 14, color: "var(--amber)" }}>Score: {payload[0].value}%</div>
                    </div>
                  ) : null} />
                  <Bar dataKey="score" fill="#F59E0B" radius={[6, 6, 0, 0]} animationDuration={800} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Top Pick */}
            <div style={{ ...S.glass, borderLeft: "4px solid var(--amber)", padding: 24, marginTop: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <span style={{ background: "rgba(245,158,11,0.15)", color: "var(--amber)", fontSize: 11, borderRadius: 999, padding: "4px 10px", fontWeight: 600 }}>🏆 #1 Recommendation</span>
                  <div style={{ fontFamily: S.serif, fontSize: 22, marginTop: 8 }}>NanoFin Microloan</div>
                  <span style={{ fontSize: 11, color: "var(--blue)", background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", borderRadius: 999, padding: "2px 8px" }}>OCEN 4.0 · Flow-Based</span>
                </div>
                <div style={{ textAlign: "center" }}>
                  <ScoreRing score={81.2} />
                  <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>TOPSIS Score</div>
                </div>
              </div>
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

              {/* Explanation */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12, marginTop: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Volume2 size={16} color="var(--saffron)" />
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Saathi कह रहा है:</span>
                </div>
                <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9", marginTop: 8 }}>
                  {showEnglish ? ENGLISH_RESPONSES.credit : HINDI_RESPONSES.credit.slice(0, hindiCharIndex)}
                </p>
                <button onClick={() => setShowEnglish(!showEnglish)} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                  color: showEnglish ? "var(--saffron)" : "var(--text-secondary)", marginTop: 6,
                }}>{showEnglish ? "हिंदी" : "EN"}</button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 16 }}>
                <button style={{ background: "var(--saffron)", color: "white", border: "none", borderRadius: 10, padding: 12, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>✓ Confirm & Proceed</button>
                <button onClick={resetToIdle} style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 12, fontSize: 14, color: "var(--text-secondary)", cursor: "pointer" }}>← Ask Again</button>
              </div>
            </div>

            {/* Repayment Reminder */}
            <div style={{ ...S.glass, borderLeft: "2px solid var(--emerald)", padding: 14, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 13 }}>📅 Saathi will remind Ravi 3 days before due date</div>
                <div style={{ fontFamily: S.hindi, fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>हिंदी में reminder आएगा</div>
              </div>
              <div style={{ width: 40, height: 22, borderRadius: 11, background: "var(--emerald)", position: "relative", cursor: "pointer" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: "white", position: "absolute", top: 2, right: 2, transition: "all 200ms" }} />
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
            {/* RAG Source */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", animation: "fadeInUp 0.3s ease-out" }}>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>📚 Legal corpus consulted:</span>
              {["Factories Act 1948", "Min. Wages Act", "Contract Labour Act"].map(a => (
                <span key={a} style={{ fontSize: 11, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 999, padding: "3px 10px", color: "var(--text-secondary)" }}>{a}</span>
              ))}
            </div>

            {/* Response */}
            <div style={{ ...S.glass, borderLeft: "4px solid var(--violet)", padding: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <span style={{ fontFamily: S.serif, fontSize: 18 }}>⚖️ Your Rights</span>
                </div>
                <div style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)",
                  borderRadius: 999, padding: "5px 12px",
                }}>
                  <Shield size={14} color="var(--violet)" />
                  <span style={{ fontSize: 12, color: "var(--violet)" }}>CeRAI Validated</span>
                </div>
              </div>

              <p style={{ fontFamily: S.hindi, fontSize: "0.95rem", lineHeight: 1.9, color: "#F1F5F9" }}>
                {showEnglish ? ENGLISH_RESPONSES.safety : HINDI_RESPONSES.safety.slice(0, hindiCharIndex)}
                {!showEnglish && hindiCharIndex < HINDI_RESPONSES.safety.length && <span style={{ opacity: 0.5 }}>▌</span>}
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowEnglish(!showEnglish)} style={{
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999, padding: "3px 10px", fontSize: 11, cursor: "pointer",
                  color: showEnglish ? "var(--saffron)" : "var(--text-secondary)",
                }}>{showEnglish ? "हिंदी" : "EN"}</button>
                <button onClick={() => { setAudioPlaying(true); setTimeout(() => setAudioPlaying(false), 3000); }}
                  style={{ background: "none", border: "1px solid rgba(249,115,22,0.3)", borderRadius: 8, padding: "3px 10px", color: "var(--saffron)", fontSize: 11, cursor: "pointer" }}>🔊 सुनें</button>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 12 }}>
                <Shield size={14} color="var(--emerald)" />
                <span style={{ fontFamily: S.mono, fontSize: 12, color: "var(--emerald)" }}>0.91</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Legally compliant · CeRAI validated</span>
              </div>
            </div>

            {/* Action Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 16 }}>
              {[
                { icon: "📞", title: "Helpline", desc: "1800-11-5555", btn: "Call Now", color: "var(--emerald)" },
                { icon: "📄", title: "File Complaint", desc: "Labour Commissioner Portal", btn: "Open Link", color: "var(--blue)" },
                { icon: "📍", title: "Nearest Office", desc: "Find office in your area", btn: "Get Directions", color: "var(--violet)" },
              ].map((c, i) => (
                <div key={i} style={{ ...S.glass, padding: 16, textAlign: "center", transition: "transform 200ms", cursor: "pointer" }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: c.title === "Helpline" ? S.mono : "inherit", marginBottom: 10 }}>{c.desc}</div>
                  <button style={{
                    background: "transparent", border: `1px solid ${c.color}`, color: c.color,
                    borderRadius: 8, padding: "6px 14px", fontSize: 12, cursor: "pointer", width: "100%",
                  }}>{c.btn}</button>
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
      {/* Mobile sidebar drawer */}
      {sidebarOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} onClick={() => setSidebarOpen(false)} />
          <div style={{ position: "relative", zIndex: 1, animation: "slideInRight 0.3s ease-out", width: 280 }}>
            <button onClick={() => setSidebarOpen(false)} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", zIndex: 2 }}><X size={20} /></button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="sidebar-desktop" style={{ display: "block" }}>
        <Sidebar />
      </div>

      {/* Main */}
      <main style={{ flex: 1, padding: 20, overflow: "auto" }}>
        {activeTab === "procurement" && <ProcurementPanel />}
        {activeTab === "credit" && <CreditPanel />}
        {activeTab === "safety" && <SafetyPanel />}
      </main>
    </div>
  );

  // ─── VOICE BAR ───
  const VoiceBar = () => (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, height: 80, zIndex: 50,
      background: "rgba(6,11,24,0.97)", backdropFilter: "blur(24px) saturate(180%)",
      borderTop: "1px solid rgba(255,255,255,0.07)",
    }}>
      <div style={{
        maxWidth: 860, margin: "0 auto", height: "100%", display: "flex", alignItems: "center",
        gap: 10, padding: "0 16px",
      }}>
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
            <div style={{
              position: "absolute", bottom: 48, left: 0, ...S.glass, minWidth: 160, padding: 4, zIndex: 60,
            }}>
              {["हिंदी", "ಕನ್ನಡ", "தமிழ்", "বাংলা"].map(l => (
                <button key={l} onClick={() => { setSelectedLang(l); setShowLangDropdown(false); }} style={{
                  display: "block", width: "100%", textAlign: "left", background: selectedLang === l ? "rgba(249,115,22,0.1)" : "transparent",
                  border: "none", padding: "8px 12px", borderRadius: 8, fontSize: 13, color: "var(--text-primary)", cursor: "pointer",
                }}>{l} {selectedLang === l && "✓"}</button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
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

        {/* Mic */}
        <div style={{ position: "relative" }}>
          {appState === "recording" && (
            <>
              {[80, 100, 120].map((s, i) => (
                <div key={i} style={{
                  position: "absolute", width: s, height: s, borderRadius: "50%",
                  border: `2px solid rgba(239,68,68,${0.5 - i * 0.15})`,
                  top: (56 - s) / 2, left: (56 - s) / 2,
                  animation: `pulseOut 1.4s ease-out infinite ${i * 0.35}s`,
                  pointerEvents: "none",
                }} />
              ))}
            </>
          )}
          <button
            onClick={() => appState === "idle" || appState === "results" ? setAppState("recording") : null}
            style={{
              width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
              background: appState === "recording" ? "var(--crimson)" : "linear-gradient(145deg, #F97316, #EA580C)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: appState === "recording" ? "0 0 0 1px rgba(239,68,68,0.5), 0 0 24px rgba(239,68,68,0.3)" : S.saffronGlow,
              transition: "all 200ms cubic-bezier(0.34,1.56,0.64,1)",
              position: "relative", zIndex: 1,
            }}
            aria-label="Hold to speak"
          >
            <Mic size={22} color="white" />
          </button>
        </div>

        {/* Send */}
        <button onClick={() => submitQuery(textInput)}
          disabled={!textInput.trim()}
          style={{
            width: 40, height: 40, background: "transparent", border: "none",
            cursor: textInput.trim() ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8,
          }}>
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

  // ─── RESPONSIVE CSS ───
  const responsiveStyles = `
    @media (max-width: 767px) {
      .sidebar-desktop { display: none !important; }
      .md-hide-btn { display: flex !important; }
    }
    @media (min-width: 768px) {
      .sidebar-desktop { display: block !important; }
      .md-hide-btn { display: none !important; }
    }
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
