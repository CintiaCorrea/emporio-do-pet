'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  MessageCircle, 
  Search, 
  Filter, 
  RefreshCw, 
  Send,
  Bot,
  User,
  Clock,
  CheckCheck,
  Check,
  X,
  Phone,
  ArrowLeft,
  MoreVertical,
  Paperclip,
  Smile,
  UserCircle,
  PawPrint,
  AlertCircle,
  Power,
  Wifi,
  WifiOff,
  ChevronDown,
  Loader2,
  ArrowRightLeft,
  AlertTriangle
} from 'lucide-react';
import { useNotifications, WhatsAppMessageEvent, WhatsAppStatusEvent } from '@/hooks/useNotifications';

interface Conversation {
  id: string;
  contactPhone: string;
  contactName: string | null;
  contactPushName: string | null;
  status: string;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
  assignedUserId: string | null;
  assignedUser: { id: string; name: string } | null;
  tutor: { id: string; name: string } | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  isAutoReplyEnabled: boolean;
  humanTakeoverAt: string | null;
}

interface Message {
  id: string;
  waMessageId? (() => null) : string | null;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  failedReason? (() => null) : string | null;
  senderType?: 'AI' | 'HUMAN' | 'CUSTOMER' | 'SYSTEM';
  agentName? (() => null) : string;
  metadata? (() => null) : Record<string, unknown>;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

interface Tutor {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
}

export default function AIAgentsConversationsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Carregando conversas...</span>
        </div>
      </div>
    }>
      <AIAgentsConversationsPage />
    </Suspense>
  );
}

function AIAgentsConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [initialConversationHandled, setInitialConversationHandled] = useState(false);
  const [whatsappConnected, setWhatsappConnected] = useState<boolean | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState<string | null>(null);
  const [totalConversations, setTotalConversations] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [dismissedFailedBannerSignature, setDismissedFailedBannerSignature] = useState<string | null>(null);

  // Refs to avoid stale closures in WebSocket callbacks
  const selectedConversationRef = useRef<Conversation | null>(null);
  const messagesRef = useRef<Message[]>([]);
  selectedConversationRef.current = selectedConversation;
  messagesRef.current = messages;

  const { connected: wsConnected } = useNotifications({
    onWhatsAppMessage: (event: WhatsAppMessageEvent) => {
      fetchConversations(true);
      const current = selectedConversationRef.current;
      if (current && event.conversationId === current.id) {
        fetchMessages(current.id);
      }
    },
    onWhatsAppStatus: (event: WhatsAppStatusEvent) => {
      const statusMap: Record<string, string> = {
        sent: 'SENT', delivered: 'DELIVERED', read: 'READ', failed: 'FAILED'};
      const mappedStatus = statusMap[event.status];
      if (mappedStatus) {
        setMessages(prev => prev.map(m =>
          m.waMessageId === event.waMessageId
            ? { ...m, status: mappedStatus }
            : m
        ));
      }
      if (event.status === 'failed') {
        fetchConversations(true);
      }
    }});

  useEffect(() => {
    setCurrentPage(1);
    fetchConversations(true);
    fetchAgents();
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    checkWhatsAppConnection();
  }, []);

  // Polling fallback: refresh messages every 8s when a conversation is open
  useEffect(() => {
    if (!selectedConversation) return;
    const interval = setInterval(() => {
      const current = selectedConversationRef.current;
      if (current) {
        fetchMessages(current.id);
        fetchConversations(true);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [selectedConversation?.id]);

  const autoSelectConversation = useCallback((convList: Conversation[]) => {
    if (initialConversationHandled) return;
    const targetId = searchParams.get('conversation');
    if (!targetId) return;
    const found = convList.find(c => c.id === targetId);
    if (found) {
      setSelectedConversation(found);
      setInitialConversationHandled(true);
    }
  }, [searchParams, initialConversationHandled]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
      setShowMobileChat(true);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkWhatsAppConnection = async () => {
    try {
      const response = await fetch('/api/whatsapp/test-connection');
      if (response.ok) {
        const data = await response.json();
        setWhatsappConnected(data.connected === true);
        setWhatsappPhone(data.phoneNumber || null);
      } else {
        setWhatsappConnected(false);
      }
    } catch {
      setWhatsappConnected(false);
    }
  };

  const fetchConversations = async (reset = false) => {
    try {
      const page = reset ? 1 : currentPage;
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      params.set('page', String(page));
      params.set('limit', '50');

      const response = await fetch(`/api/whatsapp/conversations?${params.toString()}`);
      const data = await response.json();
      const convList = data.data || [];
      const pagination = data.pagination || {};

      if (reset) {
        setConversations(convList);
      } else {
        setConversations(prev => {
          const ids = new Set(prev.map(c => c.id));
          return [...prev, ...convList.filter((c: Conversation) => !ids.has(c.id))];
        });
      }

      setTotalConversations(pagination.total || 0);
      setHasMore(page < (pagination.totalPages || 1));
      autoSelectConversation(convList);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMoreConversations = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);

    const params = new URLSearchParams();
    if (searchTerm) params.set('search', searchTerm);
    if (statusFilter) params.set('status', statusFilter);
    params.set('page', String(nextPage));
    params.set('limit', '50');

    try {
      const response = await fetch(`/api/whatsapp/conversations?${params.toString()}`);
      const data = await response.json();
      const convList = data.data || [];
      const pagination = data.pagination || {};

      setConversations(prev => {
        const ids = new Set(prev.map(c => c.id));
        return [...prev, ...convList.filter((c: Conversation) => !ids.has(c.id))];
      });
      setHasMore(nextPage < (pagination.totalPages || 1));
    } catch (error) {
      console.error('Error loading more conversations:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`);
      const data = await response.json();
      const enrichedMessages = (data.data || []).map((msg: Message) => ({
        ...msg,
        senderType: msg.senderType || (msg.metadata?.senderType as Message['senderType']) || undefined,
        agentName: msg.agentName || (msg.metadata?.senderName as string) || undefined}));

      // Only update state if messages actually changed (avoids scroll jumps from polling)
      const prev = messagesRef.current;
      const changed =
        prev.length !== enrichedMessages.length ||
        prev[prev.length - 1]?.id !== enrichedMessages[enrichedMessages.length - 1]?.id ||
        prev.some((m, i) => m.status !== enrichedMessages[i]?.status);
      if (changed) {
        setMessages(enrichedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents?status=ACTIVE');
      const data = await response.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const sendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage })});

      if (response.ok) {
        setNewMessage('');
        fetchMessages(selectedConversation.id);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const assignAgent = async (agentId: string | null) => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/assign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })});

      if (response.ok) {
        fetchConversations();
        const updated = await response.json();
        setSelectedConversation(updated);
      }
    } catch (error) {
      console.error('Error assigning agent:', error);
    }
  };

  const toggleAutoReply = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAutoReplyEnabled: !selectedConversation.isAutoReplyEnabled })});

      if (response.ok) {
        const updated = await response.json();
        setSelectedConversation(updated);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error toggling auto-reply:', error);
    }
  };

  const takeoverConversation = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/takeover`, {
        method: 'POST'});

      if (response.ok) {
        const updated = await response.json();
        setSelectedConversation(updated);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error taking over conversation:', error);
    }
  };

  const releaseConversation = async () => {
    if (!selectedConversation) return;

    try {
      const response = await fetch(`/api/whatsapp/conversations/${selectedConversation.id}/release`, {
        method: 'POST'});

      if (response.ok) {
        const updated = await response.json();
        setSelectedConversation(updated);
        fetchConversations();
      }
    } catch (error) {
      console.error('Error releasing conversation:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'FAILED':
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-gray-400" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR');
    }
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((message) => {
      const date = new Date(message.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });
    return groups;
  };

  const getSenderLabel = (message: Message) => {
    if (message.direction === 'INBOUND') {
      return null;
    }
    
    if (message.senderType === 'AI') {
      return (
        <span className="flex items-center gap-1 text-xs text-purple-300 mb-1">
          <Bot className="h-3 w-3" />
          {message.agentName || 'AI Agent'}
        </span>
      );
    } else if (message.senderType === 'HUMAN') {
      return (
        <span className="flex items-center gap-1 text-xs text-blue-300 mb-1">
          <User className="h-3 w-3" />
          Atendente
        </span>
      );
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { label: string; color: string } } = {
      OPEN: { label: 'Aberta', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      CLOSED: { label: 'Fechada', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
      ASSIGNED: { label: 'Atribuída', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' }};
    const config = statusConfig[status] || statusConfig.OPEN;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const messageGroups = groupMessagesByDate(messages);

  const is24hWindowOpen = (() => {
    const lastInbound = [...messages].reverse().find(m => m.direction === 'INBOUND');
    if (!lastInbound) return false;
    return (Date.now() - new Date(lastInbound.createdAt).getTime()) < 24 * 60 * 60 * 1000;
  })();

  const failedMessages = messages.filter(m => m.status === 'FAILED');
  const hasFailedMessages = failedMessages.length > 0;
  const failedBannerSignature = failedMessages.map(m => m.id).join('|');
  const showFailedMessagesBanner =
    hasFailedMessages && dismissedFailedBannerSignature !== failedBannerSignature;

  useEffect(() => {
    setDismissedFailedBannerSignature(null);
  }, [selectedConversation?.id]);

  return (
    <div className="h-[calc(100vh-80px)] flex bg-gray-100 dark:bg-gray-900">
      {/* Sidebar - Conversation List */}
      <div className={`${showMobileChat ? 'hidden md:flex' : 'flex'} w-full md:w-96 lg:w-[420px] flex-col bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-green-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              Conversas
              {totalConversations > 0 && (
                <span className="text-sm font-normal bg-white/20 px-2 py-0.5 rounded-full">
                  {totalConversations}
                </span>
              )}
            </h1>
            <button
              onClick={() => { setCurrentPage(1); fetchConversations(true); checkWhatsAppConnection(); }}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className="h-4 w-4 text-white" />
            </button>
          </div>

          {/* WhatsApp Connection Status */}
          <div className="flex items-center gap-2 mb-3 text-sm">
            {whatsappConnected === null ? (
              <span className="flex items-center gap-1.5 text-white/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Verificando conexão...
              </span>
            ) : whatsappConnected ? (
              <span className="flex items-center gap-1.5 text-green-200">
                <Wifi className="h-3.5 w-3.5" />
                Conectado{whatsappPhone ? ` • ${whatsappPhone}` : ''}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-red-200">
                <WifiOff className="h-3.5 w-3.5" />
                WhatsApp desconectado
              </span>
            )}
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/90 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 mt-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl bg-white/90 dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none"
            >
              <option value="">Todos os status</option>
              <option value="OPEN">Abertas</option>
              <option value="CLOSED">Fechadas</option>
              <option value="ASSIGNED">Atribuídas</option>
              <option value="PENDING">Pendentes</option>
            </select>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
              <p className="text-gray-500 dark:text-gray-400">Carregando conversas...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nenhuma conversa encontrada
              </p>
              {whatsappConnected === false ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                  <p className="flex items-center justify-center gap-1.5 text-orange-600 dark:text-orange-400">
                    <AlertCircle className="h-4 w-4" />
                    WhatsApp não conectado
                  </p>
                  <p>Configure o WhatsApp Business API nas integrações para receber conversas automaticamente.</p>
                </div>
              ) : whatsappConnected === true ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                  <p>O WhatsApp está conectado e aguardando novas mensagens.</p>
                  <p>Quando alguém enviar uma mensagem para o seu número, a conversa aparecerá aqui automaticamente.</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Aguardando mensagens do WhatsApp Business API...
                </p>
              )}
            </div>
          ) : (
            <>
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-green-50 dark:bg-green-900/20 border-l-4 border-l-green-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold text-lg">
                        {(conversation.contactName || conversation.contactPushName || conversation.contactPhone)?.[0]?.toUpperCase() || '?'}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {conversation.contactName || conversation.contactPushName || conversation.contactPhone}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
                          {formatDate(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {conversation.lastMessagePreview || 'Sem mensagens'}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getStatusBadge(conversation.status)}
                        {conversation.assignedAgent && (
                          <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
                            <Bot className="h-3 w-3" />
                            {conversation.assignedAgent.name}
                          </span>
                        )}
                        {conversation.assignedUserId ? (
                          <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                            <User className="h-3 w-3" />
                            {conversation.assignedUser?.name || 'Humano'}
                          </span>
                        ) : conversation.isAutoReplyEnabled ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            <Power className="h-3 w-3" />
                            Auto
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center">
                  <button
                    onClick={loadMoreConversations}
                    disabled={loadingMore}
                    className="flex items-center gap-2 mx-auto px-4 py-2 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    {loadingMore ? 'Carregando...' : 'Carregar mais conversas'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Main - Chat Area */}
      <div className={`${showMobileChat ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50 dark:bg-gray-900`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowMobileChat(false)}
                  className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-semibold">
                  {(selectedConversation.contactName || selectedConversation.contactPushName || selectedConversation.contactPhone)?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {selectedConversation.contactName || selectedConversation.contactPushName || 'Contato'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedConversation.contactPhone}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Badge */}
                {selectedConversation.assignedUserId ? (
                  <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <User className="h-3 w-3" />
                    {selectedConversation.assignedUser?.name || 'Humano'}
                  </span>
                ) : selectedConversation.isAutoReplyEnabled ? (
                  <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <Bot className="h-3 w-3" />
                    IA Ativa
                  </span>
                ) : selectedConversation.assignedAgentId ? (
                  <span className="hidden md:flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Bot className="h-3 w-3" />
                    IA Pausada
                  </span>
                ) : null}

                {/* Takeover / Release Button */}
                {selectedConversation.assignedUserId ? (
                  <button
                    type="button"
                    onClick={releaseConversation}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
                    title="Devolver conversa ao agente IA"
                  >
                    <Bot className="h-4 w-4" />
                    <span className="hidden sm:inline">Devolver</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={takeoverConversation}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    title="Assumir conversa manualmente"
                  >
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">Assumir</span>
                  </button>
                )}

                {/* Auto Reply Toggle */}
                <button
                  onClick={toggleAutoReply}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedConversation.isAutoReplyEnabled
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                  title={selectedConversation.isAutoReplyEnabled ? 'Desativar resposta automática' : 'Ativar resposta automática'}
                >
                  <Power className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto</span>
                </button>

                {/* Agent Assignment */}
                <select
                  value={selectedConversation.assignedAgentId || ''}
                  onChange={(e) => assignAgent(e.target.value || null)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Sem agente</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div 
              className="flex-1 overflow-y-auto p-4 space-y-4"
              style={{ 
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` 
              }}
            >
              {Object.entries(messageGroups).map(([date, dateMessages]) => (
                <div key={date}>
                  {/* Date Separator */}
                  <div className="flex items-center justify-center my-4">
                    <span className="px-4 py-1 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded-full shadow-sm">
                      {formatDate(dateMessages[0].createdAt)}
                    </span>
                  </div>

                  {/* Messages for this date */}
                  {dateMessages.map((message) => (
                    message.senderType === 'SYSTEM' ? (
                      <div key={message.id} className="flex justify-center mb-3">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl max-w-[90%] md:max-w-[70%] ${
                          message.status === 'FAILED'
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40'
                            : 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40'
                        }`}>
                          {message.status === 'FAILED' ? (
                            <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                          ) : (
                            <ArrowRightLeft className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                          )}
                          <p className={`text-xs text-center ${
                            message.status === 'FAILED'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-orange-700 dark:text-orange-300'
                          }`}>{message.content}{message.status === 'FAILED' ? ' (nao entregue)' : ''}</p>
                          <span className={`text-[10px] whitespace-nowrap ${
                            message.status === 'FAILED' ? 'text-red-500' : 'text-orange-500'
                          }`}>{formatTime(message.createdAt)}</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={message.id}
                        className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'} mb-2`}
                      >
                        <div
                          className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                            message.direction === 'OUTBOUND'
                              ? message.status === 'FAILED'
                                ? 'bg-red-500/80 text-white rounded-br-md ring-2 ring-red-300 dark:ring-red-700'
                                : message.senderType === 'AI' 
                                  ? 'bg-purple-500 text-white rounded-br-md'
                                  : 'bg-green-500 text-white rounded-br-md'
                              : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-md'
                          }`}
                        >
                          {getSenderLabel(message)}
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                            message.direction === 'OUTBOUND' 
                              ? 'text-white/70' 
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            <span>{formatTime(message.createdAt)}</span>
                            {message.direction === 'OUTBOUND' && getStatusIcon(message.status)}
                          </div>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              {!is24hWindowOpen && messages.length > 0 && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/40 rounded-xl">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">
                    A janela de 24h do WhatsApp expirou. Mensagens podem nao ser entregues ao cliente. O cliente precisa enviar uma mensagem primeiro para reabrir a janela.
                  </p>
                </div>
              )}
              {showFailedMessagesBanner && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDismissedFailedBannerSignature(failedBannerSignature)}
                    className="flex-shrink-0 rounded-full p-1 text-red-600 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/40 dark:hover:text-red-300"
                    title="Fechar aviso"
                    aria-label="Fechar aviso de mensagens nao entregues"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    Algumas mensagens nao foram entregues. Verifique as mensagens com o icone <span className="font-semibold text-red-500">X</span> vermelho.
                  </p>
                </div>
              )}
              <div className="flex items-end gap-3">
                <div className="flex-1 relative">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Digite uma mensagem..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={1}
                    disabled={sendingMessage}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="p-3 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                >
                  {sendingMessage ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6">
                <MessageCircle className="h-12 w-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Conversas WhatsApp
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                Selecione uma conversa para visualizar o histórico de mensagens entre AI Agents, atendentes humanos e clientes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Contact Info */}
      {showSidebar && selectedConversation && (
        <div className="hidden lg:flex w-80 flex-col bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white">Informações</h3>
              <button
                onClick={() => setShowSidebar(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Contact Info */}
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">
                {(selectedConversation.contactName || selectedConversation.contactPushName || selectedConversation.contactPhone)?.[0]?.toUpperCase() || '?'}
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {selectedConversation.contactName || selectedConversation.contactPushName || 'Contato'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {selectedConversation.contactPhone}
              </p>
            </div>

            {/* Status */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</h5>
              {getStatusBadge(selectedConversation.status)}
            </div>

            {/* Linked Tutor */}
            {selectedConversation.tutor && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tutor Vinculado</h5>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <UserCircle className="h-8 w-8 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {selectedConversation.tutor.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Assigned Agent */}
            {selectedConversation.assignedAgent && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agente Atribuído</h5>
                <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Bot className="h-8 w-8 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {selectedConversation.assignedAgent.name}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Auto Reply Status */}
            <div>
              <h5 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Resposta Automática</h5>
              <div className={`flex items-center gap-2 p-2 rounded-lg ${
                selectedConversation.isAutoReplyEnabled 
                  ? 'bg-green-50 dark:bg-green-900/20' 
                  : 'bg-gray-50 dark:bg-gray-700'
              }`}>
                <Power className={`h-5 w-5 ${
                  selectedConversation.isAutoReplyEnabled ? 'text-green-500' : 'text-gray-400'
                }`} />
                <span className={`text-sm ${
                  selectedConversation.isAutoReplyEnabled 
                    ? 'text-green-700 dark:text-green-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  {selectedConversation.isAutoReplyEnabled ? 'Ativada' : 'Desativada'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
