import { useState, useRef, useEffect } from "react";

// ─── Config ──────────────────────────────────────────────────────────────────
const FREE_LIMIT = 999999;
const UNLOCK_AT = 3;
const PRICE_MONTHLY = 9;
const PRICE_ANNUAL = 60;
const PAYSTACK_KEY = "pk_live_711536bf0ccb9506b6ec032ff7297a60b6978b36";
const CONTACT_EMAIL = "claritycareerai@gmail.com";
const OWNER_NAME = "Goodluck Meshack Akoh";

const STAGES = ["clarify", "blindspots", "stresstest", "scenarios", "ownership"];
const STAGE_THRESHOLDS = { clarify: 3, blindspots: 2, stresstest: 2, scenarios: 1, ownership: 1 };
const STAGE_META = {
  clarify:    { label: "Clarify",     icon: "◎", color: "#C8F04A" },
  blindspots: { label: "Blind Spots", icon: "◈", color: "#F0A84A" },
  stresstest: { label: "Stress Test", icon: "◆", color: "#F04A6B" },
  scenarios:  { label: "Scenarios",   icon: "◇", color: "#4AC8F0" },
  ownership:  { label: "Ownership",   icon: "●", color: "#C8F04A" },
};

const PRO_FEATURES = [
  { icon: "∞", label: "Unlimited decisions",        sub: "No monthly cap ever",                    key: "unlimited" },
  { icon: "◎", label: "Full history saved forever", sub: "Every session, always accessible",       key: "history"   },
  { icon: "◈", label: "Image upload",               sub: "Screenshots, job offers, letters",       key: "image"     },
  { icon: "♪", label: "Voice input",                sub: "Speak your situation",                   key: "voice"     },
  { icon: "◆", label: "Deep scenario analysis",     sub: "More detailed futures & regret mapping", key: "deep"      },
  { icon: "⚡", label: "Priority responses",         sub: "Faster AI, no delay",                   key: "priority"  },
];

// ─── Storage ─────────────────────────────────────────────────────────────────
const store = {
  get: (k, fb) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch { return fb; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// ─── Paystack ────────────────────────────────────────────────────────────────
function initPaystack({ email, amount, plan, onSuccess, onClose }) {
  const load = () => new Promise(res => {
    if (window.PaystackPop) return res();
    const s = document.createElement("script");
    s.src = "https://js.paystack.co/v1/inline.js";
    s.onload = res;
    document.head.appendChild(s);
  });
  load().then(() => {
    const h = window.PaystackPop.setup({
      key: PAYSTACK_KEY, email, amount: amount * 100, currency: "USD",
      channels: ["card"],
      metadata: { plan, custom_fields: [{ display_name: "Plan", variable_name: "plan", value: plan }] },
      callback: onSuccess, onClose,
    });
    h.openIframe();
  });
}

// ─── AI ──────────────────────────────────────────────────────────────────────
const systemPromptFor = (stage, question, history, isPro) => {
  const hist = history.map(m => `${m.role === "user" ? "User" : "AI"}: ${m.content}`).join("\n");
  const base = `You are ClarityAI. You help young people (16–30) think more clearly about career decisions. You NEVER tell people what to do. You sharpen their thinking.
User's question: "${question}"
Conversation so far:\n${hist || "(none yet)"}
RULES: Never recommend. One question at a time. Warm, direct, sharp. Under 100 words unless doing scenarios. Plain language.${isPro ? " This is a Pro user — give deeper, more detailed analysis." : ""}`;
  const instructions = {
    clarify:    `STAGE: Clarify. Understand the real question. Surface goals, fears, constraints. Ask ONE focused question like a smart friend.`,
    blindspots: `STAGE: Blind Spots. Name a specific hidden assumption or emotional pressure. Example: "You seem to be assuming X — what if that's not true?" Then ask one follow-up.`,
    stresstest: `STAGE: Stress Test. Challenge one weakness in their reasoning. One sharp question only.`,
    scenarios:  `STAGE: Scenarios. Paint 3 futures:\nBEST CASE (2-3 sentences)\nLIKELY CASE (2-3 sentences)\nWORST CASE (2-3 sentences)\nREGRET ANALYSIS: at age 40, which choice would they regret more?${isPro ? " Add extra depth — explore specific timelines, financial implications, relationship impacts, and alternative paths they haven't considered." : ""} End with ONE reflective question.`,
    ownership:  `STAGE: Ownership. Summarize 2-3 key insights. End with: "You now understand the tradeoffs more clearly. The decision remains yours." Warm, empowering, no question.`,
  };
  return base + "\n\n" + instructions[stage];
};

async function callClaude(messages, systemPrompt) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system: systemPrompt, messages }),
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Error ${res.status}`); }
  const data = await res.json();
  return data.content?.map(b => b.text || "").join("") || "Something went wrong.";
}

function nextStageFor(stage, count) {
  if (count >= STAGE_THRESHOLDS[stage]) {
    const idx = STAGES.indexOf(stage);
    if (idx < STAGES.length - 1) return STAGES[idx + 1];
  }
  return stage;
}

// ─── Confetti ────────────────────────────────────────────────────────────────
function Confetti() {
  const ref = useRef();
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: ["#C8F04A","#F0A84A","#4AC8F0","#F04A6B","#ffffff"][Math.floor(Math.random()*5)],
      speed: Math.random() * 3 + 2,
      angle: Math.random() * 360,
      spin: Math.random() * 4 - 2,
    }));
    let frame;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach(p => {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle * Math.PI / 180);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
        ctx.restore();
        p.y += p.speed; p.angle += p.spin;
        if (p.y > canvas.height) { p.y = -20; p.x = Math.random() * canvas.width; }
      });
      frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} style={{ position: "fixed", inset: 0, zIndex: 999, pointerEvents: "none" }} />;
}

// ─── Components ───────────────────────────────────────────────────────────────
function ProgressBar({ stage }) {
  const idx = STAGES.indexOf(stage);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 28 }}>
      {STAGES.map((s, i) => {
        const m = STAGE_META[s]; const done = i < idx; const active = i === idx;
        return (
          <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: active?32:24, height: active?32:24, borderRadius:"50%", background: active?m.color:done?"#333":"#1a1a1a", border:`2px solid ${active?m.color:done?"#444":"#2a2a2a"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize: active?13:10, color: active?"#0a0a0a":done?"#888":"#333", fontWeight:700, transition:"all 0.3s", flexShrink:0 }}>{done?"✓":m.icon}</div>
            {i < STAGES.length-1 && <div style={{ width:16, height:2, background: done?"#444":"#1a1a1a" }} />}
          </div>
        );
      })}
      <span style={{ marginLeft:10, fontSize:11, color:"#666", letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"monospace" }}>{STAGE_META[stage].label}</span>
    </div>
  );
}

