// DESTINO: vet-crm/app/(user)/dashboard/erp/consulta-vendas/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

/* ---------------- paleta Base44 ---------------- */
const BG = '#F6F2EA';
const CARD_LINE = '#E8E2D6';
const NAVY = '#014D5E';
const TEAL = '#009AAC';
const GREEN = '#0F6E56';
const CORAL = '#D85A30';
const GREY = '#5C6B70';
const GREY2 = '#8A989D';

/* ---------------- tipos ---------------- */
interface Item {
  descricao: string | null;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  grupo: string | null;
  marca: string | null;
  executor: string | null;
}
interface Venda {
  id: string;
  numeroVenda: number | null;
  codigoExterno: string | null;
  date: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
  valor: number;
  cliente: string | null;
  clienteId: string;
  pet: string | null;
  funcionario: string | null;
  marca: string | null;
  itens: Item[];
}
interface Totais { qtd: number; liquido: number; ticket: number; descontos: number }
interface Resp { vendas: Venda[]; totais: Totais }

/* ---------------- helpers ---------------- */
const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const dm = (s: string) => {
  const d = new Date(s);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const vendaNum = (v: { numeroVenda: number | null; codigoExterno: string | null }) =>
  v.numeroVenda != null ? `#${v.numeroVenda}` : (v.codigoExterno ? `SV ${v.codigoExterno}` : '—');

// Marca: pill config
const MARCAS: Record<string, { label: string; emoji: string; bg: string; fg: string }> = {
  EMPORIO: { label: 'Empório', emoji: '🏥', bg: '#E6F3EA', fg: GREEN },
  MUNDO_A_PARTE: { label: 'Mundo à Parte', emoji: '🌿', bg: '#E1F0E4', fg: '#256b3d' },
  DRA_VIVIAN: { label: 'Dra. Vivian', emoji: '✨', bg: '#F0E9F7', fg: '#6b3fa0' },
};

const inp: React.CSSProperties = {
  padding: '8px 10px', border: `1px solid ${CARD_LINE}`, borderRadius: 9,
  fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: NAVY,
};
const cardCss: React.CSSProperties = { background: '#fff', border: `1px solid ${CARD_LINE}`, borderRadius: 14 };

function MarcaPill({ marca }: { marca: string | null }) {
  if (!marca) return <span style={{ color: GREY2, fontSize: 12 }}>—</span>;
  const m = MARCAS[marca];
  if (!m) return <span style={{ color: GREY, fontSize: 12 }}>{marca}</span>;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full font-medium"
      style={{ background: m.bg, color: m.fg, fontSize: 11.5, padding: '3px 9px' }}
    >
      <span>{m.emoji}</span>{m.label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status || '').toLowerCase();
  const baixado = s.includes('baixado') || s.includes('complet') || s.includes('paid');
  const orcamento = s.includes('orcament') || s.includes('orçament') || s.includes('schedul');
  const cfg = baixado
    ? { bg: '#E6F3EA', fg: GREEN, label: status || 'Baixado' }
    : orcamento
      ? { bg: '#FEF3D7', fg: '#946200', label: status || 'Orçamento' }
      : { bg: '#EEF2F4', fg: GREY, label: status || '—' };
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{ background: cfg.bg, color: cfg.fg, fontSize: 11.5, padding: '3px 9px' }}
    >
      {cfg.label}
    </span>
  );
}

/* ---------------- KPI ---------------- */
function Kpi({ emoji, label, value, color }: { emoji: string; label: string; value: string; color: string }) {
  return (
    <div style={{ ...cardCss, padding: '14px 16px' }} className="flex-1 min-w-[150px]">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 500, color }}>{value}</div>
    </div>
  );
}

