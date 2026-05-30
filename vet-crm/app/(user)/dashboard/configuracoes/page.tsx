'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@/components/common/ThemeProvider';
import type { ThemeOption } from '@/lib/theme';
import { 
  
  
  LuCheck,
  LuSave,
  LuLoaderCircle,
  LuUserPlus
} from 'react-icons/lu';

// Tipos
type TabType = 'geral' | 'equipe' | 'permissao';
type UserRole = 'ADMIN' | 'VETERINARIAN' | 'RECEPTIONIST';
type UserStatus = 'approved' | 'pending' | 'blocked';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  image?: string | null;
  permissions: string[];
  isApproved?: boolean;
  isBlocked?: boolean;
  createdAt: string;
}

type PermissionAction = 'create' | 'read' | 'update' | 'delete';
type PermissionMatrix = Record<string, Record<PermissionAction, boolean>>;

// Módulos da plataforma para permissões
const MODULES = [
  { id: 'tutores', name: 'Tutores' },
  { id: 'pets', name: 'Pets' },
  { id: 'clientes', name: 'Clientes' },
  { id: 'agendamentos', name: 'Agendamentos' },
  { id: 'consultas', name: 'Consultas' },
  { id: 'tratamentos', name: 'Tratamentos' },
  { id: 'internacoes', name: 'Internações' },
  { id: 'servicos', name: 'Serviços' },
  { id: 'produtos', name: 'Produtos' },
  { id: 'estoque', name: 'Estoque' },
  { id: 'financeiro', name: 'Financeiro' },
  { id: 'comissoes', name: 'Comissões' },
  { id: 'documentos', name: 'Documentos' },
  { id: 'campanhas', name: 'Campanhas' },
  { id: 'newsletter', name: 'Newsletter' },
  { id: 'crm', name: 'CRM / Pipelines' },
  { id: 'ai_agents', name: 'AI Agents' },
  { id: 'automacoes', name: 'Automações' },
  { id: 'landing_pages', name: 'Landing Pages' },
  { id: 'global_agent', name: 'Global Agent' },
  { id: 'integracoes', name: 'Integrações' },
];

// Labels para roles
const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  VETERINARIAN: 'Veterinário',
  RECEPTIONIST: 'Recepcionista'};

const ROLE_COLORS: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  VETERINARIAN: 'bg-blue-100 text-blue-700',
  RECEPTIONIST: 'bg-orange-100 text-orange-700'};

// Back-compat (versões antigas armazenavam flags em permissions)
const TEAM_APPROVED = 'team:approved';
const TEAM_BLOCKED = 'team:blocked';

// Componentes auxiliares
interface SettingToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  label: string;
  description?: string;
}