function Message({ msg, isNew }) {
  const ai = msg.role === "assistant";
  return (
    <div style={{ display:"flex", justifyContent: ai?"flex-start":"flex-end", marginBottom:14, animation: isNew?"fadeUp 0.4s ease":"none" }}>
      {ai && <div style={{ width:28, height:28, borderRadius:"50%", background:"#C8F04A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#0a0a0a", marginRight:10, flexShrink:0, marginTop:4 }}>C</div>}
      <div style={{ maxWidth:"75%", background: ai?"#141414":"#C8F04A", color: ai?"#e0e0e0":"#0a0a0a", padding:"13px 17px", borderRadius: ai?"4px 18px 18px 18px":"18px 4px 18px 18px", fontSize:15, lineHeight:1.7, fontFamily:"Georgia,serif", border: ai?"1px solid #222":"none", whiteSpace:"pre-wrap" }}>{msg.content}</div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
      <div style={{ width:28, height:28, borderRadius:"50%", background:"#C8F04A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:900, color:"#0a0a0a" }}>C</div>
      <div style={{ display:"flex", gap:5, padding:"13px 17px", background:"#141414", borderRadius:"4px 18px 18px 18px", border:"1px solid #222" }}>
        {[0,1,2].map(i => <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"#C8F04A", animation:`bounce 1.2s ease ${i*0.2}s infinite` }} />)}
      </div>
    </div>
  );
}

// ── Onboarding ──
function OnboardingModal({ onDone }) {
  const [step, setStep] = useState(0);
  const steps = [
    { icon:"◎", title:"You bring the question.", body:"Any career decision you're stuck on. University vs skill. Stay vs move. Which path. Whatever's keeping you up at night." },
    { icon:"◈", title:"We sharpen your thinking.", body:"Not advice. Not decisions. We help you see clearly — your blind spots, your assumptions, your real fears." },
    { icon:"●", title:"The decision stays yours.", body:"By the end you'll understand your tradeoffs better than you did before. That's the whole point." },
  ];
  const s = steps[step];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.95)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:500, padding:20 }}>
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:20, padding:"40px 32px", maxWidth:400, width:"100%", textAlign:"center", animation:"slideUp 0.35s ease" }}>
        <div style={{ fontSize:48, color:"#C8F04A", marginBottom:20 }}>{s.icon}</div>
        <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:24, color:"#f0f0f0", marginBottom:14 }}>{s.title}</h2>
        <p style={{ color:"#777", fontSize:15, lineHeight:1.75, fontFamily:"Georgia,serif", marginBottom:36 }}>{s.body}</p>
        <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:28 }}>
          {steps.map((_,i) => <div key={i} style={{ width: i===step?24:8, height:8, borderRadius:4, background: i===step?"#C8F04A":"#2a2a2a", transition:"all 0.3s" }} />)}
        </div>
        <button onClick={() => step < steps.length-1 ? setStep(step+1) : onDone()}
          style={{ width:"100%", padding:"15px", background:"#C8F04A", color:"#0a0a0a", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer" }}>
          {step < steps.length-1 ? "Next →" : "Let's begin →"}
        </button>
      </div>
    </div>
  );
}

// ── Pro Feature Lock Badge ──
function ProBadge() {
  return <span style={{ background:"#C8F04A", color:"#0a0a0a", fontSize:9, fontWeight:800, padding:"2px 6px", borderRadius:4, letterSpacing:"0.08em", marginLeft:6, verticalAlign:"middle" }}>PRO</span>;
}

// ── Rating Modal ──
function RatingModal({ onRate, onSkip }) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const labels = ["","Not helpful","Somewhat helpful","Pretty good","Very helpful","Transformative"];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:20, padding:"36px 32px", maxWidth:400, width:"100%", textAlign:"center", animation:"slideUp 0.35s ease" }}>
        <div style={{ fontSize:36, marginBottom:16 }}>◎</div>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:22, color:"#f0f0f0", marginBottom:10 }}>How clear do you feel?</h2>
        <p style={{ color:"#666", fontSize:14, lineHeight:1.65, fontFamily:"Georgia,serif", marginBottom:28 }}>Your honest rating helps us improve Clarity for the next person.</p>
        <div style={{ display:"flex", justifyContent:"center", gap:10, marginBottom:12 }}>
          {[1,2,3,4,5].map(n => (
            <div key={n} onClick={() => setSelected(n)} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)}
              style={{ width:44, height:44, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, cursor:"pointer", background: n<=(hovered||selected)?"#C8F04A":"#1a1a1a", color: n<=(hovered||selected)?"#0a0a0a":"#444", border:`2px solid ${n<=(hovered||selected)?"#C8F04A":"#2a2a2a"}`, transition:"all 0.15s" }}>★</div>
          ))}
        </div>
        <p style={{ fontSize:13, color:"#C8F04A", height:20, marginBottom:24 }}>{labels[hovered||selected]}</p>
        <button onClick={() => selected && onRate(selected)} disabled={!selected}
          style={{ width:"100%", padding:"14px", background: selected?"#C8F04A":"#1a1a1a", color: selected?"#0a0a0a":"#333", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor: selected?"pointer":"not-allowed", marginBottom:10 }}>
          Submit Rating
        </button>
        <button onClick={onSkip} style={{ width:"100%", padding:"12px", background:"none", color:"#555", border:"1px solid #1a1a1a", borderRadius:10, fontSize:14, cursor:"pointer" }}>Skip for now</button>
      </div>
    </div>
  );
}

