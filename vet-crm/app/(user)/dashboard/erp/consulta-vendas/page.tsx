// DESTINO: vet-crm/app/(user)/dashboard/erp/consulta-vendas/page.tsx
'use client';

import { useState, useEffect, useCallback, useMemo, useRef, Fragment } from 'react';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import OrcamentosBusca from '@/components/vendas/OrcamentosBusca';
import { imprimirVenda } from '@/lib/documentos/venda-print';
import { resumoDeVendas } from '@/lib/resumoDeVendas';
import { useRolePreview } from '@/lib/ui/RolePreview';
import EnviarPorWhatsApp from '@/components/comum/EnviarPorWhatsApp';
import { textoDoRelatorioVendas } from '@/lib/textoDoRelatorioVendas';
import { gerarPdfDoExtrato } from '@/lib/documentos/relatorio-vendas-pdf';
import { imprimirVendasDoCliente } from '@/lib/documentos/relatorio-vendas-print';
import ReceberEmLoteModal, { type ComandaParaReceber } from '@/components/caixa/ReceberEmLoteModal';
import { excluirVenda } from '@/lib/vendas/excluirVenda';
import toast from 'react-hot-toast';
import { imprimirComandasDoDia } from '@/lib/documentos/relatorio-vendas-print';
import SeletorDePeriodo from '@/components/comum/SeletorDePeriodo';
import { imprimirResumoDeVendas } from '@/lib/documentos/relatorio-resumo-vendas-print';
import { fundoDeModal } from "@/lib/ui/fundoDeModal";

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
interface Pacote { nome: string; vendidos: number; sessoes: number; usadas: number; valor: number; reconhecido: number; aReconhecer: number }
interface Resp { vendas: Venda[]; totais: Totais; pacotes?: Pacote[] }

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
function Kpi({ emoji, label, value, color, destaque }: { emoji: string; label: string; value: string; color: string; destaque?: boolean }) {
  return (
    // `destaque` levanta UM cartao — o saldo do cliente. Se todos tivessem borda, nenhum teria.
    <div style={{ ...cardCss, padding: destaque ? '13px 15px' : '14px 16px', border: destaque ? `2px solid ${CORAL}` : cardCss.border }} className="flex-1 min-w-[150px]">
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
    <div {...fundoDeModal(onClose)} style={{ position: 'fixed', inset: 0, background: 'rgba(1,45,55,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 12px', overflowY: 'auto' }}>
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
function LinhaVenda({ v, saldoCliente, onExcluir, excluindo }: { v: Venda; saldoCliente: number; onExcluir: (v: Venda) => void; excluindo: string | null }) {
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
                  {/* EXCLUIR VENDA veio da aba "Todas as vendas" (bloco B, 12/09/2026), para
                      ela poder sair do menu sem levar a acao embora. A regra e a mesma, de
                      lib/vendas/excluirVenda: quem nao e adm so apaga venda sem recebimento,
                      e gravacao de audio exige o segundo aviso. */}
                  <button
                    onClick={(e) => { e.stopPropagation(); onExcluir(v); }}
                    disabled={excluindo === v.id}
                    title="Excluir a venda"
                    className="inline-flex items-center gap-1.5"
                    style={{ border: '1px solid #F0D2D1', borderRadius: 8, padding: '5px 10px', fontSize: 12, fontWeight: 600, color: '#b23b39', background: '#fff', cursor: 'pointer' }}
                  >{excluindo === v.id ? '…' : '🗑️ Excluir'}</button>
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

  // O CAMPO FINO da barra de filtros: o rotulo mora dentro dele (primeira opcao do select,
  // placeholder do input), entao a barra tem uma linha de altura em vez de duas.
  // O BOTAO-ICONE: quadrado, mesma altura dos campos, para a linha ficar reta.
  const botaoIcone: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 33, height: 33, borderRadius: 8, border: `1px solid ${CARD_LINE}`, background: '#fff', color: NAVY, fontSize: 14, cursor: 'pointer', flex: '0 0 auto' };
  const fino: React.CSSProperties = { border: `1px solid ${CARD_LINE}`, borderRadius: 8, padding: '7px 9px', fontSize: 12.5, background: '#fff', color: NAVY, height: 33 };

  const [mesIni, mesFim] = useMemo(() => {
    const n = new Date();
    return [iso(new Date(n.getFullYear(), n.getMonth(), 1)), iso(new Date(n.getFullYear(), n.getMonth() + 1, 0))];
  }, []);

  const [de, setDe] = useState(mesIni);
  const [ate, setAte] = useState(mesFim);
  const [sitPg, setSitPg] = useState<'' | 'BAIXADO' | 'ABERTO'>('');
  const [marca, setMarca] = useState('');
  const [busca, setBusca] = useState('');
  const [cod, setCod] = useState('');
  const [func, setFunc] = useState('');
  const [modo, setModo] = useState<'VENDAS' | 'ORCAMENTOS' | 'TOTAIS' | 'RESUMO'>('VENDAS');
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === 'ADMIN';
  // Comeca ESCONDIDO: a tela abre virada pro balcao, e o dinheiro da clinica nao e assunto
  // de quem esta do outro lado. Um clique no olhinho mostra; outro esconde.
  const [verTotaisClinica, setVerTotaisClinica] = useState(false);
  // Saldo em aberto POR CLIENTE, de todos os dias — e o que alimenta o aviso da lista.
  const [saldos, setSaldos] = useState<Record<string, number>>({});
  // As comandas abertas de cada cliente, de TODOS os dias — a fonte do recebimento em lote.
  const [abertasPorCliente, setAbertasPorCliente] = useState<Record<string, ComandaParaReceber[]>>({});
  // Muda de valor depois de um recebimento, e com isso o efeito recarrega as abertas.
  const [recarregarAbertas, setRecarregarAbertas] = useState(0);
  const [receberDe, setReceberDe] = useState<{ nome: string; comandas: ComandaParaReceber[] } | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
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
  }, [de, ate, marca, busca, cod]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  // As contas em aberto de TODOS os dias, somadas por cliente (mesma fonte do ponto de venda).
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/caixa/vendas?abertas=true', { cache: 'no-store' });
        if (!r.ok) return;
        const arr = await r.json();
        const m: Record<string, number> = {};
        // Guarda tambem as LINHAS, nao so a soma: sao elas que o recebimento em lote precisa.
        const porCliente: Record<string, ComandaParaReceber[]> = {};
        for (const x of Array.isArray(arr) ? arr : []) {
          const k = x.tutorId || x.tutor;
          if (!k) continue;
          const aberto = Math.max(0, Number(x.valor || 0) - Number(x.pago || 0));
          m[k] = (m[k] || 0) + aberto;
          if (aberto > 0.009 && x.id) {
            (porCliente[k] = porCliente[k] || []).push({
              id: x.id, date: x.date, pet: x.pet, origem: x.origem,
              numeroVenda: x.numeroVenda ?? x.codigoExterno ?? null, aberto,
            });
          }
        }
        setSaldos(m);
        setAbertasPorCliente(porCliente);
      } catch { /* o aviso e um extra: sem ele a lista continua inteira */ }
    })();
  }, [recarregarAbertas]);

  const t = data?.totais;
  const funcs = useMemo(() => [...new Set((data?.vendas || []).map((v) => v.funcionario).filter(Boolean))] as string[], [data]);
  const vendasF = useMemo(() => (data?.vendas || [])
    .filter((v) => !func || v.funcionario === func)
    // Baixado = nao deve mais nada. Parcial ainda deve, entao conta como em aberto.
    .filter((v) => !sitPg || (sitPg === 'BAIXADO' ? v.situacao === 'PAGA' : v.situacao !== 'PAGA'))
    // Dia mais recente primeiro e, dentro do dia, o codigo maior primeiro — a ordem que a
    // recepcao espera. Por hora nao serve: venda lancada as 18h30 pode ter codigo menor.
    .sort((a, b) => {
      const da = String(a.date).slice(0, 10), db = String(b.date).slice(0, 10);
      if (da !== db) return db.localeCompare(da);
      return (Number(b.numeroVenda) || 0) - (Number(a.numeroVenda) || 0);
    }), [data, func, sitPg]);
  // Todos os quadros do Resumo saem de UMA passada (lib/resumoDeVendas, com teste): é o que
  // garante que card, quadro e linha nunca contem histórias diferentes.
  const resumo = useMemo(() => resumoDeVendas(vendasF as any), [vendasF]);

  /* ── QUEM ESTA NA TELA ────────────────────────────────────────────────────────────
     Cintia, 12/09/2026 (Fig 2): "a unica coisa que preciso e que essa parte apareca
     somente a informacoes do cliente solicitado, nao quero que todas as informacoes da
     empresa fiquem disponivel para todos os clientes."

     Nao precisou de campo novo: se o que a consulta devolveu e de UM cliente so — achado
     pelo nome dele, pelo nome do pet ou pelo numero da venda — o cabecalho vira o extrato
     dele. O gesto de quem usa continua o mesmo. */
  /* EXCLUIR VENDA veio da aba "Todas as vendas" (bloco B, 12/09/2026), para ela poder sair
     do menu sem levar a acao embora. A regra e a MESMA, de lib/vendas/excluirVenda. */
  const pedirExclusao = async (v: Venda) => {
    if (excluindo) return;   // trava no primeiro clique: nao se apaga venda duas vezes
    setExcluindo(v.id);
    const r = await excluirVenda(
      { id: v.id, numeroVenda: v.numeroVenda, tutor: v.cliente, pet: v.pet, valor: v.valor, pago: v.pago },
      { isAdmin, confirmar: (m) => window.confirm(m) },
    );
    setExcluindo(null);
    if (r.ok) { toast.success('Venda excluída.'); setRecarregarAbertas((n) => n + 1); load(); return; }
    if (r.erro) toast.error(r.erro);
  };

  const clienteUnico = useMemo(() => {
    const ids = new Set(vendasF.map((v) => v.clienteId).filter(Boolean));
    if (ids.size !== 1) return null;
    const id = [...ids][0] as string;
    const dele = vendasF.filter((v) => v.clienteId === id);
    const datas = dele.map((v) => String(v.date)).sort();
    return {
      id,
      nome: dele.find((v) => v.cliente)?.cliente || 'Cliente',
      pets: [...new Set(dele.map((v) => v.pet).filter(Boolean))] as string[],
      ultima: datas[datas.length - 1] || '',
      comprado: dele.reduce((t, v) => t + (Number(v.valor) || 0), 0),
      pago: dele.reduce((t, v) => t + (Number(v.pago) || 0), 0),
      qtd: dele.length,
    };
  }, [vendasF]);

  /* As vendas do cliente no formato que o extrato, o PDF e o WhatsApp já falam — o mesmo
     de lib/textoDoRelatorioVendas, para a conta sair igual em papel, PDF e mensagem. */
  const vendasDoCliente = useMemo(() => !clienteUnico ? [] : vendasF
    .filter((v) => v.clienteId === clienteUnico.id)
    .map((v) => ({
      numero: v.numeroVenda ?? v.codigoExterno ?? null,
      data: v.date,
      pet: v.pet || '',
      valor: Number(v.valor) || 0,
      pago: Number(v.pago) || 0,
      itens: (v.itens || []).map((it) => ({
        descricao: it.descricao || 'Item',
        quantidade: Number(it.quantidade) || 1,
        valorUnitario: Number(it.valorUnitario) || 0,
        desconto: Number(it.desconto) || 0,
      })),
    })), [clienteUnico, vendasF]);
  const totalPaginas = Math.max(1, Math.ceil(vendasF.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const vendasDaPagina = useMemo(() => vendasF.slice((paginaAtual - 1) * POR_PAGINA, paginaAtual * POR_PAGINA), [vendasF, paginaAtual]);
  useEffect(() => { setPagina(1); }, [data, func, sitPg]);
  useEffect(() => { if (!isAdmin && (modo === 'RESUMO' || modo === 'TOTAIS')) setModo('VENDAS'); }, [isAdmin, modo]);
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

      {modo === 'ORCAMENTOS' ? <OrcamentosBusca /> : (<>

      {/* cabeçalho só de impressão */}
      <div className="cv-print-h" style={{ display: 'none', marginBottom: 14 }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>Consulta de vendas · Empório do Pet</div>
        <div style={{ fontSize: 12, color: GREY }}>Período {de} a {ate}{cod ? ` · cód. ${cod}` : ''}{marca ? ` · ${marca}` : ''}{sitPg === 'BAIXADO' ? ' · baixadas' : sitPg === 'ABERTO' ? ' · em aberto' : ''}</div>
      </div>

      {/* ── A LINHA DE FILTROS, FINA E INTEIRA ──────────────────────────────────────────
          A Cintia, 08/09/2026: "essa linha nao pode ser um pouco mais delicada e que caiba
          tudo em uma linha so".

          Duas coisas engordavam a barra: cada campo tinha um ROTULO EMPILHADO em cima (o que
          dobra a altura de todos, para dizer "Status" acima de um campo cujo primeiro item ja
          e "Todos") e os botoes caiam numa segunda linha. Agora o rotulo mora dentro do proprio
          campo e a barra e uma so. */}
      <div style={{ ...cardCss, padding: '9px 11px' }} className="mb-4 no-print">
        <div className="flex items-center gap-2 flex-wrap">
          {/* A VISAO — era uma fileira de quatro abas ocupando uma linha inteira em cima.
              A Cintia, 08/09/2026: "podem ficar em um botão seletor, lembrando de manter tudo
              em uma linha só se possível". As quatro continuam existindo; mudou o gesto. */}
          <select
            value={modo}
            onChange={(e) => setModo(e.target.value as any)}
            title="O que mostrar: a lista de vendas, os totais por produto, o resumo do período ou os orçamentos"
            style={{ ...fino, fontWeight: 600, color: NAVY, borderColor: TEAL, minWidth: 168 }}
          >
            <option value="VENDAS">🧾 Vendas</option>
            {/* Totais por produto e Resumo sao painel consolidado da CLINICA — faturamento,
                desconto, ticket medio, convenios. Cintia, 12/09/2026: "so vendas, e orcamento
                para o restante da equipe — somente adm ve tudo". */}
            {isAdmin && <option value="TOTAIS">📊 Totais por produto</option>}
            {isAdmin && <option value="RESUMO">📈 Resumo</option>}
            <option value="ORCAMENTOS">📄 Orçamentos</option>
          </select>

          <SeletorDePeriodo faixa={{ de, ate }} onMudar={(f) => { setDe(f.de); setAte(f.ate); }} />

          <select value={sitPg} onChange={(e) => setSitPg(e.target.value as any)} style={fino}>
            <option value="">Situação: todas</option>
            <option value="BAIXADO">Baixado</option>
            <option value="ABERTO">Em aberto</option>
          </select>

          <select value={marca} onChange={(e) => setMarca(e.target.value)} style={fino}>
            <option value="">Todas as marcas</option>
            <option value="EMPORIO">🏥 Empório</option>
            <option value="MUNDO_A_PARTE">🌿 Mundo à Parte</option>
            <option value="DRA_VIVIAN">✨ Dra. Vivian</option>
          </select>

          {funcs.length > 0 && (
            <select value={func} onChange={(e) => setFunc(e.target.value)} style={fino}>
              <option value="">Todos os profissionais</option>
              {funcs.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          )}

          <input
            value={cod}
            onChange={(e) => setCod(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            placeholder="Nº da venda"
            style={{ ...fino, width: 112 }}
          />

          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            placeholder="Cliente, pet ou serviço"
            style={{ ...fino, flex: 1, minWidth: 150 }}
          />

          {/* SO OS ICONES (Cintia, 08/09/2026). Cada um leva `title` e `aria-label`: sem o
              texto, e ali que o nome da acao passa a viver. */}
          <button onClick={load} title="Consultar com estes filtros" aria-label="Consultar" style={{ ...botaoIcone, background: TEAL, borderColor: TEAL, color: '#fff' }}>🔍</button>

          {/* O RELATORIO DO PERIODO. Era window.print(), que imprimia a TELA — abas, filtros
              e botoes, cortada onde a pagina acabasse. Agora sai documento, no mesmo motor das
              comandas e do movimento de caixa. */}
          <button
            onClick={() => imprimirResumoDeVendas({
              resumo,
              pacotes: data?.pacotes || [],
              periodo: `${de.split('-').reverse().join('/')} a ${ate.split('-').reverse().join('/')}`,
              filtros: [cod && `cód. ${cod}`, marca, sitPg === 'BAIXADO' ? 'baixadas' : sitPg === 'ABERTO' ? 'em aberto' : '', func && `funcionário ${func}`].filter(Boolean).join(' · '),
            })}
            disabled={!vendasF.length}
            title="Relatório do período: os cartões e todos os quadros do Resumo, em papel"
            aria-label="Relatório do período"
            style={{ ...botaoIcone, opacity: vendasF.length ? 1 : .45, cursor: vendasF.length ? 'pointer' : 'not-allowed' }}
          >
            🖨️
          </button>

          {/* COMANDAS — o papel do fechamento: uma comanda por venda, dia a dia, com os itens
              de cada uma. Mora AQUI, e nao no ponto de venda, porque e nesta tela que os itens
              ja vem carregados e que se escolhe o periodo. */}
          <button
            onClick={() => imprimirComandasDoDia({ dia: de, ate, comandas: vendasF.map((v) => ({
              id: v.id, numero: v.numeroVenda ?? v.codigoExterno ?? null, data: v.date,
              tutor: v.cliente || 'Cliente', pet: v.pet || '', valor: Number(v.valor) || 0, pago: Number(v.pago) || 0,
              itens: (v.itens || []).map((it) => ({ descricao: it.descricao || 'Item', quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, desconto: Number(it.desconto) || 0 })),
            })) })}
            disabled={vendasF.length === 0}
            title="Comandas do período: uma por venda, dia a dia, com os itens de cada uma"
            aria-label="Imprimir as comandas do período"
            style={{ ...botaoIcone, opacity: vendasF.length ? 1 : .45, cursor: vendasF.length ? 'pointer' : 'not-allowed' }}
          >
            🧾
          </button>

          <a href="/dashboard/erp/recebimentos" title="Ir para Recebimentos" aria-label="Ir para Recebimentos" style={{ ...botaoIcone, textDecoration: 'none' }}>💰</a>

          {/* O OLHINHO — ultimo da fileira, so o simbolo (Cintia, 12/09/2026: "o olhinho pode
              ficar ao lado dos outros botoes, so o simbolo"). Mostra e esconde os totais da
              clinica. So o administrativo ve: pra recepcao e veterinario ele nao existe. */}
          {isAdmin && !clienteUnico && (
            <button
              onClick={() => setVerTotaisClinica((v) => !v)}
              title={verTotaisClinica ? 'Esconder os totais da clínica' : 'Ver os totais da clínica'}
              aria-label={verTotaisClinica ? 'Esconder os totais da clínica' : 'Ver os totais da clínica'}
              aria-pressed={verTotaisClinica}
              style={{ ...botaoIcone, background: verTotaisClinica ? TEAL : '#fff', borderColor: verTotaisClinica ? TEAL : NAVY }}
            >👁️</button>
          )}
        </div>
      </div>

      {/* ── O CABEÇALHO, EM TRÊS ESTADOS ───────────────────────────────────────────────
          Cintia, 12/09/2026 (Fig 2): "a única coisa que preciso é que essa parte apareça
          somente a informações do cliente solicitado, não quero que todas as informações
          da empresa fiquem disponível para todos os clientes."

          1. cliente pesquisado   -> o extrato DELE, e nada da clínica;
          2. sem cliente + adm    -> os sete cartões, atrás do 👁️, que abre escondido;
          3. sem cliente + outros -> nenhum valor; os totais moram no Resumo, só do adm.

          O cálculo não mudou: é o mesmo lib/resumoDeVendas, que sempre respeitou a pesquisa.
          O que faltava era mostrar só o do cliente. */}
      {clienteUnico ? (<>
        <div style={{ ...cardCss, borderLeft: `4px solid ${NAVY}`, padding: '11px 14px' }} className="mb-3 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: NAVY }}>{clienteUnico.nome}</div>
            <div style={{ fontSize: 11.5, color: GREY, marginTop: 2 }}>
              {clienteUnico.pets.slice(0, 3).join(' · ')}{clienteUnico.pets.length > 3 ? ` +${clienteUnico.pets.length - 3}` : ''}
              {clienteUnico.ultima ? `${clienteUnico.pets.length ? ' · ' : ''}última compra ${dm(clienteUnico.ultima)}` : ''}
              {` · ${clienteUnico.qtd} venda${clienteUnico.qtd === 1 ? '' : 's'} no período`}
            </div>
          </div>
          <div className="flex gap-1.5 flex-wrap no-print">
            {/* Papel, PDF e WhatsApp saem do MESMO texto e da MESMA soma da ficha do tutor e
                das comandas — duas contas parecidas e a clínica se contradiz na frente do
                cliente, que não sabe que são duas telas. */}
            <button
              onClick={() => imprimirVendasDoCliente({ tutor: clienteUnico.nome, comandas: vendasDoCliente.map((v) => ({ ...v, tutor: clienteUnico.nome })) })}
              title="Extrato em papel: todas as vendas deste cliente, dia a dia, com os itens"
              style={{ ...botaoIcone, width: 'auto', padding: '0 11px', fontSize: 12, fontWeight: 600 }}
            >🖨️ Extrato</button>
            <EnviarPorWhatsApp
              tutorId={clienteUnico.id}
              texto={textoDoRelatorioVendas({ cliente: clienteUnico.nome, vendas: vendasDoCliente })}
              rotulo="💬 Extrato"
              titulo={`Extrato — ${clienteUnico.nome}`}
              gerarPdf={async () => gerarPdfDoExtrato({ cliente: clienteUnico.nome, vendas: vendasDoCliente })}
            />
            {/* COBRAR e RECEBER só aparecem quando ha o que cobrar. Os dois trabalham com as
                vendas abertas de TODOS os dias, nao com as do periodo filtrado: cobrar "o que
                venceu em setembro" deixa a divida antiga pra tras. */}
            {(abertasPorCliente[clienteUnico.id]?.length || 0) > 0 && (<>
              <EnviarPorWhatsApp
                tutorId={clienteUnico.id}
                texto={textoDoRelatorioVendas({ cliente: clienteUnico.nome, vendas: vendasDoCliente, apenasEmAberto: true })}
                rotulo="💬 Cobrar"
                titulo={`Cobrança — ${clienteUnico.nome}`}
                gerarPdf={async () => gerarPdfDoExtrato({ cliente: clienteUnico.nome, vendas: vendasDoCliente, apenasEmAberto: true })}
              />
              <button
                onClick={() => setReceberDe({ nome: clienteUnico.nome, comandas: abertasPorCliente[clienteUnico.id] || [] })}
                title="Receber todas as vendas em aberto deste cliente num pagamento só"
                style={{ ...botaoIcone, width: 'auto', padding: '0 11px', fontSize: 12, fontWeight: 600, background: TEAL, borderColor: TEAL, color: '#fff' }}
              >💰 Receber</button>
            </>)}
          </div>
        </div>
        <div className="flex gap-3 flex-wrap mb-4">
          <Kpi emoji="🛒" label="Total comprado" value={brl(clienteUnico.comprado)} color={NAVY} />
          <Kpi emoji="✅" label="Já pago" value={brl(clienteUnico.pago)} color={GREEN} />
          {/* O CARTÃO EM DESTAQUE é o saldo de TODOS os tempos, não o do período filtrado.
              Filtrar setembro e cobrar o "a receber de setembro" deixa dívida antiga pra trás. */}
          <Kpi emoji="⚠️" label="Em aberto · todos os períodos" value={brl(saldos[clienteUnico.id] || 0)} color={CORAL} destaque />
          <Kpi emoji="🧾" label="Nº de compras" value={String(clienteUnico.qtd)} color={NAVY} />
          <Kpi emoji="📅" label="Última compra" value={clienteUnico.ultima ? dm(clienteUnico.ultima) : '—'} color={GREY2} />
        </div>
      </>) : (isAdmin && verTotaisClinica) ? (
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
      ) : (
        <div className="no-print mb-4" style={{ ...cardCss, border: `1px dashed ${CARD_LINE}`, padding: '13px 15px', fontSize: 12.5, color: GREY, lineHeight: 1.6 }}>
          Pesquise um cliente — por nome, pelo pet ou pelo nº da venda — para ver o extrato dele.
          {isAdmin ? ' Os totais da clínica estão no 👁️ da barra.' : ' Os totais da clínica ficam no Resumo, com o administrativo.'}
        </div>
      )}

      {/* Sem esta linha, a primeira comparação com o relatório do SimplesVet vira desconfiança
          do sistema: lá o mesmo dinheiro era contado duas vezes (produto e forma de pagamento). */}
      <div className="no-print" style={{ fontSize: 12, color: GREY2, margin: '-8px 0 14px', maxWidth: '86ch' }}>
        Compra de <b style={{ color: GREY }}>crédito de cliente</b> não conta como venda — ela vira receita no serviço em que o crédito for gasto, e aparece em “Uso de crédito” nas formas de recebimento. Por isso este total fica menor que o do SimplesVet no mesmo mês.
      </div>

      {/* Tabela */}
      <div style={{ ...cardCss, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center gap-2" style={{ padding: 48, color: GREY2, fontSize: 14 }}>
            <span className="animate-pulse">⏳ Carregando vendas…</span>
          </div>
        ) : !data || vendasF.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2" style={{ padding: 48, color: GREY2 }}>
            <span style={{ fontSize: 32 }}>📭</span>
            {/* O VAZIO DIZ DE QUE PERIODO ESTA FALANDO. Sem isso, as quatro abas mostram a
                mesma frase e parece que a tela nao responde ao clique — foi o que a Cintia
                viu em 08/09/2026, quando as vendas do mes estavam sumindo por outro motivo. */}
            <span style={{ fontSize: 14 }}>Nenhuma venda entre {de.split('-').reverse().join('/')} e {ate.split('-').reverse().join('/')}.</span>
            <span style={{ fontSize: 12.5 }}>As abas Totais, Resumo e Orçamentos se preenchem quando houver venda no período.</span>
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

            {/* PACOTES — o que o SimplesVet nao tem: sessoes usadas e receita reconhecida. */}
            {(data?.pacotes || []).length > 0 && (
              <Quadro titulo="Pacotes" subtitulo="a receita é reconhecida sessão a sessão, não no dia da venda" cols={['Pacote', 'Vend.', 'Sessões', 'Usadas', 'Reconhecido', 'A reconhecer']}>
                {(data?.pacotes || []).map((pc) => (
                  <tr key={pc.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                    <Td>{pc.nome}</Td>
                    <Td dir>{pc.vendidos}</Td>
                    <Td dir>{pc.sessoes}</Td>
                    <Td dir>{pc.usadas}</Td>
                    <Td dir cor={GREEN}>{brl(pc.reconhecido)}</Td>
                    <Td dir cor={pc.aReconhecer > 0 ? '#946200' : GREY2}>{pc.aReconhecer > 0 ? brl(pc.aReconhecer) : '—'}</Td>
                  </tr>
                ))}
                <tr style={{ borderTop: `2px solid ${NAVY}` }}>
                  <Td forte>Total</Td>
                  <Td dir forte>{(data?.pacotes || []).reduce((a, p2) => a + p2.vendidos, 0)}</Td>
                  <Td dir forte>{(data?.pacotes || []).reduce((a, p2) => a + p2.sessoes, 0)}</Td>
                  <Td dir forte>{(data?.pacotes || []).reduce((a, p2) => a + p2.usadas, 0)}</Td>
                  <Td dir forte cor={GREEN}>{brl((data?.pacotes || []).reduce((a, p2) => a + p2.reconhecido, 0))}</Td>
                  <Td dir forte cor="#946200">{brl((data?.pacotes || []).reduce((a, p2) => a + p2.aReconhecer, 0))}</Td>
                </tr>
              </Quadro>
            )}

            {/* TIPO — produto x servico, pelo tipo do item do catalogo. */}
            <Quadro titulo="Produto × serviço" cols={['Tipo', 'Itens', 'Bruto', 'Desc.', 'Líquido']}>
              {resumo.porTipo.map((t2) => (
                <tr key={t2.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                  <Td>{t2.nome}</Td>
                  <Td dir>{t2.qtd.toLocaleString('pt-BR')}</Td>
                  <Td dir>{brl(t2.bruto)}</Td>
                  <Td dir>{t2.desconto ? brl(t2.desconto) : '—'}</Td>
                  <Td dir forte>{brl(t2.liquido)}</Td>
                </tr>
              ))}
            </Quadro>

            {/* CONVENIO — item que o convenio paga sai do total do tutor. */}
            {resumo.porConvenio.length > 0 && (
              <Quadro titulo="Convênios" subtitulo="item pago pelo convênio: sai do total do tutor e vira a-receber mensal" cols={['Convênio', 'Itens', 'A faturar']}>
                {resumo.porConvenio.map((c) => (
                  <tr key={c.nome} style={{ borderTop: `1px solid ${CARD_LINE}` }}>
                    <Td>{c.nome}</Td>
                    <Td dir>{c.itens.toLocaleString('pt-BR')}</Td>
                    <Td dir forte cor="#946200">{brl(c.valor)}</Td>
                  </tr>
                ))}
              </Quadro>
            )}

            {/* GRUPO DE PRODUTO */}
            <Quadro titulo="Por grupo de produto" subtitulo="a árvore do nosso catálogo: grupo e subgrupo" cols={['Grupo', '%', 'Bruto', 'Desc.', 'Líquido']}>
              {(() => {
                // Dois níveis, como no catálogo: o pai aparece uma vez, somando os filhos.
                const pais = [...new Set(resumo.porGrupo.map((g) => g.pai))];
                return pais.map((pai) => {
                  const filhos = resumo.porGrupo.filter((g) => g.pai === pai);
                  const soma = (f: (g: typeof filhos[number]) => number) => filhos.reduce((a, g) => a + f(g), 0);
                  return (
                    <Fragment key={pai || '—'}>
                      {pai && (
                        <tr style={{ borderTop: `1px solid ${CARD_LINE}`, background: '#FBF9F4' }}>
                          <Td forte>{pai}</Td>
                          <Td dir forte>{soma((g) => g.percentual).toFixed(1).replace('.', ',')}%</Td>
                          <Td dir forte>{brl(soma((g) => g.bruto))}</Td>
                          <Td dir forte>{brl(soma((g) => g.desconto))}</Td>
                          <Td dir forte>{brl(soma((g) => g.liquido))}</Td>
                        </tr>
                      )}
                      {filhos.map((g) => (
                        <tr key={g.nome} style={{ borderTop: pai ? 'none' : `1px solid ${CARD_LINE}` }}>
                          {pai ? <Td sub>{g.nome}</Td> : <Td>{g.nome}</Td>}
                          <Td dir sub={!!pai}>{g.percentual.toFixed(1).replace('.', ',')}%</Td>
                          <Td dir sub={!!pai}>{brl(g.bruto)}</Td>
                          <Td dir sub={!!pai}>{g.desconto ? brl(g.desconto) : '—'}</Td>
                          <Td dir forte={!pai} sub={!!pai}>{brl(g.liquido)}</Td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                });
              })()}
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
              {vendasDaPagina.map((v) => <LinhaVenda key={v.id} v={v} saldoCliente={saldos[v.clienteId] || 0} onExcluir={pedirExclusao} excluindo={excluindo} />)}
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

      {/* RECEBER TUDO JUNTO, aqui mesmo (bloco B, 12/09/2026). Cintia: "quero que fique
          somente a opcao de consulta de vendas" — para a aba de Vendas em aberto poder sair
          do menu, receber precisa existir DENTRO desta tela. O componente e o MESMO que a
          tela de comandas usa: recebimento e dinheiro, e duas copias significam corrigir uma
          e esquecer a outra. */}
      {receberDe && (
        <ReceberEmLoteModal
          tutor={receberDe.nome}
          comandas={receberDe.comandas}
          onFechar={() => setReceberDe(null)}
          onRecebido={() => { setRecarregarAbertas((n) => n + 1); load(); }}
        />
      )}
    </div>
  );
}
