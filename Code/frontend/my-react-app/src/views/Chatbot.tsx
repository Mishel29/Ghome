import { useState, useRef, useEffect } from "react";
import { useApp } from "../context";
import { fmt } from "../data";

interface Msg { role: "user" | "bot"; text: string; timestamp: Date }

const SUGGESTIONS = [
  "Show me 3-bed homes under €500k",
  "Which properties are ready to move in?",
  "What's in Cork?",
  "Compare Meridian and Oakfield",
  "What is the Help to Buy scheme?",
  "Show me the most affordable option",
];

export default function Chatbot() {
  const { properties } = useApp();
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "bot",
      text: "Hello! I'm Harborstone's AI home assistant. I can help you find properties, answer questions about our developments, and guide you through the buying process. What are you looking for today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const respond = (query: string): string => {
    const q = query.toLowerCase();

    // Price filter
    const priceMatch = q.match(/under\s+[€£]?\s*(\d[\d,]*)/);
    if (priceMatch) {
      const max = parseInt(priceMatch[1].replace(/,/g, ""));
      const found = properties.filter((p) => p.price.min <= max && p.status !== "sold-out" && p.status !== "offline");
      if (found.length === 0) return `I couldn't find properties under €${max.toLocaleString()}. Try a higher budget or check our full listings.`;
      return `Here are ${found.length} propert${found.length > 1 ? "ies" : "y"} under ${fmt(max)}:\n\n${found.map((p) => `• **${p.name}** (${p.location}) — from ${fmt(p.price.min)} · ${p.type}`).join("\n")}\n\nWould you like details on any of these?`;
    }

    // Beds filter
    const bedMatch = q.match(/(\d)\s*[-\s]?bed/);
    if (bedMatch) {
      const beds = parseInt(bedMatch[1]);
      const found = properties.filter((p) => p.beds.includes(beds) && p.status !== "offline");
      if (found.length === 0) return `I don't currently have any ${beds}-bed homes available. Can I help with a different bedroom count?`;
      return `I found ${found.length} development${found.length > 1 ? "s" : ""} with ${beds}-bed options:\n\n${found.map((p) => `• **${p.name}** — ${p.location}, from ${fmt(p.price.min)}`).join("\n")}`;
    }

    // Location query
    const counties = ["dublin", "cork", "galway", "limerick", "wicklow", "kildare"];
    const countyMatch = counties.find((c) => q.includes(c));
    if (countyMatch) {
      const found = properties.filter((p) => p.county.toLowerCase() === countyMatch);
      if (found.length === 0) return `We don't currently have active listings in ${countyMatch.charAt(0).toUpperCase() + countyMatch.slice(1)}, but new developments are planned. Register your interest and we'll notify you.`;
      return `We have ${found.length} development${found.length > 1 ? "s" : ""} in ${countyMatch.charAt(0).toUpperCase() + countyMatch.slice(1)}:\n\n${found.map((p) => `• **${p.name}** — ${p.type}, from ${fmt(p.price.min)}`).join("\n")}`;
    }

    // Ready to move
    if (q.includes("ready") || q.includes("move in") || q.includes("available now")) {
      const found = properties.filter((p) => p.stage === "Ready to Move" && p.status === "on-sale");
      return `${found.length} developments are ready to move into now:\n\n${found.map((p) => `• **${p.name}** — ${p.location}, from ${fmt(p.price.min)}`).join("\n")}`;
    }

    // Most affordable
    if (q.includes("affordable") || q.includes("cheapest") || q.includes("lowest price")) {
      const sorted = [...properties].filter((p) => p.status !== "sold-out" && p.status !== "offline").sort((a, b) => a.price.min - b.price.min);
      const p = sorted[0];
      return `Our most affordable option is **${p.name}** in ${p.location}, starting from ${fmt(p.price.min)}. It offers ${p.type} — ${p.description.substring(0, 100)}...`;
    }

    // Help to Buy
    if (q.includes("help to buy") || q.includes("htb") || q.includes("first time")) {
      return "The **Help to Buy (HTB) scheme** allows first-time buyers to claim back up to €30,000 in income tax and DIRT paid over the previous 4 years. It applies to new builds priced up to €500,000. All our properties are HTB-eligible where applicable. Check with Revenue.ie or speak to our sales team for details.";
    }

    // Compare
    if (q.includes("compar")) {
      return "Our comparison tool lets you view up to 3 properties side by side — price, bedrooms, size, stage, and more. Click the **Compare** link in the navigation, or use the '+Compare' button on any property card.";
    }

    // Mortgage
    if (q.includes("mortgage") || q.includes("repayment") || q.includes("loan")) {
      return "Use our **Mortgage Calculator** to estimate your monthly repayments based on property price, deposit, interest rate, and term. It also checks affordability based on the 3.5× income rule. You'll find it in the navigation.";
    }

    // Property name lookup
    for (const p of properties) {
      if (q.includes(p.name.toLowerCase())) {
        return `**${p.name}** is located in ${p.address}. It offers ${p.type}, starting from ${fmt(p.price.min)}. Current stage: ${p.stage}. ${p.description} \n\nWould you like to view the full details or register your interest?`;
      }
    }

    // Greeting
    if (q.match(/\b(hi|hello|hey|good morning|good afternoon)\b/)) {
      return "Hello there! I'm happy to help you find your perfect home. You can ask me about specific properties, bedroom counts, locations, pricing, the Help to Buy scheme, mortgages, or anything else about Harborstone Homes.";
    }

    return "That's a great question! For detailed queries like this, our sales team would love to help. You can also browse all our properties using the search tool, or try asking me about a specific development, location, or price range.";
  };

  const send = (text?: string) => {
    const q = (text ?? input).trim();
    if (!q) return;
    setInput("");
    const userMsg: Msg = { role: "user", text: q, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);
    setTimeout(() => {
      const botMsg: Msg = { role: "bot", text: respond(q), timestamp: new Date() };
      setMessages((prev) => [...prev, botMsg]);
      setThinking(false);
    }, 800 + Math.random() * 400);
  };

  const fmt2 = (d: Date) => d.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

  const renderText = (text: string) =>
    text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );

  return (
    <div className="bg-cream min-h-screen">
      <div className="bg-navy py-10 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="font-display text-white text-3xl font-bold">AI Home Assistant</h1>
          <p className="text-white/60 text-sm mt-1">Powered by Harborstone property intelligence</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Chat window */}
        <div className="bg-white border border-[#ddd5c5] shadow-sm flex flex-col h-[520px]">
          {/* Header */}
          <div className="bg-cream-dark border-b border-[#ddd5c5] px-5 py-3 flex items-center gap-3">
            <div className="w-8 h-8 bg-navy rounded-full flex items-center justify-center">
              <svg width="16" height="16" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div>
              <div className="font-semibold text-navy text-sm">Harborstone AI</div>
              <div className="text-[11px] text-stone flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-sage rounded-full pulse-dot"/>
                Online
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "bot" && (
                  <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center mr-2 mt-1 shrink-0 text-white text-xs font-bold">H</div>
                )}
                <div className={`max-w-[75%] ${m.role === "user" ? "bg-navy text-white" : "bg-cream-dark text-navy"} px-4 py-3 text-sm leading-relaxed`}>
                  <div className="whitespace-pre-line">{renderText(m.text)}</div>
                  <div className={`text-[10px] mt-1.5 ${m.role === "user" ? "text-white/50" : "text-stone"}`}>{fmt2(m.timestamp)}</div>
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-navy rounded-full flex items-center justify-center text-white text-xs font-bold">H</div>
                <div className="bg-cream-dark px-4 py-3 flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="w-2 h-2 bg-stone rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s`}}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={endRef}/>
          </div>

          {/* Input */}
          <div className="border-t border-[#ddd5c5] p-3 flex gap-2">
            <input
              className="flex-1 px-4 py-2.5 border border-[#ddd5c5] bg-cream text-sm text-navy placeholder-stone"
              placeholder="Ask about properties, prices, locations..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || thinking}
              className="bg-navy text-white px-4 py-2.5 hover:bg-amber disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Suggestions */}
        <div className="mt-5">
          <p className="text-xs text-stone mb-3 uppercase tracking-wider font-semibold">Try asking...</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="text-xs px-3 py-2 border border-[#ddd5c5] bg-cream-dark text-navy hover:border-amber hover:text-amber transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
