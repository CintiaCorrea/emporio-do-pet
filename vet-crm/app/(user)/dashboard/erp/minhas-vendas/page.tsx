// DESTINO: vet-crm/app/(user)/dashboard/erp/minhas-vendas/page.tsx
// "Meu BI" — reusa o endpoint do BI de Vendas (/api/caixa/vendas-resumo) TRAVADO no
// profissional logado (profissionalId = meu id). Sem backend novo, sem duplicar filtros.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const GREEN = '#0f6e56';
const LINE = '#E8E2D6';

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const METRICAS: { k: string; l: string; money: boolean; v: (b: any) => number }[] = [
  { k: 'LIQUIDA', l: '💰 Venda líquida', money: true, v: (b) => Number(b.liquido) || 0 },
  { k: 'BRUTA', l: 'Venda bruta', money: true, v: (b) => Number(b.bruto) || 0 },
  { k: 'TICKET', l: 'Ticket médio', money: true, v: (b) => (b.qtdVendas ? (Number(b.liquido) || 0) / b.qtdVendas : 0) },
  { k: 'DESCONTO', l: 'Descontos', money: true, v: (b) => Number(b.desconto) || 0 },
  { k: 'QTDV', l: 'Nº de vendas', money: false, v: (b) => Number(b.qtdVendas) || 0 },
  { k: 'QTDI', l: 'Nº de itens', money: false, v: (b) => Number(b.qtdItens) || 0 },
];
const GRUPOS = [{ k: 'DIA', l: 'Dia' }, { k: 'SEMANA', l: 'Semana' }, { k: 'MES', l: 'Mês' }];

