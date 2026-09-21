import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { graphqlRequest } from "../api/graphql";
import { viewProperty } from "../api/properties";
import PropertyCard from "../components/PropertyCard";
import type { Property as ApiProperty, PropertyAssistantResult } from "../api/schemaTypes";
import type { Property } from "../data";

const ASSISTANT_PROPERTY_FIELDS = `id name location county address postalCode type saleType status stage publicationStatus publishedAt priceMin priceMax bedroomsMin bedroomsMax bathroomsMin bathroomsMax sizeSqm sizeSqmMax completionYear description bedroomOptions bathroomOptions listedDate createdAt media { id url type isPrimary sortOrder altText } features { id name } valueHistory { id year value growthPercent isSynthetic source } historicalPrices { year price } clickCount interestCount saveCount campaigned`;
const CHAT_MUTATION = `mutation ChatWithPropertyAI($input: PropertyAssistantInput!) { chatWithPropertyAI(input: $input) { message sessionId intent selectedPropertyId filterJson totalCount properties { ${ASSISTANT_PROPERTY_FIELDS} } } }`;

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: Date;
  properties?: Property[];
  filterJson?: string;
  totalCount?: number;
};

type PendingRequest = { message: string; selectedPropertyId?: string; selectedPropertyName?: string };
type ChatResponse = Omit<PropertyAssistantResult, "properties"> & { properties: ApiProperty[] };

const SUGGESTIONS = [
  "Find me a 3-bedroom home under €500k",
  "Show me properties near Dublin",
  "Find family homes with at least 2 bathrooms",
  "Show me the newest available properties",
];

function messageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function responseToMessage(reply: ChatResponse): ChatMessage {
  return {
    id: messageId(),
    role: "assistant",
    text: reply.message,
    timestamp: new Date(),
    properties: reply.properties.map(viewProperty),
    filterJson: reply.filterJson,
    totalCount: reply.totalCount,
  };
}