// ── Unlock Teaser ──
function UnlockTeaserModal({ onAccept, onDecline }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0d0d0d", border:"1px solid #C8F04A", borderRadius:20, padding:"36px 32px", maxWidth:420, width:"100%", textAlign:"center", animation:"slideUp 0.35s ease" }}>
        <div style={{ display:"inline-block", background:"#C8F04A", color:"#0a0a0a", fontSize:11, fontWeight:800, padding:"4px 12px", borderRadius:20, letterSpacing:"0.12em", marginBottom:20 }}>FREE PRO TASTE</div>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:22, color:"#f0f0f0", marginBottom:12 }}>You've made 3 decisions.</h2>
        <p style={{ color:"#888", fontSize:15, lineHeight:1.7, fontFamily:"Georgia,serif", marginBottom:28 }}>Try our <strong style={{ color:"#C8F04A" }}>deeper scenario analysis</strong> on your next decision — completely free. Best case, worst case, regret analysis, more depth than ever.</p>
        <div style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:12, padding:"16px 20px", marginBottom:24, textAlign:"left" }}>
          {["Detailed best / likely / worst case","Regret analysis at age 40","Specific to your exact words","No charge — just try it"].map((f,i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"center", marginBottom: i<3?10:0 }}>
              <span style={{ color:"#C8F04A" }}>✓</span>
              <span style={{ fontSize:14, color:"#bbb" }}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={onAccept} style={{ width:"100%", padding:"15px", background:"#C8F04A", color:"#0a0a0a", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:10 }}>Yes, unlock my free taste →</button>
        <button onClick={onDecline} style={{ width:"100%", padding:"12px", background:"none", color:"#555", border:"1px solid #1a1a1a", borderRadius:10, fontSize:14, cursor:"pointer" }}>No thanks</button>
      </div>
    </div>
  );
}