function SettingToggle({ enabled, onChange, label, description }: SettingToggleProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${enabled ? 'left-7' : 'left-1'}`}></span>
      </button>
    </div>
  );
}

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [isSaving, setIsSaving] = useState(false);
  const { theme, setTheme } = useTheme();
  
  // Estado para Geral
  const [language, setLanguage] = useState('pt-BR');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    appointments: true,
    marketing: false,
    updates: true});
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showActivity: false,
    dataCollection: true});

  // Estado para Equipe / Permissões (API)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<PermissionMatrix>({});

  const selectedUser = useMemo(
    () => teamMembers.find((u) => u.id === selectedUserId) || null,
    [teamMembers, selectedUserId]
  );

  const emptyMatrix = useCallback((): PermissionMatrix => {
    return MODULES.reduce((acc, mod) => {
      acc[mod.id] = { create: false, read: false, update: false, delete: false };
      return acc;
    }, {} as PermissionMatrix);
  }, []);

  const decodePermissions = useCallback((permissions: string[]): PermissionMatrix => {
    const matrix = emptyMatrix();
    for (const p of permissions) {
      if (p.startsWith('team:')) continue;
      const [moduleId, action] = p.split(':');
      if (!moduleId || !action) continue;
      if (!matrix[moduleId]) continue;
      if (action === 'create' || action === 'read' || action === 'update' || action === 'delete') {
        matrix[moduleId][action] = true;
      }
    }
    return matrix;
  }, [emptyMatrix]);

  const encodePermissions = useCallback((matrix: PermissionMatrix): string[] => {
    const perms: string[] = [];
    for (const mod of MODULES) {
      const m = matrix[mod.id];
      if (!m) continue;
      (['create', 'read', 'update', 'delete'] as const).forEach((action) => {
        if (m[action]) perms.push(`${mod.id}:${action}`);
      });
    }
    return perms;
  }, []);

  const deriveStatus = useCallback((u: any): UserStatus => {
    const role = u?.role as UserRole;
    const permissions = Array.isArray(u?.permissions) ? (u.permissions as string[]) : [];

    if (role === 'ADMIN') return 'approved';
    if (u?.isBlocked === true) return 'blocked';
    if (u?.isApproved === true) return 'approved';

    // fallback: flags em permissions
    if (permissions.includes(TEAM_BLOCKED)) return 'blocked';
    if (permissions.includes(TEAM_APPROVED)) return 'approved';
    return 'pending';
  }, []);

  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError(null);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      if (!res.ok) throw new Error('Erro ao carregar equipe');
      const data = await res.json();

      const members: TeamMember[] = (Array.isArray(data) ? data : []).map((u: any) => {
        const perms = Array.isArray(u.permissions) ? u.permissions : [];
        const role = u.role as UserRole;
        return {
          id: String(u.id),
          name: u.name || 'Sem nome',
          email: u.email || '',
          role,
          image: u.image ?? null,
          permissions: perms,
          isApproved: typeof u.isApproved === 'boolean' ? u.isApproved : undefined,
          isBlocked: typeof u.isBlocked === 'boolean' ? u.isBlocked : undefined,
          status: deriveStatus(u),
          createdAt: u.createdAt ? String(u.createdAt) : ''};
      });

      setTeamMembers(members);
      if (!selectedUserId && members.length > 0) {
        setSelectedUserId(members[0].id);
      }
    } catch (e) {
      setTeamError(e instanceof Error ? e.message : 'Erro ao carregar equipe');
    } finally {
      setTeamLoading(false);
    }
  }, [deriveStatus, selectedUserId]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    if (!selectedUser) return;
    setPermissionDraft(decodePermissions(selectedUser.permissions));
  }, [selectedUser, decodePermissions]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // TODO: Implementar chamada à API
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const patchUser = useCallback(async (userId: string, body: any) => {
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)});
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Erro ao atualizar usuário');
    }
    return res.json();
  }, []);

  const handleApproveUser = useCallback(async (userId: string) => {
    await patchUser(userId, { isApproved: true, isBlocked: false });
    await fetchTeam();
  }, [patchUser, fetchTeam]);

  const handleBlockUser = useCallback(async (userId: string) => {
    await patchUser(userId, { isBlocked: true });
    await fetchTeam();
  }, [patchUser, fetchTeam]);

  const handleUnblockUser = useCallback(async (userId: string) => {
    await patchUser(userId, { isBlocked: false });
    await fetchTeam();
  }, [patchUser, fetchTeam]);

  const handleDeleteUser = useCallback(async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;
    const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || 'Erro ao excluir usuário');
      return;
    }
    await fetchTeam();
    if (selectedUserId === userId) setSelectedUserId(null);
  }, [fetchTeam, selectedUserId]);

  const handlePermissionToggle = (moduleId: string, action: PermissionAction) => {
    setPermissionDraft((prev) => ({
      ...prev,
      [moduleId]: {
        ...(prev[moduleId] || { create: false, read: false, update: false, delete: false }),
        [action]: !(prev[moduleId]?.[action] ?? false)}}));
  };

  const handleSavePermissions = useCallback(async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    try {
      // Preserva flags antigas (team:*) caso existam no banco
      const legacyTeamFlags = selectedUser.permissions.filter((p) => p.startsWith('team:'));
      const modulePerms = encodePermissions(permissionDraft);
      await patchUser(selectedUser.id, { permissions: [...legacyTeamFlags, ...modulePerms] });
      await fetchTeam();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao salvar permissões');
    } finally {
      setIsSaving(false);
    }
  }, [selectedUser, encodePermissions, permissionDraft, patchUser, fetchTeam]);

  const themeOptions: { value: ThemeOption; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: 'Claro', icon: <span style={{fontSize:"14px"}}>•</span> },
    { value: 'dark', label: 'Escuro', icon: <span style={{fontSize:"14px"}}>•</span> },
    { value: 'system', label: 'Sistema', icon: <span style={{fontSize:"14px"}}>•</span> },
  ];

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'geral', label: 'Geral', icon: <span style={{fontSize:"14px"}}>⚙</span> },
    { id: 'equipe', label: 'Equipe', icon: <span style={{fontSize:"14px"}}>👥</span> },
    { id: 'permissao', label: 'Permissão', icon: <span style={{fontSize:"14px"}}>🔒</span> },
  ];

  const getStatusBadge = (status: UserStatus) => {
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 text-xs font-medium bg-cyan-100 text-cyan-700 rounded-full">Aprovado</span>;
      case 'pending':
        return <span className="px-3 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">Pendente</span>;
      case 'blocked':
        return <span className="px-3 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">Bloqueado</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
            <p className="text-gray-600 mt-1">Personalize sua experiência e gerencie sua equipe</p>
          </div>
          <button
            onClick={activeTab === 'permissao' ? handleSavePermissions : handleSave}
            disabled={isSaving || (activeTab === 'permissao' && !selectedUser)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
          >
            {isSaving ? <LuLoaderCircle className="w-4 h-4 animate-spin" /> : <LuSave className="w-4 h-4" />}
            {activeTab === 'permissao' ? 'Salvar permissões' : 'Salvar alterações'}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-1.5 inline-flex gap-1 mb-8 shadow-sm">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'geral' && (
          <div className="space-y-6">
            {/* Aparência */}
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-xl">
                  <span style={{fontSize:"14px"}}>•</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Aparência</h2>
                  <p className="text-sm text-gray-500">Personalize a interface do sistema</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Tema</label>
                  <div className="grid grid-cols-3 gap-3">
                    {themeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                          theme === option.value
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                        }`}
                      >
                        {theme === option.value && (
                          <span className="absolute top-2 right-2 p-1 bg-blue-500 rounded-full">
                            <LuCheck className="w-3 h-3 text-white" />
                          </span>
                        )}
                        <span className={theme === option.value ? 'text-blue-600' : 'text-gray-500'}>
                          {option.icon}
                        </span>
                        <span className={`text-sm font-medium ${theme === option.value ? 'text-blue-700' : 'text-gray-700'}`}>
                          {option.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Idioma */}
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-xl">
                  <span style={{fontSize:"14px"}}>🌐</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Idioma e Região</h2>
                  <p className="text-sm text-gray-500">Configure idioma e formato de dados</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Idioma</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="pt-BR">Português (Brasil)</option>
                    <option value="en-US">English (US)</option>
                    <option value="es">Español</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fuso horário</label>
                  <select
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="America/Sao_Paulo">Brasília (GMT-3)</option>
                    <option value="America/New_York">New York (GMT-5)</option>
                    <option value="Europe/London">Londres (GMT+0)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notificações */}
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-xl">
                  <span style={{fontSize:"14px"}}>•</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Notificações</h2>
                  <p className="text-sm text-gray-500">Gerencie como você recebe alertas</p>
                </div>
              </div>

              <div>
                <SettingToggle
                  enabled={notifications.email}
                  onChange={(v) => setNotifications({ ...notifications, email: v })}
                  label="Notificações por e-mail"
                  description="Receba atualizações importantes no seu e-mail"
                />
                <SettingToggle
                  enabled={notifications.push}
                  onChange={(v) => setNotifications({ ...notifications, push: v })}
                  label="Notificações push"
                  description="Alertas em tempo real no navegador"
                />
                <SettingToggle
                  enabled={notifications.appointments}
                  onChange={(v) => setNotifications({ ...notifications, appointments: v })}
                  label="Lembretes de agendamentos"
                  description="Seja lembrado sobre consultas e compromissos"
                />
                <SettingToggle
                  enabled={notifications.updates}
                  onChange={(v) => setNotifications({ ...notifications, updates: v })}
                  label="Atualizações do sistema"
                  description="Novidades e melhorias do Empório do Pet"
                />
                <SettingToggle
                  enabled={notifications.marketing}
                  onChange={(v) => setNotifications({ ...notifications, marketing: v })}
                  label="E-mails promocionais"
                  description="Ofertas e novidades de parceiros"
                />
              </div>
            </div>

            {/* Privacidade */}
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-xl">
                  <span style={{fontSize:"14px"}}>🛡</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Privacidade</h2>
                  <p className="text-sm text-gray-500">Controle seus dados e visibilidade</p>
                </div>
              </div>

              <div>
                <SettingToggle
                  enabled={privacy.showProfile}
                  onChange={(v) => setPrivacy({ ...privacy, showProfile: v })}
                  label="Perfil público"
                  description="Outros usuários podem ver seu perfil"
                />
                <SettingToggle
                  enabled={privacy.showActivity}
                  onChange={(v) => setPrivacy({ ...privacy, showActivity: v })}
                  label="Mostrar atividade"
                  description="Exibir status online e última atividade"
                />
                <SettingToggle
                  enabled={privacy.dataCollection}
                  onChange={(v) => setPrivacy({ ...privacy, dataCollection: v })}
                  label="Coleta de dados anônimos"
                  description="Ajude-nos a melhorar o sistema"
                />
              </div>
            </div>

            {/* Dados */}
            <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <span style={{fontSize:"14px"}}>🗄</span>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Seus Dados</h2>
                  <p className="text-sm text-gray-500">Gerencie e exporte suas informações</p>
                </div>
              </div>

              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <span style={{fontSize:"14px"}}>🗄</span>
                    <span className="text-sm font-medium text-gray-700">Exportar meus dados</span>
                  </div>
                  <span style={{fontSize:"14px"}}>▶</span>
                </button>
                <button className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <span style={{fontSize:"14px"}}>🛡</span>
                    <span className="text-sm font-medium text-red-700">Excluir minha conta</span>
                  </div>
                  <span style={{fontSize:"14px"}}>▶</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'equipe' && (
          <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Equipe</h2>
                <p className="text-gray-600 text-sm mt-1">
                  Membros da equipe (Recepcionista/Veterinário) só acessam o <span className="text-gray-900 font-medium">/dashboard</span> após aprovação.
                </p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
                <LuUserPlus className="w-4 h-4" />
                Convidar
              </button>
            </div>

            <div className="flex items-center justify-between mb-4">
              <div />
              <button
                onClick={fetchTeam}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200"
              >
                <span style={{fontSize:"14px"}}>↻</span>
                Atualizar
              </button>
            </div>

            {teamError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <span style={{fontSize:"14px"}}>⚠️</span>
                <p className="text-red-700 text-sm">{teamError}</p>
              </div>
            )}

            {/* Tabela de membros */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Nome</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Cargo</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-gray-500">Status</th>
                    <th className="text-right py-4 px-4 text-sm font-medium text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member) => (
                    <tr key={member.id} className="border-b border-gray-100 hover:bg-gray-50/60 transition-colors">
                      <td className="py-4 px-4">
                        <p className="text-gray-900 font-medium">{member.name}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-gray-600">{member.email}</p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${ROLE_COLORS[member.role]}`}>
                          {ROLE_LABELS[member.role]}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {member.role === 'ADMIN' ? (
                          <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                            Não requer aprovação
                          </span>
                        ) : (
                          getStatusBadge(member.status)
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {member.role !== 'ADMIN' && member.status === 'pending' && (
                            <button
                              onClick={() => handleApproveUser(member.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
                            >
                              Aprovar
                            </button>
                          )}
                          {member.role !== 'ADMIN' && member.status !== 'blocked' && (
                            <button
                              onClick={() => handleBlockUser(member.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                            >
                              Bloquear
                            </button>
                          )}
                          {member.role !== 'ADMIN' && member.status === 'blocked' && (
                            <button
                              onClick={() => handleUnblockUser(member.id)}
                              className="px-3 py-1.5 text-xs font-medium bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg transition-colors"
                            >
                              Desbloquear
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteUser(member.id)}
                            className="px-3 py-1.5 text-xs font-medium border border-gray-300 hover:border-red-500 hover:bg-red-50 text-gray-700 hover:text-red-600 rounded-lg transition-colors"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {teamMembers.length === 0 && (
              <div className="text-center py-12">
                <span style={{fontSize:"14px"}}>👥</span>
                <p className="text-gray-500">Nenhum membro na equipe</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'permissao' && (
          <div className="bg-white rounded-3xl shadow-sm shadow-gray-200/50 border border-gray-100 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Permissões da Equipe</h2>
              <p className="text-gray-600 text-sm mt-1">
                Defina quais ações cada membro pode fazer em cada módulo do sistema.
              </p>
            </div>

            {teamError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
                <span style={{fontSize:"14px"}}>⚠️</span>
                <p className="text-red-700 text-sm">{teamError}</p>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista de usuários */}
              <div className="lg:col-span-1">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Equipe</h3>
                <div className="space-y-2">
                  {teamMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSelectedUserId(member.id)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                        selectedUserId === member.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                      }`}
                    >
                      <p className="text-gray-900 font-medium">{member.name}</p>
                      <p className="text-gray-500 text-sm truncate">{member.email}</p>
                      <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Matriz de permissões */}
              <div className="lg:col-span-2">
                {selectedUser ? (
                  <>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-gray-500 text-sm">Editando</p>
                        <h3 className="text-xl font-semibold text-gray-900">{selectedUser.name}</h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded ${ROLE_COLORS[selectedUser.role]}`}>
                          {ROLE_LABELS[selectedUser.role]}
                        </span>
                      </div>
                      <button
                        onClick={fetchTeam}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-xl border border-gray-200"
                      >
                        <span style={{fontSize:"14px"}}>↻</span>
                        Atualizar
                      </button>
                    </div>

                    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 bg-gray-50">
                            <th className="text-left py-4 px-4 text-sm font-medium text-gray-600">Módulo</th>
                            <th className="text-center py-4 px-4 text-sm font-medium text-gray-600">Criar</th>
                            <th className="text-center py-4 px-4 text-sm font-medium text-gray-600">Ver</th>
                            <th className="text-center py-4 px-4 text-sm font-medium text-gray-600">Editar</th>
                            <th className="text-center py-4 px-4 text-sm font-medium text-gray-600">Excluir</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MODULES.map((module) => {
                            const perms = permissionDraft[module.id] || { create: false, read: false, update: false, delete: false };
                            return (
                              <tr key={module.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-3 px-4">
                                  <span className="text-gray-900 font-medium">{module.name}</span>
                                </td>
                                {(['create', 'read', 'update', 'delete'] as const).map((action) => (
                                  <td key={action} className="py-3 px-4 text-center">
                                    <button
                                      onClick={() => handlePermissionToggle(module.id, action)}
                                      className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                        perms[action]
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                                      }`}
                                    >
                                      {perms[action] && <LuCheck className="w-4 h-4" />}
                                    </button>
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <p className="text-gray-500 text-sm mt-4">
                      <span className="text-orange-700 font-medium">Dica:</span> se desmarcar &quot;Ver&quot;, o usuário não consegue nem listar o módulo no dashboard (backend bloqueia).
                    </p>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50 rounded-2xl border border-gray-200">
                    <div className="text-center">
                      <span style={{fontSize:"14px"}}>🛡</span>
                      <p className="text-gray-600">Selecione um usuário para editar permissões</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
