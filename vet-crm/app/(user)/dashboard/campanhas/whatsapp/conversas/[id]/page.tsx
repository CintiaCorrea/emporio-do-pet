'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuLoader,
  LuUser,
  LuPhone,
  LuCheck,
  LuPawPrint} from 'react-icons/lu';
import { toast } from 'sonner';
import { useNotifications, WhatsAppMessageEvent, WhatsAppStatusEvent } from '@/hooks/useNotifications';

type MessageDirection = 'INBOUND' | 'OUTBOUND';
type MessageStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
type ConversationStatus = 'OPEN' | 'ASSIGNED' | 'CLOSED' | 'RESOLVED';

interface Message {
  id: string;
  direction: MessageDirection;
  type: string;
  content: string;
  status: MessageStatus;
  mediaUrl?: string;
  mediaCaption?: string;
  createdAt: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
}

interface Agent {
  id: string;
  name: string;
}

interface Tutor {
  id: string;
  name: string;
  pets?: { id: string; name: string; species: string }[];
  contacts?: { number: string; type: string }[];
}

interface Conversation {
  id: string;
  contactPhone: string;
  contactName?: string;
  contactPushName?: string;
  status: ConversationStatus;
  unreadCount: number;
  lastMessageAt?: string;
  isAutoReplyEnabled: boolean;
  assignedAgent?: Agent;
  tutor?: Tutor;
}

