"import { useEffect, useRef, useState } from \"react\";
import { motion, AnimatePresence } from \"framer-motion\";
import { api } from \"@/lib/api\";
import { MessageSquare, Send, X, Loader2, Bot } from \"lucide-react\";
import { useAuth } from \"@/contexts/AuthContext\";

export default function ChatAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: \"assistant\", text: \"Hi! I'm AgriSense. Ask me about yield, weather, irrigation, pests or policy planning.\" },
  ]);
  const [input, setInput] = useState(\"\");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const scroller = useRef(null);

  useEffect(() => { scroller.current?.scrollTo({ top: 99999, behavior: \"smooth\" }); }, [messages, open]);

  if (!user) return null;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput(\"\");
    setMessages((m) => [...m, { role: \"user\", text }]);
    setLoading(true);
    try {
      const { data } = await api.post(\"/chat\", { message: text, session_id: sessionId });
      setSessionId(data.session_id);
      setMessages((m) => [...m, { role: \"assistant\", text: data.reply }]);
    } catch (e) {
      setMessages((m) => [...m, { role: \"assistant\", text: \"I'm having trouble responding right now. Please try again.\" }]);
    } finally { setLoading(false); }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className=\"fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-neon-green to-neon-cyan text-bg-1 shadow-[0_0_28px_rgba(0,255,136,0.55)] flex items-center justify-center animate-pulse-glow\"
        data-testid=\"chat-toggle\"
        aria-label=\"Open AI assistant\"
      >
        {open ? <X className=\"w-5 h-5\" /> : <MessageSquare className=\"w-5 h-5\" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            className=\"fixed bottom-24 right-6 z-50 w-[92vw] sm:w-[400px] h-[520px] glass-strong flex flex-col overflow-hidden\"
            data-testid=\"chat-panel\"
          >
            <div className=\"px-4 py-3 border-b border-white/10 flex items-center gap-2\">
              <Bot className=\"w-4 h-4 text-neon-green\" />
              <span className=\"font-display font-bold text-sm\">AgriSense AI</span>
              <span className=\"ml-auto text-[10px] text-white/40 font-mono\">claude-sonnet-4.5</span>
            </div>
            <div ref={scroller} className=\"flex-1 overflow-y-auto px-3 py-3 space-y-2.5 text-sm\">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === \"user\" ? \"justify-end\" : \"justify-start\"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${m.role === \"user\" ? \"bg-neon-green text-bg-1 rounded-br-sm\" : \"bg-white/5 border border-white/10 rounded-bl-sm\"}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className=\"flex justify-start\">
                  <div className=\"px-3 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/60 flex items-center gap-2 text-xs\">
                    <Loader2 className=\"w-3.5 h-3.5 animate-spin\" /> thinking…
                  </div>
                </div>
              )}
            </div>
            <div className=\"p-3 border-t border-white/10 flex gap-2\">
              <input
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === \"Enter\" && send()}
                placeholder=\"Ask about your harvest…\"
                className=\"input-field text-sm flex-1\"
                data-testid=\"chat-input\"
              />
              <button onClick={send} disabled={loading} className=\"btn-primary !px-3 !py-2\" data-testid=\"chat-send\">
                <Send className=\"w-4 h-4\" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
"