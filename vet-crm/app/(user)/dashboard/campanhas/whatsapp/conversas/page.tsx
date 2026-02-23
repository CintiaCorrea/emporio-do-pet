'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  X
} from 'lucide-react';
import { useNotifications, WhatsAppMessageEvent } from '@/hooks/useNotifications';

interface Conversation {
  id: string;
  contactPhone: string;
  contactName: string | null;
  contactPushName: string | null;
  status: string;
  assignedAgentId: string | null;
  assignedAgent: { id: string; name: string } | null;
  tutor: { id: string; name: string } | null;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  unreadCount: number;
  isAutoReplyEnabled: boolean;
}

interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: string;
  status: string;
  createdAt: string;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
}

interface Agent {
  id: string;
  name: string;
  status: string;
}

export default function WhatsAppConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);

  // WebSocket for real-time updates
  useNotifications({
    onWhatsAppMessage: (event: WhatsAppMessageEvent) => {
      // Refresh conversation list when any message arrives
      fetchConversations();
      // If the message belongs to the currently selected conversation, refresh messages
      if (selectedConversation && event.conversationId === selectedConversation.id) {
        fetchMessages(selectedConversation.id);
      }
    },
  });

  // Fetch conversations
  useEffect(() => {
    fetchConversations();
    fetchAgents();
  }, [searchTerm, statusFilter]);

  // Fetch messages when conversation selected
  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/whatsapp/conversations?${params.toString()}`);
      const data = await response.json();
      setConversations(data.data || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/whatsapp/conversations/${conversationId}/messages`);
      const data = await response.json();
      setMessages(data.data || []);
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
        body: JSON.stringify({ content: newMessage }),
      });

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
        body: JSON.stringify({ agentId }),
      });

      if (response.ok) {
        fetchConversations();
        const updated = await response.json();
        setSelectedConversation(updated);
      }
    } catch (error) {
      console.error('Error assigning agent:', error);
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

  return (
    <div className="h-[calc(100vh-120px)] flex">
      {/* Sidebar - Conversation List */}
      <div className="w-96 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Conversas WhatsApp
          </h1>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>

          {/* Filter */}
          <div className="flex gap-2 mt-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              <option value="">Todos os status</option>
              <option value="OPEN">Abertas</option>
              <option value="CLOSED">Fechadas</option>
              <option value="ASSIGNED">Atribuídas</option>
              <option value="PENDING">Pendentes</option>
            </select>
            <button
              onClick={fetchConversations}
              className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              Nenhuma conversa encontrada
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => setSelectedConversation(conversation)}
                className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-green-50 dark:bg-green-900/20'
                    : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {conversation.contactName || conversation.contactPushName || conversation.contactPhone}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatDate(conversation.lastMessageAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conversation.lastMessagePreview || 'Sem mensagens'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {conversation.unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          {conversation.unreadCount}
                        </span>
                      )}
                      {conversation.assignedAgent && (
                        <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                          <Bot className="h-3 w-3" />
                          {conversation.assignedAgent.name}
                        </span>
                      )}
                      {conversation.tutor && (
                        <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                          <User className="h-3 w-3" />
                          {conversation.tutor.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main - Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">
                    {selectedConversation.contactName || selectedConversation.contactPushName || selectedConversation.contactPhone}
                  </h2>
                  <p className="text-sm text-gray-500">{selectedConversation.contactPhone}</p>
                </div>
              </div>

              {/* Agent Assignment */}
              <div className="flex items-center gap-3">
                <select
                  value={selectedConversation.assignedAgentId || ''}
                  onChange={(e) => assignAgent(e.target.value || null)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                >
                  <option value="">Sem agente</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg px-4 py-2 ${
                      message.direction === 'OUTBOUND'
                        ? 'bg-green-500 text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    <div className={`flex items-center gap-1 mt-1 text-xs ${
                      message.direction === 'OUTBOUND' ? 'text-green-100' : 'text-gray-500'
                    }`}>
                      <span>{formatTime(message.createdAt)}</span>
                      {message.direction === 'OUTBOUND' && getStatusIcon(message.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Digite uma mensagem..."
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>Selecione uma conversa para começar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
