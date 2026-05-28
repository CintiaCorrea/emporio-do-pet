'use client';

import { useEffect, useState, useMemo } from 'react';

type Period = 'hoje' | 'semana' | 'mes' | 'tudo';

interface LeadItem {
  kind: 'lead';
  id: string;
  name: string;
  phone: string | null;
  status: string;
  tags: string[];
  lastSeenAt: string;
  lastInteraction: any;
  source: string | null;
}

interface InteractionItem {
  kind: 'interaction';
  leadId: string;
  leadName: string | null;
  leadPhone: string | null;
  eventType: string;
  eventData: any;
  createdAt: string;
}

interface InboxData {
  leads: LeadItem[];
  recentInteractions: InteractionItem[];
  counts: { triagem: number; recentes: number };
}

const TAG_COLORS: Record<string, string> = {
  'OR': 'bg-blue-100 text-blue-800',     // Origem
  'SR': 'bg-purple-100 text-purple-800', // Serviço
  'ES': 'bg-green-100 text-green-800',   // Espécie
  'SX': 'bg-pink-100 text-pink-800',     // Sexo
  'ID': 'bg-yellow-100 text-yellow-800', // Idade
  'CO': 'bg-red-100 text-red-800',       // Comorbidade
  'FU': 'bg-indigo-100 text-indigo-800', // Status FU
  'MP': 'bg-orange-100 text-orange-800', // Motivo perda
  'P':  'bg-cyan-100 text-cyan-800',     // Perfil
  'ST': 'bg-amber-100 text-amber-800',   // Status clínico
};

function tagColor(tag: string): string {
  const prefix = tag.split('-')[0];
  return TAG_COLORS[prefix] || 'bg-gray-100 text-gray-800';
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} d`;
}

export default function InboxRecepcaoPage() {
  const [period, setPeriod] = useState<Period>('tudo');
  const [data, setData] = useState<InboxData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/inbox/recepcao?period=${period}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e: any) {
        setError(e.message || 'Erro ao carregar inbox');
      } finally {
        setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000); // refresh a cada 30s
    return () => clearInterval(t);
  }, [period]);

  const triagemLeads = useMemo(
    () => (data?.leads || []).filter((l) => l.status === 'AGUARDANDO_TRIAGEM'),
    [data],
  );
  const otherLeads = useMemo(
    () => (data?.leads || []).filter((l) => l.status !== 'AGUARDANDO_TRIAGEM'),
    [data],
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox Recepção</h1>
        <p className="text-gray-600 mt-1">
          Quem precisa de atenção agora — leads em triagem + interações recentes
        </p>
      </header>

      {/* Filtros de período */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['hoje', 'semana', 'mes', 'tudo'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              period === p
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {p === 'hoje' ? 'Hoje' : p === 'semana' ? 'Semana' : p === 'mes' ? 'Mês' : 'Tudo'}
          </button>
        ))}
      </div>

      {/* Cards de contadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Em triagem</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">
            {data?.counts.triagem ?? '—'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Interações recentes</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">
            {data?.counts.recentes ?? '—'}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">Período</p>
          <p className="text-lg font-medium text-gray-900 mt-2 capitalize">{period}</p>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          Erro: {error}
        </div>
      )}

      {/* Triagem */}
      {!loading && !error && (
        <>
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
              Aguardando triagem ({triagemLeads.length})
            </h2>
            {triagemLeads.length === 0 ? (
              <p className="text-gray-500 text-sm bg-gray-50 p-4 rounded-lg">
                Nada aguardando triagem nesse período.
              </p>
            ) : (
              <div className="grid gap-3">
                {triagemLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            )}
          </section>

          {/* Outros leads novos */}
          {otherLeads.length > 0 && (
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                Novos ({otherLeads.length})
              </h2>
              <div className="grid gap-3">
                {otherLeads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </div>
            </section>
          )}

          {/* Interações recentes (48h) */}
          {data && data.recentInteractions.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                Interações nas últimas 48h ({data.recentInteractions.length})
              </h2>
              <div className="grid gap-3">
                {data.recentInteractions.map((it, idx) => (
                  <InteractionCard key={idx} interaction={it} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LeadCard({ lead }: { lead: LeadItem }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="font-semibold text-gray-900">{lead.name}</p>
          {lead.phone && (
            <p className="text-sm text-gray-600">{lead.phone}</p>
          )}
        </div>
        <span className="text-xs text-gray-500">{timeAgo(lead.lastSeenAt)}</span>
      </div>

      {lead.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-2">
          {lead.tags.slice(0, 8).map((tag) => (
            <span
              key={tag}
              className={`text-xs px-2 py-0.5 rounded ${tagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {lead.lastInteraction?.resumoIA && (
        <p className="text-sm text-gray-700 italic mt-2 line-clamp-2">
          "{lead.lastInteraction.resumoIA}"
        </p>
      )}

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
        <a
          href={`/dashboard/crm/leads/${lead.id}`}
          className="text-sm text-emerald-700 hover:text-emerald-800 font-medium"
        >
          Abrir perfil →
        </a>
        {lead.source && (
          <span className="text-xs text-gray-500 ml-auto">via {lead.source}</span>
        )}
      </div>
    </div>
  );
}

function InteractionCard({ interaction }: { interaction: InteractionItem }) {
  return (
    <div className="bg-emerald-50/30 border border-emerald-100 rounded-lg p-3">
      <div className="flex justify-between items-center mb-1">
        <p className="font-medium text-sm text-gray-900">
          {interaction.leadName || interaction.leadPhone || 'Anônimo'}
        </p>
        <span className="text-xs text-gray-500">{timeAgo(interaction.createdAt)}</span>
      </div>
      {interaction.eventData?.resumoIA && (
        <p className="text-sm text-gray-700 italic mt-1 line-clamp-2">
          "{interaction.eventData.resumoIA}"
        </p>
      )}
      {interaction.eventData?.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap mt-2">
          {(interaction.eventData.tags as string[]).slice(0, 5).map((tag) => (
            <span key={tag} className={`text-xs px-2 py-0.5 rounded ${tagColor(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
