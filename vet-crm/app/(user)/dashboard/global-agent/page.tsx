'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  LuSparkles,
  LuPlus,
  LuTrash,
  LuCheck,
  LuLoaderCircle,
  LuUser} from 'react-icons/lu';

type MessageRole = 'user' | 'assistant';

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

const SUGGESTIONS = [
  { icon: () => <span style={{fontSize:"14px"}}>✏</span>, label: 'Criar conteúdo', prompt: 'Crie um post para redes sociais sobre cuidados com pets no verão' },
  { icon: () => <span style={{fontSize:"14px"}}>{}</span>, label: 'Gerar código', prompt: 'Gere um código de desconto automático para clientes VIP do pet shop' },
  { icon: () => <span style={{fontSize:"14px"}}>🌐</span>, label: 'Estratégia digital', prompt: 'Crie uma estratégia de marketing digital para meu pet shop' },
  { icon: () => <span style={{fontSize:"14px"}}>🧠</span>, label: 'Análise de dados', prompt: 'Analise os principais KPIs que um pet shop deve acompanhar' },
];

const FAKE_RESPONSE = `Claro! Aqui está uma sugestão completa para você:

## Estratégia para Pet Shop

1. **Presença nas Redes Sociais**
   - Poste fotos dos pets atendidos (com autorização)
   - Crie conteúdo educativo sobre cuidados com animais
   - Use Reels e Stories para mostrar o dia a dia

2. **Programa de Fidelidade**
   - A cada 10 banhos, ofereça 1 gratuito
   - Descontos progressivos para clientes frequentes
   - Brindes em datas especiais dos pets

3. **Marketing Local**
   - Parcerias com clínicas veterinárias
   - Eventos de adoção no estabelecimento
   - Panfletos em condomínios da região

> 💡 **Dica**: O mais importante é manter consistência na comunicação e sempre priorizar o bem-estar dos animais em toda sua estratégia.`;

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export default function GlobalAgentPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(() => {
    if (typeof window !== 'undefined') return window.innerWidth >= 768;
    return true;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null;
  const messages = activeConversation?.messages ?? [];

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: generateId(),
      title: 'Nova conversa',
      messages: [],
      createdAt: new Date()};
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setInput('');
    setShowHistory(false);
    return newConv.id;
  }, []);

  const simulateResponse = useCallback(
    (convId: string) => {
      setIsTyping(true);
      const delay = 1200 + Math.random() * 1500;
      setTimeout(() => {
        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: FAKE_RESPONSE,
          timestamp: new Date()};
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, messages: [...c.messages, assistantMsg] } : c))
        );
        setIsTyping(false);
      }, delay);
    },
    []
  );

  const handleSend = useCallback(
    (text?: string) => {
      const content = (text ?? input).trim();
      if (!content || isTyping) return;

      let convId = activeConversationId;
      if (!convId) {
        convId = createNewConversation();
      }

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: new Date()};

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== convId) return c;
          const title = c.messages.length === 0 ? content.slice(0, 50) : c.title;
          return { ...c, title, messages: [...c.messages, userMsg] };
        })
      );

      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      simulateResponse(convId!);
    },
    [input, isTyping, activeConversationId, createNewConversation, simulateResponse]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeConversationId === id) {
      setActiveConversationId(null);
    }
  };

  const isEmptyState = !activeConversation || messages.length === 0;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* History Sidebar - overlay on mobile, inline on md+ */}
      {showHistory && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setShowHistory(false)}
        />
      )}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/98 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ease-in-out md:relative md:z-auto md:transition-all md:duration-300 ${
          showHistory
            ? 'translate-x-0 md:translate-x-0 md:w-72'
            : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0'
        } md:shrink-0 md:overflow-hidden`}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/5 min-w-[18rem]">
          <h2 className="text-sm font-semibold text-white/70 whitespace-nowrap">Histórico</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={createNewConversation}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title="Nova conversa"
            >
              <LuPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowHistory(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all md:hidden"
            >
              <span style={{fontSize:"14px"}}>✕</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-w-[18rem]">
          {conversations.length === 0 ? (
            <div className="px-3 py-8 text-center">
              
              <p className="text-xs text-white/30">Nenhuma conversa ainda</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                  activeConversationId === conv.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                }`}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  if (window.innerWidth < 768) setShowHistory(false);
                }}
              >
                <span style={{fontSize:"14px"}}>💬</span>
                <span className="flex-1 text-sm truncate">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-all"
                >
                  <LuTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-2.5 sm:px-4 py-2.5 sm:py-3 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all"
              title={showHistory ? 'Recolher histórico' : 'Expandir histórico'}
            >
              <span style={{fontSize:"14px"}}>💬</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <LuSparkles className="w-4 h-4 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-cyan-400 border-2 border-slate-950" />
              </div>
              <div>
                <h1 className="text-xs sm:text-sm font-semibold text-white">Global Agent</h1>
                <p className="text-[10px] sm:text-xs text-cyan-400/80">Online</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={createNewConversation}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs sm:text-sm transition-all"
            >
              <LuPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Nova conversa</span>
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          {isEmptyState ? (
            <div className="flex flex-col items-center justify-center h-full px-3 sm:px-4 py-8 sm:py-12">
              <div className="relative mb-6 sm:mb-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-2xl shadow-purple-500/30">
                  <LuSparkles className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                </div>
                <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 blur-2xl -z-10" />
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-1.5 sm:mb-2 text-center">
                Como posso ajudar?
              </h2>
              <p className="text-white/40 text-xs sm:text-sm md:text-base text-center max-w-md mb-6 sm:mb-10 px-2">
                Seu assistente inteligente para gestão do pet shop. Pergunte qualquer coisa.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full max-w-xl">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s.prompt)}
                    className="group flex items-start gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:border-white/[0.12] active:scale-[0.98] transition-all duration-300 text-left"
                  >
                    <div className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/10 group-hover:from-violet-500/20 group-hover:to-fuchsia-500/20 transition-all">
                      <s.icon className="w-4 h-4 text-violet-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">
                        {s.label}
                      </p>
                      <p className="text-xs text-white/30 mt-0.5 line-clamp-1 sm:line-clamp-2">{s.prompt}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-2 sm:gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-purple-500/20">
                      <LuSparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[80%] md:max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-[13px] sm:text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-br from-violet-600 to-purple-600 text-white rounded-br-md shadow-lg shadow-violet-500/10'
                          : 'bg-white/[0.05] border border-white/[0.08] text-white/90 rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none prose-headings:text-white prose-p:text-white/80 prose-strong:text-white prose-li:text-white/80 prose-blockquote:text-white/70 prose-blockquote:border-violet-500/50">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>

                    {msg.role === 'assistant' && (
                      <div className="flex items-center gap-1 mt-1.5 ml-1">
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/5 transition-all"
                          title="Copiar"
                        >
                          {copiedId === msg.id ? (
                            <LuCheck className="w-3.5 h-3.5 text-cyan-400" />
                          ) : (
                            <span style={{fontSize:"14px"}}>⎘</span>
                          )}
                        </button>
                        <span className="text-[10px] text-white/15">
                          {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center shrink-0 mt-0.5 shadow-lg shadow-cyan-500/20">
                      <LuUser className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex gap-2 sm:gap-3 justify-start">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shrink-0 shadow-lg shadow-purple-500/20">
                    <LuSparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                  </div>
                  <div className="bg-white/[0.05] border border-white/[0.08] rounded-2xl rounded-bl-md px-5 py-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                      <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                      <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div className="max-w-3xl mx-auto w-full px-2.5 sm:px-4 py-2.5 sm:py-4">
            <div className="relative flex items-end bg-white/[0.04] border border-white/[0.08] rounded-xl sm:rounded-2xl focus-within:border-violet-500/30 focus-within:bg-white/[0.06] transition-all duration-300 shadow-lg shadow-black/20">
              <div className="hidden sm:flex items-center gap-1 pl-3 pb-3">
                <button
                  className="p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
                  title="Anexar arquivo"
                >
                  <span style={{fontSize:"14px"}}>📎</span>
                </button>
                <button
                  className="p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
                  title="Enviar imagem"
                >
                  <span style={{fontSize:"14px"}}>🖼</span>
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Envie uma mensagem..."
                rows={1}
                className="flex-1 bg-transparent text-white placeholder-white/25 py-3 sm:py-3.5 pl-3 sm:pl-0 pr-2 text-sm resize-none focus:outline-none max-h-[200px] leading-relaxed"
              />

              <div className="flex items-center gap-0.5 sm:gap-1 pr-2 sm:pr-3 pb-2.5 sm:pb-3">
                <button
                  className="hidden sm:flex p-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all"
                  title="Mensagem de voz"
                >
                  <span style={{fontSize:"14px"}}>🎤</span>
                </button>

                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:from-violet-500 hover:to-purple-500 disabled:opacity-30 disabled:shadow-none disabled:hover:from-violet-600 disabled:hover:to-purple-600 transition-all duration-200"
                  title="Enviar"
                >
                  {isTyping ? (
                    <LuLoaderCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5 animate-spin" />
                  ) : (
                    <span style={{fontSize:"14px"}}>➤</span>
                  )}
                </button>
              </div>
            </div>

            <div className="hidden sm:flex items-center justify-center gap-2 mt-2.5">
              <span className="text-[10px] text-white/20 flex items-center gap-1">
                <span style={{fontSize:"14px"}}>↩</span>
                Enter para enviar · Shift+Enter para nova linha
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-base font-semibold text-white mt-4 mb-2">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-lg font-bold text-white mt-4 mb-2">
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-2 border-violet-500/50 pl-3 my-2 text-white/70"
        >
          <InlineMarkdown text={line.slice(2)} />
        </blockquote>
      );
    } else if (/^\d+\.\s\*\*/.test(line)) {
      const items: string[] = [line];
      let j = i + 1;
      while (j < lines.length && /^\s+-\s/.test(lines[j])) {
        items.push(lines[j]);
        j++;
      }
      elements.push(
        <div key={i} className="my-1.5">
          <InlineMarkdown text={line} />
          {items.length > 1 && (
            <ul className="ml-5 mt-1 space-y-0.5 list-disc text-white/70">
              {items.slice(1).map((item, idx) => (
                <li key={idx}>
                  <InlineMarkdown text={item.replace(/^\s+-\s/, '')} />
                </li>
              ))}
            </ul>
          )}
        </div>
      );
      i = j;
      continue;
    } else if (line.startsWith('- ')) {
      const items: string[] = [line];
      let j = i + 1;
      while (j < lines.length && lines[j].startsWith('- ')) {
        items.push(lines[j]);
        j++;
      }
      elements.push(
        <ul key={i} className="ml-4 my-1.5 space-y-0.5 list-disc text-white/80">
          {items.map((item, idx) => (
            <li key={idx}>
              <InlineMarkdown text={item.slice(2)} />
            </li>
          ))}
        </ul>
      );
      i = j;
      continue;
    } else if (line.trim() === '') {
      elements.push(<div key={i} className="h-2" />);
    } else {
      elements.push(
        <p key={i} className="text-white/80 my-1">
          <InlineMarkdown text={line} />
        </p>
      );
    }
    i++;
  }

  return <>{elements}</>;
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|💡)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={idx} className="font-semibold text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code key={idx} className="px-1.5 py-0.5 rounded-md bg-white/10 text-violet-300 text-xs font-mono">
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
}
