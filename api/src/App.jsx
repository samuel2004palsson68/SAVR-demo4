import { useState, useRef, useEffect } from "react";

// ─── SAVR Design Tokens (exakt från skärmbilderna) ───────────────────────────
const C = {
  bg: "#0A0A0A",
  card: "#1A1A1A",
  cardHover: "#222222",
  border: "#2A2A2A",
  borderLight: "#333333",
  purple: "#7C6FE0",
  purpleLight: "#9B8FEF",
  purpleDim: "#7C6FE015",
  purpleMid: "#7C6FE030",
  text: "#FFFFFF",
  textSub: "#999999",
  textMuted: "#666666",
  green: "#4ADE80",
  greenDim: "#4ADE8020",
  red: "#FF6B6B",
  buy: "#FFFFFF",
};

// ─── Mock data (Investor A) ───────────────────────────────────────────────────
const STOCK = {
  name: "Investor A",
  ticker: "INVE A",
  exchange: "Nasdaq Stockholm",
  price: "351,50",
  change: "+107,37%",
  changeAbs: "+182,00",
  period: "5 år",
  pe: "6,86",
  yield: "1,59%",
  owners: "125 017",
  marketCap: "1 085 834 MSEK",
  description: "Investor är ett svenskt investment- och holdingbolag som förvaltar aktieinnehav och helägda bolag genom långsiktigt ägande och aktivt styrelseengagemang. Bolaget investerar i noterade bolag, onoterade verksamheter och kapitalfonder, och samarbetar med företagsledningar för värdeutveckling på marknader internationellt. Investor grundades 1916 och har sitt huvudkontor i Stockholm, Sverige.",
};

const OM_SUGGESTIONS = [
  "Vad gör Investor unikt?",
  "Vilka är de största innehaven?",
  "Är det ett bra bolag för långsiktig sparare?",
];

const ANALYS_SUGGESTIONS = [
  "Är P/E 6,86 billigt eller dyrt?",
  "Vad innebär ROE 16,49% i praktiken?",
  "Är soliditeten på 86,5% stark?",
  "Hur tolkar jag Nettoskuld/EBITDA 0,57?",
];

const ANALYS_METRICS = {
  general: [
    { label: "Utdelning", value: "5,60", unit: "SEK/aktie", trend: "up" },
    { label: "Direktavkastning", value: "1,59%", unit: "", trend: "flat" },
    { label: "Utdelningsandel", value: "10,90%", unit: "", trend: "down" },
    { label: "Omsättning", value: "0,00", unit: "SEK/aktie", trend: "flat" },
    { label: "Vinst", value: "51,38", unit: "SEK/aktie", trend: "up" },
    { label: "Börsvärde", value: "1 085 834", unit: "MSEK", trend: "up" },
    { label: "Enterprise Value", value: "1 179 362", unit: "MSEK", trend: "up" },
    { label: "Antal ägare", value: "125 017", unit: "st", trend: "up" },
  ],
  profitability: [
    { label: "Vinstmarginal", value: "–", unit: "", trend: "none" },
    { label: "ROA", value: "14,27%", unit: "", trend: "down" },
    { label: "Rörelsemarginal", value: "–", unit: "", trend: "none" },
    { label: "ROE", value: "16,49%", unit: "", trend: "down" },
    { label: "Bruttomarginal", value: "–", unit: "", trend: "none" },
    { label: "ROIC", value: "14,77%", unit: "", trend: "down" },
  ],
  financial: [
    { label: "Soliditet", value: "86,50%", unit: "", trend: "up" },
    { label: "Nettoskuld/EBITDA", value: "0,57", unit: "", trend: "flat" },
  ],
};

