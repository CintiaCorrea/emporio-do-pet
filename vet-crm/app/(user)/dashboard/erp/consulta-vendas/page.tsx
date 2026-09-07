// DESTINO: vet-crm/app/(user)/dashboard/erp/consulta-vendas/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import OrcamentosBusca from '@/components/vendas/OrcamentosBusca';
import { imprimirVenda } from '@/lib/documentos/venda-print';
import { resumoDeVendas } from '@/lib/resumoDeVendas';

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
  desconto: number;
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
  pago: number;
  aberto: number;
  situacao: 'ABERTA' | 'PARCIAL' | 'PAGA';
  cliente: string | null;
  clienteId: string;
  pet: string | null;
  funcionario: string | null;
  marca: string | null;
  itens: Item[];
}
interface Totais { qtd: number; liquido: number; ticket: number; descontos: number; recebido: number; aberto: number }
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

function StatusPill({ v }: { v: Venda }) {
  // Tres estados, tres cores — do jeito que a recepcao le a lista: o que falta receber e
  // vermelho, o que entrou pela metade e ambar, o que fechou e verde. A cor sai do MESMO
  // calculo do backend (consulta-vendas.regras), nunca de um texto de status solto.
  const cfg = v.situacao === 'PAGA'
    ? { bg: '#E6F3EA', fg: GREEN, label: 'Baixado' }
    : v.situacao === 'PARCIAL'
      ? { bg: '#FEF3D7', fg: '#946200', label: 'Baixa parcial' }
      : { bg: '#FDECEC', fg: '#b23b39', label: 'Aberto' };
  return (
    <span
      className="inline-flex items-center rounded-full font-medium"
      style={{ background: cfg.bg, color: cfg.fg, fontSize: 11.5, padding: '3px 9px' }}
      title={v.situacao === 'PARCIAL' ? `Pago ${brl(v.pago)} · falta ${brl(v.aberto)}` : undefined}
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

/* ---------------- quadros do Resumo ---------------- */
function Quadro({ titulo, subtitulo, cols, children }: { titulo: string; subtitulo?: string; cols: string[]; children: React.ReactNode }) {
  return (
    <div style={{ ...cardCss, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${CARD_LINE}`, background: '#FBF9F4' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: NAVY }}>{titulo}</div>
        {subtitulo && <div style={{ fontSize: 11, color: GREY2 }}>{subtitulo}</div>}
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 320 }}>
          <thead>
            <tr>
              {cols.map((c, i) => (
                <th key={c} style={{ padding: '7px 10px', fontSize: 10.5, color: GREY2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px', textAlign: i === 0 ? 'left' : 'right', whiteSpace: 'nowrap' }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function Td({ children, dir, forte, sub, cor }: { children: React.ReactNode; dir?: boolean; forte?: boolean; sub?: boolean; cor?: string }) {
  return (
    <td style={{
      padding: sub ? '4px 10px 4px 22px' : '8px 10px',
      fontSize: sub ? 12 : 12.5,
      textAlign: dir ? 'right' : 'left',
      fontWeight: forte ? 700 : 400,
      color: cor || (sub ? GREY2 : forte ? NAVY : GREY),
      whiteSpace: 'nowrap',
    }}>{children}</td>
  );
}

/* ---------------- linha expansível ---------------- */
function LinhaVenda({ v, saldoCliente }: { v: Venda; saldoCliente: number }) {
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
        <td style={{ padding: '11px 12px', fontSize: 13, color: NAVY }} onClick={(e) => e.stopPropagation()}>
          {/* O aviso e do CLIENTE, nao desta venda: e o que ele deve no total, de qualquer dia.
              Serve pra recepcao ver, na hora, que tem conta velha em aberto junto. */}
          {saldoCliente > 0 && (
            <span title={`${(v.cliente || 'Este cliente').split(' ')[0]} tem ${brl(saldoCliente)} em aberto no total`} style={{ color: '#b23b39', marginRight: 5, cursor: 'help' }}>&#9888;</span>
          )}
          {v.clienteId ? (<Link href={`/dashboard/erp/tutores/${v.clienteId}`} style={{ color: NAVY, textDecoration: 'none', fontWeight: 500 }}>{v.cliente || '—'}</Link>) : (v.cliente || '—')}
        </td>
        <td style={{ padding: '11px 12px', fontSize: 13, color: GREY }}>{v.pet || '—'}</td>
        <td style={{ padding: '11px 12px' }}><MarcaPill marca={v.marca} /></td>
        <td style={{ padding: '11px 12px', fontSize: 13, fontWeight: 500, color: NAVY, textAlign: 'right', whiteSpace: 'nowrap' }}>{brl(v.valor)}</td>
        <td style={{ padding: '11px 12px' }}><StatusPill v={v} /></td>
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
  const [modo, setModo] = useState<'VENDAS' | 'ORCAMENTOS' | 'TOTAIS' | 'RESUMO'>('VENDAS');
  // Saldo em aberto POR CLIENTE, de todos os dias — e o que alimenta o aviso da lista.
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 30;

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
      else setData({ vendas: [], totais: { qtd: 0, liquido: 0, ticket: 0, descontos: 0, recebido: 0, aberto: 0 } });
    } catch {
      setData({ vendas: [], totais: { qtd: 0, liquido: 0, ticket: 0, descontos: 0, recebido: 0, aberto: 0 } });
    } finally {
      jaCarregou.current = true; setLoading(false);
    }
  }, [de, ate, status, marca, busca, cod]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // As contas em aberto de TODOS os dias, somadas por cliente (mesma fonte do ponto de venda).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/caixa/vendas?abertas=true', { cache: 'no-store' });
        if (!r.ok) return;
        const arr = await r.json();
        const m: Record<string, number> = {};
        for (const x of Array.isArray(arr) ? arr : []) {
          const k = x.tutorId || x.tutor;
          if (!k) continue;
          m[k] = (m[k] || 0) + Math.max(0, Number(x.valor || 0) - Number(x.pago || 0));
        }
        setSaldos(m);
      } catch { /* o aviso e um extra: sem ele a lista continua inteira */ }
    })();
  }, []);

  const t = data?.totais;
  const funcs = useMemo(() => [...new Set((data?.vendas || []).map((v) => v.funcionario).filter(Boolean))] as string[], [data]);
  const vendasF = useMemo(() => (data?.vendas || [])
    .filter((v) => !func || v.funcionario === func)
    // Dia mais recente primeiro e, dentro do dia, o codigo maior primeiro — a ordem que a
    // recepcao espera. Por hora nao serve: venda lancada as 18h30 pode ter codigo menor.
    .sort((a, b) => {
      const da = String(a.date).slice(0, 10), db = String(b.date).slice(0, 10);
      if (da !== db) return db.localeCompare(da);
      return (Number(b.numeroVenda) || 0) - (Number(a.numeroVenda) || 0);
    }), [data, func]);
  // Todos os quadros do Resumo saem de UMA passada (lib/resumoDeVendas, com teste): é o que
  // garante que card, quadro e linha nunca contem histórias diferentes.
  const resumo = useMemo(() => resumoDeVendas(vendasF as any), [vendasF]);
  const totalPaginas = Math.max(1, Math.ceil(vendasF.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const vendasDaPagina = useMemo(() => vendasF.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA), [vendasF, paginaAtual]);
  useEffect(() => { setPagina(1); }, [data, func]);
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
        {(([['VENDAS', '🧾 Vendas'], ['TOTAIS', '📊 Totais por produto'], ['RESUMO', '📈 Resumo'], ['ORCAMENTOS', '📄 Orçamentos']]) as [('VENDAS' | 'ORCAMENTOS' | 'TOTAIS' | 'RESUMO'), string][]).map(([k, lbl]) => (
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
        {/* Os cartões saem do mesmo cálculo dos quadros (lib/resumoDeVendas) e respeitam o
            filtro de funcionário — antes vinham do total do backend e discordavam da tela. */}
        <Kpi emoji="💰" label="Venda bruta" value={brl(resumo.cards.bruto)} color={GREEN} />
        <Kpi emoji="🏷️" label={`Descontos · ${resumo.cards.percentualDesconto.toFixed(1).replace('.', ',')}%`} value={brl(resumo.cards.desconto)} color={'#946200'} />
        <Kpi emoji="🧮" label="Venda líquida" value={brl(resumo.cards.liquido)} color={NAVY} />
        <Kpi emoji="✅" label="Recebido" value={brl(resumo.cards.recebido)} color={GREEN} />
        <Kpi emoji="⏳" label="A receber no período" value={brl(resumo.cards.aberto)} color={CORAL} />
        <Kpi emoji="🧾" label="Nº vendas" value={String(resumo.cards.qtd)} color={NAVY} />
        <Kpi emoji="🎯" label="Ticket médio" value={brl(resumo.cards.ticket)} color={TEAL} />
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
        ) : modo === 'RESUMO' ? (
          <div style={{ padding: 14, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))' }}>
            {/* VENDAS POR DIA — competência: o dia em que a venda foi feita. */}
            <Quadro titulo="Vendas por dia" cols={['Dia', 'Qtd', 'Bruto', 'Desc.', '%', 'Líquido', 'Recebido', 'A receber']}>
              {resumo.porDia.map((d) => (
                <tr key={d.dia} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{d.dia.split('-').reverse().join('/')}</Td>
                  <Td dir>{d.qtd}</Td>
                  <Td dir>{brl(d.bruto)}</Td>
                  <Td dir>{d.desconto ? brl(d.desconto) : '—'}</Td>
                  <Td dir>{d.percentual ? `${d.percentual.toFixed(1).replace('.', ',')}%` : '—'}</Td>
                  <Td dir forte>{brl(d.liquido)}</Td>
                  <Td dir cor={GREEN}>{brl(d.recebido)}</Td>
                  <Td dir cor={d.aberto > 0 ? '#b23b39' : GREY2}>{brl(d.aberto)}</Td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${NAVY}` }}>
                <Td forte>Total</Td>
                <Td dir forte>{resumo.cards.qtd}</Td>
                <Td dir forte>{brl(resumo.cards.bruto)}</Td>
                <Td dir forte>{brl(resumo.cards.desconto)}</Td>
                <Td dir forte>{resumo.cards.percentualDesconto.toFixed(1).replace('.', ',')}%</Td>
                <Td dir forte>{brl(resumo.cards.liquido)}</Td>
                <Td dir forte cor={GREEN}>{brl(resumo.cards.recebido)}</Td>
                <Td dir forte cor="#b23b39">{brl(resumo.cards.aberto)}</Td>
              </tr>
            </Quadro>

            {/* SITUAÇÃO — as três colunas juntas, para o quadro FECHAR com o total. */}
            <Quadro titulo="Situação das vendas" cols={['Situação', 'Qtd', 'Valor', 'Recebido', 'A receber']}>
              {resumo.porSituacao.map((l) => (
                <tr key={l.situacao} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{l.rotulo}</Td>
                  <Td dir>{l.qtd}</Td>
                  <Td dir>{brl(l.valor)}</Td>
                  <Td dir cor={GREEN}>{brl(l.recebido)}</Td>
                  <Td dir cor={l.aberto > 0 ? '#b23b39' : GREY2}>{brl(l.aberto)}</Td>
                </tr>
              ))}
              <tr style={{ borderTop: `2px solid ${NAVY}` }}>
                <Td forte>Total</Td>
                <Td dir forte>{resumo.cards.qtd}</Td>
                <Td dir forte>{brl(resumo.cards.liquido)}</Td>
                <Td dir forte cor={GREEN}>{brl(resumo.cards.recebido)}</Td>
                <Td dir forte cor="#b23b39">{brl(resumo.cards.aberto)}</Td>
              </tr>
            </Quadro>

            {/* FORMAS — o que entrou, por forma e por parcelamento. */}
            <Quadro titulo="Formas de recebimento" cols={['Forma', 'Valor pago']}>
              {resumo.porForma.length === 0 && <tr><Td>Nada recebido no período.</Td><Td dir>—</Td></tr>}
              {resumo.porForma.map((f) => (
                <Fragment key={f.forma}>
                  <tr style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                    <Td forte>{f.forma}</Td>
                    <Td dir forte>{brl(f.valor)}</Td>
                  </tr>
                  {f.parcelas.map((pz) => (
                    <tr key={pz.rotulo}>
                      <Td sub>{pz.rotulo}</Td>
                      <Td dir sub>{brl(pz.valor)}</Td>
                    </tr>
                  ))}
                </Fragment>
              ))}
              {resumo.porForma.length > 0 && (
                <tr style={{ borderTop: `2px solid ${NAVY}` }}>
                  <Td forte>Total</Td>
                  <Td dir forte cor={GREEN}>{brl(resumo.cards.recebido)}</Td>
                </tr>
              )}
            </Quadro>

            {/* DATA DA BAIXA — caixa: o dia em que o dinheiro entrou, que não é o da venda. */}
            <Quadro titulo="Data da baixa" subtitulo="quando o dinheiro entrou (pode ser outro dia que o da venda)" cols={['Dia', 'Recebido']}>
              {resumo.porDataDeBaixa.length === 0 && <tr><Td>Nenhuma baixa no período.</Td><Td dir>—</Td></tr>}
              {resumo.porDataDeBaixa.map((b) => (
                <tr key={b.dia} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{b.dia.split('-').reverse().join('/')}</Td>
                  <Td dir cor={GREEN}>{brl(b.valor)}</Td>
                </tr>
              ))}
            </Quadro>

            {/* FUNCIONÁRIO */}
            <Quadro titulo="Por funcionário" cols={['Nome', 'Qtd', 'Bruto', 'Desc.', 'Líquido']}>
              {resumo.porFuncionario.map((f) => (
                <tr key={f.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{f.nome}</Td>
                  <Td dir>{f.qtd}</Td>
                  <Td dir>{brl(f.bruto)}</Td>
                  <Td dir>{f.desconto ? brl(f.desconto) : '—'}</Td>
                  <Td dir forte>{brl(f.liquido)}</Td>
                </tr>
              ))}
            </Quadro>

            {/* GRUPO DE PRODUTO */}
            <Quadro titulo="Por grupo de produto" cols={['Grupo', '%', 'Bruto', 'Desc.', 'Líquido']}>
              {resumo.porGrupo.map((g) => (
                <tr key={g.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{g.nome}</Td>
                  <Td dir>{g.percentual.toFixed(1).replace('.', ',')}%</Td>
                  <Td dir>{brl(g.bruto)}</Td>
                  <Td dir>{g.desconto ? brl(g.desconto) : '—'}</Td>
                  <Td dir forte>{brl(g.liquido)}</Td>
                </tr>
              ))}
            </Quadro>
          </div>
        ) : modo === 'TOTAIS' ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FBF9F4' }}>
                {['Produto / Serviço', 'Itens', 'Bruto', 'Desconto', 'Líquido'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 11, color: GREY2, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {resumo.porItem.length === 0 ? <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: GREY2, fontSize: 13 }}>Sem itens no período.</td></tr> : resumo.porGrupo.map((g) => {
                const doGrupo = resumo.porItem.filter((i) => i.grupo === g.nome);
                return (
                  <Fragment key={g.nome}>
                    <tr style={{ background: '#FBF9F4', borderTop: `1px solid ${CARD_LINE}` }}>
                      <td colSpan={5} style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, color: NAVY }}>
                        {g.nome} <span style={{ fontWeight: 400, color: GREY2 }}>· {g.percentual.toFixed(1).replace('.', ',')}% do bruto</span>
                      </td>
                    </tr>
                    {doGrupo.map((x) => (
                      <tr key={x.chave} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                        <td style={{ padding: '9px 12px 9px 24px', fontSize: 13, color: NAVY }}>
                          {x.nome}
                          {/* Dois cadastros com o mesmo nome: some no relatorio e vira erro de
                              cobranca. Aqui a tela avisa em vez de somar por engano. */}
                          {x.nomeRepetido && <span title="Existe mais de um cadastro com este nome — arrume no catálogo" style={{ marginLeft: 6, fontSize: 10.5, color: '#946200', background: '#FEF3D7', padding: '1px 6px', borderRadius: 999 }}>nome repetido</span>}
                        </td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: GREY }}>{x.qtd.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: GREY }}>{brl(x.bruto)}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', color: x.desconto ? '#946200' : '#c9c4b8' }}>{x.desconto ? brl(x.desconto) : '—'}</td>
                        <td style={{ padding: '9px 12px', fontSize: 13, textAlign: 'right', fontWeight: 600, color: NAVY }}>{brl(x.liquido)}</td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                      <td style={{ padding: '7px 12px', fontSize: 12, color: GREY2, textAlign: 'right' }}>subtotal de {g.nome}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 700, color: NAVY }}>{g.qtd.toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(g.bruto)}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(g.desconto)}</td>
                      <td style={{ padding: '7px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(g.liquido)}</td>
                    </tr>
                  </Fragment>
                );
              })}
              {resumo.porItem.length > 0 && (
                <tr style={{ borderTop: `2px solid ${NAVY}`, background: '#FBF9F4' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 700, color: NAVY }}>Total geral</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: NAVY }}>{resumo.porGrupo.reduce((a, g) => a + g.qtd, 0).toLocaleString('pt-BR')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(resumo.porGrupo.reduce((a, g) => a + g.bruto, 0))}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(resumo.porGrupo.reduce((a, g) => a + g.desconto, 0))}</td>
                  <td style={{ padding: '10px 12px', fontSize: 13, textAlign: 'right', fontWeight: 700, color: NAVY }}>{brl(resumo.porGrupo.reduce((a, g) => a + g.liquido, 0))}</td>
                </tr>
              )}
              {resumo.ajusteDeVenda !== 0 && (
                <tr style={{ background: '#FEF3D7' }}>
                  <td colSpan={4} style={{ padding: '8px 12px', fontSize: 12, color: '#946200' }}>
                    Desconto dado no total da venda (não no item) — por isso a soma dos itens fica acima do que foi cobrado
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: 12.5, textAlign: 'right', fontWeight: 700, color: '#946200' }}>−{brl(resumo.ajusteDeVenda)}</td>
                </tr>
              )}
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
              {vendasDaPagina.map((v) => <LinhaVenda key={v.id} v={v} saldoCliente={saldos[v.clienteId] || 0} />)}
            </tbody>
          </table>
        )}
        {/* Paginacao: 30 por pagina. O corte nunca e mudo — o rodape diz quantas vendas
            existem no filtro, nao so a pagina em que voce esta. */}
        {modo === 'VENDAS' && vendasF.length > 0 && (
          <div className="flex items-center justify-center gap-3 no-print" style={{ padding: '10px 12px', borderTop: `1px solid ${CARD_LINE}`, fontSize: 12.5, color: GREY }}>
            <button onClick={() => setPagina(1)} disabled={paginaAtual <= 1} style={{ border: 'none', background: 'none', cursor: paginaAtual <= 1 ? 'default' : 'pointer', color: paginaAtual <= 1 ? '#c9c4b8' : NAVY }}>&laquo;</button>
            <button onClick={() => setPagina((n) => Math.max(1, n - 1))} disabled={paginaAtual <= 1} style={{ border: 'none', background: 'none', cursor: paginaAtual <= 1 ? 'default' : 'pointer', color: paginaAtual <= 1 ? '#c9c4b8' : NAVY }}>&lsaquo;</button>
            <span>Página {paginaAtual} de {totalPaginas} · <b style={{ color: NAVY }}>{vendasF.length}</b> {vendasF.length === 1 ? 'venda' : 'vendas'} no filtro</span>
            <button onClick={() => setPagina((n) => Math.min(totalPaginas, n + 1))} disabled={paginaAtual >= totalPaginas} style={{ border: 'none', background: 'none', cursor: paginaAtual >= totalPaginas ? 'default' : 'pointer', color: paginaAtual >= totalPaginas ? '#c9c4b8' : NAVY }}>&rsaquo;</button>
            <button onClick={() => setPagina(totalPaginas)} disabled={paginaAtual >= totalPaginas} style={{ border: 'none', background: 'none', cursor: paginaAtual >= totalPaginas ? 'default' : 'pointer', color: paginaAtual >= totalPaginas ? '#c9c4b8' : NAVY }}>&raquo;</button>
          </div>
        )}
      </div>
      </>)}
    </div>
  );
}