export default function MinhasVendasPage() {
  usePageTitle('Minhas vendas', 'Seu desempenho — o seu BI pessoal');
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || '';
  const hoje = new Date(); const ini = new Date(); ini.setDate(1);
  const [from, setFrom] = useState(iso(ini));
  const [to, setTo] = useState(iso(hoje));
  const [metrica, setMetrica] = useState('LIQUIDA');
  const [grupo, setGrupo] = useState('MES');
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!meId) { setLoading(false); return; }
    setLoading(true);
    try {
      const p = new URLSearchParams({ from, to, groupBy: grupo, profissionalId: meId });
      const r = await fetch(`/api/caixa/vendas-resumo?${p.toString()}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
      setD(r);
    } catch {}
    setLoading(false);
  }, [from, to, grupo, meId]);
  useEffect(() => { load(); }, [load]);

  const met = METRICAS.find((m) => m.k === metrica) || METRICAS[0];
  const fmtMet = (v: number) => (met.money ? brl(v) : (Number(v) || 0).toLocaleString('pt-BR'));
  const evol = d?.evolucao || [];
  const maxEvol = Math.max(1, ...evol.map((e: any) => met.v(e)));
  const totais = d?.totais || { liquido: 0, qtdVendas: 0, ticket: 0, desconto: 0 };
  const topItens = d?.topItens || [];
  const maxItem = Math.max(1, ...topItens.map((t: any) => Number(t.valor) || 0));
  const turno = d?.porTurno || { MANHA: 0, TARDE: 0, NOITE: 0 };
  const turnoArr = [{ l: '☀️ Manhã', v: Number(turno.MANHA) || 0, c: '#E0A100' }, { l: '🌤️ Tarde', v: Number(turno.TARDE) || 0, c: '#009AAC' }, { l: '🌙 Noite', v: Number(turno.NOITE) || 0, c: '#6A4FB0' }];
  const maxTurno = Math.max(1, ...turnoArr.map((t) => t.v));
  const ps = d?.produtoServico || { servico: 0, produto: 0 };
  const vServ = Number(ps.servico) || 0, vProd = Number(ps.produto) || 0, somaPS = vServ + vProd || 1;
  const pctServ = Math.round((vServ / somaPS) * 100);
  const semVendas = !loading && (Number(totais.qtdVendas) || 0) === 0;

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14 };
  const ch: React.CSSProperties = { padding: '11px 15px', borderBottom: '1px solid #F0EBE0', fontSize: 13, fontWeight: 600, color: NAVY };

  return (
    <div className="p-6" style={{ background: '#F6F2EA', minHeight: '100%' }}>
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 19 }}>📈</span>
        <h1 className="text-xl font-semibold" style={{ color: '#0E2244' }}>Minhas vendas</h1>
        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#E0F4F6', color: '#00798A' }}>só as suas vendas (você é o vendedor)</span>
      </div>
      <p className="text-sm text-gray-500 mb-4">Seu desempenho no período — mesmo motor do BI de Vendas, filtrado só nas suas vendas.</p>

      <div className="flex items-center gap-2 flex-wrap mb-4">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-2.5 py-2 text-sm bg-white" style={{ borderColor: LINE }} />
        <span className="text-gray-500">a</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-2.5 py-2 text-sm bg-white" style={{ borderColor: LINE }} />
        <button onClick={load} className="text-white rounded-lg px-4 py-2 text-sm font-medium" style={{ background: TEAL }}>🔍 Consultar</button>
      </div>

      {loading ? (
        <div style={card}><div className="text-center py-14 text-gray-400 text-sm">Carregando…</div></div>
      ) : !meId ? (
        <div style={card}><div className="text-center py-14 text-gray-400 text-sm">Faça login pra ver as suas vendas.</div></div>
      ) : semVendas ? (
        <div style={card}><div className="text-center py-14 text-gray-400 text-sm">📊 Você não tem vendas no período.<br /><span className="text-xs">Vendas contam aqui quando você é o vendedor do item (no PDV).</span></div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
            {[['💰 Venda líquida', brl(Number(totais.liquido) || 0)], ['🧾 Nº de vendas', String(totais.qtdVendas || 0)], ['🎯 Ticket médio', brl(Number(totais.ticket) || 0)], ['🏷️ Descontos', brl(Number(totais.desconto) || 0)]].map(([l, v]) => (
              <div key={l} style={{ ...card, padding: '12px 14px' }}><div className="text-[10.5px] uppercase tracking-wide text-gray-500 font-semibold">{l}</div><div className="text-[21px] font-bold tabular-nums mt-1" style={{ color: NAVY }}>{v}</div></div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={{ ...ch, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span>📈 Minha evolução — {met.l.replace(/^💰 /, '')}</span>
              <select value={metrica} onChange={(e) => setMetrica(e.target.value)} className="border rounded-lg px-2 py-1.5 text-[13px] bg-white" style={{ marginLeft: 'auto', borderColor: LINE }}>
                {METRICAS.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
              </select>
              <div className="inline-flex border rounded-lg overflow-hidden" style={{ borderColor: LINE }}>
                {GRUPOS.map((g) => <button key={g.k} onClick={() => setGrupo(g.k)} className="px-3 py-1.5 text-[12.5px] font-medium" style={grupo === g.k ? { background: '#E0F4F6', color: NAVY } : { background: '#fff', color: '#5C6B70' }}>{g.l}</button>)}
              </div>
            </div>
            <div style={{ padding: 16 }}>
              <div className="flex items-end gap-2" style={{ height: 170 }}>
                {evol.length === 0 ? <span className="text-xs text-gray-400">Sem dados.</span> : evol.map((e: any, i: number) => { const v = met.v(e); return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full min-w-0">
                    <div title={fmtMet(v)} style={{ width: '80%', maxWidth: 40, height: `${Math.max(2, v / maxEvol * 100)}%`, background: 'linear-gradient(180deg,#009AAC,#00798A)', borderRadius: '6px 6px 0 0' }} />
                    <div className="text-[10px] text-gray-400 mt-1.5 whitespace-nowrap">{e.label}</div>
                  </div>
                ); })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-4">
            <div style={card}>
              <div style={ch}>🕐 Minhas vendas por turno</div>
              <div style={{ padding: 16 }}>
                <div className="flex items-end gap-2" style={{ height: 120 }}>
                  {turnoArr.map((t) => (
                    <div key={t.l} className="flex-1 flex flex-col items-center justify-end h-full">
                      <div title={brl(t.v)} style={{ width: '70%', maxWidth: 40, height: `${Math.max(2, t.v / maxTurno * 100)}%`, background: t.c, borderRadius: '6px 6px 0 0' }} />
                      <div className="text-[10.5px] text-gray-400 mt-1.5">{t.l}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={card}>
              <div style={ch}>🔀 Produto × Serviço</div>
              <div style={{ padding: 16 }}>
                <div className="flex rounded-lg overflow-hidden" style={{ height: 26, marginBottom: 10 }}>
                  <div className="flex items-center justify-center text-[11.5px] font-bold text-white" style={{ width: `${pctServ}%`, background: '#009AAC' }}>{pctServ >= 16 ? `Serviços ${pctServ}%` : ''}</div>
                  <div className="flex items-center justify-center text-[11.5px] font-bold text-white" style={{ width: `${100 - pctServ}%`, background: '#0F6E56' }}>{100 - pctServ >= 16 ? `Produtos ${100 - pctServ}%` : ''}</div>
                </div>
                <div className="flex gap-4 text-[12px] text-gray-600 flex-wrap"><span>🔵 Serviços <b style={{ color: NAVY }}>{brl(vServ)}</b></span><span>🟢 Produtos <b style={{ color: NAVY }}>{brl(vProd)}</b></span></div>
              </div>
            </div>
          </div>

          <div style={{ ...card, marginBottom: 14 }}>
            <div style={ch}>🏆 Meus itens mais vendidos</div>
            <div style={{ padding: '10px 16px' }}>
              {topItens.length === 0 ? <div className="text-xs text-gray-400 py-2">Sem itens no período.</div> : topItens.map((t: any) => (
                <div key={t.nome} className="flex items-center gap-3 mb-2.5 last:mb-0">
                  <span className="text-[12.5px] text-gray-600 flex-shrink-0 text-right truncate" style={{ width: 160 }}>{t.nome}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{ background: '#F0EBE0', height: 16 }}><div style={{ height: '100%', width: `${(Number(t.valor) || 0) / maxItem * 100}%`, background: TEAL, borderRadius: 999 }} /></div>
                  <span className="text-[12px] font-semibold tabular-nums flex-shrink-0" style={{ width: 96, textAlign: 'right', color: NAVY }}>{brl(Number(t.valor) || 0)}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400">Precisa do detalhe venda a venda? Vá em <a href="/dashboard/erp/consulta-vendas" style={{ color: '#00798A', fontWeight: 600 }}>Consulta de vendas</a> e filtre pelo seu nome.</p>
        </>
      )}
    </div>
  );
}
