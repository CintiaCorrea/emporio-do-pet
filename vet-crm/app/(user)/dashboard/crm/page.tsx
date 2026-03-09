'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  LuUsers, LuUserPlus, LuTrendingUp, LuTarget,
  LuDollarSign, LuArrowRight, LuLoader, LuRefreshCw,
  LuLightbulb, LuLayoutDashboard, LuTriangleAlert,
  LuChartBar, LuWorkflow, LuZap
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { CrmStats, Lead, LeadInsight, LEAD_STATUS_LABELS } from '@/types/crm';

const STATUS_FUNNEL: { key: string; label: string; color: string }[] = [
  { key: 'new', label: 'Novos', color: 'from-blue-500 to-blue-600' },
  { key: 'enriched', label: 'Enriquecidos', color: 'from-indigo-500 to-indigo-600' },
  { key: 'qualified', label: 'Qualificados', color: 'from-green-500 to-green-600' },
  { key: 'contacted', label: 'Contactados', color: 'from-amber-500 to-amber-600' },
  { key: 'converted', label: 'Convertidos', color: 'from-emerald-500 to-emerald-600' },
];

export default function CrmDashboardPage() {
  const [stats, setStats] = useState<CrmStats | null>(null);
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [urgentInsights, setUrgentInsights] = useState<LeadInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, leadsRes, insightsRes] = await Promise.all([
        fetch('/api/crm/stats'),
        fetch('/api/leads?limit=10&sortBy=createdAt&sortOrder=desc'),
        fetch('/api/insights/urgent'),
      ]);

      if (!statsRes.ok) throw new Error('Erro ao carregar estatísticas');

      const statsData = await statsRes.json();
      setStats(statsData);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setRecentLeads(Array.isArray(leadsData) ? leadsData : leadsData.data || []);
      }

      if (insightsRes.ok) {
        const insightsData = await insightsRes.json();
        setUrgentInsights(Array.isArray(insightsData) ? insightsData : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      toast.error('Erro ao carregar dashboard CRM');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const getScoreBadge = (score: number) => {
    if (score >= 71) return 'bg-red-100 text-red-700';
    if (score >= 51) return 'bg-orange-100 text-orange-700';
    if (score >= 31) return 'bg-yellow-100 text-yellow-700';
    return 'bg-blue-100 text-blue-700';
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700',
      ENRICHING: 'bg-purple-100 text-purple-700',
      ENRICHED: 'bg-indigo-100 text-indigo-700',
      QUALIFIED: 'bg-green-100 text-green-700',
      CONTACTED: 'bg-amber-100 text-amber-700',
      CONVERTED: 'bg-emerald-100 text-emerald-700',
      LOST: 'bg-gray-100 text-gray-700',
    };
    return map[status] || 'bg-gray-100 text-gray-700';
  };

  const statusLabels: Record<string, string> = {
    NEW: 'Novo', ENRICHING: 'Enriquecendo', ENRICHED: 'Enriquecido',
    QUALIFIED: 'Qualificado', CONTACTED: 'Contactado', CONVERTED: 'Convertido', LOST: 'Perdido',
  };

  const priorityBadge: Record<string, string> = {
    URGENT: 'bg-red-100 text-red-700',
    HIGH: 'bg-orange-100 text-orange-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    LOW: 'bg-gray-100 text-gray-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <LuLoader className="w-6 h-6 animate-spin" />
          <span className="text-lg">Carregando dashboard CRM...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-semibold text-lg">Erro ao carregar</div>
          <div className="text-gray-600 mt-1">{error}</div>
          <button onClick={fetchData} className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:scale-105 transition-all duration-300">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const funnelMax = stats ? Math.max(stats.leads.new, stats.leads.qualified, stats.leads.converted, 1) : 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              CRM Dashboard
            </h1>
            <p className="text-gray-500 mt-1">Visão geral do relacionamento com clientes</p>
          </div>
          <button onClick={fetchData} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all duration-200">
            <LuRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Leads</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.leads.total}</p>
                  <p className="text-xs text-blue-600 mt-1">{stats.leads.new} novos</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-2xl">
                  <LuUserPlus className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Qualificados</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.leads.qualified}</p>
                  <p className="text-xs text-green-600 mt-1">Score médio: {stats.leads.averageScore}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-2xl">
                  <LuTarget className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Taxa de Conversão</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.conversions.rate}%</p>
                  <p className="text-xs text-purple-600 mt-1">{stats.conversions.thisMonth} este mês</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-2xl">
                  <LuTrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Receita Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    R$ {((stats.clients.totalRevenue || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">{stats.clients.active} ativos</p>
                </div>
                <div className="p-3 bg-emerald-100 rounded-2xl">
                  <LuDollarSign className="w-6 h-6 text-emerald-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/dashboard/crm/leads" className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-xl"><LuUserPlus className="w-5 h-5 text-blue-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Leads</p>
                <p className="text-sm text-gray-500">Gerenciar leads</p>
              </div>
            </div>
            <LuArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          </Link>

          <Link href="/dashboard/crm/pipelines" className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl"><LuWorkflow className="w-5 h-5 text-purple-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Pipelines</p>
                <p className="text-sm text-gray-500">Quadros Kanban</p>
              </div>
            </div>
            <LuArrowRight className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" />
          </Link>

          <Link href="/dashboard/crm/insights" className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-xl"><LuLightbulb className="w-5 h-5 text-amber-600" /></div>
              <div>
                <p className="font-semibold text-gray-900">Insights</p>
                <p className="text-sm text-gray-500">Ações recomendadas</p>
              </div>
            </div>
            <LuArrowRight className="w-5 h-5 text-gray-400 group-hover:text-amber-600 transition-colors" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Funnel */}
          {stats && (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <LuChartBar className="w-5 h-5 text-blue-600" />
                  Funil de Leads
                </h2>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Novos', value: stats.leads.new, color: 'from-blue-500 to-blue-600' },
                  { label: 'Qualificados', value: stats.leads.qualified, color: 'from-green-500 to-green-600' },
                  { label: 'Convertidos', value: stats.leads.converted, color: 'from-emerald-500 to-emerald-600' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-28">{item.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${item.color} rounded-full flex items-center justify-end pr-3 transition-all duration-700`}
                        style={{ width: `${Math.max((item.value / funnelMax) * 100, 8)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{item.value}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Conversões este mês</span>
                    <span className="font-semibold text-gray-900">{stats.conversions.thisMonth}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Conversões mês passado</span>
                    <span className="font-semibold text-gray-900">{stats.conversions.lastMonth}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Urgent Insights */}
          <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <LuZap className="w-5 h-5 text-amber-600" />
                Insights Urgentes
              </h2>
              <Link href="/dashboard/crm/insights" className="text-sm text-blue-600 hover:underline">Ver todos</Link>
            </div>
            {urgentInsights.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <LuLightbulb className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum insight urgente</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[320px] overflow-y-auto">
                {urgentInsights.slice(0, 6).map((insight) => (
                  <div key={insight.id} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
                    <div className="p-1.5 bg-amber-100 rounded-lg mt-0.5">
                      <LuTriangleAlert className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{insight.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{insight.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge[insight.priority] || 'bg-gray-100 text-gray-700'}`}>
                          {insight.priority}
                        </span>
                        <span className="text-xs text-gray-400">{insight.action}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <LuUsers className="w-5 h-5 text-blue-600" />
              Leads Recentes
            </h2>
            <Link href="/dashboard/crm/leads" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todos <LuArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentLeads.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <LuUserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum lead cadastrado</p>
              <Link href="/dashboard/crm/leads/novo" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
                Criar primeiro lead
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Nome</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Origem</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Score</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLeads.map((lead) => (
                    <tr key={lead.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <Link href={`/dashboard/crm/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {lead.name || 'Sem nome'}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{lead.email}</td>
                      <td className="py-3 px-4">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{lead.source}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${getScoreBadge(lead.currentScore)}`}>
                          {lead.currentScore}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusBadge(lead.status)}`}>
                          {statusLabels[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-500">
                        {new Date(lead.firstSeenAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