export default function Chatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: "welcome", role: "assistant", text: "Hello! I can help you explore Harborstone's currently published properties and answer questions about a property you select.", timestamp: new Date() }]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string>();
  const [selectedProperty, setSelectedProperty] = useState<{ id: string; name: string }>();
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string>();
  const [lastRequest, setLastRequest] = useState<PendingRequest>();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages, thinking, error]);

  const send = async (request?: PendingRequest, retry = false) => {
    const next = request ?? { message: input.trim() };
    const message = next.message.trim();
    if (!message || thinking) return;

    setError(undefined);
    setLastRequest({ ...next, message });
    if (!retry) {
      setMessages((current) => [...current, { id: messageId(), role: "user", text: message, timestamp: new Date() }]);
    }
    setInput("");
    setThinking(true);

    try {
      const data = await graphqlRequest<{ chatWithPropertyAI: ChatResponse }>(CHAT_MUTATION, {
        input: {
          message,
          sessionId,
          selectedPropertyId: next.selectedPropertyId ?? selectedProperty?.id,
        },
      });
      const reply = data.chatWithPropertyAI;
      setSessionId(reply.sessionId);
      if (reply.selectedPropertyId) {
        const property = reply.properties.find((item) => item.id === reply.selectedPropertyId);
        setSelectedProperty({ id: reply.selectedPropertyId, name: property?.name ?? next.selectedPropertyName ?? "Selected property" });
      } else if (reply.intent === "PROPERTY_SEARCH") {
        setSelectedProperty(undefined);
      }
      setMessages((current) => [...current, responseToMessage(reply)]);
    } catch {
      setError("The property assistant is temporarily unavailable. Please try again.");
    } finally {
      setThinking(false);
    }
  };

  const askAboutProperty = (property: Property) => {
    setSelectedProperty({ id: property.id, name: property.name });
    void send({ message: "Tell me about this property.", selectedPropertyId: property.id, selectedPropertyName: property.name });
  };

  const formatTime = (date: Date) => date.toLocaleTimeString("en-IE", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-cream">
      <div className="bg-navy px-6 py-10">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-3xl font-bold text-white">AI Home Assistant</h1>
          <p className="mt-1 text-sm text-white/70">Grounded in Harborstone's current published property records.</p>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <section className="flex min-h-[600px] flex-col border border-[#ddd5c5] bg-white shadow-sm" aria-label="Harborstone property assistant">
          <header className="flex items-center gap-3 border-b border-[#ddd5c5] bg-cream-dark px-5 py-3">
            <span className="flex h-8 w-8 items-center justify-center bg-navy text-sm font-bold text-white" aria-hidden="true">H</span>
            <div>
              <p className="text-sm font-semibold text-navy">Harborstone AI</p>
              <p className="text-xs text-stone">Published property information only</p>
            </div>
          </header>

          {selectedProperty && (
            <div className="flex items-center justify-between gap-3 border-b border-[#ddd5c5] bg-cream px-5 py-2 text-sm text-navy">
              <span>Asking about: <strong>{selectedProperty.name}</strong></span>
              <button type="button" onClick={() => setSelectedProperty(undefined)} className="text-xs font-semibold text-navy underline hover:text-amber">Clear selection</button>
            </div>
          )}

          <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-5" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                {message.role === "assistant" && <span className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center bg-navy text-xs font-bold text-white" aria-hidden="true">H</span>}
                <div className={`max-w-[88%] ${message.role === "user" ? "bg-navy text-white" : "bg-cream-dark text-navy"} px-4 py-3 text-sm leading-relaxed`}>
                  <p className="whitespace-pre-line">{message.text}</p>
                  <p className={`mt-2 text-[10px] ${message.role === "user" ? "text-white/60" : "text-stone"}`}>{formatTime(message.timestamp)}</p>
                  {message.properties && message.properties.length > 0 && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {message.properties.map((property) => <PropertyCard key={property.id} property={property} showCompare onAskAI={askAboutProperty} />)}
                    </div>
                  )}
                  {message.filterJson && message.totalCount && message.totalCount > 0 && (
                    <Link className="mt-4 inline-block text-xs font-semibold text-navy underline hover:text-amber" to={`/properties?filters=${encodeURIComponent(message.filterJson)}`}>Open these filters in property search</Link>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-stone" role="status">
                <span className="flex h-7 w-7 items-center justify-center bg-navy text-xs font-bold text-white" aria-hidden="true">H</span>
                Finding current property information...
              </div>
            )}
            {error && (
              <div className="flex items-center justify-between gap-3 border border-burgundy/40 bg-cream px-3 py-2 text-sm text-navy" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => lastRequest && void send(lastRequest, true)} disabled={!lastRequest || thinking} className="shrink-0 font-semibold underline disabled:opacity-40">Retry</button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className="border-t border-[#ddd5c5] p-3" onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <label className="sr-only" htmlFor="property-assistant-message">Ask about properties</label>
            <div className="flex items-end gap-2">
              <textarea
                id="property-assistant-message"
                className="min-h-11 flex-1 resize-y border border-[#ddd5c5] bg-cream px-3 py-2 text-sm text-navy placeholder-stone"
                placeholder="Ask about properties, prices, or locations..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                disabled={thinking}
                maxLength={1200}
              />
              <button type="submit" disabled={!input.trim() || thinking} className="bg-navy px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber disabled:cursor-not-allowed disabled:opacity-40">Send</button>
            </div>
          </form>
        </section>

        <section className="mt-5" aria-label="Starter questions">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-stone">Try asking</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => <button key={suggestion} type="button" onClick={() => void send({ message: suggestion })} disabled={thinking} className="border border-[#ddd5c5] bg-cream-dark px-3 py-2 text-xs text-navy transition-colors hover:border-amber hover:text-amber disabled:opacity-40">{suggestion}</button>)}
          </div>
        </section>
      </main>
    </div>
  );
}