/* ---------------- linha expansível ---------------- */
function LinhaVenda({ v }: { v: Venda }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer transition"
        style={{ borderTop: `1px solid ${CARD_LINE}`, background: open ? '#FBF9F4' : 'transparent' }}
      >
        <td style={{ padding: '11px 12px', fontSize: 13 }}>
          <span style={{ color: GREY2, marginRight: 6 }}>{open ? '▾' : '▸'}</span>
          <span style={{ color: NAVY, fontWeight: 600 }}>{vendaNum(v)}</span>
          {v.numeroVenda != null && v.codigoExterno && <span style={{ color: GREY2, fontSize: 11, marginLeft: 6 }}>· SV {v.codigoExterno}</span>}
          <span style={{ color: GREY2, fontSize: 11.5, marginLeft: 8 }}>{dm(v.date)}</span>
        </td>
        <td style={{ padding: '11px 12px', fontSize: 13, color: NAVY }}>{v.cliente || '—'}</td>
        <td style={{ padding: '11px 12px', fontSize: 13, color: GREY }}>{v.pet || '—'}</td>
        <td style={{ padding: '11px 12px' }}><MarcaPill marca={v.marca} /></td>
        <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 500, color: NAVY, textAlign: 'right', whiteSpace: 'nowrap' }}>{brl(v.valor)}</td>
        <td style={{ padding: '11px 12px' }}><StatusPill status={v.status} /></td>
      </tr>
      {open && (
        <tr style={{ background: '#FBF9F4' }}>
          <td colSpan={6} style={{ padding: '0 12px 14px 12px' }}>
            <div style={{ ...cardCss, padding: '10px 12px', background: '#fff' }}>
              <div style={{ fontSize: 11.5, color: GREY2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.3px', marginBottom: 8 }}>
                🧾 Itens da venda
              </div>
              <div className="flex flex-col gap-1.5">
                {v.itens.length === 0 && <div style={{ fontSize: 12.5, color: GREY2 }}>Sem itens.</div>}
                {v.itens.map((it, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 flex-wrap" style={{ fontSize: 12.5, color: GREY, paddingBottom: 6, borderBottom: i < v.itens.length - 1 ? `1px dashed ${CARD_LINE}` : 'none' }}>
                    <div className="flex-1 min-w-[180px]">
                      <span style={{ color: NAVY, fontWeight: 500 }}>{it.descricao || '—'}</span>
                      <span style={{ color: GREY2, marginLeft: 8 }}>{it.quantidade} × {brl(it.valorUnitario)}</span>
                      {it.executor && <span style={{ color: GREY2, marginLeft: 8 }}>· 👤 {it.executor}</span>}
                    </div>
                    <div style={{ fontWeight: 500, color: NAVY, whiteSpace: 'nowrap' }}>{brl(it.valorTotal)}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2.5 flex-wrap" style={{ fontSize: 12, color: GREY2 }}>
                {v.paymentMethod && <span>💳 {v.paymentMethod}</span>}
                {v.funcionario && <span>🧑 {v.funcionario}</span>}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

/* ---------------- página ---------------- */
export default function ConsultaVendasPage() {
  usePageTitle('Consulta de vendas', 'Vendas do período');

  const [mesIni, mesFim] = useMemo(() => {
    const n = new Date();
    return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
  }, []);

  const [de, setDe] = useState(mesIni);
  const [ate, setAte] = useState(mesFim);
  const [status, setStatus] = useState('');
  const [marca, setMarca] = useState('');
  const [busca, setBusca] = useState('');
  const [cod, setCod] = useState('');

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (de) p.set('de', de);
      if (ate) p.set('ate', ate);
      if (status) p.set('status', status);
      if (marca) p.set('marca', marca);
      if (busca.trim()) p.set('busca', busca.trim());
      if (cod.trim()) p.set('cod', cod.trim());
      const r = await fetch(`/api/crm/consulta-vendas?${p.toString()}`, { cache: 'no-store' });
      if (r.ok) setData(await r.json());
      else setData({ vendas: [], totais: { qtd: 0, liquido: 0, ticket: 0, descontos: 0 } });
    } catch {
      setData({ vendas: [], totais: { qtd: 0, liquido: 0, ticket: 0, descontos: 0 } });
    } finally {
      setLoading(false);
    }
  }, [de, ate, status, marca, busca, cod]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const t = data?.totais;

  return (
    <div className="p-6 min-h-screen" style={{ background: BG }}>
      <style>{`@media print{ .no-print{display:none!important;} body{background:#fff;} .cv-print-h{display:block!important;} }`}</style>

      {/* cabeçalho só de impressão */}
      <div className="cv-print-h" style={{ display: 'none', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>Consulta de vendas · Empório do Pet</div>
        <div style={{ fontSize: 12, color: GREY }}>Período {de} a {ate}{cod ? ` · cód. ${cod}` : ''}{marca ? ` · ${marca}` : ''}{status ? ` · ${status}` : ''}</div>
      </div>

      {/* Filtros */}
      <div style={{ ...cardCss, padding: 16 }} className="mb-4 no-print">
        <div className="flex items-end gap-3 flex-wrap">
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>De</span>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={inp} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Até</span>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={inp} />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...inp, minWidth: 140 }}>
              <option value="">Todos</option>
              <option value="COMPLETED">Baixado</option>
              <option value="SCHEDULED">Orçamento</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Marca</span>
            <select value={marca} onChange={(e) => setMarca(e.target.value)} style={{ ...inp, minWidth: 150 }}>
              <option value="">Todas</option>
              <option value="EMPORIO">🏥 Empório</option>
              <option value="MUNDO_A_PARTE">🌿 Mundo à Parte</option>
              <option value="DRA_VIVIAN">✨ Dra. Vivian</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Cód. venda</span>
            <input
              value={cod}
              onChange={(e) => setCod(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="Nº ou SimplesVet"
              style={{ ...inp, width: 140 }}
            />
          </label>
          <label className="flex flex-col gap-1 flex-1 min-w-[180px]">
            <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Busca</span>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
              placeholder="Cliente, pet ou serviço"
              style={inp}
            />
          </label>
          <button
            onClick={load}
            className="font-medium text-white transition"
            style={{ background: TEAL, borderRadius: 9, padding: '9px 18px', fontSize: 13.5 }}
          >
            🔍 Consultar
          </button>
          <button
            onClick={() => window.print()}
            className="font-medium transition"
            style={{ background: '#fff', color: NAVY, border: `1px solid ${CARD_LINE}`, borderRadius: 9, padding: '9px 16px', fontSize: 13.5 }}
          >
            🖨️ Imprimir
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex gap-3 flex-wrap mb-4">
        <Kpi emoji="💰" label="Total líquido" value={brl(t?.liquido || 0)} color={GREEN} />
        <Kpi emoji="🧾" label="Nº vendas" value={String(t?.qtd || 0)} color={NAVY} />
        <Kpi emoji="🎯" label="Ticket médio" value={brl(t?.ticket || 0)} color={TEAL} />
        <Kpi emoji="🏷️" label="Descontos" value={brl(t?.descontos || 0)} color={CORAL} />
      </div>

      {/* Tabela */}
      <div style={{ ...cardCss, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2" style={{ padding: 48, color: GREY2, fontSize: 14 }}>
            <span className="animate-pulse">⏳ Carregando vendas…</span>
          </div>
        ) : !data || data.vendas.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ padding: 56, color: GREY2 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span style={{ fontSize: 14 }}>Nenhuma venda encontrada no período.</span>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FBF9F4' }}>
                {['Venda', 'Cliente', 'Pet', 'Marca', 'Valor', 'Status'].map((h, i) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 12px', fontSize: 11, color: GREY2, fontWeight: 500,
                      textTransform: 'uppercase', letterSpacing: '.4px',
                      textAlign: i === 4 ? 'right' : 'left',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.vendas.map((v) => <LinhaVenda key={v.id} v={v} />)}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
