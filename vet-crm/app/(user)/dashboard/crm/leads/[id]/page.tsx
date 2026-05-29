'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuArrowLeft, LuLoader, LuRefreshCw, LuArrowRightLeft,
  LuZap, LuTarget, LuUser, LuMail, LuPhone, LuGlobe,
  LuMapPin, LuTag, LuCalendar, LuClock, LuEye,
  LuShoppingCart, LuMessageCircle, LuMousePointer,
  LuFileText, LuTrendingUp, LuTrendingDown, LuChartBar,
  LuLightbulb, LuTriangleAlert, LuCircleCheck, LuCircleX,
  LuHistory, LuActivity, LuSmartphone, LuMonitor, LuTablet,
  LuChevronRight, LuStar, LuBrain, LuSearch
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { Lead, LeadEvent, LeadInsight, LeadScore, LeadHistory, LeadEnrichment } from '@/types/crm';
import {
  LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS,
  getScoreColor, getScoreLabel, getStatusColor,
  getInsightPriorityColor, INSIGHT_TYPE_LABELS, INSIGHT_PRIORITY_LABELS
} from '@/types/crm';

type Tab = 'resumo' | 'timeline' | 'insights' | 'score' | 'enrichment' | 'historico';

const EVENT_ICONS: Record<string, React.ReactNode> = {
  page_view: <LuEye className="w-4 h-4" />,
  checkout_start: <LuShoppingCart className="w-4 h-4" />,
  checkout_abandon: <LuShoppingCart className="w-4 h-4 text-red-500" />,
  whatsapp_click: <LuMessageCircle className="w-4 h-4 text-green-500" />,
  whatsapp_conversation: <LuMessageCircle className="w-4 h-4 text-green-500" />,
  form_submit: <LuFileText className="w-4 h-4" />,
  pricing_view: <LuTarget className="w-4 h-4 text-purple-500" />,
  lead_created: <LuStar className="w-4 h-4 text-blue-500" />,
  button_click: <LuMousePointer className="w-4 h-4" />,
  scroll_depth: <LuTrendingDown className="w-4 h-4" />,
  session_start: <LuActivity className="w-4 h-4" />,
  session_end: <LuClock className="w-4 h-4" />,
};

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  DESKTOP: <LuMonitor className="w-4 h-4" />,
  MOBILE: <LuSmartphone className="w-4 h-4" />,
  TABLET: <LuTablet className="w-4 h-4" />,
  UNKNOWN: <LuGlobe className="w-4 h-4" />,
};

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('resumo');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLead = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/leads/${id}`);
      if (!response.ok) throw new Error('Lead não encontrado');
      const data = await response.json();
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLead(); }, [id]);

  const handleConvert = async () => {
    try {
      setActionLoading('convert');
      const response = await fetch(`/api/crm/leads/${id}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Erro ao converter');
      toast.success('Lead convertido para cliente!');
      fetchLead();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao converter');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnrich = async () => {
    try {
      setActionLoading('enrich');
      const response = await fetch(`/api/leads/${id}/enrich`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao enriquecer');
      toast.success('Enriquecimento iniciado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRescore = async () => {
    try {
      setActionLoading('score');
      const response = await fetch(`/api/leads/${id}/score`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro ao recalcular score');
      toast.success('Recálculo de score iniciado!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDismissInsight = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/dismiss`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro');
      toast.success('Insight descartado');
      fetchLead();
    } catch { toast.error('Erro ao descartar insight'); }
  };

  const handleActInsight = async (insightId: string) => {
    try {
      const response = await fetch(`/api/insights/${insightId}/act`, { method: 'POST' });
      if (!response.ok) throw new Error('Erro');
      toast.success('Insight marcado como executado');
      fetchLead();
    } catch { toast.error('Erro ao atuar sobre insight'); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <LuLoader className="w-6 h-6 animate-spin" />
          <span className="text-lg">Carregando lead...</span>
        </div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 font-semibold text-lg">{error || 'Lead não encontrado'}</div>
          <button onClick={() => router.back()} className="mt-4 px-6 py-2 bg-gray-200 rounded-2xl hover:bg-gray-300 transition-all">
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'resumo', label: 'Resumo', icon: <LuUser className="w-4 h-4" /> },
    { key: 'timeline', label: 'Timeline', icon: <LuActivity className="w-4 h-4" /> },
    { key: 'insights', label: 'Insights', icon: <LuLightbulb className="w-4 h-4" /> },
    { key: 'score', label: 'Score', icon: <LuTarget className="w-4 h-4" /> },
    { key: 'enrichment', label: 'Enrichment', icon: <LuBrain className="w-4 h-4" /> },
    { key: 'historico', label: 'Histórico', icon: <LuHistory className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
            <LuArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{lead.name || 'Lead sem nome'}</h1>
            <p className="text-sm text-gray-500">{lead.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-bold border ${getScoreColor(lead.currentScore)}`}>
              Score: {lead.currentScore} · {getScoreLabel(lead.currentScore)}
            </span>
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium border ${getStatusColor(lead.status)}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button onClick={fetchLead} className="flex items-center gap-2 px-4 py-2 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-white transition-all text-sm">
            <LuRefreshCw className="w-4 h-4" /> Atualizar
          </button>
          <button onClick={handleEnrich} disabled={actionLoading === 'enrich'} className="flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-2xl hover:bg-purple-100 transition-all text-sm text-purple-700 disabled:opacity-50">
            {actionLoading === 'enrich' ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuBrain className="w-4 h-4" />} Enriquecer
          </button>
          <button onClick={handleRescore} disabled={actionLoading === 'score'} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-2xl hover:bg-blue-100 transition-all text-sm text-blue-700 disabled:opacity-50">
            {actionLoading === 'score' ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuTarget className="w-4 h-4" />} Recalcular Score
          </button>
          {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
            <button onClick={handleConvert} disabled={actionLoading === 'convert'} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-cyan-600 text-white rounded-2xl hover:scale-105 transition-all text-sm shadow-lg shadow-green-500/25 disabled:opacity-50">
              {actionLoading === 'convert' ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuArrowRightLeft className="w-4 h-4" />} Converter para Cliente
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/80 border border-gray-200/80 rounded-2xl p-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-lg">
          {activeTab === 'resumo' && <ResumoTab lead={lead} />}
          {activeTab === 'timeline' && <TimelineTab events={lead.events || []} />}
          {activeTab === 'insights' && <InsightsTab insights={lead.insights || []} onDismiss={handleDismissInsight} onAct={handleActInsight} />}
          {activeTab === 'score' && <ScoreTab scores={lead.scores || []} currentScore={lead.currentScore} />}
          {activeTab === 'enrichment' && <EnrichmentTab enrichment={lead.enrichment || null} />}
          {activeTab === 'historico' && <HistoricoTab history={lead.history || []} />}
        </div>
      </div>
    </div>
  );
}

function ResumoTab({ lead }: { lead: Lead }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Informações Básicas</h3>
        <div className="space-y-3">
          <InfoRow icon={<LuUser className="w-4 h-4" />} label="Nome" value={lead.name || 'N/A'} />
          <InfoRow icon={<LuMail className="w-4 h-4" />} label="Email" value={lead.email} />
          <InfoRow icon={<LuPhone className="w-4 h-4" />} label="Telefone" value={lead.phone || 'N/A'} />
          <InfoRow icon={<LuGlobe className="w-4 h-4" />} label="Origem" value={LEAD_SOURCE_LABELS[lead.source] || lead.source} />
          {lead.sourceDetail && <InfoRow icon={<LuTag className="w-4 h-4" />} label="Detalhe" value={lead.sourceDetail} />}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Localização & Dispositivo</h3>
        <div className="space-y-3">
          {lead.city && <InfoRow icon={<LuMapPin className="w-4 h-4" />} label="Cidade" value={`${lead.city}${lead.state ? `, ${lead.state}` : ''}`} />}
          <InfoRow icon={<LuGlobe className="w-4 h-4" />} label="País" value={lead.country} />
          <InfoRow icon={DEVICE_ICONS[lead.device] || <LuGlobe className="w-4 h-4" />} label="Dispositivo" value={lead.device} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Datas</h3>
        <div className="space-y-3">
          <InfoRow icon={<LuCalendar className="w-4 h-4" />} label="Primeiro acesso" value={new Date(lead.firstSeenAt).toLocaleString('pt-BR')} />
          <InfoRow icon={<LuClock className="w-4 h-4" />} label="Último acesso" value={new Date(lead.lastSeenAt).toLocaleString('pt-BR')} />
          {lead.lastActivityAt && <InfoRow icon={<LuActivity className="w-4 h-4" />} label="Última atividade" value={new Date(lead.lastActivityAt).toLocaleString('pt-BR')} />}
          {lead.convertedAt && <InfoRow icon={<LuCircleCheck className="w-4 h-4" />} label="Convertido em" value={new Date(lead.convertedAt).toLocaleString('pt-BR')} />}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Flags Comportamentais</h3>
        <div className="space-y-3">
          <FlagRow label="Visitou pricing" active={lead.visitedPricing} />
          <FlagRow label="Abandonou carrinho" active={lead.abandonedCart} />
          <FlagRow label="Retornou em 24h" active={lead.returnedWithin24h} />
        </div>

        {lead.tags.length > 0 && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mt-6">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {lead.tags.map(tag => (
                <span key={tag} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">{tag}</span>
              ))}
            </div>
          </>
        )}

        {lead.notes && (
          <>
            <h3 className="text-lg font-bold text-gray-900 mt-6">Notas</h3>
            <p className="text-gray-600 text-sm bg-gray-50 rounded-xl p-3">{lead.notes}</p>
          </>
        )}
      </div>

      {(lead.utmSource || lead.utmMedium || lead.utmCampaign) && (
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-bold text-gray-900">UTM Data</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {lead.utmSource && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Source</p><p className="font-medium text-gray-900">{lead.utmSource}</p></div>}
            {lead.utmMedium && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Medium</p><p className="font-medium text-gray-900">{lead.utmMedium}</p></div>}
            {lead.utmCampaign && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Campaign</p><p className="font-medium text-gray-900">{lead.utmCampaign}</p></div>}
            {lead.utmContent && <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs text-gray-500">Content</p><p className="font-medium text-gray-900">{lead.utmContent}</p></div>}
          </div>
          {lead.referrer && <InfoRow icon={<LuGlobe className="w-4 h-4" />} label="Referrer" value={lead.referrer} />}
          {lead.landingPage && <InfoRow icon={<LuSearch className="w-4 h-4" />} label="Landing Page" value={lead.landingPage} />}
        </div>
      )}

      {(lead.whatsappConversationId || lead.convertedToClientId) && (
        <div className="space-y-4 md:col-span-2">
          <h3 className="text-lg font-bold text-gray-900">Integrações</h3>
          <div className="flex flex-wrap gap-3">
            {lead.whatsappConversationId && (
              <Link
                href={`/dashboard/ai-agents/conversas?conversation=${lead.whatsappConversationId}`}
                className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-2xl hover:bg-green-100 transition-all"
              >
                <LuMessageCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-green-800">Conversa WhatsApp</p>
                  <p className="text-xs text-green-600">Abrir conversa vinculada</p>
                </div>
                <LuChevronRight className="w-4 h-4 text-green-400 ml-2" />
              </Link>
            )}
            {lead.convertedToClientId && (
              <Link
                href={`/dashboard/crm/clientes/${lead.convertedToClientId}`}
                className="flex items-center gap-2 px-4 py-3 bg-cyan-50 border border-cyan-200 rounded-2xl hover:bg-cyan-100 transition-all"
              >
                <LuArrowRightLeft className="w-5 h-5 text-cyan-600" />
                <div>
                  <p className="text-sm font-medium text-cyan-800">Cliente Convertido</p>
                  <p className="text-xs text-cyan-600">Ver ficha do cliente</p>
                </div>
                <LuChevronRight className="w-4 h-4 text-cyan-400 ml-2" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ events }: { events: LeadEvent[] }) {
  if (events.length === 0) {
    return <div className="text-center py-12 text-gray-400"><LuActivity className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum evento registrado</p></div>;
  }

  const sorted = [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-1">
      {sorted.map((event, idx) => (
        <div key={event.id} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center">
            <div className="p-2 bg-gray-100 rounded-xl">
              {EVENT_ICONS[event.eventType] || <LuActivity className="w-4 h-4" />}
            </div>
            {idx < sorted.length - 1 && <div className="w-px flex-1 bg-gray-200 my-1" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900 text-sm">{event.eventType.replace(/_/g, ' ')}</p>
              <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString('pt-BR')}</span>
            </div>
            {event.page && <p className="text-xs text-gray-500 mt-0.5">{event.page}</p>}
            {event.duration && <p className="text-xs text-gray-400 mt-0.5">{event.duration}s de duração</p>}
            {event.eventData && Object.keys(event.eventData).length > 0 && (
              <div className="mt-1.5 text-xs bg-gray-50 rounded-lg p-2 text-gray-600">
                {Object.entries(event.eventData).map(([k, v]) => (
                  <span key={k} className="mr-3"><span className="font-medium">{k}:</span> {String(v)}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function InsightsTab({ insights, onDismiss, onAct }: { insights: LeadInsight[]; onDismiss: (id: string) => void; onAct: (id: string) => void }) {
  const active = insights.filter(i => !i.dismissed && !i.actedOn);
  const past = insights.filter(i => i.dismissed || i.actedOn);

  if (insights.length === 0) {
    return <div className="text-center py-12 text-gray-400"><LuLightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum insight disponível</p></div>;
  }

  return (
    <div className="space-y-6">
      {active.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3">Insights Ativos ({active.length})</h3>
          <div className="space-y-3">
            {active.map(insight => (
              <div key={insight.id} className="flex items-start gap-4 p-4 rounded-2xl border border-gray-100 hover:border-blue-200 transition-all">
                <div className={`p-2 rounded-xl ${insight.priority === 'URGENT' ? 'bg-red-100' : insight.priority === 'HIGH' ? 'bg-orange-100' : 'bg-blue-100'}`}>
                  <LuLightbulb className={`w-5 h-5 ${insight.priority === 'URGENT' ? 'text-red-600' : insight.priority === 'HIGH' ? 'text-orange-600' : 'text-blue-600'}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{insight.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getInsightPriorityColor(insight.priority)}`}>
                      {INSIGHT_PRIORITY_LABELS[insight.priority]}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {INSIGHT_TYPE_LABELS[insight.type] || insight.type}
                    </span>
                  </div>
                  {insight.description && <p className="text-sm text-gray-600">{insight.description}</p>}
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <span>Confiança: {Math.round(insight.confidence * 100)}%</span>
                    <span>·</span>
                    <span>Ação: {insight.action}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => onAct(insight.id)} className="px-3 py-1.5 text-xs bg-green-50 text-green-700 border border-green-200 rounded-xl hover:bg-green-100 transition-all">
                    Executar
                  </button>
                  <button onClick={() => onDismiss(insight.id)} className="px-3 py-1.5 text-xs bg-gray-50 text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all">
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Anteriores ({past.length})</h3>
          <div className="space-y-2">
            {past.map(insight => (
              <div key={insight.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 opacity-60">
                {insight.actedOn ? <LuCircleCheck className="w-4 h-4 text-green-500" /> : <LuCircleX className="w-4 h-4 text-gray-400" />}
                <span className="text-sm text-gray-600 flex-1">{insight.title}</span>
                <span className="text-xs text-gray-400">{insight.actedOn ? 'Executado' : 'Descartado'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreTab({ scores, currentScore }: { scores: LeadScore[]; currentScore: number }) {
  const sorted = [...scores].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const latest = sorted[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-6">
        <div className={`w-24 h-24 rounded-3xl flex items-center justify-center border-2 ${getScoreColor(currentScore)}`}>
          <div className="text-center">
            <p className="text-3xl font-bold">{currentScore}</p>
            <p className="text-xs">{getScoreLabel(currentScore)}</p>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Score Atual</h3>
          <p className="text-sm text-gray-500">0-30 Frio · 31-50 Morno · 51-70 Quente · 71-100 Muito Quente</p>
          {latest && <p className="text-xs text-gray-400 mt-1">Algoritmo: {latest.algorithm} v{latest.version}</p>}
        </div>
      </div>

      {latest?.breakdown && (
        <div>
          <h3 className="text-md font-bold text-gray-900 mb-3">Breakdown</h3>
          <div className="space-y-2">
            {Object.entries(latest.breakdown).map(([key, val]) => {
              const numVal = typeof val === 'number' ? val : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 w-40 capitalize">{key.replace(/_/g, ' ')}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${numVal > 0 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-red-400'}`}
                      style={{ width: `${Math.min(Math.abs(numVal), 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-semibold w-12 text-right ${numVal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {numVal > 0 ? '+' : ''}{numVal}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {sorted.length > 1 && (
        <div>
          <h3 className="text-md font-bold text-gray-900 mb-3">Histórico de Scores</h3>
          <div className="space-y-2">
            {sorted.map(score => (
              <div key={score.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50">
                <span className={`text-lg font-bold w-12 text-center ${getScoreColor(score.score).split(' ')[0]}`}>{score.score}</span>
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{new Date(score.createdAt).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-gray-400">{score.algorithm} v{score.version}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EnrichmentTab({ enrichment }: { enrichment: LeadEnrichment | null }) {
  if (!enrichment) {
    return <div className="text-center py-12 text-gray-400"><LuBrain className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum dado de enriquecimento</p><p className="text-sm mt-1">Use o botão &quot;Enriquecer&quot; para iniciar</p></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Email</h3>
        <div className="space-y-3">
          <InfoRow icon={<LuMail className="w-4 h-4" />} label="Provedor" value={enrichment.emailProvider || 'N/A'} />
          <FlagRow label="Email válido" active={enrichment.emailValid} />
          <FlagRow label="Email descartável" active={enrichment.emailDisposable} negative />
          {enrichment.emailRisk && <InfoRow icon={<LuTriangleAlert className="w-4 h-4" />} label="Risco" value={enrichment.emailRisk} />}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Comportamento</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Page Views" value={enrichment.totalPageViews} />
          <MetricCard label="Páginas Únicas" value={enrichment.uniquePages} />
          <MetricCard label="Pricing Views" value={enrichment.pricingPageViews} />
          <MetricCard label="Checkout Starts" value={enrichment.checkoutStarts} />
          <MetricCard label="Cart Abandons" value={enrichment.checkoutAbandons} />
          <MetricCard label="Form Submits" value={enrichment.formSubmissions} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Sessões</h3>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total Sessões" value={enrichment.totalSessions} />
          <MetricCard label="Duração Média" value={`${enrichment.avgSessionDuration}s`} />
          <MetricCard label="Tempo Total" value={`${Math.round(enrichment.totalTimeOnSite / 60)}min`} />
          <MetricCard label="Frequência" value={enrichment.visitFrequency.toFixed(1)} />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Atividade</h3>
        <div className="space-y-3">
          <InfoRow icon={<LuCalendar className="w-4 h-4" />} label="Dias Ativo" value={String(enrichment.daysActive)} />
          <InfoRow icon={<LuClock className="w-4 h-4" />} label="Desde 1ª visita" value={`${enrichment.daysSinceFirstVisit} dias`} />
          <InfoRow icon={<LuClock className="w-4 h-4" />} label="Desde última visita" value={`${enrichment.daysSinceLastVisit} dias`} />
          {enrichment.preferredTimeSlot && <InfoRow icon={<LuClock className="w-4 h-4" />} label="Horário preferido" value={enrichment.preferredTimeSlot} />}
          {enrichment.primaryChannel && <InfoRow icon={<LuGlobe className="w-4 h-4" />} label="Canal principal" value={enrichment.primaryChannel} />}
          <InfoRow icon={<LuShoppingCart className="w-4 h-4" />} label="Intenção de compra" value={enrichment.purchaseIntent} />
        </div>
      </div>
    </div>
  );
}

function HistoricoTab({ history }: { history: LeadHistory[] }) {
  if (history.length === 0) {
    return <div className="text-center py-12 text-gray-400"><LuHistory className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum registro no histórico</p></div>;
  }

  const sorted = [...history].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-2">
      {sorted.map(entry => (
        <div key={entry.id} className="flex items-start gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors">
          <div className="p-2 bg-gray-100 rounded-xl">
            <LuHistory className="w-4 h-4 text-gray-500" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-sm text-gray-900 capitalize">{entry.action.replace(/_/g, ' ')}</p>
            {entry.field && (
              <div className="flex items-center gap-2 mt-1 text-xs">
                <span className="text-gray-500">{entry.field}:</span>
                {entry.oldValue && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded line-through">{entry.oldValue}</span>}
                {entry.oldValue && entry.newValue && <LuChevronRight className="w-3 h-3 text-gray-400" />}
                {entry.newValue && <span className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded">{entry.newValue}</span>}
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>{new Date(entry.createdAt).toLocaleString('pt-BR')}</span>
              {entry.triggeredBy && <><span>·</span><span>por {entry.triggeredBy}</span></>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <span className="text-sm text-gray-500 w-32">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function FlagRow({ label, active, negative }: { label: string; active: boolean; negative?: boolean }) {
  const isGood = negative ? !active : active;
  return (
    <div className="flex items-center gap-3">
      <div className={`w-2 h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-gray-300'}`} />
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-xs font-medium ${active ? (negative ? 'text-red-600' : 'text-green-600') : 'text-gray-400'}`}>
        {active ? 'Sim' : 'Não'}
      </span>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  );
}