// ─── Mini sparkline ────────────────────────────────────────────────────────────
function Spark({ trend }) {
  const paths = {
    up: "M2,18 L6,15 L10,12 L14,8 L18,5 L22,2",
    down: "M2,2 L6,5 L10,8 L14,12 L18,15 L22,18",
    flat: "M2,10 L6,8 L10,11 L14,9 L18,10 L22,10",
    none: "M2,10 L22,10",
  };
  const colors = { up: C.purple, down: C.red, flat: C.purple, none: C.textMuted };
  return (
    <svg width="24" height="20" viewBox="0 0 24 20" fill="none" style={{ opacity: trend === "none" ? 0.2 : 0.8 }}>
      <path d={paths[trend] || paths.flat} stroke={colors[trend] || C.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {trend === "up" && <circle cx="22" cy="2" r="2" fill="#FFC107" />}
      {trend === "down" && <circle cx="22" cy="18" r="2" fill="#FFC107" />}
    </svg>
  );
}

// ─── Typing dots ──────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, padding: "2px 0" }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%", background: C.purple,
          animation: `savr2-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
        }} />
      ))}
    </div>
  );
}

// ─── Chat inline component ────────────────────────────────────────────────────
function InlineChat({ context, suggestions, placeholder, systemExtra }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [focused, setFocused] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    if (expanded) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, expanded]);

  const callAPI = async (messages, system) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        system,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API ${res.status}: ${err}`);
    }
    return res.json();
  };

  const send = async (text) => {
    if (!text.trim() || loading) return;
    setExpanded(true);
    setInput("");
    setMessages(prev => [...prev, { role: "user", text, time: new Date() }]);
    setLoading(true);
    setMessages(prev => [...prev, { role: "ai", typing: true }]);

    const system = `Du är SAVRs inbyggda aktieassistent. Du analyserar ${STOCK.name} (${STOCK.ticker}) på Nasdaq Stockholm.
Aktuell kurs: ${STOCK.price} SEK. P/E: ${STOCK.pe}. Direktavk: ${STOCK.yield}. Börsvärde: ${STOCK.marketCap}.
${systemExtra || ""}
Du har tillgång till webbsökning – använd den för att hämta aktuell information om bolaget, nyheter och marknad.
Svara alltid på svenska. Var konkret och faktabaserad. Max 4 meningar per svar.`;

    // Build messages array from history + new message
    const msgs = [...historyRef.current, { role: "user", content: text }];

    try {
      let data = await callAPI(msgs, system);
      let allMsgs = [...msgs];
      let didSearch = false;

      // Agentic loop: handle tool_use (web_search) rounds
      while (data.stop_reason === "tool_use") {
        didSearch = true;
        const assistantBlock = { role: "assistant", content: data.content };
        allMsgs.push(assistantBlock);

        // Build tool results for each tool_use block
        const toolResults = data.content
          .filter(b => b.type === "tool_use")
          .map(b => ({
            type: "tool_result",
            tool_use_id: b.id,
            content: b.input?.query ? `Sökte efter: ${b.input.query}` : "Sökning utförd",
          }));

        allMsgs.push({ role: "user", content: toolResults });
        data = await callAPI(allMsgs, system);
      }

      // Extract final text
      const reply = (data.content || [])
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("\n") || "Inget svar mottaget.";

      // Save full conversation to history
      historyRef.current = [
        ...allMsgs,
        { role: "assistant", content: data.content },
      ];

      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai", text: reply, time: new Date(), searched: didSearch,
      }]);
    } catch (err) {
      console.error("SAVR Chat error:", err);
      setMessages(prev => [...prev.slice(0, -1), {
        role: "ai",
        text: `Fel: ${err.message || "Anslutning misslyckades. Försök igen."}`,
        time: new Date(),
      }]);
    }
    setLoading(false);
  };

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      background: C.card,
      borderRadius: 16,
      border: `1px solid ${focused || hasMessages ? C.purple + "60" : C.border}`,
      overflow: "hidden",
      transition: "border-color 0.2s, box-shadow 0.2s",
      boxShadow: focused || hasMessages ? `0 0 0 1px ${C.purple}20, 0 4px 24px rgba(124,111,224,0.1)` : "none",
    }}>

      {/* Header label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "12px 16px 10px",
        borderBottom: hasMessages ? `1px solid ${C.border}` : "none",
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 6,
          background: `linear-gradient(135deg, ${C.purple}, #5B4FD0)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, color: "#fff",
        }}>S</div>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textSub, letterSpacing: "0.01em" }}>
          {context === "om" ? "Fråga om bolaget" : "Analysassistenten"}
        </span>
        <div style={{
          marginLeft: "auto", width: 6, height: 6, borderRadius: "50%",
          background: C.green, boxShadow: `0 0 6px ${C.green}`,
        }} />
      </div>

      {/* Messages */}
      {hasMessages && (
        <div style={{ padding: "12px 16px", maxHeight: 240, overflowY: "auto" }}>
          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: 10,
              animation: i === messages.length - 1 ? "savr2-fadein 0.3s ease" : "none",
            }}>
              {m.role === "user" ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <div style={{
                    background: C.purple,
                    color: "#fff",
                    borderRadius: "12px 12px 3px 12px",
                    padding: "8px 13px",
                    fontSize: 13,
                    maxWidth: "80%",
                    lineHeight: 1.5,
                  }}>{m.text}</div>
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                    background: `linear-gradient(135deg, ${C.purple}, #5B4FD0)`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 10, fontWeight: 800, color: "#fff", marginTop: 2,
                  }}>S</div>
                  <div style={{ maxWidth: "85%", display: "flex", flexDirection: "column", gap: 5 }}>
                    {m.searched && !m.typing && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "#12112a", border: `1px solid ${C.purple}50`,
                        borderRadius: 20, padding: "3px 10px",
                        fontSize: 11, color: C.purpleLight,
                        alignSelf: "flex-start",
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                          <circle cx="11" cy="11" r="7" stroke={C.purpleLight} strokeWidth="2.5"/>
                          <path d="M20 20l-3-3" stroke={C.purpleLight} strokeWidth="2.5" strokeLinecap="round"/>
                        </svg>
                        Sökte på nätet
                      </div>
                    )}
                    <div style={{
                      background: "#222",
                      border: `1px solid ${C.border}`,
                      borderRadius: "3px 12px 12px 12px",
                      padding: "8px 13px",
                      fontSize: 13,
                      color: C.text,
                      lineHeight: 1.6,
                    }}>
                      {m.typing ? <TypingDots /> : m.text}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Suggestions */}
      {!hasMessages && (
        <div style={{ padding: "10px 16px 12px", display: "flex", gap: 7, flexWrap: "wrap" }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{
              background: C.purpleDim,
              border: `1px solid ${C.purple}40`,
              borderRadius: 20,
              padding: "5px 12px",
              fontSize: 12,
              color: C.purpleLight,
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
              lineHeight: 1.4,
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.purpleMid; e.currentTarget.style.borderColor = C.purple; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.purpleDim; e.currentTarget.style.borderColor = C.purple + "40"; }}
            >{s}</button>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: hasMessages ? "10px 12px 12px" : "0 12px 12px",
        borderTop: hasMessages ? `1px solid ${C.border}` : "none",
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send(input))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            background: "#111",
            border: `1px solid ${C.borderLight}`,
            borderRadius: 10,
            padding: "9px 13px",
            fontSize: 13,
            color: C.text,
            outline: "none",
            fontFamily: "inherit",
            transition: "border-color 0.2s",
          }}
          onFocus2={e => e.target.style.borderColor = C.purple}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            width: 34, height: 34, borderRadius: 9,
            background: input.trim() && !loading ? C.purple : C.border,
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.2s", flexShrink: 0,
            boxShadow: input.trim() && !loading ? `0 2px 12px ${C.purple}44` : "none",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 12H19M13 6l6 6-6 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, unit, trend }) {
  return (
    <div style={{
      background: C.card,
      borderRadius: 14,
      border: `1px solid ${C.border}`,
      padding: "14px 16px",
      display: "flex",
      flexDirection: "column",
      gap: 6,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.3 }}>{label}</span>
        <Spark trend={trend} />
      </div>
      <div>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  const tabs = ["Om", "Nyheter", "Analys", "Ägare", "Handel"];
  return (
    <div style={{ display: "flex", gap: 8, padding: "0 16px", overflowX: "auto" }}>
      {tabs.map(t => (
        <button key={t} onClick={() => onChange(t)} style={{
          background: active === t ? "transparent" : "transparent",
          border: active === t ? `1px solid ${C.text}` : `1px solid ${C.border}`,
          borderRadius: 20,
          padding: "7px 16px",
          fontSize: 14,
          fontWeight: active === t ? 600 : 400,
          color: active === t ? C.text : C.textSub,
          cursor: "pointer",
          whiteSpace: "nowrap",
          fontFamily: "inherit",
          transition: "all 0.15s",
        }}>{t}</button>
      ))}
    </div>
  );
}

// ─── Om view ─────────────────────────────────────────────────────────────────
function OmView() {
  return (
    <div style={{ padding: "16px 16px 120px" }}>
      {/* AI Chat – ABOVE description */}
      <div style={{ marginBottom: 16 }}>
        <InlineChat
          context="om"
          suggestions={OM_SUGGESTIONS}
          placeholder="Ställ en fråga om Investor..."
          systemExtra="Fokusera på bolagets historia, affärsmodell, portfölj och lämplighet som investering."
        />
      </div>

      {/* Description card */}
      <div style={{
        background: C.card,
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        padding: "18px",
        marginBottom: 16,
      }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 2 }}>Investor</div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 12 }}>Stockholm, Sverige</div>
        <p style={{ fontSize: 14, color: C.textSub, lineHeight: 1.7, margin: 0 }}>
          {STOCK.description}
        </p>
      </div>

      {/* Tags */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {[
          { label: "Liknande bolag ✦", count: null },
          { label: "Långsiktig investering", count: 25 },
          { label: "Investmentbolag", count: 327 },
          { label: "Bolagsstyrning", count: 64 },
          { label: "Investeringar", count: 552 },
          { label: "Nordiska marknaden", count: 42 },
        ].map((tag, i) => (
          <button key={i} style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 20, padding: "7px 14px",
            fontSize: 13, color: C.textSub, cursor: "pointer",
            fontFamily: "inherit",
            display: "flex", gap: 6, alignItems: "center",
          }}>
            {tag.label}
            {tag.count && <span style={{ color: C.purple, fontWeight: 600 }}>{tag.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Analys view ──────────────────────────────────────────────────────────────
function AnalysView() {
  return (
    <div style={{ padding: "16px 16px 120px" }}>

      {/* AI Chat – analys mode */}
      <div style={{ marginBottom: 20 }}>
        <InlineChat
          context="analys"
          suggestions={ANALYS_SUGGESTIONS}
          placeholder="Fråga om nyckeltal, värdering, lönsamhet..."
          systemExtra={`Fokusera på finansiell analys. ROA: 14,27%. ROE: 16,49%. ROIC: 14,77%. Soliditet: 86,5%. Nettoskuld/EBITDA: 0,57. Vinst: 51,38 SEK/aktie. P/E: 6,86. Börsvärde: 1 085 834 MSEK.`}
        />
      </div>

      {/* Allmänt */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Allmänt</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ANALYS_METRICS.general.map((m, i) => <MetricCard key={i} {...m} />)}
        </div>
      </div>

      {/* Värdering teaser */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Värdering</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "P/E", value: "6,86", unit: "", trend: "flat" },
            { label: "P/S", value: "–", unit: "", trend: "none" },
          ].map((m, i) => <MetricCard key={i} {...m} />)}
        </div>
      </div>

      {/* Lönsamhet */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Lönsamhet</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ANALYS_METRICS.profitability.map((m, i) => <MetricCard key={i} {...m} />)}
        </div>
      </div>

      {/* Finansiell ställning */}
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>Finansiell ställning</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {ANALYS_METRICS.financial.map((m, i) => <MetricCard key={i} {...m} />)}
        </div>
      </div>

      <p style={{ fontSize: 11, color: C.textMuted, marginTop: 16 }}>
        Bolagsdata från Infront, Millistream & Euroclear
      </p>
    </div>
  );
}

// ─── Price chart (static svg) ─────────────────────────────────────────────────
function PriceChart() {
  const points = [45, 42, 50, 47, 55, 52, 60, 58, 56, 62, 65, 70, 68, 72, 80, 85, 82, 90, 95, 100, 92, 98, 105, 108, 115, 120, 118, 125];
  const max = Math.max(...points), min = Math.min(...points);
  const w = 340, h = 100;
  const toX = (i) => (i / (points.length - 1)) * w;
  const toY = (v) => h - ((v - min) / (max - min)) * h * 0.85 - 7;
  const path = points.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v)}`).join(" ");
  const area = path + ` L${w},${h} L0,${h} Z`;

  return (
    <div style={{ padding: "0 16px", marginBottom: 8 }}>
      <div style={{
        background: C.card, borderRadius: 16, border: `1px solid ${C.border}`,
        padding: "16px",
      }}>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: "-0.04em" }}>
          351,50 <span style={{ fontSize: 14, fontWeight: 500, color: C.textMuted }}>SEK</span>
        </div>
        <div style={{ fontSize: 13, color: C.purple, marginBottom: 14, fontWeight: 500 }}>
          +107,37% (182,00) · 5 år
        </div>
        <svg width="100%" viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
          <defs>
            <linearGradient id="chartGrad" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={C.purple} stopOpacity="0.3" />
              <stop offset="100%" stopColor={C.purple} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#chartGrad)" />
          <path d={path} fill="none" stroke={C.purple} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          {/* Benchmark line */}
          <path d={points.map((v, i) => `${i === 0 ? "M" : "L"}${toX(i)},${toY(v * 0.7)}`).join(" ")}
            fill="none" stroke="#4ECDC4" strokeWidth="1.2" strokeOpacity="0.6" strokeDasharray="none" />
        </svg>

        {/* Period buttons */}
        <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
          {[["3M", "-0,94%"], ["1 år", "+15,74%"], ["3 år", "+69,40%"], ["5 år", "+107,37%"], ["Max", "+3 501,64%"]].map(([p, v]) => (
            <button key={p} style={{
              flex: 1,
              background: p === "5 år" ? "#2A2A2A" : "transparent",
              border: p === "5 år" ? `1px solid ${C.borderLight}` : "none",
              borderRadius: 8,
              padding: "6px 2px",
              cursor: "pointer",
              fontFamily: "inherit",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: p === "5 år" ? C.text : C.textMuted }}>{p}</div>
              <div style={{ fontSize: 10, color: C.purple, marginTop: 1 }}>{v}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("Om");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${C.bg}; }
        @keyframes savr2-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
          40% { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes savr2-fadein {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 0; height: 0; }
        input::placeholder { color: ${C.textMuted}; }
      `}</style>

      <div style={{
        background: C.bg,
        minHeight: "100vh",
        fontFamily: "'Figtree', 'Helvetica Neue', sans-serif",
        maxWidth: 430,
        margin: "0 auto",
        position: "relative",
        color: C.text,
      }}>

        {/* Status bar mock */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 20px 8px", fontSize: 12, fontWeight: 600, color: C.text,
        }}>
          <span>11:33</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <svg width="16" height="10" viewBox="0 0 16 10"><rect x="0" y="3" width="3" height="7" rx="1" fill="white" /><rect x="4.5" y="2" width="3" height="8" rx="1" fill="white" /><rect x="9" y="1" width="3" height="9" rx="1" fill="white" /><rect x="13.5" y="0" width="2.5" height="10" rx="1" fill="white" opacity="0.3" /></svg>
            <span style={{ fontSize: 11 }}>5G</span>
            <div style={{ width: 22, height: 11, border: "1.5px solid white", borderRadius: 3, display: "flex", alignItems: "center", padding: "1px" }}>
              <div style={{ width: "70%", height: "100%", background: "white", borderRadius: 1 }} />
            </div>
          </div>
        </div>

        {/* Nav bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "4px 16px 12px",
        }}>
          <button style={{ background: "none", border: "none", color: C.text, fontSize: 18, cursor: "pointer", padding: 4 }}>‹</button>
          <div style={{
            flex: 1, background: C.card, borderRadius: 20, border: `1px solid ${C.border}`,
            padding: "7px 14px", display: "flex", alignItems: "center", gap: 8,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke={C.textMuted} strokeWidth="2" /><path d="M20 20l-3-3" stroke={C.textMuted} strokeWidth="2" strokeLinecap="round" /></svg>
            <span style={{ fontSize: 13, color: C.text, fontWeight: 600, letterSpacing: "0.05em" }}>INVE A</span>
          </div>
          <button style={{
            width: 34, height: 34, borderRadius: 20, background: C.card,
            border: `1px solid ${C.border}`, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>🌤</button>
          <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18 }}>🔖</button>
        </div>

        {/* Stock header */}
        <div style={{ padding: "0 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "linear-gradient(135deg, #1565C0, #0D47A1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 900, color: "#fff",
          }}>i</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>Investor A</div>
            <div style={{ fontSize: 12, color: C.textMuted }}>🇸🇪 Nasdaq Stockholm · Aktie</div>
          </div>
        </div>

        {/* Price chart */}
        <PriceChart />

        {/* Key stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, padding: "12px 16px", marginBottom: 4 }}>
          {[
            { label: "Antal ägare", value: "125 017 st" },
            { label: "P/E", value: "6,86" },
            { label: "Direktavk.", value: "1,59%" },
            { label: "Börsvärde", value: "1 085 834 MSEK" },
          ].map((s, i) => (
            <div key={i} style={{
              background: C.card, borderRadius: 12, border: `1px solid ${C.border}`,
              padding: "10px 10px",
            }}>
              <div style={{ fontSize: 10, color: C.textMuted, marginBottom: 3, lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ fontSize: i === 3 ? 9.5 : 12, fontWeight: 700, color: C.text, lineHeight: 1.2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ padding: "8px 0 0" }}>
          <TabBar active={tab} onChange={setTab} />
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: C.border, margin: "12px 0 4px" }} />

        {/* Tab content */}
        {tab === "Om" && <OmView />}
        {tab === "Analys" && <AnalysView />}
        {!["Om", "Analys"].includes(tab) && (
          <div style={{ padding: 32, textAlign: "center", color: C.textMuted, fontSize: 14 }}>
            {tab}-vyn visas ej i denna demo
          </div>
        )}

        {/* Buy button – fixed bottom */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430,
          padding: "12px 16px 28px",
          background: `linear-gradient(0deg, ${C.bg} 70%, transparent 100%)`,
        }}>
          <button style={{
            width: "100%", padding: "16px",
            background: "#1A1A1A", border: `1px solid ${C.border}`,
            borderRadius: 14, fontSize: 16, fontWeight: 700,
            color: C.text, cursor: "pointer", fontFamily: "inherit",
            letterSpacing: "0.02em",
          }}>Köp</button>
        </div>

        {/* Bottom nav */}
        <div style={{
          position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
          width: "100%", maxWidth: 430,
          display: "flex", justifyContent: "space-around",
          padding: "8px 0 20px",
          borderTop: `1px solid ${C.border}`,
          background: C.bg,
        }}>
          {[["🏠", "Hem"], ["💼", "Innehav"], ["🔖", "Bevaka"], ["🔍", "Upptäck"]].map(([icon, label]) => (
            <button key={label} style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              fontFamily: "inherit",
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 10, color: label === "Upptäck" ? C.text : C.textMuted, fontWeight: label === "Upptäck" ? 600 : 400 }}>{label}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
