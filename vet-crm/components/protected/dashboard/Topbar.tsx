'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LuUser, 
  LuSettings, 
  LuLogOut, 
  LuChevronDown,
} from 'react-icons/lu';
import NotificationBell from './NotificationBell';

interface TopbarProps {
  sidebarOpen?: boolean;
}

export default function Topbar({ sidebarOpen = false }: TopbarProps) {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userName = session?.user?.name || 'Usuário';
  const userEmail = session?.user?.email || '';
  const userImage = session?.user?.image;

  // Gerar iniciais do nome
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className={`
      fixed top-0 right-0 z-40 h-16 bg-[color:var(--topbar-bg)] backdrop-blur-xl border-b border-[color:var(--topbar-border)]
      transition-all duration-300
      ${sidebarOpen ? 'left-56 sm:left-64' : 'left-12 sm:left-16'}
    `}>
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Espaço para breadcrumb ou título (opcional) */}
        <div className="flex-1">
          {/* Pode adicionar breadcrumb aqui futuramente */}
        </div>

        {/* Área direita */}
        <div className="flex items-center gap-3">
          {/* Notificações em tempo real (WebSocket) */}
          <NotificationBell />

          {/* Separador */}
          <div className="w-px h-8 bg-[color:var(--topbar-separator)]"></div>

          {/* Dropdown do usuário */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-[color:var(--topbar-hover)] transition-all group"
            >
              {/* Avatar */}
              <div className="relative">
                {userImage ? (
                  <Image
                    src={userImage}
                    alt={userName}
                    width={36}
                    height={36}
                    className="rounded-full object-cover ring-2 ring-[color:var(--topbar-ring)] group-hover:ring-[color:var(--topbar-ring-hover)] transition-all"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-amber-600 flex items-center justify-center text-white text-sm font-semibold ring-2 ring-[color:var(--topbar-ring)] group-hover:ring-[color:var(--topbar-ring-hover)] transition-all">
                    {getInitials(userName)}
                  </div>
                )}
                {/* Indicador online */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[color:var(--topbar-avatar-border)] rounded-full"></span>
              </div>

              {/* Nome (oculto em telas pequenas) */}
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-[color:var(--topbar-text)] truncate max-w-[120px]">
                  {userName}
                </p>
                <p className="text-xs text-[color:var(--topbar-muted)] truncate max-w-[120px]">
                  {userEmail}
                </p>
              </div>

              {/* Seta */}
              <LuChevronDown className={`w-4 h-4 text-[color:var(--topbar-muted)] transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-[color:var(--dropdown-bg)] rounded-2xl shadow-xl border border-[color:var(--dropdown-border)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                style={{ boxShadow: `0 20px 25px -5px var(--dropdown-shadow), 0 8px 10px -6px var(--dropdown-shadow)` }}
              >
                {/* Header do dropdown */}
                <div className="px-4 py-3 border-b border-[color:var(--dropdown-border)]">
                  <p className="text-sm font-semibold text-[color:var(--topbar-text)] truncate">{userName}</p>
                  <p className="text-xs text-[color:var(--topbar-muted)] truncate">{userEmail}</p>
                </div>

                {/* Links */}
                <div className="py-2">
                  <Link
                    href="/dashboard/perfil"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--dropdown-item-text)] hover:bg-[color:var(--dropdown-hover)] hover:text-[color:var(--dropdown-item-text-hover)] transition-colors"
                  >
                    <LuUser className="w-4 h-4" />
                    <span>Perfil</span>
                  </Link>
                  <Link
                    href="/dashboard/configuracoes"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-[color:var(--dropdown-item-text)] hover:bg-[color:var(--dropdown-hover)] hover:text-[color:var(--dropdown-item-text-hover)] transition-colors"
                  >
                    <LuSettings className="w-4 h-4" />
                    <span>Configurações</span>
                  </Link>
                </div>

                {/* Separador */}
                <div className="border-t border-[color:var(--dropdown-border)] my-1"></div>

                {/* Logout */}
                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <LuLogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

