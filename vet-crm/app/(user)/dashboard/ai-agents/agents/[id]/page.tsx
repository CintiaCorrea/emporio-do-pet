'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  LuArrowLeft,
  LuPencil,
  LuLoader,
  LuDollarSign
} from 'react-icons/lu';
import { toast } from 'sonner';

type TabId = 'overview' | 'executions' | 'analytics' | 'versions' | 'settings';

interface Agent {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  provider: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  totalInteractions: number;
  successRate: number;
  avgResponseTime: number;
  totalCostUsd: number;
  lastActiveAt?: string;
  rateLimitRequests: number;
  rateLimitWindow: number;
  voiceEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Execution {
  id: string;
  status: string;
  input: string;
  output?: string;
  error?: string;
  latencyMs: number;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  createdAt: string;
}

interface AnalyticsData {
  summary: {
    totalExecutions: number;
    successCount: number;
    failedCount: number;
    successRate: string;
    avgLatencyMs: number;
  };
  usage: { totalTokens: number; promptTokens: number; completionTokens: number };
  dailyStats: Array<{ date: string; total: number; success: number; failed: number; avgLatency: number }>;
  sourceBreakdown: Array<{ source: string; count: number; percentage: string }>;
  topErrors: Array<{ error: string; count: number }>;
}

interface AgentVersion {
  id: string;
  version: number;
  changeNotes?: string;
  config: Record<string, unknown>;
  createdAt: string;
}

interface RateLimitStatus {
  current: number;
  max: number;
  remaining: number;
  resetAt: string;
  windowSeconds: number;
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Executions state
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [execPage, setExecPage] = useState(1);
  const [execTotal, setExecTotal] = useState(0);
  const [execLoading, setExecLoading] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Versions state
  const [versions, setVersions] = useState<AgentVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);

  // Settings state
  const [rateLimit, setRateLimit] = useState<RateLimitStatus | null>(null);
  const [circuitStatus, setCircuitStatus] = useState<Record<string, unknown> | null>(null);

