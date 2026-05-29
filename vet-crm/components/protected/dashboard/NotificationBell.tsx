'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { LuCheck LuCalendar } from 'react-icons/lu';
import { useNotifications, Notification } from '@/hooks/useNotifications';
import { toast } from 'sonner';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const {
    notifications,
    unreadCount,
    connected,
    markAsRead,
    markAllAsRead} = useNotifications({
    onNotification: (notification) => {
      toast(notification.title, {
        description: notification.message});
    }});

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'WHATSAPP_MESSAGE':
        return <span style={{fontSize:"14px"}}>💬</span>;
      case 'APPOINTMENT_REMINDER':
        return <LuCalendar className="w-4 h-4 text-blue-600" />;
      case 'AUTOMATION_COMPLETE':
        return <span style={{fontSize:"14px"}}>⚡</span>;
      case 'CAMPAIGN_COMPLETE':
        return <span style={{fontSize:"14px"}}>📣</span>;
      default:
        return <span style={{fontSize:"14px"}}>🔔</span>;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <span style={{fontSize:"14px"}}>🔔</span>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
        
        {/* Connection Indicator */}
        <span
          className={`absolute bottom-1 right-1 w-2 h-2 rounded-full ${
            connected ? 'bg-cyan-500' : 'bg-gray-300'
          }`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notificações</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-violet-600 hover:text-violet-700 font-medium flex items-center gap-1"
              >
                <span style={{fontSize:"14px"}}>✓✓</span>
                Marcar todas como lidas
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center">
                <span style={{fontSize:"14px"}}>🔔</span>
                <p className="text-sm text-gray-500">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.read ? 'bg-violet-50/50' : ''
                    }`}
                    onClick={() => {
                      if (!notification.read) {
                        markAsRead(notification.id);
                      }
                      if (notification.link) {
                        window.location.href = notification.link;
                      }
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatTime(notification.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {notification.message}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-violet-500 mt-1.5" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <Link
              href="/dashboard/notificacoes"
              onClick={() => setIsOpen(false)}
              className="text-sm text-violet-600 hover:text-violet-700 font-medium"
            >
              Ver todas as notificações
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
