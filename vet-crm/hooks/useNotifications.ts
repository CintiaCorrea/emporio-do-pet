'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface WhatsAppMessageEvent {
  type: 'received' | 'sent';
  conversationId: string;
  contactPhone?: string;
  contactName?: string;
  content?: string;
  messageId?: string;
}

export interface WhatsAppStatusEvent {
  waMessageId: string;
  status: string;
  recipientId: string;
}

export interface CampaignCompletedEvent {
  campaignId: string;
  sent: number;
  failed: number;
  total: number;
}

interface UseNotificationsOptions {
  onNotification?: (notification: Notification) => void;
  onWhatsAppMessage?: (event: WhatsAppMessageEvent) => void;
  onWhatsAppStatus?: (event: WhatsAppStatusEvent) => void;
  onCampaignCompleted?: (event: CampaignCompletedEvent) => void;
  autoConnect?: boolean;
}

export function useNotifications(options: UseNotificationsOptions = {}) {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  // Store callbacks in refs to avoid re-creating useCallback/useEffect chains
  // This is the key fix: callbacks change every render, but refs don't trigger re-renders
  const callbacksRef = useRef(options);
  callbacksRef.current = options;

  const autoConnect = options.autoConnect ?? true;

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications?limit=20');
      if (!response.ok) return;
      const data = await response.json();
      setNotifications(data.data || []);
    } catch {
      // Silently ignore network failures (e.g. during hot-reload)
    }
  }, []);

  // Load unread count
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count');
      if (!response.ok) return;
      const data = await response.json();
      setUnreadCount(data.count || 0);
    } catch {
      // Silently ignore network failures (e.g. during hot-reload)
    }
  }, []);

  // Connect to WebSocket — only depends on accessToken (stable)
  const connect = useCallback(() => {
    const accessToken = session?.accessToken;
    if (!accessToken || socketRef.current?.connected) return;

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3333';

    const socket = io(`${backendUrl}/notifications`, {
      auth: {
        token: accessToken,
      },
      transports: ['polling', 'websocket'],
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      timeout: 10000,
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        socket.connect();
      }
    });

    socket.on('connected', () => {
      // Server acknowledged the connection
    });

    socket.on('notification', (notification: Notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);
      callbacksRef.current.onNotification?.(notification);
    });

    socket.on('whatsapp:message', (event: WhatsAppMessageEvent) => {
      callbacksRef.current.onWhatsAppMessage?.(event);
    });

    socket.on('whatsapp:status', (event: WhatsAppStatusEvent) => {
      callbacksRef.current.onWhatsAppStatus?.(event);
    });

    socket.on('campaign:completed', (event: CampaignCompletedEvent) => {
      callbacksRef.current.onCampaignCompleted?.(event);
    });

    socket.on('connect_error', () => {
      // Socket.io handles reconnection automatically
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
    // Only re-connect when the accessToken actually changes
  }, [session?.accessToken]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  // Subscribe to specific event types
  const subscribe = useCallback((types: string[]) => {
    socketRef.current?.emit('subscribe', { types });
  }, []);

  // Unsubscribe from event types
  const unsubscribe = useCallback((types: string[]) => {
    socketRef.current?.emit('unsubscribe', { types });
  }, []);

  // Auto-connect when session is available
  // Dependencies are now stable (no callback references that change every render)
  useEffect(() => {
    if (autoConnect && session?.accessToken) {
      loadNotifications();
      loadUnreadCount();
      const cleanup = connect();
      return cleanup;
    }
  }, [autoConnect, session?.accessToken, connect, loadNotifications, loadUnreadCount]);

  return {
    connected,
    notifications,
    unreadCount,
    connect,
    disconnect,
    markAsRead,
    markAllAsRead,
    subscribe,
    unsubscribe,
    refresh: () => {
      loadNotifications();
      loadUnreadCount();
    },
  };
}