export default function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversation = async () => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar conversa');
      }

      setConversation(data);
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
      toast.error('Erro ao carregar conversa');
      router.push('/dashboard/campanhas/whatsapp/conversas');
    }
  };

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}/messages?limit=100`);
      const data = await response.json();

      if (response.ok) {
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const loadAgents = async () => {
    try {
      const response = await fetch('/api/agents?status=ACTIVE&limit=50');
      const data = await response.json();
      if (response.ok) {
        setAgents(data.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar agentes:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadConversation(), loadMessages(), loadAgents()]);
      setLoading(false);
    };
    loadData();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // WebSocket for real-time message updates
  const { connected: wsConnected } = useNotifications({
    onWhatsAppMessage: (event: WhatsAppMessageEvent) => {
      // Only handle events for this conversation
      if (event.conversationId === id) {
        // Reload messages when a new message arrives
        loadMessages();
        // Reload conversation to update unread count etc.
        loadConversation();
      }
    },
    onWhatsAppStatus: (event: WhatsAppStatusEvent) => {
      // Update message status in-place without refetching
      setMessages(prev =>
        prev.map(msg =>
          msg.id === event.waMessageId || (msg as any).waMessageId === event.waMessageId
            ? { ...msg, status: event.status.toUpperCase() as MessageStatus }
            : msg
        )
      );
    }});

  // Fallback polling (longer interval) when WebSocket is not connected
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, wsConnected ? 15000 : 3000); // 15s with WS, 3s without
    return () => clearInterval(interval);
  }, [id, wsConnected]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageContent = newMessage;
    setNewMessage('');

    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: messageContent })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      // Add message optimistically
      setMessages(prev => [...prev, data.message]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar mensagem');
      setNewMessage(messageContent); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleAssignAgent = async (agentId: string | null) => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}/assign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atribuir agente');
      }

      setConversation(data);
      toast.success(agentId ? 'Agente atribuído!' : 'Agente removido!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao atribuir agente');
    }
  };

  const handleToggleAutoReply = async () => {
    if (!conversation) return;
    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAutoReplyEnabled: !conversation.isAutoReplyEnabled })});

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao alterar resposta automática');
      }

      setConversation(data);
      toast.success(data.isAutoReplyEnabled ? 'Resposta automática ativada!' : 'Resposta automática desativada!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao alterar resposta automática');
    }
  };

  const handleCloseConversation = async () => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLOSED' })});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fechar conversa');
      }

      setConversation(data);
      toast.success('Conversa fechada!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fechar conversa');
    }
  };

  const getStatusIcon = (status: MessageStatus) => {
    switch (status) {
      case 'PENDING': return <span style={{fontSize:"14px"}}>⏱</span>;
      case 'SENT': return <LuCheck className="w-3.5 h-3.5 text-gray-400" />;
      case 'DELIVERED': return <span style={{fontSize:"14px"}}>✓✓</span>;
      case 'READ': return <span style={{fontSize:"14px"}}>✓✓</span>;
      case 'FAILED': return <span style={{fontSize:"14px"}}>✗</span>;
    }
  };

  const getConversationStatusColor = (status: ConversationStatus) => {
    switch (status) {
      case 'OPEN': return 'bg-cyan-100 text-cyan-700';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-700';
      case 'CLOSED': return 'bg-gray-100 text-gray-700';
      case 'RESOLVED': return 'bg-violet-100 text-violet-700';
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    }
    return d.toLocaleDateString('pt-BR');
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-cyan-100 border-t-emerald-600 rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">Carregando conversa...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <div className="text-center">
          <span style={{fontSize:"14px"}}>💬</span>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Conversa não encontrada</h2>
          <Link
            href="/dashboard/campanhas/whatsapp/conversas"
            className="text-cyan-600 hover:text-cyan-700"
          >
            Voltar para conversas
          </Link>
        </div>
      </div>
    );
  }

  const contactName = conversation.contactName || conversation.contactPushName || conversation.contactPhone;

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {/* Chat Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard/campanhas/whatsapp/conversas"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LuArrowLeft className="w-5 h-5 text-gray-500" />
              </Link>
              
              <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                <span style={{fontSize:"14px"}}>👤</span>
              </div>
              
              <div>
                <h2 className="font-semibold text-gray-900">{contactName}</h2>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <LuPhone className="w-3.5 h-3.5" />
                  <span>{conversation.contactPhone}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${getConversationStatusColor(conversation.status)}`}>
                {conversation.status}
              </span>
              
              {conversation.assignedAgent && (
                <div className="flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 rounded-full text-sm">
                  <span style={{fontSize:"14px"}}>🤖</span>
                  {conversation.assignedAgent.name}
                </div>
              )}
              
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span style={{fontSize:"14px"}}>⚙</span>
              </button>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-6"
          style={{ backgroundImage: 'url("/chat-bg-pattern.png")', backgroundSize: '400px' }}
        >
          <div className="max-w-3xl mx-auto space-y-6">
            {Object.entries(groupedMessages).map(([date, dayMessages]) => (
              <div key={date}>
                {/* Date Separator */}
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 bg-white/90 text-gray-500 text-xs rounded-full shadow-sm">
                    {formatDate(dayMessages[0].createdAt)}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-2">
                  {dayMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                          message.direction === 'OUTBOUND'
                            ? 'bg-cyan-500 text-white rounded-br-none'
                            : 'bg-white text-gray-900 rounded-bl-none'
                        }`}
                      >
                        {/* Media Preview */}
                        {message.mediaUrl && message.type !== 'TEXT' && (
                          <div className="mb-2">
                            {message.type === 'IMAGE' ? (
                              <img 
                                src={message.mediaUrl} 
                                alt="Imagem" 
                                className="rounded-lg max-w-full"
                              />
                            ) : (
                              <div className="flex items-center gap-2 p-2 bg-white/10 rounded-lg">
                                <span style={{fontSize:"14px"}}>📎</span>
                                <span className="text-sm">Arquivo anexado</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="whitespace-pre-wrap break-words">{message.content}</p>
                        
                        <div className={`flex items-center justify-end gap-1 mt-1 ${
                          message.direction === 'OUTBOUND' ? 'text-cyan-100' : 'text-gray-400'
                        }`}>
                          <span className="text-xs">{formatTime(message.createdAt)}</span>
                          {message.direction === 'OUTBOUND' && getStatusIcon(message.status)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-12">
                <span style={{fontSize:"14px"}}>💬</span>
                <p className="text-gray-500">Nenhuma mensagem ainda</p>
                <p className="text-sm text-gray-400">Envie a primeira mensagem para iniciar a conversa</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message Input */}
        <div className="bg-white border-t border-gray-100 p-4">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-3">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                <span style={{fontSize:"14px"}}>🙂</span>
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500">
                <span style={{fontSize:"14px"}}>📎</span>
              </button>
              
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 max-h-32"
                  style={{ minHeight: '44px' }}
                />
              </div>
              
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sending}
                className="p-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? (
                  <LuLoader className="w-5 h-5 animate-spin" />
                ) : (
                  <span style={{fontSize:"14px"}}>➤</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="w-80 bg-white border-l border-gray-100 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center mx-auto mb-4">
                <span style={{fontSize:"14px"}}>👤</span>
              </div>
              <h3 className="font-semibold text-gray-900">{contactName}</h3>
              <p className="text-sm text-gray-500">{conversation.contactPhone}</p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-500 uppercase">Ações</h4>
              
              {conversation.status !== 'CLOSED' && (
                <button
                  onClick={handleCloseConversation}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <span style={{fontSize:"14px"}}>⏻</span>
                  <span className="text-gray-700">Fechar Conversa</span>
                </button>
              )}
            </div>

            {/* AI Agent Assignment */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase">Agente IA</h4>
              
              <select
                value={conversation.assignedAgent?.id || ''}
                onChange={(e) => handleAssignAgent(e.target.value || null)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="">Sem agente</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              
              {conversation.assignedAgent && (
                <>
                  <div className="flex items-center gap-2 p-3 bg-violet-50 rounded-xl">
                    <span style={{fontSize:"14px"}}>🤖</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-violet-700">
                        {conversation.assignedAgent.name}
                      </p>
                    </div>
                  </div>
                  
                  {/* Auto-reply toggle */}
                  <button
                    onClick={handleToggleAutoReply}
                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${
                      conversation.isAutoReplyEnabled
                        ? 'bg-cyan-50 border border-cyan-200'
                        : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span style={{fontSize:"14px"}}>⏻</span>
                      <span className={`text-sm font-medium ${
                        conversation.isAutoReplyEnabled ? 'text-cyan-700' : 'text-gray-500'
                      }`}>
                        Resposta automática
                      </span>
                    </div>
                    <div className={`w-10 h-6 rounded-full p-0.5 transition-colors ${
                      conversation.isAutoReplyEnabled ? 'bg-cyan-500' : 'bg-gray-300'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        conversation.isAutoReplyEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`} />
                    </div>
                  </button>
                </>
              )}
            </div>

            {/* Linked Tutor */}
            {conversation.tutor && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 uppercase">Tutor Vinculado</h4>
                
                <Link
                  href={`/dashboard/erp/tutores/${conversation.tutor.id}`}
                  className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <LuUser className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{conversation.tutor.name}</p>
                      <p className="text-xs text-gray-500">Ver perfil completo</p>
                    </div>
                  </div>
                </Link>

                {/* Pets */}
                {conversation.tutor.pets && conversation.tutor.pets.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-500">Pets:</p>
                    {conversation.tutor.pets.map((pet) => (
                      <Link
                        key={pet.id}
                        href={`/dashboard/erp/pets/${pet.id}`}
                        className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <LuPawPrint className="w-4 h-4 text-orange-600" />
                        <span className="text-sm text-orange-700">{pet.name}</span>
                        <span className="text-xs text-orange-500">({pet.species})</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Conversation Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-500 uppercase">Informações</h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getConversationStatusColor(conversation.status)}`}>
                    {conversation.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Mensagens</span>
                  <span className="text-gray-900">{messages.length}</span>
                </div>
                {conversation.lastMessageAt && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Última mensagem</span>
                    <span className="text-gray-900">
                      {new Date(conversation.lastMessageAt).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'})}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
