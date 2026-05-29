'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  
  LuPawPrint,
  LuCalendar,
  LuDollarSign,
  LuTarget,
  LuSparkles,
  LuFileText,
  LuUserPlus} from 'react-icons/lu';

interface DashboardData {
  totalTutores: number;
  totalPets: number;
  totalClientes: number;
  agendamentosHoje: number;
  consultasHoje: number;
  consultasPendentes: number;
  internacoesAtivas: number;
  faturamentoMes: number;
  faturamentoHoje: number;
  ticketMedio: number;
  comissoesPendentes: number;
  leadsNovos: number;
  leadsQualificados: number;
  taxaConversao: number;
  campanhasAtivas: number;
  emailsEnviados: number;
  taxaAbertura: number;
  agentesAtivos: number;
  interacoesHoje: number;
  taxaSucessoAgentes: number;
  produtosBaixoEstoque: number;
  alertasEstoque: number;
}

interface AtividadeRecente {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string;
  tempo: string;
  icone: string;
  cor: string;
}

interface AgendamentoProximo {
  id: string;
  horario: string;
  tutor: string;
  pet: string;
  servico: string;
  status: 'confirmado' | 'pendente' | 'em_atendimento';
}

const defaultData: DashboardData = {
  totalTutores: 0,
  totalPets: 0,
  totalClientes: 0,
  agendamentosHoje: 0,
  consultasHoje: 0,
  consultasPendentes: 0,
  internacoesAtivas: 0,
  faturamentoMes: 0,
  faturamentoHoje: 0,
  ticketMedio: 0,
  comissoesPendentes: 0,
  leadsNovos: 0,
  leadsQualificados: 0,
  taxaConversao: 0,
  campanhasAtivas: 0,
  emailsEnviados: 0,
  taxaAbertura: 0,
  agentesAtivos: 0,
  interacoesHoje: 0,
  taxaSucessoAgentes: 0,
  produtosBaixoEstoque: 0,
  alertasEstoque: 0};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Bom dia', emoji: '☀️' };
  if (h < 18) return { text: 'Boa tarde', emoji: '🌤️' };
  return { text: 'Boa noite', emoji: '🌙' };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>(defaultData);
  const [atividades, setAtividades] = useState<AtividadeRecente[]>([]);
  const [agendamentos, setAgendamentos] = useState<AgendamentoProximo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<'hoje' | 'semana' | 'mes'>('hoje');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, activitiesRes, appointmentsRes] = await Promise.all([
        fetch('/api/dashboard/summary').catch(() => null),
        fetch('/api/dashboard/recent-activities?limit=6').catch(() => null),
        fetch('/api/dashboard/upcoming-appointments?limit=5').catch(() => null),
      ]);
      if (summaryRes?.ok) {
        const summaryData = await summaryRes.json();
        setData(summaryData);
      } else setData(defaultData);
      if (activitiesRes?.ok) {
        const activitiesData = await activitiesRes.json();
        setAtividades(activitiesData);
      }
      if (appointmentsRes?.ok) {
        const appointmentsData = await appointmentsRes.json();
        setAgendamentos(appointmentsData);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setData(defaultData);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData, timeFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(value);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmado': return 'bg-cyan-500/15 text-cyan-600 border border-cyan-500/30';
      case 'pendente': return 'bg-orange-500/15 text-orange-600 border border-orange-500/30';
      case 'em_atendimento': return 'bg-cyan-500/15 text-cyan-600 border border-cyan-500/30';
      default: return 'bg-gray-500/10 text-gray-600 border border-gray-500/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmado': return 'Confirmado';
      case 'pendente': return 'Pendente';
      case 'em_atendimento': return 'Em atendimento';
      default: return status;
    }
  };

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'});
  const greeting = getGreeting();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-5rem)]">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-orange-500/20 border border-cyan-500/20 animate-pulse" />
            <div className="absolute inset-0 w-20 h-20 border-2 border-transparent border-t-blue-500 rounded-2xl animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Carregando seu dashboard...</p>
        </div>
      </div>
    );
  }

  const quickModules = [
    { href: '/dashboard/ai-agents/agents', label: 'Agents', icon: () => <span style={{fontSize:"14px"}}>🤖</span>, color: 'violet' },
    { href: '/dashboard/ai-agents/conversas', label: 'Conversas', icon: () => <span style={{fontSize:"14px"}}>💬</span>, color: 'violet' },
    { href: '/dashboard/ai-agents/templates', label: 'Templates', icon: LuFileText, color: 'violet' },
    { href: '/dashboard/ai-agents/conexoes', label: 'Conexões', icon: () => <span style={{fontSize:"14px"}}>⚙</span>, color: 'violet' },
    { href: '/dashboard/ai-agents/automacoes', label: 'Automações', icon: () => <span style={{fontSize:"14px"}}>⚡</span>, color: 'violet' },
    { href: '/dashboard/ai-agents/conhecimento', label: 'Base de Conhecimento', icon: () => <span style={{fontSize:"14px"}}>🗄</span>, color: 'violet' },
    { href: '/dashboard/crm/leads', label: 'Leads', icon: LuUserPlus, color: 'blue' },
    { href: '/dashboard/crm/pipelines', label: 'Pipelines', icon: () => <span style={{fontSize:"14px"}}>🔀</span>, color: 'blue' },
    { href: '/dashboard/erp/tutores', label: 'Tutores', icon: () => <span style={{fontSize:"14px"}}>👥</span>, color: 'indigo' },
    { href: '/dashboard/erp/pets', label: 'Pets', icon: LuPawPrint, color: 'amber' },
    { href: '/dashboard/erp/clientes', label: 'Clientes', icon: () => <span style={{fontSize:"14px"}}>👥</span>, color: 'indigo' },
    { href: '/dashboard/erp/agendamentos', label: 'Agendamentos', icon: LuCalendar, color: 'amber' },
    { href: '/dashboard/erp/consultas', label: 'Consultas', icon: () => <span style={{fontSize:"14px"}}>🩺</span>, color: 'teal' },
    { href: '/dashboard/erp/tratamentos', label: 'Tratamentos', icon: () => <span style={{fontSize:"14px"}}>💉</span>, color: 'teal' },
    { href: '/dashboard/erp/internacoes', label: 'Internações', icon: () => <span style={{fontSize:"14px"}}>🛏</span>, color: 'rose' },
    { href: '/dashboard/erp/servicos', label: 'Serviços', icon: () => <span style={{fontSize:"14px"}}>🔧</span>, color: 'indigo' },
    { href: '/dashboard/erp/produtos', label: 'Produtos', icon: () => <span style={{fontSize:"14px"}}>📦</span>, color: 'emerald' },
    { href: '/dashboard/erp/estoque', label: 'Estoque', icon: () => <span style={{fontSize:"14px"}}>🏬</span>, color: 'amber' },
    { href: '/dashboard/erp/comissoes', label: 'Comissões', icon: () => <span style={{fontSize:"14px"}}>•</span>, color: 'emerald' },
    { href: '/dashboard/erp/financeiro', label: 'Financeiro', icon: LuDollarSign, color: 'emerald' },
    { href: '/dashboard/erp/documentos', label: 'Documentos', icon: LuFileText, color: 'slate' },
    { href: '/dashboard/campanhas/adsense', label: 'AdSense', icon: () => <span style={{fontSize:"14px"}}>📊</span>, color: 'cyan' },
    { href: '/dashboard/campanhas/email', label: 'Email', icon: () => <span style={{fontSize:"14px"}}>✉️</span>, color: 'cyan' },
    { href: '/dashboard/campanhas/whatsapp', label: 'WhatsApp', icon: () => <span style={{fontSize:"14px"}}>💬</span>, color: 'emerald' },
    { href: '/dashboard/landing-pages', label: 'Landing Pages', icon: () => <span style={{fontSize:"14px"}}>⊞</span>, color: 'purple' },
  ];

  const colorClasses: Record<string, string> = {
    violet: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/30',
    blue: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30',
    indigo: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/30',
    amber: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/30',
    teal: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30',
    rose: 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/15 hover:border-rose-500/30',
    emerald: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20 hover:bg-cyan-500/15 hover:border-cyan-500/30',
    purple: 'bg-orange-500/10 text-orange-600 border-orange-500/20 hover:bg-orange-500/15 hover:border-orange-500/30',
    slate: 'bg-slate-500/10 text-slate-600 border-slate-500/20 hover:bg-slate-500/15 hover:border-slate-500/30'};

  return (
    <div className="min-h-screen">
      {/* Hero gradient strip */}
      <div className="absolute top-0 left-0 right-0 h-[420px] bg-gradient-to-br from-cyan-500/8 via-orange-500/5 to-cyan-500/8 pointer-events-none" aria-hidden />
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" aria-hidden />
      <div className="absolute top-20 right-1/4 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" aria-hidden />

      <div className="relative p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 tracking-tight">
              {greeting.text} {greeting.emoji}
            </h1>
            <p className="text-gray-500 mt-1.5 capitalize text-lg">{hoje}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-1 shadow-sm">
              {(['hoje', 'semana', 'mes'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTimeFilter(filter)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    timeFilter === filter
                      ? 'bg-gray-900 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {filter === 'hoje' ? 'Hoje' : filter === 'semana' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
            >
              <span style={{fontSize:"14px"}}>↻</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <span style={{fontSize:"14px"}}>⚠️</span>
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={fetchData} className="ml-auto text-sm font-medium text-red-600 hover:text-red-700">
              Tentar novamente
            </button>
          </div>
        )}

        {/* KPI Cards - glass style */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Tutores', value: data.totalTutores, icon: () => <span style={{fontSize:"14px"}}>👥</span>, bg: 'bg-cyan-500/10', iconColor: 'text-cyan-600' },
            { label: 'Pets', value: data.totalPets, icon: LuPawPrint, bg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
            { label: 'Agendamentos hoje', value: data.agendamentosHoje, icon: LuCalendar, bg: 'bg-orange-500/10', iconColor: 'text-orange-600' },
            { label: 'Consultas hoje', value: data.consultasHoje, sub: data.consultasPendentes ? `${data.consultasPendentes} pendentes` : null, icon: () => <span style={{fontSize:"14px"}}>🩺</span>, bg: 'bg-cyan-500/10', iconColor: 'text-cyan-600' },
            { label: 'Internações', value: data.internacoesAtivas, icon: () => <span style={{fontSize:"14px"}}>🛏</span>, bg: 'bg-rose-500/10', iconColor: 'text-rose-600' },
            { label: 'Faturamento hoje', value: formatCurrency(data.faturamentoHoje), icon: LuDollarSign, bg: 'bg-cyan-500/10', iconColor: 'text-cyan-600' },
          ].map(({ label, value, sub, icon: Icon, bg, iconColor }) => (
            <div
              key={label}
              className="group relative bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-300/80 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`inline-flex p-2.5 rounded-xl ${bg} ${iconColor} mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
              {sub && <p className="text-xs text-orange-600 font-medium mt-1">{sub}</p>}
            </div>
          ))}
        </div>

        {/* Main 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Agenda do dia */}
          <div className="lg:col-span-1">
            <div className="h-full bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-xl">
                    <LuCalendar className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Agenda do Dia</h2>
                    <p className="text-sm text-gray-500">{data.agendamentosHoje} agendamentos</p>
                  </div>
                </div>
                <Link href="/dashboard/erp/agendamentos" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                  <span style={{fontSize:"14px"}}>▶</span>
                </Link>
              </div>
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {agendamentos.length === 0 ? (
                  <div className="p-8 text-center">
                    <LuCalendar className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Nenhum agendamento para hoje</p>
                  </div>
                ) : (
                  agendamentos.map((ag) => (
                    <div key={ag.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center min-w-[52px] font-semibold text-gray-900">{ag.horario}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{ag.tutor}</p>
                          <p className="text-sm text-gray-500">{ag.pet} • {ag.servico}</p>
                        </div>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${getStatusColor(ag.status)}`}>
                          {getStatusText(ag.status)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-4 bg-gray-50/50 border-t border-gray-100">
                <Link href="/dashboard/erp/agendamentos" className="flex items-center justify-center gap-2 text-sm font-medium text-cyan-600 hover:text-cyan-700">
                  Ver agenda completa <span style={{fontSize:"14px"}}>▶</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Atividades recentes */}
          <div className="lg:col-span-1">
            <div className="h-full bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-500/10 rounded-xl">
                    <span style={{fontSize:"14px"}}>⚡</span>
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Atividades Recentes</h2>
                    <p className="text-sm text-gray-500">Últimas atualizações</p>
                  </div>
                </div>
              </div>
              <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
                {atividades.length === 0 ? (
                  <div className="p-8 text-center">
                    <span style={{fontSize:"14px"}}>⚡</span>
                    <p className="text-gray-500 text-sm">Nenhuma atividade recente</p>
                  </div>
                ) : (
                  atividades.map((a) => (
                    <div key={a.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-start gap-3">
                        <span className="text-xl">{a.icone}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{a.titulo}</p>
                          <p className="text-sm text-gray-500 truncate">{a.descricao}</p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{a.tempo}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Módulos em destaque */}
          <div className="lg:col-span-1 space-y-4">
            <Link href="/dashboard/ai-agents/agents" className="block group">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-orange-500/20 hover:shadow-xl hover:shadow-orange-500/25 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <span style={{fontSize:"14px"}}>🤖</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse" />
                    {data.agentesAtivos} ativos
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">AI Agents</h3>
                <p className="text-white/80 text-sm mb-3">{data.interacoesHoje} interações hoje</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/20">
                  <span className="text-sm text-white/80">Taxa de sucesso</span>
                  <span className="text-lg font-bold">{data.taxaSucessoAgentes}%</span>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/crm/leads" className="block group">
              <div className="bg-gradient-to-br from-cyan-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <LuTarget className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">{data.taxaConversao}% conversão</span>
                </div>
                <h3 className="text-lg font-semibold mb-1">CRM</h3>
                <p className="text-white/80 text-sm mb-3">{data.leadsNovos} novos leads</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/20">
                  <span className="text-sm text-white/80">Qualificados</span>
                  <span className="text-lg font-bold">{data.leadsQualificados}</span>
                </div>
              </div>
            </Link>
            <Link href="/dashboard/campanhas/email" className="block group">
              <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl p-5 text-white shadow-lg shadow-cyan-500/20 hover:shadow-xl hover:shadow-cyan-500/25 hover:scale-[1.02] transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-white/20 rounded-xl">
                    <span style={{fontSize:"14px"}}>📣</span>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-medium bg-white/20 px-3 py-1 rounded-full">
                    {data.campanhasAtivas} ativas
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-1">Campanhas</h3>
                <p className="text-white/80 text-sm mb-3">{data.emailsEnviados.toLocaleString()} emails enviados</p>
                <div className="flex items-center justify-between pt-3 border-t border-white/20">
                  <span className="text-sm text-white/80">Taxa de abertura</span>
                  <span className="text-lg font-bold">{data.taxaAbertura}%</span>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Hub de Módulos - todas as features */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-900 rounded-xl">
              <span style={{fontSize:"14px"}}>⊞</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Acesso rápido</h2>
              <p className="text-sm text-gray-500">Todos os módulos do sistema</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {quickModules.map(({ href, label, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 p-3 rounded-xl border bg-white/80 backdrop-blur-sm shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${colorClasses[color]}`}
              >
                <div className="flex-shrink-0 p-1.5 rounded-lg bg-white/80 border border-current/20">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium truncate">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Resumos: Financeiro, Estoque, Serviços, Integrações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-cyan-500/10 rounded-xl">
                <LuDollarSign className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Financeiro</h3>
                <p className="text-xs text-gray-500">Este mês</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Faturamento</span><span className="font-semibold text-gray-900">{formatCurrency(data.faturamentoMes)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Ticket médio</span><span className="font-semibold text-gray-900">{formatCurrency(data.ticketMedio)}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Comissões pend.</span><span className="font-semibold text-orange-600">{formatCurrency(data.comissoesPendentes)}</span></div>
            </div>
            <Link href="/dashboard/erp/financeiro" className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-cyan-600 hover:text-cyan-700">
              Ver detalhes <span style={{fontSize:"14px"}}>▶</span>
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <span style={{fontSize:"14px"}}>🏬</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Estoque</h3>
                <p className="text-xs text-gray-500">Status atual</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between"><span className="text-sm text-gray-500">Baixo estoque</span><span className="font-semibold text-orange-600">{data.produtosBaixoEstoque}</span></div>
              <div className="flex justify-between"><span className="text-sm text-gray-500">Alertas</span><span className="font-semibold text-rose-600">{data.alertasEstoque}</span></div>
            </div>
            <Link href="/dashboard/erp/estoque" className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-orange-600 hover:text-orange-700">
              Gerenciar <span style={{fontSize:"14px"}}>▶</span>
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <LuSparkles className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Serviços</h3>
                <p className="text-xs text-gray-500">Mais populares</p>
              </div>
            </div>
            <div className="space-y-2">
              {['Consultas', 'Vacinação', 'Banho e Tosa'].map((s, i) => (
                <div key={s} className="flex justify-between items-center py-1">
                  <span className="text-sm text-gray-600">{s}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500 rounded-full" style={{ width: `${[70, 45, 35][i]}%` }} />
                    </div>
                    <span className="text-xs text-gray-500">{[70, 45, 35][i]}%</span>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/dashboard/erp/servicos" className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-orange-600 hover:text-orange-700">
              Ver serviços <span style={{fontSize:"14px"}}>▶</span>
            </Link>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/80 p-5 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-orange-500/10 rounded-xl">
                <span style={{fontSize:"14px"}}>⚙</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Integrações</h3>
                <p className="text-xs text-gray-500">Status</p>
              </div>
            </div>
            <div className="space-y-3">
              {['WhatsApp Bot', 'N8N Automações', 'AI Agents'].map((name) => (
                <div key={name} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-cyan-500 rounded-full" />
                    <span className="text-sm text-gray-600">{name}</span>
                  </div>
                  <span className="text-xs font-medium text-cyan-600">Online</span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/ai-agents/conexoes" className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-gray-100 text-sm font-medium text-orange-600 hover:text-orange-700">
              Configurar <span style={{fontSize:"14px"}}>▶</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