  const loadAgent = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Erro ao carregar agente');
      setAgent(data);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar agente');
      router.push('/dashboard/ai-agents/agents');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { loadAgent(); }, [loadAgent]);

  const loadExecutions = useCallback(async (page = 1) => {
    setExecLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}/executions?page=${page}&limit=15`);
      const data = await res.json();
      if (res.ok) {
        setExecutions(data.data || []);
        setExecTotal(data.pagination?.total || 0);
        setExecPage(page);
      }
    } catch (err) { console.error(err); }
    finally { setExecLoading(false); }
  }, [id]);

  const loadAnalytics = useCallback(async (days = 30) => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}/analytics?days=${days}`);
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch (err) { console.error(err); }
    finally { setAnalyticsLoading(false); }
  }, [id]);

  const loadVersions = useCallback(async () => {
    setVersionsLoading(true);
    try {
      const res = await fetch(`/api/agents/${id}/versions`);
      const data = await res.json();
      if (res.ok) setVersions(data.data || []);
    } catch (err) { console.error(err); }
    finally { setVersionsLoading(false); }
  }, [id]);

  const loadSettings = useCallback(async () => {
    try {
      const [rlRes, csRes] = await Promise.all([
        fetch(`/api/agents/${id}/rate-limit`),
        fetch('/api/agents/circuit-status'),
      ]);
      if (rlRes.ok) setRateLimit(await rlRes.json());
      if (csRes.ok) setCircuitStatus(await csRes.json());
    } catch (err) { console.error(err); }
  }, [id]);

  useEffect(() => {
    if (!agent) return;
    if (activeTab === 'executions') loadExecutions();
    else if (activeTab === 'analytics') loadAnalytics(analyticsDays);
    else if (activeTab === 'versions') loadVersions();
    else if (activeTab === 'settings') loadSettings();
  }, [activeTab, agent, loadExecutions, loadAnalytics, loadVersions, loadSettings, analyticsDays]);

  const handleStatusToggle = async () => {
    if (!agent) return;
    const newStatus = agent.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/agents/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })});
      if (res.ok) {
        toast.success(`Agente ${newStatus === 'ACTIVE' ? 'ativado' : 'pausado'}`);
        loadAgent();
      }
    } catch { toast.error('Erro ao atualizar status'); }
  };

  const handleCreateVersion = async () => {
    const notes = prompt('Notas da versão (opcional):');
    try {
      const res = await fetch(`/api/agents/${id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changeNotes: notes || undefined })});
      if (res.ok) {
        toast.success('Versão criada com sucesso');
        loadVersions();
      }
    } catch { toast.error('Erro ao criar versão'); }
  };

  const handleRollback = async (version: number) => {
    if (!confirm(`Reverter para versão ${version}?`)) return;
    try {
      const res = await fetch(`/api/agents/${id}/versions/${version}/rollback`, {
        method: 'POST'});
      if (res.ok) {
        toast.success(`Revertido para versão ${version}`);
        loadAgent();
        loadVersions();
      }
    } catch { toast.error('Erro ao reverter versão'); }
  };

  const handleResetRateLimit = async () => {
    try {
      const res = await fetch(`/api/agents/${id}/rate-limit`, { method: 'POST' });
      if (res.ok) {
        toast.success('Rate limit resetado');
        loadSettings();
      }
    } catch { toast.error('Erro ao resetar rate limit'); }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'});

  const formatNum = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <LuLoader className="w-12 h-12 text-violet-600 animate-spin" />
      </div>
    );
  }

  if (!agent) return null;

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Visão Geral', icon: <span style={{fontSize:"14px"}}>⚡</span> },
    { id: 'executions', label: 'Execuções', icon: <span style={{fontSize:"14px"}}>⏳</span> },
    { id: 'analytics', label: 'Analytics', icon: <span style={{fontSize:"14px"}}>📊</span> },
    { id: 'versions', label: 'Versões', icon: <span style={{fontSize:"14px"}}>🌿</span> },
    { id: 'settings', label: 'Configurações', icon: <span style={{fontSize:"14px"}}>⚙</span> },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">AI Agents</Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <Link href="/dashboard/ai-agents/agents" className="hover:text-violet-600">Agents</Link>
          <span style={{fontSize:"14px"}}>▶</span>
          <span className="text-gray-900 font-medium">{agent.name}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-lg">
              <LuArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="p-3 rounded-xl bg-violet-50">
              <span style={{fontSize:"14px"}}>🤖</span>
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
                <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                  agent.status === 'ACTIVE' ? 'bg-cyan-100 text-cyan-700' :
                  agent.status === 'PAUSED' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {agent.status === 'ACTIVE' ? 'Ativo' : agent.status === 'PAUSED' ? 'Pausado' : agent.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">{agent.provider} / {agent.model} / Temp: {agent.temperature}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleStatusToggle} className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              agent.status === 'ACTIVE' ? 'bg-orange-50 hover:bg-orange-100 text-orange-700' : 'bg-cyan-50 hover:bg-cyan-100 text-cyan-700'
            }`}>
              {agent.status === 'ACTIVE' ? <><span style={{fontSize:"14px"}}>⏸</span>Pausar</> : <><span style={{fontSize:"14px"}}>▶</span>Ativar</>}
            </button>
            <Link href={`/dashboard/ai-agents/agents/${id}/editar`} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">
              <LuPencil className="w-4 h-4" />Editar
            </Link>
            <Link href={`/dashboard/ai-agents/agents/${id}/testar`} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg">
              <span style={{fontSize:"14px"}}>💬</span>Testar
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-violet-600 text-violet-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <MetricCard icon={<span style={{fontSize:"14px"}}>⚡</span>} label="Interações" value={formatNum(agent.totalInteractions)} bg="bg-blue-50" />
              <MetricCard icon={<span style={{fontSize:"14px"}}>✓</span>} label="Taxa Sucesso" value={`${agent.successRate.toFixed(1)}%`} bg="bg-cyan-50" />
              <MetricCard icon={<span style={{fontSize:"14px"}}>⏱</span>} label="Latência Média" value={`${(agent.avgResponseTime / 1000).toFixed(1)}s`} bg="bg-orange-50" />
              <MetricCard icon={<LuDollarSign className="w-5 h-5 text-violet-600" />} label="Custo Total" value={`$${agent.totalCostUsd.toFixed(4)}`} bg="bg-violet-50" />
              <MetricCard icon={<span style={{fontSize:"14px"}}>📈</span>} label="Última Atividade" value={agent.lastActiveAt ? new Date(agent.lastActiveAt).toLocaleDateString('pt-BR') : '-'} bg="bg-fuchsia-50" />
            </div>

            {/* Description & Config */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Descrição</h3>
                <p className="text-gray-700">{agent.description || 'Sem descrição'}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Configuração</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Provider:</span> <span className="font-medium text-gray-900">{agent.provider}</span></div>
                  <div><span className="text-gray-500">Modelo:</span> <span className="font-medium text-gray-900">{agent.model}</span></div>
                  <div><span className="text-gray-500">Temperatura:</span> <span className="font-medium text-gray-900">{agent.temperature}</span></div>
                  <div><span className="text-gray-500">Max Tokens:</span> <span className="font-medium text-gray-900">{formatNum(agent.maxTokens)}</span></div>
                  <div><span className="text-gray-500">Rate Limit:</span> <span className="font-medium text-gray-900">{agent.rateLimitRequests}/{agent.rateLimitWindow}s</span></div>
                  <div><span className="text-gray-500">Voz:</span> <span className="font-medium text-gray-900">{agent.voiceEnabled ? 'Habilitada' : 'Desabilitada'}</span></div>
                </div>
              </div>
            </div>

            {/* System Prompt Preview */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">System Prompt</h3>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-4 max-h-60 overflow-y-auto font-mono">
                {agent.systemPrompt}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'executions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Histórico de Execuções ({execTotal})</h3>
              <button onClick={() => loadExecutions(execPage)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                <span style={{fontSize:"14px"}}>↻</span>Atualizar
              </button>
            </div>

            {execLoading ? (
              <div className="flex justify-center py-12"><LuLoader className="w-8 h-8 animate-spin text-violet-600" /></div>
            ) : executions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <span style={{fontSize:"14px"}}>⏳</span>
                <p className="text-gray-500">Nenhuma execução encontrada</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Input</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Output</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Latência</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Tokens</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-500">Data</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {executions.map(exec => (
                        <tr key={exec.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            {exec.status === 'SUCCESS' ? (
                              <span className="flex items-center gap-1.5 text-cyan-600"><span style={{fontSize:"14px"}}>✓</span>OK</span>
                            ) : (
                              <span className="flex items-center gap-1.5 text-red-600"><span style={{fontSize:"14px"}}>✗</span>Erro</span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{exec.input}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{exec.output || exec.error || '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{exec.latencyMs ? `${(exec.latencyMs / 1000).toFixed(1)}s` : '-'}</td>
                          <td className="px-4 py-3 text-gray-600">{exec.usage?.total_tokens ? formatNum(exec.usage.total_tokens) : '-'}</td>
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(exec.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {execTotal > 15 && (
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => loadExecutions(execPage - 1)} disabled={execPage <= 1} className="px-3 py-2 bg-white border rounded-lg disabled:opacity-50">
                      <span style={{fontSize:"12px"}}>◀</span>
                    </button>
                    <span className="text-sm text-gray-500">Página {execPage} de {Math.ceil(execTotal / 15)}</span>
                    <button onClick={() => loadExecutions(execPage + 1)} disabled={execPage >= Math.ceil(execTotal / 15)} className="px-3 py-2 bg-white border rounded-lg disabled:opacity-50">
                      <span style={{fontSize:"14px"}}>▶</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
              <select
                value={analyticsDays}
                onChange={(e) => setAnalyticsDays(Number(e.target.value))}
                className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                <option value={7}>Últimos 7 dias</option>
                <option value={14}>Últimos 14 dias</option>
                <option value={30}>Últimos 30 dias</option>
                <option value={90}>Últimos 90 dias</option>
              </select>
            </div>

            {analyticsLoading ? (
              <div className="flex justify-center py-12"><LuLoader className="w-8 h-8 animate-spin text-violet-600" /></div>
            ) : !analytics ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <span style={{fontSize:"14px"}}>📊</span>
                <p className="text-gray-500">Sem dados de analytics disponíveis</p>
              </div>
            ) : (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <MetricCard icon={<span style={{fontSize:"14px"}}>⚡</span>} label="Execuções" value={formatNum(analytics.summary.totalExecutions)} bg="bg-blue-50" />
                  <MetricCard icon={<span style={{fontSize:"14px"}}>✓</span>} label="Sucesso" value={formatNum(analytics.summary.successCount)} bg="bg-cyan-50" />
                  <MetricCard icon={<span style={{fontSize:"14px"}}>✗</span>} label="Falhas" value={formatNum(analytics.summary.failedCount)} bg="bg-red-50" />
                  <MetricCard icon={<span style={{fontSize:"14px"}}>📈</span>} label="Taxa Sucesso" value={`${analytics.summary.successRate}%`} bg="bg-violet-50" />
                  <MetricCard icon={<span style={{fontSize:"14px"}}>⏱</span>} label="Latência Média" value={`${(analytics.summary.avgLatencyMs / 1000).toFixed(1)}s`} bg="bg-orange-50" />
                </div>

                {/* Token Usage */}
                <div className="bg-white rounded-2xl border border-gray-100 p-6">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Uso de Tokens</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{formatNum(analytics.usage.promptTokens)}</p>
                      <p className="text-sm text-gray-500">Prompt Tokens</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{formatNum(analytics.usage.completionTokens)}</p>
                      <p className="text-sm text-gray-500">Completion Tokens</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-2xl font-bold text-gray-900">{formatNum(analytics.usage.totalTokens)}</p>
                      <p className="text-sm text-gray-500">Total Tokens</p>
                    </div>
                  </div>
                </div>

                {/* Daily Stats Chart (simplified bar chart) */}
                {analytics.dailyStats.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Execuções por Dia</h4>
                    <div className="flex items-end gap-1 h-40">
                      {analytics.dailyStats.map(day => {
                        const maxVal = Math.max(...analytics.dailyStats.map(d => d.total), 1);
                        const height = (day.total / maxVal) * 100;
                        const successPct = day.total > 0 ? (day.success / day.total) * 100 : 0;
                        return (
                          <div key={day.date} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.total} total, ${day.success} sucesso, ${day.failed} falha`}>
                            <div className="w-full relative rounded-t-md overflow-hidden" style={{ height: `${Math.max(height, 4)}%` }}>
                              <div className="absolute bottom-0 w-full bg-cyan-400" style={{ height: `${successPct}%` }} />
                              <div className="absolute top-0 w-full bg-red-300" style={{ height: `${100 - successPct}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-400 -rotate-45 origin-top-left whitespace-nowrap">{day.date.slice(5)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-cyan-400 rounded-sm" />Sucesso</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded-sm" />Falha</span>
                    </div>
                  </div>
                )}

                {/* Source Breakdown & Top Errors */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Origem das Execuções</h4>
                    {analytics.sourceBreakdown.length === 0 ? (
                      <p className="text-gray-400 text-sm">Sem dados</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.sourceBreakdown.map(s => (
                          <div key={s.source} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700 capitalize">{s.source}</span>
                            <span className="text-gray-500">{s.count} ({s.percentage}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-100 p-6">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase mb-3">Erros Frequentes</h4>
                    {analytics.topErrors.length === 0 ? (
                      <p className="text-gray-400 text-sm">Nenhum erro no período</p>
                    ) : (
                      <div className="space-y-2">
                        {analytics.topErrors.map((e, i) => (
                          <div key={i} className="flex items-start justify-between text-sm gap-2">
                            <span className="text-red-600 truncate flex-1">{e.error}</span>
                            <span className="text-gray-500 whitespace-nowrap">{e.count}x</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'versions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Versões do Agente</h3>
              <button onClick={handleCreateVersion} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm">
                <span style={{fontSize:"14px"}}>🌿</span>Criar Versão
              </button>
            </div>

            {versionsLoading ? (
              <div className="flex justify-center py-12"><LuLoader className="w-8 h-8 animate-spin text-violet-600" /></div>
            ) : versions.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
                <span style={{fontSize:"14px"}}>🌿</span>
                <p className="text-gray-500">Nenhuma versão salva</p>
                <p className="text-gray-400 text-sm mt-1">Crie uma versão para salvar o estado atual do agente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((v, idx) => (
                  <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl ${idx === 0 ? 'bg-violet-50' : 'bg-gray-50'}`}>
                        <span style={{fontSize:"14px"}}>🌿</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">v{v.version}</span>
                          {idx === 0 && <span className="px-2 py-0.5 bg-violet-100 text-violet-600 text-xs rounded-full">Mais recente</span>}
                        </div>
                        <p className="text-sm text-gray-500">{v.changeNotes || 'Sem notas'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDate(v.createdAt)}</p>
                      </div>
                    </div>
                    {idx > 0 && (
                      <button onClick={() => handleRollback(v.version)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-lg">
                        <span style={{fontSize:"14px"}}>↙</span>Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Rate Limit */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-gray-500 uppercase">Rate Limit</h4>
                <button onClick={handleResetRateLimit} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
                  <span style={{fontSize:"14px"}}>↻</span>Resetar
                </button>
              </div>
              {rateLimit ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Usadas</p>
                    <p className="text-xl font-bold text-gray-900">{rateLimit.current}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Restantes</p>
                    <p className="text-xl font-bold text-gray-900">{rateLimit.remaining}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Máximo</p>
                    <p className="text-xl font-bold text-gray-900">{rateLimit.max}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Janela</p>
                    <p className="text-xl font-bold text-gray-900">{rateLimit.windowSeconds}s</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Carregando informações de rate limit...</p>
              )}
            </div>

            {/* Circuit Breaker */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Circuit Breaker (Serviço IA)</h4>
              {circuitStatus ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Estado</p>
                    <p className={`text-xl font-bold ${
                      (circuitStatus.state as string) === 'CLOSED' ? 'text-cyan-600' :
                      (circuitStatus.state as string) === 'OPEN' ? 'text-red-600' : 'text-orange-600'
                    }`}>
                      {(circuitStatus.state as string) === 'CLOSED' ? 'Fechado (OK)' :
                       (circuitStatus.state as string) === 'OPEN' ? 'Aberto (Bloq.)' : 'Semi-Aberto'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Falhas</p>
                    <p className="text-xl font-bold text-gray-900">{circuitStatus.failures as number || 0}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Sucessos</p>
                    <p className="text-xl font-bold text-gray-900">{circuitStatus.successes as number || 0}</p>
                  </div>
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Carregando status do circuit breaker...</p>
              )}
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-4">Ações Rápidas</h4>
              <div className="flex flex-wrap gap-3">
                <Link href={`/dashboard/ai-agents/agents/${id}/editar`} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
                  <LuPencil className="w-4 h-4" />Editar Agente
                </Link>
                <Link href={`/dashboard/ai-agents/agents/${id}/testar`} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
                  <span style={{fontSize:"14px"}}>💬</span>Testar Agente
                </Link>
                <button onClick={handleCreateVersion} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700">
                  <span style={{fontSize:"14px"}}>🌿</span>Salvar Versão
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string; bg: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${bg}`}>{icon}</div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