// ── Share Card ──
function ShareModal({ question, rating, onClose }) {
  const text = `I just made a clearer career decision with Clarity.\n\n"${question.slice(0,80)}${question.length>80?"...":""}"\n\nRating: ${"★".repeat(rating||5)}\n\nTry it free → useclarity.co`;
  const copy = () => { navigator.clipboard.writeText(text); };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:20, padding:"32px", maxWidth:420, width:"100%", animation:"slideUp 0.35s ease" }}>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:20, color:"#f0f0f0", marginBottom:20 }}>Share your clarity</h2>
        <div style={{ background:"#111", border:"1px solid #2a2a2a", borderRadius:12, padding:"20px", marginBottom:20, fontFamily:"Georgia,serif", fontSize:14, color:"#bbb", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{text}</div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={copy} style={{ flex:1, padding:"13px", background:"#C8F04A", color:"#0a0a0a", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer" }}>Copy to share</button>
          <button onClick={onClose} style={{ padding:"13px 20px", background:"none", color:"#666", border:"1px solid #2a2a2a", borderRadius:10, fontSize:14, cursor:"pointer" }}>Close</button>
        </div>
      </div>
    </div>
  );
}

// ── Paywall ──
function PaywallModal({ onClose, onUpgradeSuccess }) {
  const [plan, setPlan]     = useState("annual");
  const [email, setEmail]   = useState("");
  const [paying, setPaying] = useState(false);
  const [step, setStep]     = useState("plans");
  const amount = plan === "monthly" ? PRICE_MONTHLY : PRICE_ANNUAL;
  const planLabel = plan === "monthly" ? `$${PRICE_MONTHLY}/month` : `$${PRICE_ANNUAL}/year`;

  const handlePay = () => {
    if (!email.includes("@")) return;
    setPaying(true);
    initPaystack({ email, amount, plan,
      onSuccess: (r) => { setPaying(false); store.set("clarity_pro",true); store.set("clarity_pro_email",email); store.set("clarity_pro_ref",r.reference); onUpgradeSuccess(); },
      onClose: () => setPaying(false),
    });
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0d0d0d", border:"1px solid #2a2a2a", borderRadius:20, padding:"36px 32px", maxWidth:460, width:"100%", maxHeight:"90vh", overflowY:"auto", animation:"slideUp 0.35s ease" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ width:48, height:48, borderRadius:"50%", background:"#C8F04A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, fontWeight:900, color:"#0a0a0a", margin:"0 auto 16px" }}>C</div>
          <h2 style={{ fontFamily:"Georgia,serif", fontSize:24, color:"#f0f0f0", marginBottom:10 }}>You've used all {FREE_LIMIT} free decisions</h2>
          <p style={{ color:"#666", fontSize:14, lineHeight:1.65, fontFamily:"Georgia,serif" }}>Upgrade to keep thinking clearly — no limits, no waiting.</p>
        </div>

        {step === "plans" && (
          <>
            <div style={{ display:"flex", gap:10, marginBottom:20 }}>
              {[
                { id:"monthly", label:"Monthly", price:`$${PRICE_MONTHLY}`, per:"/month", badge:null },
                { id:"annual",  label:"Annual",  price:`$${Math.round(PRICE_ANNUAL/12)}`, per:"/month", badge:"Save 45%", billed:`Billed $${PRICE_ANNUAL}/year` },
              ].map(p => (
                <div key={p.id} onClick={() => setPlan(p.id)} style={{ flex:1, padding:"16px 12px", border:`2px solid ${plan===p.id?"#C8F04A":"#222"}`, borderRadius:12, cursor:"pointer", background: plan===p.id?"#111":"transparent", textAlign:"center", position:"relative", transition:"all 0.2s" }}>
                  {p.badge && <div style={{ position:"absolute", top:-10, left:"50%", transform:"translateX(-50%)", background:"#C8F04A", color:"#0a0a0a", fontSize:10, fontWeight:800, padding:"2px 10px", borderRadius:20, whiteSpace:"nowrap" }}>{p.badge}</div>}
                  <div style={{ fontSize:11, color:"#888", marginBottom:6 }}>{p.label}</div>
                  <div style={{ display:"flex", alignItems:"baseline", justifyContent:"center", gap:2 }}>
                    <span style={{ fontSize:26, fontWeight:800, color: plan===p.id?"#C8F04A":"#ccc" }}>{p.price}</span>
                    <span style={{ fontSize:12, color:"#666" }}>{p.per}</span>
                  </div>
                  {p.billed && <div style={{ fontSize:11, color:"#555", marginTop:4 }}>{p.billed}</div>}
                </div>
              ))}
            </div>
            <div style={{ background:"#111", borderRadius:12, padding:"18px 20px", marginBottom:18, border:"1px solid #1a1a1a" }}>
              <div style={{ fontSize:11, color:"#555", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:14, fontFamily:"monospace" }}>Everything in Clarity Pro</div>
              {PRO_FEATURES.map((f,i,arr) => (
                <div key={i} style={{ display:"flex", gap:12, alignItems:"flex-start", marginBottom: i<arr.length-1?12:0 }}>
                  <span style={{ color:"#C8F04A", fontSize:15, flexShrink:0, marginTop:1 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize:14, color:"#ddd", fontWeight:500, marginBottom:1 }}>{f.label}</div>
                    <div style={{ fontSize:12, color:"#555", fontFamily:"Georgia,serif" }}>{f.sub}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep("email")} style={{ width:"100%", padding:"15px", background:"#C8F04A", color:"#0a0a0a", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor:"pointer", marginBottom:10 }}>Continue to Payment →</button>
          </>
        )}

        {step === "email" && (
          <>
            <div style={{ background:"#111", borderRadius:12, padding:"16px 20px", marginBottom:16, border:"1px solid #1a1a1a" }}>
              <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Selected plan</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#C8F04A" }}>{planLabel}</div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:13, color:"#888", display:"block", marginBottom:8 }}>Your email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                style={{ width:"100%", background:"#141414", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 16px", color:"#e0e0e0", fontSize:15, fontFamily:"Georgia,serif", transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor="#C8F04A"} onBlur={e => e.target.style.borderColor="#2a2a2a"} />
              <p style={{ fontSize:11, color:"#555", marginTop:8, fontFamily:"Georgia,serif" }}>Used to manage your subscription. We never spam.</p>
            </div>
            <button onClick={handlePay} disabled={!email.includes("@")||paying}
              style={{ width:"100%", padding:"15px", background: email.includes("@")&&!paying?"#C8F04A":"#1a1a1a", color: email.includes("@")&&!paying?"#0a0a0a":"#333", border:"none", borderRadius:10, fontSize:15, fontWeight:800, cursor: email.includes("@")?"pointer":"not-allowed", marginBottom:10 }}>
              {paying ? "Opening payment..." : `Pay ${planLabel} →`}
            </button>
            <button onClick={() => setStep("plans")} style={{ width:"100%", padding:"12px", background:"none", color:"#555", border:"1px solid #1a1a1a", borderRadius:10, fontSize:14, cursor:"pointer" }}>← Back</button>
          </>
        )}

        <button onClick={onClose} style={{ width:"100%", padding:"11px", background:"none", color:"#444", border:"none", fontSize:13, cursor:"pointer", marginTop:8 }}>Maybe later</button>
        <p style={{ textAlign:"center", fontSize:11, color:"#444", marginTop:6, fontFamily:"Georgia,serif" }}>Secured by Paystack. Cancel anytime.</p>
      </div>
    </div>
  );
}

// ── Progress Tracker ──
function ProgressTracker({ decisions, onClose }) {
  const total = decisions.length;
  const rated = decisions.filter(d => d.rating);
  const avgRating = rated.length ? (rated.reduce((s,d) => s+d.rating, 0) / rated.length).toFixed(1) : null;
  const stages = decisions.map(d => d.stage);
  const completed = decisions.filter(d => d.stage === "ownership").length;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:20, padding:"32px", maxWidth:460, width:"100%", animation:"slideUp 0.35s ease" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <h2 style={{ fontFamily:"Georgia,serif", fontSize:20, color:"#f0f0f0" }}>Your Progress</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12, marginBottom:24 }}>
          {[
            { value: total, label: "Total decisions" },
            { value: completed, label: "Fully completed" },
            { value: avgRating ? `${avgRating}★` : "—", label: "Avg clarity score" },
          ].map((s,i) => (
            <div key={i} style={{ background:"#111", border:"1px solid #1a1a1a", borderRadius:12, padding:"16px", textAlign:"center" }}>
              <div style={{ fontSize:28, fontWeight:800, color:"#C8F04A", marginBottom:4 }}>{s.value}</div>
              <div style={{ fontSize:11, color:"#666", lineHeight:1.4 }}>{s.label}</div>
            </div>
          ))}
        </div>
        {decisions.length === 0 ? (
          <p style={{ color:"#555", fontFamily:"Georgia,serif", textAlign:"center" }}>No decisions yet. Start your first one.</p>
        ) : (
          <div>
            <div style={{ fontSize:11, color:"#555", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:12, fontFamily:"monospace" }}>Recent decisions</div>
            {decisions.slice(0,5).map((d,i) => (
              <div key={i} style={{ padding:"12px 16px", border:"1px solid #1a1a1a", borderRadius:10, marginBottom:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div style={{ fontSize:13, color:"#bbb", fontFamily:"Georgia,serif", flex:1, marginRight:12 }}>{d.question.slice(0,55)}{d.question.length>55?"...":""}</div>
                <div style={{ fontSize:12, color:"#C8F04A", flexShrink:0 }}>{d.rating ? "★".repeat(d.rating) : STAGE_META[d.stage]?.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── History Modal ──
function HistoryModal({ decisions, onLoad, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:16, padding:28, maxWidth:520, width:"100%", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#e0e0e0", fontSize:18, fontFamily:"Georgia,serif" }}>Past Decisions</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {decisions.length === 0
          ? <p style={{ color:"#555", fontFamily:"Georgia,serif" }}>No saved decisions yet.</p>
          : decisions.map((d,i) => (
            <div key={i} onClick={() => onLoad(d)}
              style={{ padding:"14px 18px", border:"1px solid #222", borderRadius:10, marginBottom:10, cursor:"pointer", transition:"border-color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.borderColor="#C8F04A"}
              onMouseLeave={e => e.currentTarget.style.borderColor="#222"}>
              <div style={{ fontSize:11, color:"#C8F04A", marginBottom:4, fontFamily:"monospace" }}>
                {new Date(d.timestamp).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
                {d.rating ? ` · ${"★".repeat(d.rating)}` : ""}
              </div>
              <div style={{ color:"#ccc", fontFamily:"Georgia,serif", fontSize:14 }}>{d.question}</div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── FAQ ──
function FAQModal({ onClose }) {
  const [open, setOpen] = useState(null);
  const faqs = [
    { q:"Is my data private?", a:"Yes. Your decisions and conversations are stored only on your device. We never sell your data or share it with third parties." },
    { q:"How does Clarity work?", a:"You bring a career question. Clarity guides you through 5 stages — Clarify, Blind Spots, Stress Test, Scenarios, and Ownership — to help you think more clearly. We never tell you what to do." },
    { q:"What's the difference between free and Pro?", a:`Free users get ${FREE_LIMIT} decisions per month. Pro users get unlimited decisions, full history, image upload, voice input, deeper analysis, and priority responses for $${PRICE_MONTHLY}/month or $${PRICE_ANNUAL}/year.` },
    { q:"Can I cancel my subscription?", a:`Yes, anytime. Email us at ${CONTACT_EMAIL} with your subscription email and we'll cancel immediately. No questions asked.` },
    { q:"What payment methods are accepted?", a:"We accept all major credit and debit cards worldwide through Paystack — Visa, Mastercard, and more." },
    { q:"Will Clarity tell me what to do?", a:"Never. That's the whole point. Clarity helps you think more clearly so you can make a decision you fully own. The choice always stays yours." },
  ];
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:16, padding:28, maxWidth:540, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ color:"#e0e0e0", fontSize:18, fontFamily:"Georgia,serif" }}>Frequently Asked Questions</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        {faqs.map((f,i) => (
          <div key={i} style={{ borderBottom:"1px solid #1a1a1a", marginBottom:0 }}>
            <div onClick={() => setOpen(open===i?null:i)} style={{ padding:"16px 0", cursor:"pointer", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ fontSize:15, color:"#ddd", fontFamily:"Georgia,serif" }}>{f.q}</span>
              <span style={{ color:"#C8F04A", fontSize:18, flexShrink:0, marginLeft:12 }}>{open===i?"−":"+"}</span>
            </div>
            {open===i && <div style={{ paddingBottom:16, fontSize:14, color:"#888", fontFamily:"Georgia,serif", lineHeight:1.7 }}>{f.a}</div>}
          </div>
        ))}
        <div style={{ marginTop:20, padding:"16px", background:"#111", borderRadius:10, textAlign:"center" }}>
          <p style={{ fontSize:13, color:"#666", fontFamily:"Georgia,serif" }}>Still have questions? Email us at <a href={`mailto:${CONTACT_EMAIL}`} style={{ color:"#C8F04A" }}>{CONTACT_EMAIL}</a></p>
        </div>
      </div>
    </div>
  );
}

// ── Legal Pages ──
function LegalModal({ type, onClose }) {
  const today = new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
  const privacy = `PRIVACY POLICY
Last updated: ${today}

Clarity ("we", "us", "our") is operated by ${OWNER_NAME}. This Privacy Policy explains how we collect, use, and protect your information.

INFORMATION WE COLLECT
— Decisions and conversations you enter into Clarity (stored on your device only)
— Email address (only if you subscribe to Clarity Pro)
— Payment information (processed securely by Paystack — we never see your card details)

HOW WE USE YOUR INFORMATION
— To provide and improve the Clarity service
— To manage your subscription
— To respond to support requests

DATA STORAGE
Your conversations and decisions are stored locally on your device. We do not store your career conversations on our servers.

PAYMENTS
Payments are processed by Paystack. By subscribing, you agree to Paystack's terms at paystack.com/terms.

YOUR RIGHTS
You may request deletion of your account data at any time by emailing ${CONTACT_EMAIL}.

CONTACT
${OWNER_NAME}
Email: ${CONTACT_EMAIL}`;

  const terms = `TERMS OF SERVICE
Last updated: ${today}

By using Clarity, you agree to these Terms of Service.

1. SERVICE DESCRIPTION
Clarity is an AI-powered tool that helps users think more clearly about career decisions. Clarity does not provide professional career advice, legal advice, financial advice, or psychological counseling.

2. FREE AND PRO TIERS
Free users receive ${FREE_LIMIT} decisions per month. Pro subscribers receive unlimited access for $${PRICE_MONTHLY}/month or $${PRICE_ANNUAL}/year.

3. PAYMENTS AND CANCELLATION
Subscriptions renew automatically. You may cancel at any time by emailing ${CONTACT_EMAIL}. No refunds are provided for partial months.

4. ACCEPTABLE USE
You agree not to misuse Clarity, attempt to reverse-engineer the service, or use it for any unlawful purpose.

5. DISCLAIMER
Clarity is not a licensed therapist, career counselor, or financial advisor. Decisions made using Clarity are your own responsibility.

6. LIMITATION OF LIABILITY
Clarity is provided "as is". We are not liable for any decisions made based on use of the service.

7. CONTACT
${OWNER_NAME}
Email: ${CONTACT_EMAIL}`;

  const content = type === "privacy" ? privacy : terms;
  const title = type === "privacy" ? "Privacy Policy" : "Terms of Service";

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:16, padding:28, maxWidth:580, width:"100%", maxHeight:"85vh", overflowY:"auto" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <h2 style={{ color:"#e0e0e0", fontSize:18, fontFamily:"Georgia,serif" }}>{title}</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <pre style={{ fontSize:13, color:"#888", fontFamily:"Georgia,serif", lineHeight:1.8, whiteSpace:"pre-wrap" }}>{content}</pre>
      </div>
    </div>
  );
}

// ── About ──
function AboutModal({ onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200, padding:20, animation:"fadeIn 0.3s ease" }}>
      <div style={{ background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:16, padding:32, maxWidth:480, width:"100%" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:24 }}>
          <h2 style={{ color:"#e0e0e0", fontSize:18, fontFamily:"Georgia,serif" }}>About Clarity</h2>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#666", fontSize:20, cursor:"pointer" }}>✕</button>
        </div>
        <p style={{ color:"#888", fontSize:15, fontFamily:"Georgia,serif", lineHeight:1.8, marginBottom:20 }}>
          Clarity was built for young people who feel stuck between choices — university or skills, staying or leaving, this path or that one.
        </p>
        <p style={{ color:"#888", fontSize:15, fontFamily:"Georgia,serif", lineHeight:1.8, marginBottom:20 }}>
          Most tools give you answers. Clarity gives you clarity. We believe the best decisions are the ones you fully understand and own — not the ones an AI made for you.
        </p>
        <p style={{ color:"#888", fontSize:15, fontFamily:"Georgia,serif", lineHeight:1.8, marginBottom:28 }}>
          Built by {OWNER_NAME}.
        </p>
        <a href={`mailto:${CONTACT_EMAIL}`} style={{ display:"block", textAlign:"center", padding:"13px", background:"#111", border:"1px solid #2a2a2a", borderRadius:10, color:"#C8F04A", fontSize:14, textDecoration:"none" }}>
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [isPro, setIsPro]       = useState(() => store.get("clarity_pro", false));
  const [decisionsThisMonth, setDecisionsThisMonth] = useState(() => {
    const saved = store.get("clarity_usage", { count:0, month: new Date().getMonth() });
    if (saved.month !== new Date().getMonth()) return 0;
    return saved.count;
  });
  const [totalDecisions, setTotalDecisions] = useState(() => store.get("clarity_total", 0));
  const [teaserUsed, setTeaserUsed]         = useState(() => store.get("clarity_teaser_used", false));
  const [savedDecisions, setSavedDecisions] = useState(() => store.get("clarity_decisions", []));
  const [showOnboarding, setShowOnboarding] = useState(() => !store.get("clarity_onboarded", false));

  const [screen, setScreen]   = useState("home");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [stage, setStage]     = useState("clarify");
  const [stageCount, setStageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [input, setInput]     = useState("");
  const [newMsgIdx, setNewMsgIdx] = useState(null);
  const [lastRating, setLastRating] = useState(null);

  const [showHistory,   setShowHistory]   = useState(false);
  const [showPaywall,   setShowPaywall]   = useState(false);
  const [showRating,    setShowRating]    = useState(false);
  const [showTeaser,    setShowTeaser]    = useState(false);
  const [showShare,     setShowShare]     = useState(false);
  const [showProgress,  setShowProgress]  = useState(false);
  const [showFAQ,       setShowFAQ]       = useState(false);
  const [showAbout,     setShowAbout]     = useState(false);
  const [showPrivacy,   setShowPrivacy]   = useState(false);
  const [showTerms,     setShowTerms]     = useState(false);
  const [showConfetti,  setShowConfetti]  = useState(false);
  const [showLowWarning, setShowLowWarning] = useState(false);

  const bottomRef = useRef();
  const inputRef  = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  // Show low decision warning when 1 left
  useEffect(() => {
    if (!isPro && decisionsThisMonth === FREE_LIMIT - 1) setShowLowWarning(true);
  }, [decisionsThisMonth, isPro]);

  const saveDecision = (msgs, stg, rating=null) => {
    const existing = savedDecisions.find(d => d.question === question);
    const record = { question, messages:msgs, stage:stg, timestamp: existing?.timestamp||Date.now(), rating: rating||existing?.rating||null };
    const updated = [record, ...savedDecisions.filter(d => d.question !== question)].slice(0,20);
    setSavedDecisions(updated);
    store.set("clarity_decisions", updated);
  };

  const incrementUsage = () => {
    const newCount = decisionsThisMonth + 1;
    const newTotal = totalDecisions + 1;
    setDecisionsThisMonth(newCount);
    setTotalDecisions(newTotal);
    store.set("clarity_usage", { count:newCount, month: new Date().getMonth() });
    store.set("clarity_total", newTotal);
    // Trigger confetti at milestones
    if ([10,50,100,500,1000].includes(newTotal)) setShowConfetti(true);
    return newCount;
  };

  const startConversation = async (skipChecks=false) => {
    if (!question.trim() || loading) return;
    if (!skipChecks) {
      if (false) { setShowPaywall(true); return; }
      if (!isPro && !teaserUsed && decisionsThisMonth === UNLOCK_AT) { setShowTeaser(true); return; }
    }
    setError(null); setScreen("chat"); setLoading(true); setStage("clarify"); setStageCount(1);
    incrementUsage();
    try {
      const sys = systemPromptFor("clarify", question, [], isPro);
      const aiText = await callClaude([{ role:"user", content:question }], sys);
      const initMsgs = [{ role:"user", content:question },{ role:"assistant", content:aiText }];
      setMessages(initMsgs); setNewMsgIdx(1);
      saveDecision(initMsgs, "clarify");
    } catch(e) { setError(e.message); setScreen("home"); }
    finally { setLoading(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    setError(null);
    const userMsg = { role:"user", content:input.trim() };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); setInput(""); setLoading(true);
    const newCount = stageCount + 1;
    const next = nextStageFor(stage, newCount);
    const reset = next !== stage;
    setStage(next); setStageCount(reset ? 1 : newCount);
    try {
      const sys = systemPromptFor(next, question, newMsgs, isPro);
      const reply = await callClaude(newMsgs.map(m => ({ role:m.role, content:m.content })), sys);
      const aiMsg = { role:"assistant", content:reply };
      const final = [...newMsgs, aiMsg];
      setMessages(final); setNewMsgIdx(final.length-1);
      saveDecision(final, next);
      if (next === "ownership") setTimeout(() => setShowRating(true), 800);
    } catch(e) { setError(e.message); setMessages(messages); setInput(userMsg.content); }
    finally { setLoading(false); inputRef.current?.focus(); }
  };

  const handleRate = (stars) => {
    setLastRating(stars); saveDecision(messages, stage, stars);
    setShowRating(false); setShowShare(true);
  };

  const handleUpgradeSuccess = () => { setIsPro(true); setShowPaywall(false); };

  const loadDecision = (d) => {
    setQuestion(d.question); setMessages(d.messages); setStage(d.stage);
    setStageCount(0); setShowHistory(false); setScreen("chat");
  };

  const reset = () => {
    setScreen("home"); setQuestion(""); setMessages([]);
    setStage("clarify"); setStageCount(0); setInput(""); setError(null);
  };

  const remaining = Math.max(0, FREE_LIMIT - decisionsThisMonth);

  return (
    <div style={{ minHeight:"100vh", background:"#0a0a0a", color:"#e0e0e0", fontFamily:"'Helvetica Neue',Arial,sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(24px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bounce  { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        textarea{resize:none;} button{font-family:inherit;} a{cursor:pointer;}
      `}</style>

      {showConfetti && <Confetti />}

      {/* ── NAV ── */}
      <nav style={{ padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #1a1a1a", position:"sticky", top:0, background:"#0a0a0a", zIndex:100 }}>
        <div onClick={reset} style={{ cursor:"pointer", display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:"#C8F04A", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:900, color:"#0a0a0a" }}>C</div>
          <span style={{ fontSize:17, fontWeight:700, letterSpacing:"-0.03em", color:"#f0f0f0" }}>Clarity<span style={{ color:"#C8F04A" }}>.</span></span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {!isPro && remaining <= 1 && remaining > 0 && (
            <div style={{ fontSize:11, color:"#F04A6B", fontFamily:"monospace", background:"rgba(240,74,107,0.1)", padding:"4px 10px", borderRadius:6 }}>
              {remaining} free decision left
            </div>
          )}
          {isPro && <div style={{ fontSize:11, color:"#C8F04A", fontFamily:"monospace", letterSpacing:"0.1em", background:"rgba(200,240,74,0.1)", padding:"4px 10px", borderRadius:6 }}>PRO</div>}
          <button onClick={() => setShowProgress(true)} style={{ background:"none", border:"1px solid #2a2a2a", color:"#888", padding:"7px 13px", borderRadius:8, cursor:"pointer", fontSize:13, transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#C8F04A";e.currentTarget.style.color="#C8F04A";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#888";}}>
            Progress
          </button>
          <button onClick={() => setShowHistory(true)} style={{ background:"none", border:"1px solid #2a2a2a", color:"#888", padding:"7px 13px", borderRadius:8, cursor:"pointer", fontSize:13, transition:"all 0.2s" }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor="#C8F04A";e.currentTarget.style.color="#C8F04A";}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#2a2a2a";e.currentTarget.style.color="#888";}}>
            History
          </button>
          {!isPro && <button onClick={() => setShowPaywall(true)} style={{ background:"#C8F04A", color:"#0a0a0a", border:"none", padding:"7px 13px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:700 }}>Go Pro</button>}
          {screen !== "home" && <button onClick={reset} style={{ background:"none", border:"1px solid #2a2a2a", color:"#888", padding:"7px 13px", borderRadius:8, cursor:"pointer", fontSize:13 }}>New</button>}
        </div>
      </nav>

      {/* ── ERROR ── */}
      {error && (
        <div style={{ background:"#2a0a0a", borderBottom:"1px solid #5a1a1a", color:"#f08080", padding:"10px 20px", fontSize:13, display:"flex", justifyContent:"space-between" }}>
          <span>⚠ {error}</span>
          <button onClick={() => setError(null)} style={{ background:"none", border:"none", color:"#f08080", cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* ── LOW DECISION WARNING ── */}
      {showLowWarning && !isPro && (
        <div style={{ background:"rgba(240,168,74,0.08)", borderBottom:"1px solid rgba(240,168,74,0.2)", color:"#F0A84A", padding:"10px 20px", fontSize:13, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span>⚡ You have 1 free decision left this month. <span onClick={() => setShowPaywall(true)} style={{ color:"#C8F04A", cursor:"pointer", textDecoration:"underline" }}>Upgrade for unlimited →</span></span>
          <button onClick={() => setShowLowWarning(false)} style={{ background:"none", border:"none", color:"#F0A84A", cursor:"pointer" }}>✕</button>
        </div>
      )}

      {/* ── HOME ── */}
      {screen === "home" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", animation:"fadeUp 0.6s ease" }}>
          <div style={{ maxWidth:580, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:11, letterSpacing:"0.25em", textTransform:"uppercase", color:"#C8F04A", marginBottom:24, fontFamily:"monospace" }}>Career Decision Intelligence</div>
            <h1 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(32px,6vw,54px)", lineHeight:1.1, margin:"0 0 20px", color:"#f0f0f0" }}>
              Not an AI that decides.<br /><em style={{ color:"#C8F04A" }}>One that makes you sharper.</em>
            </h1>
            <p style={{ color:"#666", fontSize:16, lineHeight:1.75, marginBottom:40, fontFamily:"Georgia,serif", maxWidth:420, margin:"0 auto 40px" }}>
              Bring your hardest career question. We help you think through it clearly — no advice, no judgment. Just sharper thinking.
            </p>

            <div style={{ maxWidth:500, margin:"0 auto" }}>
              <textarea value={question} onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();startConversation();}}}
                placeholder="What's the decision you're wrestling with? Be honest."
                rows={3}
                style={{ width:"100%", background:"#0f0f0f", border:"1px solid #2a2a2a", borderRadius:12, padding:"17px 19px", color:"#e0e0e0", fontSize:15, fontFamily:"Georgia,serif", lineHeight:1.65, transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor="#C8F04A"}
                onBlur={e => e.target.style.borderColor="#2a2a2a"}
              />

              {/* Pro features preview (locked) */}
              {!isPro && (
                <div style={{ background:"#0d0d0d", border:"1px solid #1a1a1a", borderRadius:10, padding:"12px 16px", margin:"10px 0", display:"flex", gap:16, flexWrap:"wrap", justifyContent:"center" }}>
                  {[{icon:"◈",label:"Image upload"},{icon:"♪",label:"Voice input"},{icon:"◆",label:"Deep analysis"},{icon:"∞",label:"Unlimited"}].map((f,i) => (
                    <div key={i} style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, color:"#444" }}>
                      <span style={{ color:"#333" }}>{f.icon}</span>
                      <span>{f.label}</span>
                      <ProBadge />
                    </div>
                  ))}
                </div>
              )}

              {!isPro && (
                <div style={{ margin:"8px 0 4px" }}>
                  <div style={{ height:3, background:"#1a1a1a", borderRadius:2, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${(decisionsThisMonth/FREE_LIMIT)*100}%`, background: remaining<=1?"#F04A6B":"#C8F04A", borderRadius:2, transition:"width 0.4s" }} />
                  </div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#555", fontFamily:"monospace" }}>
                    <span>{decisionsThisMonth} of {FREE_LIMIT} free decisions used this month</span>
                    {remaining===0 && <span style={{ color:"#F04A6B", cursor:"pointer" }} onClick={() => setShowPaywall(true)}>Upgrade →</span>}
                  </div>
                </div>
              )}

              <button onClick={() => startConversation()} disabled={!question.trim()||loading}
                style={{ width:"100%", marginTop:12, background: question.trim()&&!loading?"#C8F04A":"#1a1a1a", color: question.trim()&&!loading?"#0a0a0a":"#333", border:"none", borderRadius:10, padding:"15px", fontSize:15, fontWeight:700, cursor: question.trim()?"pointer":"not-allowed", letterSpacing:"0.02em", transition:"all 0.2s" }}>
                {loading?"Starting…":remaining===0&&!isPro?"Upgrade to continue →":"Begin Thinking →"}
              </button>
            </div>

            <div style={{ display:"flex", gap:24, marginTop:56, flexWrap:"wrap", justifyContent:"center" }}>
              {STAGES.slice(0,4).map(s => {
                const m = STAGE_META[s];
                const descs = { clarify:"Surface the real question", blindspots:"Hidden assumptions", stresstest:"Challenge your reasoning", scenarios:"Possible futures" };
                return (
                  <div key={s} style={{ textAlign:"center", maxWidth:88 }}>
                    <div style={{ fontSize:20, color:m.color, marginBottom:7 }}>{m.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#777", marginBottom:3 }}>{m.label}</div>
                    <div style={{ fontSize:11, color:"#444", lineHeight:1.5 }}>{descs[s]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── CHAT ── */}
      {screen === "chat" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", maxWidth:700, margin:"0 auto", width:"100%", padding:"24px 20px 0" }}>
          <ProgressBar stage={stage} />
          <div style={{ flex:1, overflowY:"auto", paddingBottom:130 }}>
            {messages.map((msg,i) => <Message key={i} msg={msg} isNew={i===newMsgIdx} />)}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
          <div style={{ position:"fixed", bottom:0, left:0, right:0, background:"linear-gradient(to top,#0a0a0a 65%,transparent)", padding:"18px 20px 24px" }}>
            <div style={{ maxWidth:700, margin:"0 auto", display:"flex", gap:10 }}>
              <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if(e.key==="Enter") sendMessage(); }}
                placeholder="Your response…" disabled={loading}
                style={{ flex:1, background:"#141414", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 17px", color:"#e0e0e0", fontSize:15, fontFamily:"Georgia,serif", transition:"border-color 0.2s" }}
                onFocus={e => e.target.style.borderColor="#C8F04A"}
                onBlur={e => e.target.style.borderColor="#2a2a2a"}
              />
              <button onClick={sendMessage} disabled={!input.trim()||loading}
                style={{ background: input.trim()&&!loading?"#C8F04A":"#1a1a1a", color: input.trim()&&!loading?"#0a0a0a":"#333", border:"none", borderRadius:10, width:46, height:46, fontSize:18, cursor: input.trim()&&!loading?"pointer":"not-allowed", flexShrink:0, transition:"all 0.2s" }}>→</button>
            </div>
          </div>
        </div>
      )}

      {/* ── DONE ── */}
      {screen === "done" && (
        <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 24px", animation:"fadeUp 0.6s ease" }}>
          <div style={{ fontSize:48, color:"#C8F04A", marginBottom:20 }}>●</div>
          <h2 style={{ fontFamily:"'DM Serif Display',serif", fontSize:"clamp(26px,5vw,38px)", textAlign:"center", color:"#f0f0f0", marginBottom:14 }}>The thinking is done.</h2>
          <p style={{ color:"#666", fontSize:15, textAlign:"center", fontFamily:"Georgia,serif", lineHeight:1.75, maxWidth:380, marginBottom:36 }}>
            You've worked through the tradeoffs. The clarity belongs to you. So does the decision.
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap", justifyContent:"center" }}>
            <button onClick={reset} style={{ background:"#C8F04A", color:"#0a0a0a", border:"none", borderRadius:10, padding:"13px 26px", fontSize:15, fontWeight:700, cursor:"pointer" }}>New Decision</button>
            <button onClick={() => setShowShare(true)} style={{ background:"none", color:"#C8F04A", border:"1px solid #C8F04A", borderRadius:10, padding:"13px 26px", fontSize:15, cursor:"pointer" }}>Share →</button>
            <button onClick={() => setScreen("chat")} style={{ background:"none", color:"#888", border:"1px solid #2a2a2a", borderRadius:10, padding:"13px 26px", fontSize:15, cursor:"pointer" }}>Review</button>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      {screen === "home" && (
        <footer style={{ padding:"20px 24px", borderTop:"1px solid #1a1a1a", display:"flex", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
          {[
            { label:"About", fn:() => setShowAbout(true) },
            { label:"FAQ", fn:() => setShowFAQ(true) },
            { label:"Privacy", fn:() => setShowPrivacy(true) },
            { label:"Terms", fn:() => setShowTerms(true) },
            { label:"Contact", fn:() => window.location.href=`mailto:${CONTACT_EMAIL}` },
          ].map((l,i) => (
            <span key={i} onClick={l.fn} style={{ fontSize:12, color:"#555", cursor:"pointer", transition:"color 0.2s" }}
              onMouseEnter={e => e.currentTarget.style.color="#C8F04A"}
              onMouseLeave={e => e.currentTarget.style.color="#555"}>
              {l.label}
            </span>
          ))}
        </footer>
      )}

      {/* ── MODALS ── */}
      {showOnboarding  && <OnboardingModal onDone={() => { store.set("clarity_onboarded",true); setShowOnboarding(false); }} />}
      {showHistory     && <HistoryModal decisions={savedDecisions} onLoad={loadDecision} onClose={() => setShowHistory(false)} />}
      {showPaywall     && <PaywallModal onClose={() => setShowPaywall(false)} onUpgradeSuccess={handleUpgradeSuccess} />}
      {showRating      && <RatingModal onRate={handleRate} onSkip={() => { setShowRating(false); setScreen("done"); }} />}
      {showTeaser      && <UnlockTeaserModal onAccept={() => { setTeaserUsed(true); store.set("clarity_teaser_used",true); setShowTeaser(false); startConversation(true); }} onDecline={() => { setShowTeaser(false); startConversation(true); }} />}
      {showShare       && <ShareModal question={question} rating={lastRating} onClose={() => { setShowShare(false); setScreen("done"); }} />}
      {showProgress    && <ProgressTracker decisions={savedDecisions} onClose={() => setShowProgress(false)} />}
      {showFAQ         && <FAQModal onClose={() => setShowFAQ(false)} />}
      {showAbout       && <AboutModal onClose={() => setShowAbout(false)} />}
      {showPrivacy     && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
      {showTerms       && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
    </div>
  );
}
