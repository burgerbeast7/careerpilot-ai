import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, Sparkles, Loader2 } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "How can I boost my ATS score?",
  "Give me a behavioral interview tip",
  "Explain containerization simply",
  "What projects should I build?"
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your **CareerPilot AI** coach. Ask me anything about resume optimizations, target company expectations, or mock interview preparation!"
    }
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingText]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text) return;

    // 1. Add user message
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: 'user',
      content: text
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);
    setStreamingText('');

    // Compile message history
    const historyPayload = [...messages, userMsg].map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}/chat/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: historyPayload
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Failed to start reader');

      let accumulated = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            try {
              const dataStr = cleanLine.replace('data: ', '');
              const payload = jsonParseSafe(dataStr);
              if (payload && payload.chunk) {
                accumulated += payload.chunk;
                setStreamingText(accumulated);
              }
            } catch (err) {
              // ignore partial lines
            }
          }
        }
      }

      // Add completed response
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: accumulated
      }]);
      setStreamingText('');
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: 'assistant',
        content: "Apologies, I encountered a connection issue. Please try again."
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const jsonParseSafe = (str: string) => {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  };

  // Simple Markdown parser for bolding **text**
  const parseMarkdown = (text: string) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = text.split(boldRegex);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="text-white font-bold">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {!isOpen ? (
          /* Floating Button */
          <motion.button
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-ibm-blue to-ibm-purple p-0.5 shadow-glow-purple flex items-center justify-center text-white hover:scale-105 transition-all"
          >
            <MessageSquare className="w-6 h-6 animate-pulse" />
          </motion.button>
        ) : (
          /* Expandable Chat panel */
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 50 }}
            className="w-[360px] max-w-[calc(100vw-32px)] h-[500px] glass-panel border border-ibm-border rounded-2xl shadow-glass flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-ibm-blue/20 to-ibm-purple/20 border-b border-ibm-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-ibm-blue to-ibm-purple flex items-center justify-center p-0.5 shadow-glow-blue">
                  <Bot className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white flex items-center gap-1">
                    AI Career assistant
                    <Sparkles className="w-3 h-3 text-ibm-cyan animate-pulse" />
                  </h3>
                  <span className="text-[9px] text-gray-500 font-mono">Status: online</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg border border-ibm-border hover:bg-white/5 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Message Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 scrollbar-thin">
              {messages.map((m) => (
                <div 
                  key={m.id}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] rounded-xl p-3 text-xs leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-ibm-blue/15 border border-ibm-blue/30 text-white rounded-br-none shadow-glow-blue/10' 
                        : 'bg-white/5 border border-white/[0.04] text-gray-300 rounded-bl-none'
                    }`}
                  >
                    {parseMarkdown(m.content)}
                  </div>
                </div>
              ))}

              {/* Streaming box */}
              {isStreaming && streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-xl p-3 text-xs leading-relaxed bg-white/5 border border-white/[0.04] text-gray-300 rounded-bl-none streaming-cursor">
                    {parseMarkdown(streamingText)}
                  </div>
                </div>
              )}

              {/* Loader */}
              {isStreaming && !streamingText && (
                <div className="flex items-center gap-1.5 py-1 text-gray-500 text-[10px]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-ibm-cyan" />
                  <span>AI Agent thinking...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions (Shown when idle) */}
            {!isStreaming && messages.length === 1 && (
              <div className="px-4 py-2 border-t border-white/[0.02] bg-white/[0.01]">
                <div className="text-[9px] uppercase font-bold text-gray-500 tracking-wider mb-1.5">Suggested Prompts</div>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTED_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(p)}
                      className="px-2 py-1 rounded-md border border-white/[0.04] bg-white/5 hover:bg-ibm-blue/10 hover:border-ibm-blue/20 text-[10px] text-gray-400 hover:text-white transition"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-3 border-t border-ibm-border bg-black/40 flex gap-2">
              <input
                type="text"
                placeholder="Ask about placement preparation..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
                disabled={isStreaming}
                className="flex-1 px-3 py-2 bg-black/60 border border-ibm-border rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-ibm-blue focus:shadow-glow-blue transition-all"
              />
              <button
                onClick={() => handleSend(input)}
                disabled={isStreaming || !input.trim()}
                className="p-2 bg-gradient-to-tr from-ibm-blue to-ibm-purple rounded-lg text-white shadow-glow-purple disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
export default ChatWidget;
