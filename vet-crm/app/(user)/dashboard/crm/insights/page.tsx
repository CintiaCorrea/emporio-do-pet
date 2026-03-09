'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  LuLightbulb, LuLoader, LuRefreshCw, LuTriangleAlert,
  LuTarget, LuMessageCircle, LuMail, LuTag, LuZap,
  LuFlame, LuSnowflake, LuTrendingDown, LuHeart,
  LuCircleCheck, LuCircleX, LuFilter, LuUser,
  LuChartBar
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { LeadInsight, InsightPriority, InsightType } from '@/types/crm';
import {
  INSIGHT_TYPE_LABELS, INSIGHT_PRIORITY_LABELS,
  getInsightPriorityColor
} from '@/types/crm';

const INSIGHT_TYPE_ICONS: Record<string, React.ReactNode> = {
  HIGH_INTENT: <LuZap className="w-5 h-5 text-amber-600" />,
  REENGAGEMENT: <LuTrendingDown className="w-5 h-5 text-blue-600" />,
  CHURN_RISK: <LuTriangleAlert className="w-5 h-5 text-red-600" />,
  COLD_LEAD: <LuSnowflake className="w-5 h-5 text-blue-400" />,
  HOT_LEAD: <LuFlame className="w-5 h-5 text-red-500" />,
  SEND_WHATSAPP: <LuMessageCircle className="w-5 h-5 text-green-600" />,
  SEND_EMAIL: <LuMail className="w-5 h-5 text-blue-600" />,
  OFFER_DISCOUNT: <LuTag className="w-5 h-5 text-purple-600" />,
  NURTURE_CONTENT: <LuHeart className="w-5 h-5 text-pink-600" />,
};

const INSIGHT_TYPE_BG: Record<string, string> = {
  HIGH_INTENT: 'bg-amber-100',
  REENGAGEMENT: 'bg-blue-100',
  CHURN_RISK: 'bg-red-100',
  COLD_LEAD: 'bg-blue-50',
  HOT_LEAD: 'bg-red-50',
  SEND_WHATSAPP: 'bg-green-100',
  SEND_EMAIL: 'bg-blue-100',
  OFFER_DISCOUNT: 'bg-purple-100',
  NURTURE_CONTENT: 'bg-pink-100',
};

interface InsightStats {
  total: number;
  pending: number;
  dismissed: number;
  actedOn: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

export default function InsightsPage() {
  const [insights, setInsights] = useState<LeadInsight[]>([]);
  const [stats, setStats] = useState<InsightStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const fetchInsights = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/insights');
      if (!response.ok) throw new Error('Erro ao carregar insights');
      const data = await response.json();
      setInsights(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/insights/stats');
      if (response.ok) setStats(await response.json());
    } catch { /* optional */ }
  }, []);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/insights/${id}/dismiss`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao descartar');
      toast.success('Insight descartado');
      setInsights(prev => prev.map(i => i.id === id ? { ...i, dismissed: true, dismissedAt: new Date().toISOString() } : i));
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const handleAct = async (id: string) => {
    try {
      const response = await fetch(`/api/insights/${id}/act`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao executar');
      toast.success('Insight marcado como executado');
      setInsights(prev => prev.map(i => i.id === id ? { ...i, actedOn: true, actedOnAt: new Date().toISOString() } : i));
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    }
  };

  const filteredInsights = insights.filter(i => {
    if (priorityFilter && i.priority !== priorityFilter) return false;
    return !i.dismissed && !i.actedOn;
  });

  const priorities: InsightPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Insights
            </h1>
            <p className="text-gray-500 mt-1">Ações recomendadas baseadas em IA</p>
          </div>
          <button onClick={() => { fetchInsights(); fetchStats(); }} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
            <LuRefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><LuLightbulb className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Pendentes</p>
                  <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl"><LuTriangleAlert className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Urgentes</p>
                  <p className="text-xl font-bold text-gray-900">{stats.byPriority?.URGENT || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-xl"><LuTarget className="w-5 h-5 text-orange-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Alta Prioridade</p>
                  <p className="text-xl font-bold text-gray-900">{stats.byPriority?.HIGH || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl"><LuCircleCheck className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Executados</p>
                  <p className="text-xl font-bold text-gray-900">{stats.actedOn}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Priority Filters */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-lg">
          <div className="flex items-center gap-2 flex-wrap">
            <LuFilter className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => setPriorityFilter('')}
              className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${!priorityFilter ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-white/80 border border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}
            >
              Todos
            </button>
            {priorities.map(p => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p === priorityFilter ? '' : p)}
                className={`px-4 py-2 rounded-2xl text-sm font-medium transition-all ${priorityFilter === p ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg' : 'bg-white/80 border border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}
              >
                {INSIGHT_PRIORITY_LABELS[p]}
                {stats?.byPriority?.[p] ? ` (${stats.byPriority[p]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-20 shadow-lg flex items-center justify-center">
              <LuLoader className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Carregando insights...</span>
            </div>
          ) : error ? (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-20 shadow-lg text-center">
              <div className="text-red-600 font-semibold">Erro ao carregar</div>
              <div className="text-gray-500 mt-1">{error}</div>
              <button onClick={fetchInsights} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl">Tentar novamente</button>
            </div>
          ) : filteredInsights.length === 0 ? (
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-20 shadow-lg text-center">
              <LuLightbulb className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-600">Nenhum insight pendente</p>
              <p className="text-gray-400 mt-1">Todos os insights foram tratados</p>
            </div>
          ) : (
            filteredInsights.map(insight => (
              <div key={insight.id} className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-5 shadow-lg hover:shadow-xl transition-all">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl ${INSIGHT_TYPE_BG[insight.type] || 'bg-gray-100'}`}>
                    {INSIGHT_TYPE_ICONS[insight.type] || <LuLightbulb className="w-5 h-5 text-gray-600" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-gray-900">{insight.title}</h3>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getInsightPriorityColor(insight.priority)}`}>
                        {INSIGHT_PRIORITY_LABELS[insight.priority]}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {INSIGHT_TYPE_LABELS[insight.type] || insight.type}
                      </span>
                    </div>
                    {insight.description && (
                      <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                      {insight.lead && (
                        <Link href={`/dashboard/crm/leads/${insight.leadId}`} className="flex items-center gap-1 text-blue-600 hover:underline">
                          <LuUser className="w-3 h-3" />
                          {insight.lead.name || insight.lead.email}
                        </Link>
                      )}
                      <span>Confiança: {Math.round(insight.confidence * 100)}%</span>
                      <span>Ação: {insight.action}</span>
                      {insight.expiresAt && (
                        <span>Expira: {new Date(insight.expiresAt).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleAct(insight.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-2xl hover:bg-green-100 transition-all text-sm font-medium"
                    >
                      <LuCircleCheck className="w-4 h-4" /> Executar
                    </button>
                    <button
                      onClick={() => handleDismiss(insight.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-2xl hover:bg-gray-100 transition-all text-sm"
                    >
                      <LuCircleX className="w-4 h-4" /> Descartar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
