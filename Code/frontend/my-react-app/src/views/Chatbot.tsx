import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { graphqlRequest } from "../api/graphql";
import { PROPERTY_FIELDS, viewProperty } from "../api/properties";
import PropertyCard from "../components/PropertyCard";
import type { Property as ApiProperty } from "../api/schemaTypes";
import type { Property } from "../data";


interface Msg { role: "user" | "bot"; text: string; timestamp: Date }

const SUGGESTIONS = [
  "Show me 3-bed homes under €500k",
  "Which properties are ready to move in?",
  "What's in Cork?",
  "Show me 3-bedroom homes in Cork under 500k",
  "Show me the most affordable option",
];

export default function Chatbot() {
  const [results, setResults] = useState<Property[]>([]);
  const [filterJson,setFilterJson] = useState("{}");
  const [resultCount,setResultCount] = useState(0);
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

  const send = async (text?: string) => {
    const q = (text ?? input).trim(); if (!q || thinking) return;
    setInput(""); setMessages((old)=>[...old,{role:"user",text:q,timestamp:new Date()}]);setThinking(true);
    try {
      const {propertyAssistant:reply}=await graphqlRequest<{propertyAssistant:{answer:string;filterJson:string;totalCount:number;properties:ApiProperty[]}}>(`query($message:String!,$previousFilterJson:String){propertyAssistant(message:$message,previousFilterJson:$previousFilterJson){answer filterJson totalCount properties{${PROPERTY_FIELDS}}}}`,{message:q,previousFilterJson:filterJson});
      setMessages((old)=>[...old,{role:"bot",text:reply.answer,timestamp:new Date()}]);setFilterJson(reply.filterJson);setResults(reply.properties.map(viewProperty));setResultCount(reply.totalCount);
    }catch(error){setMessages((old)=>[...old,{role:"bot",text:error instanceof Error?error.message:"The assistant is unavailable. Please retry.",timestamp:new Date()}]);}
    finally{setThinking(false);}
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
                Answers from published property records
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

        {results.length > 0 && <section className="mt-6"><h2 className="font-display text-xl">Matching public properties ({resultCount})</h2><Link className="underline" to={`/properties?filters=${encodeURIComponent(filterJson)}`}>Open these filters in property search</Link><div className="grid sm:grid-cols-2 gap-4 mt-4">{results.map((p)=><PropertyCard key={p.id} property={p} showCompare />)}</div></section>}
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
