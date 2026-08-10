// DESTINO: vet-crm/app/(user)/dashboard/erp/consulta-vendas/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import OrcamentosBusca from '@/components/vendas/OrcamentosBusca';
import { imprimirVenda } from '@/lib/documentos/venda-print';

/* ---------------- paleta Base44 ---------------- */
const BG = '#F6F2EA';
const CARD_LINE = '#E8E2D6';
const NAVY = '#014D5E';
const TEAL = '#009AAC';
const GREEN = '#0F6E56';
const CORAL = '#D85A30';
const GREY = '#5C6B70';
const GREY2 = '#374151';

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

/* ---------------- modal de devolução ---------------- */
interface PreviewItem { id: string; descricao: string; quantidade: number; valorTotal: number }
interface DevPreview {
  venda: { id: string; numeroVenda: number | null; tutor: string; pet: string; data: string; valor: number };
  itens: PreviewItem[];
  forma: { nome: string; parcelas: number; taxaPct: number };
  jaDevolvido: number;
}
const MOTIVOS = ['Arrependimento do cliente', 'Produto com defeito', 'Erro no lançamento', 'Procedimento não realizado'];

function DevolucaoModal({ vendaId, onClose }: { vendaId: string; onClose: () => void }) {
  const [pv, setPv] = useState<DevPreview | null>(null);
  const [erro, setErro] = useState('');
  const [escopo, setEscopo] = useState<'total' | 'item'>('total');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [forma, setForma] = useState<'CREDITO' | 'DINHEIRO'>('CREDITO');
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/financeiro/devolucao/${vendaId}/preview`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d: DevPreview) => { if (vivo) { setPv(d); setSel(new Set(d.itens.map((i) => i.id))); } })
      .catch(() => { if (vivo) setErro('Não foi possível carregar a venda.'); });
    return () => { vivo = false; };
  }, [vendaId]);

  const bruto = useMemo(() => {
    if (!pv) return 0;
    const its = escopo === 'total' ? pv.itens : pv.itens.filter((i) => sel.has(i.id));
    return its.reduce((s, i) => s + Number(i.valorTotal || 0), 0);
  }, [pv, escopo, sel]);

  const taxaPct = pv?.forma.taxaPct || 0;
  const parcelas = Math.max(1, pv?.forma.parcelas || 1);
  const taxa = bruto * taxaPct / 100;
  const liquido = bruto - taxa;
  const parcela = liquido / parcelas;

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const confirmar = async () => {
    if (!motivo.trim()) { setErro('Informe o motivo da devolução.'); return; }
    if (bruto <= 0) { setErro('Selecione ao menos um item.'); return; }
    setEnviando(true); setErro('');
    try {
      const r = await fetch(`/api/financeiro/devolucao/${vendaId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: escopo === 'item' ? [...sel] : null, forma, motivo: motivo.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || 'Falha ao devolver.');
      const via = forma === 'CREDITO' ? 'crédito do cliente' : 'dinheiro';
      setOkMsg(`Devolução de ${brl(d.liquido ?? liquido)} registrada${parcelas > 1 ? ` em ${parcelas}×` : ''} (${via}).`);
    } catch (e: any) {
      setErro(String(e?.message || 'Falha ao devolver.'));
    } finally {
      setEnviando(false);
    }
  };

  const seg: React.CSSProperties = { flex: 1, border: `1.5px solid ${CARD_LINE}`, borderRadius: 10, padding: '9px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 600, textAlign: 'center', background: '#fff', color: NAVY };
  const segOn: React.CSSProperties = { ...seg, borderColor: TEAL, background: '#EAF7F8', boxShadow: `inset 0 0 0 1px ${TEAL}` };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(1,45,55,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardCss, width: '100%', maxWidth: 560, background: '#fff', overflow: 'hidden' }}>
        {/* cabeçalho */}
        <div style={{ background: NAVY, color: '#fff', padding: '16px 18px' }}>
          <div className="flex justify-between items-start gap-3">
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>↩️ Devolver venda</div>
              <div style={{ fontSize: 12.5, opacity: .85, marginTop: 2 }}>{pv ? `${pv.venda.tutor}${pv.venda.pet ? ` · ${pv.venda.pet}` : ''} · ${dm(pv.venda.data)}` : 'carregando…'}</div>
            </div>
            {pv && <span style={{ fontSize: 12, background: 'rgba(255,255,255,.14)', padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{vendaNum({ numeroVenda: pv.venda.numeroVenda, codigoExterno: null })} · {brl(pv.venda.valor)}</span>}
          </div>
          {pv && (pv.forma.taxaPct > 0 || pv.forma.parcelas > 1) && (
            <div style={{ marginTop: 10, fontSize: 12.5, background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.16)', padding: '7px 10px', borderRadius: 9 }}>
              💳 Pago em <b>{pv.forma.nome}{pv.forma.parcelas > 1 ? ` ${pv.forma.parcelas}×` : ''}</b>{pv.forma.taxaPct > 0 ? ` · taxa da operadora ${pv.forma.taxaPct}%` : ''}
            </div>
          )}
        </div>

        {okMsg ? (
          <div style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ fontSize: 32 }}>✅</div>
            <div style={{ fontSize: 14, color: NAVY, fontWeight: 600, margin: '10px 0 4px' }}>{okMsg}</div>
            <div style={{ fontSize: 12.5, color: GREY }}>Estorno lançado no Financeiro (Deduções de Vendas) e registrado no histórico.</div>
            <button onClick={onClose} style={{ marginTop: 16, padding: '10px 22px', border: 'none', borderRadius: 10, background: TEAL, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Fechar</button>
          </div>
        ) : !pv ? (
          <div style={{ padding: 30, textAlign: 'center', color: erro ? CORAL : GREY, fontSize: 13 }}>{erro || 'Carregando venda…'}</div>
        ) : (
          <>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {pv.jaDevolvido > 0 && <div style={{ fontSize: 12.5, background: '#FEF3D7', color: '#946200', border: '1px solid #F0D89B', borderRadius: 9, padding: '8px 11px' }}>⚠ Esta venda já tem {pv.jaDevolvido} devolução(ões) registrada(s).</div>}

              {/* 1. o que devolver */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, marginBottom: 8 }}>1 · O que devolver?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={escopo === 'total' ? segOn : seg} onClick={() => setEscopo('total')}>Venda inteira</div>
                  <div style={escopo === 'item' ? segOn : seg} onClick={() => setEscopo('item')}>Escolher itens</div>
                </div>
                {escopo === 'item' && (
                  <div style={{ marginTop: 10, border: `1px solid ${CARD_LINE}`, borderRadius: 10, overflow: 'hidden' }}>
                    {pv.itens.map((it, i) => (
                      <label key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderBottom: i < pv.itens.length - 1 ? `1px solid ${CARD_LINE}` : 'none', fontSize: 13, cursor: 'pointer', opacity: sel.has(it.id) ? 1 : .45 }}>
                        <input type="checkbox" checked={sel.has(it.id)} onChange={() => toggle(it.id)} style={{ width: 17, height: 17, accentColor: TEAL }} />
                        <span style={{ flex: 1, color: NAVY }}>{it.descricao}</span>
                        <span style={{ color: GREY, fontSize: 12 }}>{it.quantidade}×</span>
                        <span style={{ fontWeight: 600, color: NAVY, minWidth: 82, textAlign: 'right' }}>{brl(it.valorTotal)}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. como devolver */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, marginBottom: 8 }}>2 · Como devolver o dinheiro?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={forma === 'CREDITO' ? segOn : seg} onClick={() => setForma('CREDITO')}>💳 Crédito do cliente</div>
                  <div style={forma === 'DINHEIRO' ? segOn : seg} onClick={() => setForma('DINHEIRO')}>💵 Dinheiro</div>
                </div>
              </div>

              {/* 3. motivo */}
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: NAVY, marginBottom: 8 }}>3 · Motivo</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {MOTIVOS.map((m) => (
                    <button key={m} onClick={() => setMotivo(m)} style={{ fontSize: 12, border: `1px solid ${CARD_LINE}`, background: '#F7F4EC', color: NAVY, padding: '5px 10px', borderRadius: 999, cursor: 'pointer' }}>{m}</button>
                  ))}
                </div>
                <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Descreva o motivo (obrigatório)…" style={{ ...inp, width: '100%', minHeight: 56, resize: 'vertical' }} />
              </div>
            </div>

            {/* resumo */}
            <div style={{ background: '#F7F4EC', borderTop: `1px solid ${CARD_LINE}`, padding: '14px 18px' }}>
              {taxaPct > 0 && (
                <>
                  <div className="flex justify-between" style={{ fontSize: 13, color: GREY, padding: '2px 0' }}><span>Valor dos itens</span><b style={{ color: NAVY }}>{brl(bruto)}</b></div>
                  <div className="flex justify-between" style={{ fontSize: 13, color: GREY, padding: '2px 0' }}><span>− Taxa do cartão ({parcelas > 1 ? `${parcelas}× · ` : ''}{taxaPct}%)</span><b style={{ color: CORAL }}>− {brl(taxa)}</b></div>
                </>
              )}
              <div className="flex justify-between items-center" style={{ marginTop: 6, paddingTop: 8, borderTop: `1px dashed ${CARD_LINE}` }}>
                <span style={{ fontSize: 13, color: GREY }}>Devolver ao cliente{taxaPct > 0 ? ' (líquido)' : ''}</span>
                <span style={{ fontSize: 23, fontWeight: 800, color: NAVY }}>{brl(liquido)}</span>
              </div>
              {parcelas > 1 && <div style={{ fontSize: 12, color: TEAL, marginTop: 5 }}>↳ em <b>{parcelas}×</b> de <b>{brl(parcela)}</b> (venc. mensal, espelhando o cartão)</div>}
              <div style={{ fontSize: 11.5, color: GREY2, marginTop: 8 }}>📉 Estorno de receita no Financeiro (Deduções de Vendas){taxaPct > 0 ? ' — a taxa permanece como custo' : ''}. {forma === 'CREDITO' ? 'Vira crédito do cliente.' : 'Registrado como saída no Financeiro.'}</div>
              {erro && <div style={{ fontSize: 12.5, color: CORAL, marginTop: 8 }}>⚠ {erro}</div>}
            </div>

            <div style={{ display: 'flex', gap: 10, padding: '12px 18px', borderTop: `1px solid ${CARD_LINE}` }}>
              <button onClick={onClose} disabled={enviando} style={{ flex: 1, padding: 11, borderRadius: 10, border: `1.5px solid ${CARD_LINE}`, background: '#fff', color: GREY, fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmar} disabled={enviando} style={{ flex: 2, padding: 11, borderRadius: 10, border: 'none', background: enviando ? '#9DBDC2' : TEAL, color: '#fff', fontWeight: 700, fontSize: 13.5, cursor: enviando ? 'default' : 'pointer' }}>{enviando ? 'Processando…' : 'Confirmar devolução'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- linha expansível ---------------- */
function LinhaVenda({ v }: { v: Venda }) {
  const [open, setOpen] = useState(false);
  const [devOpen, setDevOpen] = useState(false);
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
        <td style={{ padding: '11px 12px', fontSize: 13, color: NAVY }} onClick={(e) => e.stopPropagation()}>{v.clienteId ? (<Link href={`/dashboard/erp/tutores/${v.clienteId}`} style={{ color: NAVY, textDecoration: 'none', fontWeight: 500 }}>{v.cliente || '—'}</Link>) : (v.cliente || '—')}</td>
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
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                  <button onClick={(e) => { e.stopPropagation(); setDevOpen(true); }} className="inline-flex items-center gap-1.5" style={{ border: `1px solid ${CORAL}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: CORAL, background: '#fff', cursor: 'pointer' }}>↩️ Devolver</button>
                  <button onClick={(e) => { e.stopPropagation(); imprimirVenda(v); }} className="inline-flex items-center gap-1.5" style={{ border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: NAVY, background: '#fff', cursor: 'pointer' }}>🖨️ Imprimir comprovante</button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
      {devOpen && <DevolucaoModal vendaId={v.id} onClose={() => setDevOpen(false)} />}
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
  const [func, setFunc] = useState('');
  const [modo, setModo] = useState<'VENDAS' | 'ORCAMENTOS' | 'TOTAIS'>('VENDAS');

  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);

  const load = useCallback(async () => {
    if (!jaCarregou.current) setLoading(true);
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
      jaCarregou.current = true; setLoading(false);
    }
  }, [de, ate, status, marca, busca, cod]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const t = data?.totais;
  const funcs = useMemo(() => [...new Set((data?.vendas || []).map((v) => v.funcionario).filter(Boolean))] as string[], [data]);
  const vendasF = useMemo(() => (data?.vendas || []).filter((v) => !func || v.funcionario === func), [data, func]);
  // Totais por produto/serviço (agrega os itens das vendas do período)
  const totaisProduto = useMemo(() => {
    const m = new Map<string, { qtd: number; total: number }>();
    for (const v of vendasF) for (const it of (v.itens || [])) {
      const nm = it.descricao || 'Item';
      const cur = m.get(nm) || { qtd: 0, total: 0 };
      cur.qtd += Number(it.quantidade) || 0; cur.total += Number(it.valorTotal) || 0;
      m.set(nm, cur);
    }
    return [...m.entries()].map(([nome, x]) => ({ nome, ...x })).sort((a, b) => b.total - a.total);
  }, [vendasF]);

  return (
    <div className="p-6 min-h-screen" style={{ background: BG }}>
      <style>{`@media print{ .no-print{display:none!important;} body{background:#fff;} .cv-print-h{display:block!important;} }`}</style>

      {/* Abas: Vendas | Orçamentos (busca global de orçamentos) */}
      <div className="flex gap-1 mb-4 no-print items-center">
        {(([['VENDAS', '🧾 Vendas'], ['TOTAIS', '📊 Totais por produto'], ['ORCAMENTOS', '📄 Orçamentos']]) as [('VENDAS' | 'ORCAMENTOS' | 'TOTAIS'), string][]).map(([k, lbl]) => (
          <button key={k} onClick={() => setModo(k)} style={{ fontSize: 13, fontWeight: 600, padding: '8px 16px', borderRadius: 9, border: `1px solid ${CARD_LINE}`, background: modo === k ? TEAL : '#fff', color: modo === k ? '#fff' : NAVY }}>{lbl}</button>
        ))}
        <a href="/dashboard/erp/recebimentos" style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 600, padding: '8px 14px', borderRadius: 9, border: `1px solid ${CARD_LINE}`, background: '#fff', color: NAVY, textDecoration: 'none' }}>💰 Recebimentos →</a>
      </div>

      {modo === 'ORCAMENTOS' ? <OrcamentosBusca /> : (<>

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
          {funcs.length > 0 && (
            <label className="flex flex-col gap-1">
              <span style={{ fontSize: 11.5, color: GREY2, fontWeight: 500 }}>Profissional</span>
              <select value={func} onChange={(e) => setFunc(e.target.value)} style={{ ...inp, minWidth: 150 }}>
                <option value="">Todos</option>
                {funcs.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </label>
          )}
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
        ) : !data || vendasF.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ padding: 56, color: GREY2 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            <span style={{ fontSize: 14 }}>Nenhuma venda encontrada no período.</span>
          </div>
        ) : modo === 'TOTAIS' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FBF9F4' }}>
                {['Produto / Serviço', 'Qtd', 'Total'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, color: GREY2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {totaisProduto.length === 0 ? <tr><td colSpan={3} style={{ padding: 24, textAlign: 'center', color: GREY2, fontSize: 13 }}>Sem itens no período.</td></tr> : totaisProduto.map((x) => (
                <tr key={x.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, color: NAVY }}>{x.nome}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', color: GREY }}>{x.qtd.toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: NAVY }}>{brl(x.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
              {vendasF.map((v) => <LinhaVenda key={v.id} v={v} />)}
            </tbody>
          </table>
        )}
      </div>
      </>)}
    </div>
  );
}
