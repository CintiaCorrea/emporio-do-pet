// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/caixa/page.tsx
// Caixa — Resumo / Lista de recebimentos. Movimentos + Credito do pet + Fechamento (conferencia) / Reabrir / Impressao.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  LuPlus, LuLock, LuLockOpen, LuPrinter, LuHistory, LuChevronLeft, LuChevronRight,
  LuX, LuWallet, LuArrowRightLeft, LuTrash2, LuGift,
} from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';

type Forma = { forma: string; valor: number; parcelas: number; nsu: string };

interface Movimento {
  id: string; tipo: string; valor: number;
  forma?: string | null; conta?: string | null; descricao?: string | null; observacao?: string | null; data: string;
}
interface CreditoUtil {
  id: string; tipo: string; valor: number; descricao?: string | null; data: string;
  appointmentId?: string | null; tutor?: { id: string; name: string } | null;
}
interface Recebimento {
  id: string; valorTotal: number; desconto: number; troco: number; formas: Forma[];
  observacao?: string | null; data: string; appointmentId?: string | null;
  appointment?: { id: string; value: number; pet?: { name: string }; tutor?: { name: string } } | null;
}
interface Caixa {
  id: string; numero: number; status: 'ABERTO' | 'FECHADO';
  abertura: string; fechamento?: string | null; suprimento: number; observacao?: string | null;
  valorEsperado?: number | null; valorContado?: number | null; diferenca?: number | null; obsFechamento?: string | null;
  user?: { id: string; name: string } | null;
  recebimentos: Recebimento[]; movimentos?: Movimento[]; creditosUtilizados?: CreditoUtil[];
}
interface Appointment {
  id: string; value: number; paymentStatus?: string; tutorId?: string;
  pet?: { name: string } | null; tutor?: { id?: string; name: string } | null; start?: string;
}

const FORMAS_PADRAO = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const CONTAS = ['Caixa', 'Banco', 'Cofre'];
const ehDinheiro = (f?: string | null) => /dinheiro/i.test(f || '');
const ehCredito = (f?: string | null) => /cr[eé]dito do pet/i.test(f || '');
const ehEntrada = (tipo: string) => tipo === 'SUPRIMENTO';
const tipoLabel: Record<string, string> = { SUPRIMENTO: 'Suprimento', SANGRIA: 'Sangria', DESPESA: 'Despesa', TRANSFERENCIA: 'Transferência' };

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const hora = (s?: string | null) => (s ? new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
const dataHora = (s?: string | null) =>
  s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDataLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };

export default function CaixaPage() {
  const [date, setDate] = useState(hojeStr());
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Caixa | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<'resumo' | 'recebimentos'>('resumo');
  const [loading, setLoading] = useState(true);

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [abrirForm, setAbrirForm] = useState({ suprimento: '', observacao: '' });
  const [receberOpen, setReceberOpen] = useState(false);
  const [vendaSel, setVendaSel] = useState<Appointment | null>(null);
  const [formas, setFormas] = useState<Forma[]>([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]);
  const [desconto, setDesconto] = useState(0);
  const [obsReceb, setObsReceb] = useState('');
  const [tutorSaldo, setTutorSaldo] = useState<number | null>(null);
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState('SUPRIMENTO');
  const [movForm, setMovForm] = useState({ valor: '', forma: 'Dinheiro', conta: 'Banco', descricao: '', observacao: '' });
  const [credOpen, setCredOpen] = useState(false);
  const [credForm, setCredForm] = useState({ appointmentId: '', tipo: 'RECARGA', valor: '', descricao: '' });
  const [fecharOpen, setFecharOpen] = useState(false);
  const [fecharForm, setFecharForm] = useState({ valorContado: '', observacao: '' });

  const inert = (label: string) => toast(`${label}: em breve`);

  const fetchCaixas = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/caixa?date=${date}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar caixas');
      const data: Caixa[] = await r.json();
      setCaixas(data || []);
      if (data && data.length) {
        const stillThere = data.find((c) => c.id === selectedId);
        setSelectedId(stillThere ? stillThere.id : data[0].id);
      } else { setSelectedId(null); setDetail(null); }
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar caixas'); }
    finally { setLoading(false); }
  }, [date, selectedId]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/caixa/${id}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar caixa');
      setDetail(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar caixa'); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const r = await fetch(`/api/appointments?limit=1000`, { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      const list: Appointment[] = (data.appointments || data.data || data || [])
        .filter((a: any) => Number(a.value) > 0)
        .filter((a: any) => (a.start ? a.start.slice(0, 10) === date : true));
      setAppointments(list);
    } catch { /* silencioso */ }
  }, [date]);

  useEffect(() => { fetchCaixas(); fetchAppointments(); }, [date]); // eslint-disable-line
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const mudarDia = (delta: number) => {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  };

  const tutorIdDe = (a?: Appointment | null) => a?.tutorId || a?.tutor?.id || null;

  const resumo = useMemo(() => {
    const map = new Map<string, { vendas: number; sup: number }>();
    const add = (forma: string, campo: 'vendas' | 'sup', valor: number) => {
      const cur = map.get(forma) || { vendas: 0, sup: 0 }; cur[campo] += valor; map.set(forma, cur);
    };
    (detail?.recebimentos || []).forEach((rec) => (rec.formas || []).forEach((f) => add(f.forma || 'Outros', 'vendas', Number(f.valor || 0))));
    if (detail?.suprimento) add('Dinheiro', 'sup', Number(detail.suprimento));
    (detail?.movimentos || []).filter((m) => m.tipo === 'SUPRIMENTO').forEach((m) => add(m.forma || 'Dinheiro', 'sup', Number(m.valor || 0)));
    const linhas = Array.from(map.entries()).map(([forma, v]) => ({ forma, vendas: v.vendas, sup: v.sup, resultado: v.vendas + v.sup }));
    const tot = linhas.reduce((s, l) => ({ vendas: s.vendas + l.vendas, sup: s.sup + l.sup, resultado: s.resultado + l.resultado }), { vendas: 0, sup: 0, resultado: 0 });
    return { linhas, tot };
  }, [detail]);

  const saldoDinheiro = useMemo(() => {
    if (!detail) return 0;
    const cashRecebido = (detail.recebimentos || []).reduce(
      (s, r) => s + (r.formas || []).filter((f) => ehDinheiro(f.forma)).reduce((a, f) => a + Number(f.valor || 0), 0), 0);
    const movs = detail.movimentos || [];
    const entradas = movs.filter((m) => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor || 0), 0);
    const saidas = movs.filter((m) => m.tipo !== 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor || 0), 0);
    return Number(detail.suprimento || 0) + cashRecebido + entradas - saidas;
  }, [detail]);

  const pagoPorAppt = useMemo(() => {
    const m = new Map<string, number>();
    (detail?.recebimentos || []).forEach((r) => { if (r.appointmentId) m.set(r.appointmentId, (m.get(r.appointmentId) || 0) + Number(r.valorTotal || 0)); });
    return m;
  }, [detail]);

  const statusVenda = (value: number, pago: number) => {
    const saldo = value - pago;
    if (saldo <= 0.001) return { label: 'Baixado', bg: '#e1f5ee', fg: GREEN, saldo: 0 };
    if (pago > 0.001) return { label: 'Baixa parcial', bg: '#fdf6e3', fg: '#854F0B', saldo };
    return { label: 'Em atendimento', bg: '#fef0e8', fg: '#993C1D', saldo };
  };

  const movLinhas = useMemo(() => {
    const linhas: { data: string; tipo: string; descricao: string; conta: string; valor: number; entrada: boolean }[] = [];
    if (detail?.suprimento && detail.suprimento > 0) {
      linhas.push({ data: detail.abertura, tipo: 'Suprimento', descricao: `Abertura de caixa${detail.observacao ? ' — ' + detail.observacao : ''}`, conta: 'Caixa', valor: Number(detail.suprimento), entrada: true });
    }
    (detail?.movimentos || []).forEach((m) =>
      linhas.push({ data: m.data, tipo: tipoLabel[m.tipo] || m.tipo, descricao: m.descricao || '—', conta: m.conta || 'Caixa', valor: Number(m.valor || 0), entrada: ehEntrada(m.tipo) }));
    return linhas.sort((a, b) => +new Date(b.data) - +new Date(a.data));
  }, [detail]);

  const abrirCaixa = async () => {
    try {
      const r = await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suprimento: Number(String(abrirForm.suprimento).replace(',', '.')) || 0, observacao: abrirForm.observacao || null }) });
      if (!r.ok) throw new Error('Erro ao abrir caixa');
      toast.success('Caixa aberto!'); setAbrirOpen(false); setAbrirForm({ suprimento: '', observacao: '' }); await fetchCaixas();
    } catch (e: any) { toast.error(e.message || 'Erro ao abrir caixa'); }
  };

  const abrirFechar = () => { setFecharForm({ valorContado: '', observacao: '' }); setFecharOpen(true); };

  const fecharCaixa = async () => {
    if (!detail) return;
    const valorContado = fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.'));
    try {
      const r = await fetch(`/api/caixa/${detail.id}/fechar`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ valorEsperado: Number(saldoDinheiro.toFixed(2)), valorContado, observacao: fecharForm.observacao || null }),
      });
      if (!r.ok) throw new Error('Erro ao encerrar caixa');
      toast.success('Caixa encerrado!'); setFecharOpen(false); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao encerrar caixa'); }
  };

  const reabrirCaixa = async () => {
    if (!detail) return;
    if (!confirm(`Reabrir o Caixa nº ${detail.numero}?`)) return;
    try {
      const r = await fetch(`/api/caixa/${detail.id}/reabrir`, { method: 'PATCH' });
      if (!r.ok) throw new Error('Erro ao reabrir caixa');
      toast.success('Caixa reaberto!'); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao reabrir caixa'); }
  };

  const abrirReceber = async (venda: Appointment) => {
    setVendaSel(venda); setFormas([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]);
    setDesconto(0); setObsReceb(''); setTutorSaldo(null); setReceberOpen(true);
    const tid = tutorIdDe(venda);
    if (tid) { try { const r = await fetch(`/api/credito/tutor/${tid}`, { cache: 'no-store' }); if (r.ok) { const d = await r.json(); setTutorSaldo(Number(d.saldo || 0)); } } catch { /* ignore */ } }
  };

  const somaFormas = formas.reduce((s, f) => s + Number(f.valor || 0), 0);
  const creditoNasFormas = formas.filter((f) => ehCredito(f.forma)).reduce((s, f) => s + Number(f.valor || 0), 0);
  const creditoExcede = tutorSaldo !== null && creditoNasFormas > tutorSaldo + 0.001;
  const valorDevido = vendaSel ? Number(vendaSel.value) - (pagoPorAppt.get(vendaSel.id) || 0) : 0;
  const temDinheiro = formas.some((f) => ehDinheiro(f.forma));
  const troco = temDinheiro && somaFormas + desconto > valorDevido ? somaFormas + desconto - valorDevido : 0;
  const valorAplicado = Math.max(0, somaFormas + desconto - troco);
  const saldoRestante = Math.max(0, valorDevido - valorAplicado);

  const registrarRecebimento = async () => {
    if (!detail || !vendaSel) return;
    if (somaFormas <= 0) { toast.error('Informe ao menos uma forma com valor'); return; }
    if (creditoExcede) { toast.error('Crédito do cliente insuficiente'); return; }
    try {
      const r = await fetch(`/api/caixa/${detail.id}/recebimento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: vendaSel.id, valorTotal: valorAplicado, desconto, troco, formas, observacao: obsReceb || null }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao registrar recebimento'); }
      toast.success('Recebimento registrado!'); setReceberOpen(false); await fetchDetail(detail.id); await fetchAppointments();
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar recebimento'); }
  };

  const abrirMov = (tipo: string) => { setMovTipo(tipo); setMovForm({ valor: '', forma: 'Dinheiro', conta: 'Banco', descricao: '', observacao: '' }); setMovOpen(true); };

  const registrarMovimento = async () => {
    if (!detail) return;
    const valor = Number(String(movForm.valor).replace(',', '.')) || 0;
    if (valor <= 0) { toast.error('Informe o valor'); return; }
    try {
      const r = await fetch(`/api/caixa/${detail.id}/movimento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: movTipo, valor, forma: movForm.forma || null, conta: movTipo === 'TRANSFERENCIA' ? movForm.conta : null, descricao: movForm.descricao || null, observacao: movForm.observacao || null }),
      });
      if (!r.ok) throw new Error('Erro ao registrar movimento');
      toast.success(`${tipoLabel[movTipo]} registrada!`); setMovOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar movimento'); }
  };

  const abrirCredito = () => { setCredForm({ appointmentId: appointments[0]?.id || '', tipo: 'RECARGA', valor: '', descricao: '' }); setCredOpen(true); };

  const adicionarCredito = async () => {
    if (!detail) return;
    const valor = Number(String(credForm.valor).replace(',', '.')) || 0;
    if (!credForm.appointmentId) { toast.error('Selecione o cliente'); return; }
    if (valor <= 0) { toast.error('Informe o valor'); return; }
    try {
      const r = await fetch('/api/credito', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: credForm.appointmentId, tipo: credForm.tipo, valor, descricao: credForm.descricao || null, caixaSessaoId: detail.id }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao adicionar crédito'); }
      toast.success('Crédito adicionado!'); setCredOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao adicionar crédito'); }
  };

  const vendasEmAberto = appointments.filter((a) => { const pago = pagoPorAppt.get(a.id) || 0; return Number(a.value) - pago > 0.001; });
  const aberto = detail?.status === 'ABERTO';

  const contado = fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.'));
  const difPrevia = contado === null ? null : Number((contado - saldoDinheiro).toFixed(2));

  return (
    <div className="min-h-screen w-full" style={{ background: '#f6fafb' }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } .caixa-card { box-shadow: none !important; border: none !important; } }`}</style>
      <div className="p-6 max-w-2xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-semibold" style={{ color: '#0f2b32' }}>Caixa</h1>
            <p className="text-sm text-slate-500 no-print">Controle de recebimentos do dia</p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <div className="flex items-center border rounded-[9px] overflow-hidden" style={{ borderColor: '#d7e0e2' }}>
              <button onClick={() => mudarDia(-1)} className="px-3 py-2" style={{ color: TEAL_DARK }} aria-label="Dia anterior"><LuChevronLeft size={16} /></button>
              <span className="text-sm font-medium px-3" style={{ color: '#0f2b32' }}>{date === hojeStr() ? 'Hoje · ' : ''}{fmtDataLabel(date)}</span>
              <button onClick={() => mudarDia(1)} className="px-3 py-2" style={{ color: TEAL_DARK }} aria-label="Próximo dia"><LuChevronRight size={16} /></button>
            </div>
            <button onClick={() => setAbrirOpen(true)} className="flex items-center gap-2 px-4 py-2 rounded-[9px] text-white font-medium" style={{ background: TEAL }}><LuPlus size={16} /> Abrir caixa</button>
          </div>
        </div>

        {loading && <p className="text-slate-500">Carregando…</p>}

        {!loading && caixas.length === 0 && (
          <div className="bg-white border rounded-xl p-10 text-center" style={{ borderColor: '#e1e8ea' }}>
            <LuWallet size={28} className="mx-auto mb-3" style={{ color: TEAL }} />
            <p className="text-slate-600">Nenhum caixa neste dia.</p>
            <p className="text-slate-400 text-sm mt-1">Clique em “Abrir caixa” para começar.</p>
          </div>
        )}

        {caixas.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap no-print">
            {caixas.map((c) => {
              const on = c.id === selectedId;
              return (
                <button key={c.id} onClick={() => setSelectedId(c.id)} className="rounded-[10px] px-4 py-2 text-left"
                  style={on ? { border: `1.5px solid ${TEAL}`, background: '#e8f7f9' } : { border: '0.5px solid #d7e0e2', background: '#fff' }}>
                  <div className="text-xs font-medium" style={{ color: on ? '#0f6e7a' : '#475569' }}>Caixa nº {c.numero} · {c.user?.name || '—'}</div>
                  <div className="text-[11px]" style={{ color: on ? '#0f6e7a' : '#94a3b8' }}>{c.status === 'ABERTO' ? `Aberto às ${hora(c.abertura)}` : 'Fechado'}</div>
                </button>
              );
            })}
          </div>
        )}

        {detail && (
          <div className="bg-white border rounded-xl p-5 caixa-card" style={{ borderColor: '#e1e8ea' }}>
            <div className="text-sm leading-7 mb-4">
              <div><span style={{ color: '#0f6e7a', fontWeight: 500 }}>Caixa:</span> <span style={{ color: '#0f2b32' }}>{detail.numero}</span></div>
              <div><span style={{ color: '#0f6e7a', fontWeight: 500 }}>Usuário:</span> <span style={{ color: '#0f2b32' }}>{detail.user?.name || '—'}</span></div>
              <div><span style={{ color: '#0f6e7a', fontWeight: 500 }}>Abertura:</span> <span style={{ color: '#0f2b32' }}>{dataHora(detail.abertura)}</span></div>
              {detail.fechamento && <div><span style={{ color: '#0f6e7a', fontWeight: 500 }}>Fechamento:</span> <span style={{ color: '#0f2b32' }}>{dataHora(detail.fechamento)}</span></div>}
              <div><span style={{ color: '#0f6e7a', fontWeight: 500 }}>Status:</span>{' '}
                <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={aberto ? { background: '#e1f5ee', color: GREEN } : { background: '#eef2f3', color: '#64748b' }}>{aberto ? 'ABERTO' : 'FECHADO'}</span>
              </div>
            </div>

            <div className="flex gap-6 border-b mb-4 no-print" style={{ borderColor: '#e1e8ea' }}>
              {(['resumo', 'recebimentos'] as const).map((t) => {
                const on = tab === t;
                return (<button key={t} onClick={() => setTab(t)} className="text-sm pb-2" style={on ? { color: TEAL, fontWeight: 500, borderBottom: `2px solid ${TEAL}` } : { color: '#94a3b8' }}>{t === 'resumo' ? 'Resumo' : 'Lista de recebimentos'}</button>);
              })}
            </div>

            {tab === 'resumo' && (
              <>
                <div className="text-[15px] mb-2" style={{ color: '#0f2b32' }}>Valores recebidos no caixa</div>
                <table className="w-full text-sm mb-5" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="text-slate-500" style={{ borderBottom: '0.5px solid #e1e8ea' }}>
                      <th className="text-left font-medium py-1.5 px-2">Forma de recebimento</th>
                      <th className="text-right font-medium py-1.5 px-2">Vendas</th>
                      <th className="text-right font-medium py-1.5 px-2">Suprimentos</th>
                      <th className="text-right font-medium py-1.5 px-2">Resultado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.linhas.length === 0 && (<tr><td colSpan={4} className="py-4 px-2 text-slate-400 text-center">Nenhum valor recebido ainda.</td></tr>)}
                    {resumo.linhas.map((l) => (
                      <tr key={l.forma} style={{ borderBottom: '0.5px solid #f1f5f6' }}>
                        <td className="py-2 px-2" style={{ color: '#0f6e7a' }}>{l.forma}</td>
                        <td className="py-2 px-2 text-right">{l.vendas ? brl(l.vendas) : '—'}</td>
                        <td className="py-2 px-2 text-right">{l.sup ? brl(l.sup) : '—'}</td>
                        <td className="py-2 px-2 text-right font-medium">{brl(l.resultado)}</td>
                      </tr>
                    ))}
                    {resumo.linhas.length > 0 && (
                      <tr style={{ borderTop: '0.5px solid #d7e0e2' }}>
                        <td className="py-2 px-2 font-medium" style={{ color: '#0f2b32' }}>Total</td>
                        <td className="py-2 px-2 text-right font-medium">{brl(resumo.tot.vendas)}</td>
                        <td className="py-2 px-2 text-right font-medium">{brl(resumo.tot.sup)}</td>
                        <td className="py-2 px-2 text-right font-medium" style={{ color: TEAL_DARK }}>{brl(resumo.tot.resultado)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Saldo / Conferência */}
                {aberto ? (
                  <div className="flex items-center justify-between rounded-lg px-3 py-2.5 mb-6" style={{ background: '#e8f7f9' }}>
                    <span className="text-sm" style={{ color: '#0f6e7a' }}>Saldo em dinheiro (gaveta)</span>
                    <span className="text-lg font-semibold" style={{ color: TEAL_DARK }}>{brl(saldoDinheiro)}</span>
                  </div>
                ) : (
                  <div className="rounded-lg px-3 py-3 mb-6" style={{ background: '#f8fafb', border: '0.5px solid #e1e8ea' }}>
                    <div className="text-[13px] font-medium mb-1.5" style={{ color: '#0f2b32' }}>Conferência de fechamento</div>
                    <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">Esperado em dinheiro</span><span>{brl(Number(detail.valorEsperado ?? saldoDinheiro))}</span></div>
                    <div className="flex justify-between text-sm py-0.5"><span className="text-slate-500">Contado</span><span>{detail.valorContado != null ? brl(Number(detail.valorContado)) : '—'}</span></div>
                    <div className="flex justify-between text-sm py-0.5 font-medium">
                      <span style={{ color: '#0f2b32' }}>Diferença</span>
                      <span style={{ color: detail.diferenca == null ? '#94a3b8' : Math.abs(Number(detail.diferenca)) < 0.005 ? GREEN : Number(detail.diferenca) > 0 ? GREEN : ORANGE }}>
                        {detail.diferenca == null ? '—' : (Number(detail.diferenca) > 0 ? 'Sobra ' : Number(detail.diferenca) < 0 ? 'Falta ' : '') + brl(Math.abs(Number(detail.diferenca)))}
                      </span>
                    </div>
                    {detail.obsFechamento && <div className="text-[12px] text-slate-500 mt-1">Obs.: {detail.obsFechamento}</div>}
                  </div>
                )}

                <div className="text-[15px] mb-2" style={{ color: '#0f2b32' }}>Movimentações</div>
                <table className="w-full text-sm mb-6" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="text-slate-500" style={{ borderBottom: '0.5px solid #e1e8ea' }}>
                      <th className="text-left font-medium py-1.5 px-2">Data</th><th className="text-left font-medium py-1.5 px-2">Tipo</th>
                      <th className="text-left font-medium py-1.5 px-2">Descrição</th><th className="text-left font-medium py-1.5 px-2">Conta</th>
                      <th className="text-right font-medium py-1.5 px-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movLinhas.length === 0 && (<tr><td colSpan={5} className="py-4 px-2 text-slate-400 text-center">Sem movimentações.</td></tr>)}
                    {movLinhas.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '0.5px solid #f1f5f6' }}>
                        <td className="py-2 px-2 text-slate-600">{dataHora(m.data)}</td>
                        <td className="py-2 px-2" style={{ color: m.entrada ? GREEN : ORANGE }}>{m.tipo}</td>
                        <td className="py-2 px-2 text-slate-600">{m.descricao}</td>
                        <td className="py-2 px-2 text-slate-500">{m.conta}</td>
                        <td className="py-2 px-2 text-right font-medium" style={{ color: m.entrada ? GREEN : ORANGE }}>{m.entrada ? '' : '− '}{brl(m.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="text-[15px] mb-2" style={{ color: '#0f2b32' }}>Créditos utilizados</div>
                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="text-slate-500" style={{ borderBottom: '0.5px solid #e1e8ea' }}>
                      <th className="text-left font-medium py-1.5 px-2">Data</th><th className="text-left font-medium py-1.5 px-2">Cliente</th>
                      <th className="text-left font-medium py-1.5 px-2">Descrição</th><th className="text-right font-medium py-1.5 px-2">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.creditosUtilizados || []).length === 0 && (<tr><td colSpan={4} className="py-4 px-2 text-slate-400 text-center">Nenhum crédito utilizado.</td></tr>)}
                    {(detail.creditosUtilizados || []).map((c) => (
                      <tr key={c.id} style={{ borderBottom: '0.5px solid #f1f5f6' }}>
                        <td className="py-2 px-2 text-slate-600">{dataHora(c.data)}</td>
                        <td className="py-2 px-2" style={{ color: '#0f2b32' }}>{c.tutor?.name || 'Cliente'}</td>
                        <td className="py-2 px-2 text-slate-500">{c.descricao || '—'}</td>
                        <td className="py-2 px-2 text-right font-medium" style={{ color: ORANGE }}>− {brl(Number(c.valor))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {tab === 'recebimentos' && (
              <>
                {aberto && (
                  <div className="mb-3 no-print">
                    {vendasEmAberto.length > 0 ? (
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium" style={{ color: TEAL }}>+ Registrar recebimento ({vendasEmAberto.length} venda(s) em aberto)</summary>
                        <div className="mt-2 border rounded-lg divide-y" style={{ borderColor: '#eef2f3' }}>
                          {vendasEmAberto.map((v) => (
                            <div key={v.id} className="flex items-center justify-between px-3 py-2">
                              <span style={{ color: '#0f2b32' }}>{v.tutor?.name || 'Cliente'} · {v.pet?.name || 'Pet'}</span>
                              <span className="flex items-center gap-3">
                                <span style={{ color: ORANGE, fontWeight: 500 }}>{brl(Number(v.value) - (pagoPorAppt.get(v.id) || 0))}</span>
                                <button onClick={() => abrirReceber(v)} className="text-white text-xs px-3 py-1.5 rounded-lg" style={{ background: TEAL }}>Receber</button>
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ) : (<p className="text-sm text-slate-400">Nenhuma venda em aberto neste dia.</p>)}
                  </div>
                )}

                <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
                  <thead>
                    <tr className="text-slate-500" style={{ borderBottom: '0.5px solid #e1e8ea' }}>
                      <th className="text-left font-medium py-1.5 px-2">Hora</th><th className="text-left font-medium py-1.5 px-2">Cliente · Pet</th>
                      <th className="text-left font-medium py-1.5 px-2">Formas</th><th className="text-right font-medium py-1.5 px-2">Valor</th>
                      <th className="text-right font-medium py-1.5 px-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.recebimentos || []).length === 0 && (<tr><td colSpan={5} className="py-4 px-2 text-slate-400 text-center">Nenhum recebimento registrado.</td></tr>)}
                    {(detail.recebimentos || []).map((rec) => {
                      const value = Number(rec.appointment?.value || 0);
                      const pago = rec.appointmentId ? pagoPorAppt.get(rec.appointmentId) || 0 : 0;
                      const st = statusVenda(value, pago);
                      return (
                        <tr key={rec.id} style={{ borderBottom: '0.5px solid #f1f5f6' }}>
                          <td className="py-2.5 px-2 text-slate-600">{hora(rec.data)}</td>
                          <td className="py-2.5 px-2" style={{ color: '#0f2b32' }}>{rec.appointment?.tutor?.name || 'Cliente'} · {rec.appointment?.pet?.name || 'Pet'}</td>
                          <td className="py-2.5 px-2 text-slate-500">{(rec.formas || []).map((f) => f.forma).join(' + ') || '—'}</td>
                          <td className="py-2.5 px-2 text-right">{brl(Number(rec.valorTotal))}</td>
                          <td className="py-2.5 px-2 text-right"><span className="text-[11px] px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>{st.label}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            <div className="flex gap-2 flex-wrap border-t pt-4 mt-5 no-print" style={{ borderColor: '#e1e8ea' }}>
              <button onClick={() => inert('Log')} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border" style={{ borderColor: '#d7e0e2', color: '#475569', background: '#fff' }}><LuHistory size={14} /> Log</button>
              <button onClick={() => abrirMov('SUPRIMENTO')} disabled={!aberto} className="text-xs font-medium px-3 py-2 rounded-lg text-white disabled:opacity-40" style={{ background: TEAL }}>Suprimento</button>
              <button onClick={() => abrirMov('SANGRIA')} disabled={!aberto} className="text-xs font-medium px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: ORANGE, color: ORANGE, background: '#fff' }}>Sangria</button>
              <button onClick={() => abrirMov('DESPESA')} disabled={!aberto} className="text-xs font-medium px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: ORANGE, color: ORANGE, background: '#fff' }}>Despesa</button>
              <button onClick={() => abrirMov('TRANSFERENCIA')} disabled={!aberto} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: TEAL_DARK, color: TEAL_DARK, background: '#fff' }}><LuArrowRightLeft size={14} /> Transferência</button>
              <button onClick={abrirCredito} disabled={!aberto} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border disabled:opacity-40" style={{ borderColor: TEAL, color: TEAL, background: '#fff' }}><LuGift size={14} /> Crédito</button>
              {!aberto && <button onClick={reabrirCaixa} className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border" style={{ borderColor: '#d7e0e2', color: '#475569', background: '#fff' }}><LuLockOpen size={14} /> Reabrir</button>}
              <button onClick={() => window.print()} className="ml-auto flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border" style={{ borderColor: TEAL_DARK, color: TEAL_DARK, background: '#fff' }}><LuPrinter size={14} /> Imprimir</button>
              {aberto && (<button onClick={abrirFechar} className="flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg text-white" style={{ background: TEAL_DARK }}><LuLock size={14} /> Revisar e encerrar</button>)}
            </div>
          </div>
        )}
      </div>

      {/* MODAL ABRIR CAIXA */}
      {abrirOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#eef2f3' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#0f2b32' }}>Abrir caixa</h3>
              <button onClick={() => setAbrirOpen(false)}><LuX size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Suprimento (fundo de troco)</label>
                <input value={abrirForm.suprimento} onChange={(e) => setAbrirForm({ ...abrirForm, suprimento: e.target.value })} inputMode="decimal" placeholder="0,00" className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Observação</label>
                <input value={abrirForm.observacao} onChange={(e) => setAbrirForm({ ...abrirForm, observacao: e.target.value })} placeholder="Ex: Abertura de caixa Isabela" className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: '#eef2f3' }}>
              <button onClick={() => setAbrirOpen(false)} className="px-4 py-2.5 rounded-lg border text-slate-600" style={{ borderColor: '#d7e0e2' }}>Cancelar</button>
              <button onClick={abrirCaixa} className="px-5 py-2.5 rounded-lg text-white font-medium" style={{ background: TEAL }}>Abrir caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL FECHAR (CONFERÊNCIA) */}
      {fecharOpen && detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#eef2f3' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#0f2b32' }}>Revisar e encerrar</h3>
              <button onClick={() => setFecharOpen(false)}><LuX size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: '#e8f7f9' }}>
                <span className="text-sm" style={{ color: '#0f6e7a' }}>Esperado em dinheiro (gaveta)</span>
                <b className="text-base" style={{ color: TEAL_DARK, fontWeight: 600 }}>{brl(saldoDinheiro)}</b>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Dinheiro contado</label>
                <input value={fecharForm.valorContado} onChange={(e) => setFecharForm({ ...fecharForm, valorContado: e.target.value })} inputMode="decimal" placeholder="0,00" className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
              {difPrevia !== null && (
                <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: Math.abs(difPrevia) < 0.005 ? '#e1f5ee' : '#fef0e8' }}>
                  <span className="text-sm" style={{ color: difPrevia >= 0 ? GREEN : '#993C1D' }}>{Math.abs(difPrevia) < 0.005 ? 'Caixa confere' : difPrevia > 0 ? 'Sobra' : 'Falta'}</span>
                  <b className="text-sm" style={{ color: difPrevia >= 0 ? GREEN : ORANGE }}>{brl(Math.abs(difPrevia))}</b>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Observação</label>
                <input value={fecharForm.observacao} onChange={(e) => setFecharForm({ ...fecharForm, observacao: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: '#eef2f3' }}>
              <button onClick={() => setFecharOpen(false)} className="px-4 py-2.5 rounded-lg border text-slate-600" style={{ borderColor: '#d7e0e2' }}>Cancelar</button>
              <button onClick={fecharCaixa} className="px-5 py-2.5 rounded-lg text-white font-medium" style={{ background: TEAL_DARK }}>Encerrar caixa</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMENTO */}
      {movOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#eef2f3' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#0f2b32' }}>{tipoLabel[movTipo]}</h3>
              <button onClick={() => setMovOpen(false)}><LuX size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Valor</label>
                <input value={movForm.valor} onChange={(e) => setMovForm({ ...movForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
              {movTipo === 'TRANSFERENCIA' ? (
                <div>
                  <label className="block text-sm text-slate-600 mb-1.5">Conta destino</label>
                  <select value={movForm.conta} onChange={(e) => setMovForm({ ...movForm, conta: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }}>
                    {CONTAS.filter((c) => c !== 'Caixa').map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm text-slate-600 mb-1.5">Forma</label>
                  <select value={movForm.forma} onChange={(e) => setMovForm({ ...movForm, forma: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }}>
                    {FORMAS_PADRAO.filter((f) => !ehCredito(f)).map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Descrição</label>
                <input value={movForm.descricao} onChange={(e) => setMovForm({ ...movForm, descricao: e.target.value })} placeholder={movTipo === 'DESPESA' ? 'Ex: Pagamento fornecedor' : movTipo === 'TRANSFERENCIA' ? 'Ex: Depósito no banco' : ''} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Observação</label>
                <input value={movForm.observacao} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: '#eef2f3' }}>
              <button onClick={() => setMovOpen(false)} className="px-4 py-2.5 rounded-lg border text-slate-600" style={{ borderColor: '#d7e0e2' }}>Cancelar</button>
              <button onClick={registrarMovimento} className="px-5 py-2.5 rounded-lg text-white font-medium" style={{ background: ehEntrada(movTipo) ? TEAL : TEAL_DARK }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉDITO */}
      {credOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#eef2f3' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#0f2b32' }}>Adicionar crédito</h3>
              <button onClick={() => setCredOpen(false)}><LuX size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Cliente (pela venda do dia)</label>
                <select value={credForm.appointmentId} onChange={(e) => setCredForm({ ...credForm, appointmentId: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }}>
                  <option value="">Selecione…</option>
                  {appointments.map((a) => <option key={a.id} value={a.id}>{a.tutor?.name || 'Cliente'} · {a.pet?.name || 'Pet'}</option>)}
                </select>
                {appointments.length === 0 && <p className="text-[11px] text-slate-400 mt-1">Sem vendas no dia para vincular o cliente.</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-slate-600 mb-1.5">Tipo</label>
                  <select value={credForm.tipo} onChange={(e) => setCredForm({ ...credForm, tipo: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }}>
                    <option value="RECARGA">Recarga / pré-pago</option>
                    <option value="ESTORNO">Devolução / estorno</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-slate-600 mb-1.5">Valor</label>
                  <input value={credForm.valor} onChange={(e) => setCredForm({ ...credForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1.5">Descrição</label>
                <input value={credForm.descricao} onChange={(e) => setCredForm({ ...credForm, descricao: e.target.value })} className="w-full px-3 py-2.5 border rounded-lg" style={{ borderColor: '#d7e0e2' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: '#eef2f3' }}>
              <button onClick={() => setCredOpen(false)} className="px-4 py-2.5 rounded-lg border text-slate-600" style={{ borderColor: '#d7e0e2' }}>Cancelar</button>
              <button onClick={adicionarCredito} className="px-5 py-2.5 rounded-lg text-white font-medium" style={{ background: TEAL }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR RECEBIMENTO */}
      {receberOpen && vendaSel && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: '#eef2f3' }}>
              <h3 className="text-lg font-semibold" style={{ color: '#0f2b32' }}>Registrar recebimento</h3>
              <button onClick={() => setReceberOpen(false)}><LuX size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex justify-between items-center rounded-lg px-3 py-2.5" style={{ background: '#f8fafb' }}>
                <span className="text-sm" style={{ color: '#0f2b32' }}>{vendaSel.tutor?.name || 'Cliente'} · {vendaSel.pet?.name || 'Pet'}</span>
                <span className="text-xs text-slate-500">Total {brl(Number(vendaSel.value))} · Saldo <b style={{ color: ORANGE, fontWeight: 500 }}>{brl(valorDevido)}</b></span>
              </div>
              {tutorSaldo !== null && (
                <div className="flex justify-between items-center rounded-lg px-3 py-2" style={{ background: '#e8f7f9' }}>
                  <span className="text-xs" style={{ color: '#0f6e7a' }}>Crédito disponível do cliente</span>
                  <b className="text-sm" style={{ color: TEAL_DARK, fontWeight: 500 }}>{brl(tutorSaldo)}</b>
                </div>
              )}
              <div>
                <div className="text-xs text-slate-500 font-medium mb-2">Formas de pagamento</div>
                {formas.map((f, i) => (
                  <div key={i} className="flex gap-1.5 mb-1.5 items-center">
                    <select value={f.forma} onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, forma: e.target.value } : x))} className="flex-[1.4] px-2 py-2 border rounded-lg text-sm" style={{ borderColor: '#d7e0e2' }}>
                      {FORMAS_PADRAO.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                    <input value={f.valor || ''} inputMode="decimal" placeholder="R$" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, valor: Number(String(e.target.value).replace(',', '.')) || 0 } : x))} className="flex-1 px-2 py-2 border rounded-lg text-sm" style={{ borderColor: '#d7e0e2' }} />
                    <input value={f.parcelas || 1} type="number" min={1} title="Parcelas" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, parcelas: Number(e.target.value) || 1 } : x))} className="w-14 px-2 py-2 border rounded-lg text-sm text-center" style={{ borderColor: '#d7e0e2' }} />
                    {formas.length > 1 && (<button onClick={() => setFormas(formas.filter((_, j) => j !== i))} aria-label="Remover forma"><LuTrash2 size={15} className="text-slate-400" /></button>)}
                  </div>
                ))}
                <button onClick={() => setFormas([...formas, { forma: 'Pix', valor: 0, parcelas: 1, nsu: '' }])} className="flex items-center gap-1 text-xs font-medium mt-1" style={{ color: TEAL }}><LuPlus size={13} /> adicionar forma</button>
                {creditoExcede && <p className="text-[11px] mt-1.5" style={{ color: ORANGE }}>Crédito usado ({brl(creditoNasFormas)}) maior que o disponível ({brl(tutorSaldo || 0)}).</p>}
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Desconto</label>
                  <input value={desconto || ''} inputMode="decimal" placeholder="0,00" onChange={(e) => setDesconto(Number(String(e.target.value).replace(',', '.')) || 0)} className="w-full px-2.5 py-2 border rounded-lg text-sm" style={{ borderColor: '#d7e0e2' }} />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-1">Troco (auto)</label>
                  <div className="px-2.5 py-2 border rounded-lg text-sm text-slate-400" style={{ borderColor: '#eef2f3', background: '#f8fafb' }}>{brl(troco)}</div>
                </div>
              </div>
              <div className="flex justify-between rounded-lg px-3 py-2.5" style={{ background: '#e8f7f9' }}>
                <span className="text-sm" style={{ color: '#0f6e7a' }}>Total pago <b style={{ color: TEAL_DARK, fontWeight: 500 }}>{brl(somaFormas)}</b></span>
                <span className="text-sm" style={{ color: '#0f6e7a' }}>Saldo restante <b style={{ color: saldoRestante <= 0.001 ? GREEN : ORANGE, fontWeight: 500 }}>{brl(saldoRestante)}</b></span>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Observação</label>
                <input value={obsReceb} onChange={(e) => setObsReceb(e.target.value)} className="w-full px-2.5 py-2 border rounded-lg text-sm" style={{ borderColor: '#d7e0e2' }} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: '#eef2f3' }}>
              <button onClick={() => setReceberOpen(false)} className="px-4 py-2.5 rounded-lg border text-slate-600" style={{ borderColor: '#d7e0e2' }}>Cancelar</button>
              <button onClick={registrarRecebimento} disabled={creditoExcede} className="px-5 py-2.5 rounded-lg text-white font-medium disabled:opacity-40" style={{ background: TEAL }}>Confirmar recebimento</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
