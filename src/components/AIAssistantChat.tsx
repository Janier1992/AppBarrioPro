import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, Send, Trash2, HelpCircle, Loader2 } from "lucide-react";
import { Product, Sale } from "../types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIAssistantChatProps {
  products: Product[];
  sales: Sale[];
  userId?: string;
  geminiApiKey?: string;
}

export default function AIAssistantChat({ products, sales, userId, geminiApiKey }: AIAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize with a welcome message on first open
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "¡Hola! Soy **BarrioPro AI**, tu asesor comercial e inteligente de confianza.\n\nTengo acceso en tiempo real a tu inventario y a tus ventas registradas. Puedo ayudarte con:\n\n* **Sugerencias de reposición**: Qué productos tienen stock crítico y cuánto pedir.\n* **Estrategias de ventas**: Qué ofertas, combos o promociones puedes crear para aumentar tus ingresos.\n* **Análisis de negocio**: Consejos personalizados para mejorar y hacer crecer tu tienda.\n\n¿De qué te gustaría hablar hoy sobre tu negocio?",
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }, [messages, isOpen, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      // Map current messages for the API endpoint
      const apiMessages = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messages: apiMessages,
          products,
          sales,
          geminiApiKey
        })
      });

      if (!response.ok) {
        let errMsg = "No se pudo obtener respuesta del asistente.";
        try {
          const errorData = await response.json();
          if (errorData && errorData.error) {
            errMsg = errorData.error;
          }
        } catch (e) {
          // ignore parsing error
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(36).substring(7),
        role: "assistant",
        content: data.text || "Disculpa, no logré procesar tu solicitud. Por favor intenta de nuevo.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Error in AI Chat:", err);
      setError(err.message || "Ocurrió un error al conectar con el asistente. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (window.confirm("¿Deseas reiniciar la conversación?")) {
      setMessages([
        {
          id: "welcome-reset",
          role: "assistant",
          content: "Conversación reiniciada. ¡Hola! Estoy listo para apoyarte con tu tienda. ¿Qué te gustaría consultar hoy?",
          timestamp: new Date()
        }
      ]);
      setError(null);
    }
  };

  const suggestedQuestions = [
    { label: "📦 ¿Qué productos debo reponer?", q: "Por favor analiza mi inventario actual y dime qué productos están en stock crítico, por qué es urgente reponerlos y qué cantidad me sugieres comprar." },
    { label: "💰 ¿Cómo aumento mis ventas hoy?", q: "Basándote en mi historial de ventas e inventario, ¿qué promociones o combos sugeridos puedo armar para atraer clientes y aumentar los ingresos de hoy?" },
    { label: "📈 Ideas de mejora para mi tienda", q: "Dame recomendaciones generales e ingeniosas sobre cómo mejorar la administración, el orden y el rendimiento comercial de mi tienda de barrio." }
  ];

  // Simple rich text formatting for bold (**text**) and bullet points (* point)
  const renderMessageContent = (content: string) => {
    return content.split("\n").map((line, idx) => {
      let trimmed = line.trim();
      
      // Handle empty lines
      if (!trimmed) return <div key={idx} className="h-2" />;

      // Handle Bullet Points
      const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
      if (isBullet) {
        trimmed = trimmed.substring(2);
      }

      // Handle bold tags (**text**)
      const parts = [];
      let lastIndex = 0;
      const regex = /\*\*(.*?)\*\*/g;
      let match;

      while ((match = regex.exec(trimmed)) !== null) {
        if (match.index > lastIndex) {
          parts.push(trimmed.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-extrabold text-brand-text dark:text-white">{match[1]}</strong>);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < trimmed.length) {
        parts.push(trimmed.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc pl-1 mb-1 leading-relaxed">
            {parts.length > 0 ? parts : trimmed}
          </li>
        );
      }

      return (
        <p key={idx} className="mb-2 leading-relaxed text-[12px]">
          {parts.length > 0 ? parts : trimmed}
        </p>
      );
    });
  };

  return (
    <>
      {/* FLOATING ACTION BUTTON */}
      <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 p-3.5 rounded-full text-white shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer border border-white/20 relative group ${
            isOpen 
              ? "bg-slate-700 dark:bg-zinc-800" 
              : "bg-brand-primary dark:bg-brand-primary-dark"
          }`}
          title="Asistente BarrioPro AI"
          id="ai-floating-button"
        >
          {isOpen ? (
            <X size={20} className="transition-transform" />
          ) : (
            <>
              <Sparkles size={20} className="animate-pulse" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-out text-xs font-bold font-mono tracking-wide whitespace-nowrap">
                Asistente IA
              </span>
            </>
          )}
          {/* Subtle notification glowing dot */}
          {!isOpen && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border border-white dark:border-zinc-900"></span>
            </span>
          )}
        </button>
      </div>

      {/* CHAT WINDOW INTERFACE */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.92 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-[140px] right-4 lg:bottom-[84px] lg:right-6 z-50 w-[92vw] sm:w-[420px] h-[550px] max-h-[70vh] flex flex-col rounded-3xl bg-white dark:bg-zinc-900 shadow-2xl border border-brand-border overflow-hidden"
            id="ai-chat-window"
          >
            {/* Chat Header */}
            <div className="bg-brand-primary dark:bg-brand-primary-dark text-white px-5 py-4 flex items-center justify-between border-b border-brand-border shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-white/15 p-1.5 rounded-xl border border-white/10">
                  <Sparkles size={18} className="text-white animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-bold font-mono tracking-wide">BarrioPro AI</h3>
                  <p className="text-[10px] text-white/70">Tu asesor y mentor comercial</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleClearChat}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Reiniciar chat"
                >
                  <Trash2 size={14} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar chat"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-brand-bg dark:bg-zinc-950/20">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`rounded-2xl py-2.5 px-3.5 shadow-xs max-w-[85%] text-[12px] break-words ${
                      m.role === "user"
                        ? "bg-brand-primary dark:bg-brand-primary-dark text-white rounded-tr-none"
                        : "bg-white dark:bg-zinc-800 text-brand-text dark:text-zinc-100 border border-brand-border rounded-tl-none"
                    }`}
                  >
                    {renderMessageContent(m.content)}
                  </div>
                  <span className="text-[9px] text-brand-muted mt-1 px-1">
                    {m.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}

              {/* Suggestions Panel (only show if messages length is small/initial) */}
              {messages.length <= 2 && !isLoading && (
                <div className="pt-2 pb-1 space-y-2 border-t border-dashed border-brand-border">
                  <p className="text-[10px] font-bold text-brand-muted uppercase tracking-wider flex items-center gap-1">
                    <HelpCircle size={10} />
                    Preguntas Sugeridas
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q.q)}
                        className="text-left text-[11px] text-brand-text dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-brand-border hover:bg-slate-50 dark:hover:bg-zinc-700/50 hover:border-brand-primary/40 py-2 px-3 rounded-xl transition-all cursor-pointer font-medium shadow-xs"
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex items-center gap-2 text-brand-muted text-[11px] py-1 bg-white dark:bg-zinc-800/40 rounded-xl px-3 border border-brand-border/40 w-fit">
                  <Loader2 size={12} className="animate-spin text-brand-primary" />
                  <span>BarrioPro AI está analizando tus datos...</span>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 rounded-xl text-red-600 dark:text-red-400 text-[11px] space-y-1.5">
                  <p className="font-bold">{error}</p>
                  <button
                    onClick={() => handleSendMessage(messages[messages.length - 1]?.content || "")}
                    className="text-xs font-semibold text-brand-primary hover:underline"
                  >
                    Reintentar enviar último mensaje
                  </button>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Message Input Footer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 border-t border-brand-border bg-white dark:bg-zinc-900 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Pregunta algo sobre tu negocio..."
                disabled={isLoading}
                className="flex-1 rounded-xl border border-brand-border px-3.5 py-2.5 text-[12px] bg-slate-50/50 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary focus:outline-hidden text-brand-text dark:text-white"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-dark text-white disabled:opacity-40 transition-colors cursor-pointer shadow-xs shrink-0"
                title="Enviar"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
