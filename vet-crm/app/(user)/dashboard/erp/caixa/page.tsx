// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/caixa/page.tsx
// Caixa no PADRAO DO SISTEMA: 2 colunas, largura total, titulo "Caixa",
// botao de esconder valores e exclusao de registros.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import {
  LuPlus, LuLock, LuLockOpen, LuPrinter, LuChevronLeft, LuChevronRight,
  LuX, LuWallet, LuTrash2, LuGift, LuSettings, LuCircleDollarSign, LuEye, LuEyeOff,
} from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';
const LINE = '#E8E2D6';

type Forma = { forma: string; valor: number; parcelas: number; nsu: string };
interface Movimento { id: string; tipo: string; valor: number; forma?: string | null; conta?: string | null; descricao?: string | null; observacao?: string | null; data: string; }
interface CreditoUtil { id: string; tipo: string; valor: number; descricao?: string | null; data: string; appointmentId?: string | null; tutor?: { id: string; name: string } | null; }
interface Recebimento { id: string; valorTotal: number; desconto: number; troco: number; formas: Forma[]; observacao?: string | null; data: string; appointmentId?: string | null; appointment?: { id: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; pet?: { name: string }; tutor?: { name: string } } | null; }
interface Caixa { id: string; numero: number; status: 'ABERTO' | 'FECHADO'; abertura: string; fechamento?: string | null; suprimento: number; observacao?: string | null; valorEsperado?: number | null; valorContado?: number | null; diferenca?: number | null; obsFechamento?: string | null; user?: { id: string; name: string } | null; recebimentos: Recebimento[]; movimentos?: Movimento[]; creditosUtilizados?: CreditoUtil[]; }
interface Appointment { id: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; paymentStatus?: string; tutorId?: string; pet?: { name: string } | null; tutor?: { id?: string; name: string } | null; start?: string; }

const FORMAS_PADRAO = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const CONTAS = ['Caixa', 'Banco', 'Cofre'];
const ehDinheiro = (f?: string | null) => /dinheiro/i.test(f || '');
const ehCredito = (f?: string | null) => /cr[eé]dito do pet/i.test(f || '');
const ehEntrada = (tipo: string) => tipo === 'SUPRIMENTO';
const tipoLabel: Record<string, string> = { SUPRIMENTO: 'Suprimento', SANGRIA: 'Sangria', DESPESA: 'Despesa', TRANSFERENCIA: 'Transferência' };
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const hora = (s?: string | null) => (s ? new Date(s).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—');
const dataHora = (s?: string | null) => s ? new Date(s).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '') : '—';
const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const fmtDataLabel = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const vendaLabel = (ap?: { numeroVenda?: number | null; codigoExterno?: string | null } | null) => (ap?.numeroVenda != null ? `#${ap.numeroVenda}` : (ap?.codigoExterno ? `SV ${ap.codigoExterno}` : '—'));

const thStyle: React.CSSProperties = { color: '#5C6B70', fontWeight: 500, padding: '8px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '9px 8px', borderBottom: '1px solid #F0EBE0' };

export default function CaixaPage() {
  usePageTitle('Caixa', 'Controle de recebimentos do dia');

  const [date, setDate] = useState(hojeStr());
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Caixa | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<'resumo' | 'receb' | 'mov' | 'cred'>('resumo');
  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);

  // money(): respeita o botao de esconder valores
  const money = (v: number) => (ocultar ? 'R$ ••••••' : brl(v));

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

  const fetchCaixas = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/caixa?date=${date}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar caixas');
      const data: Caixa[] = await r.json();
      setCaixas(data || []);
      if (data && data.length) { const st = data.find((c) => c.id === selectedId); setSelectedId(st ? st.id : data[0].id); }
      else { setSelectedId(null); setDetail(null); }
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar caixas'); } finally { setLoading(false); }
  }, [date, selectedId]);

  const fetchDetail = useCallback(async (id: string) => {
    try { const r = await fetch(`/api/caixa/${id}`, { cache: 'no-store' }); if (!r.ok) throw new Error('Erro ao carregar caixa'); setDetail(await r.json()); }
    catch (e: any) { toast.error(e.message || 'Erro ao carregar caixa'); }
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

  const mudarDia = (delta: number) => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + delta); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); };
  const tutorIdDe = (a?: Appointment | null) => a?.tutorId || a?.tutor?.id || null;

  const resumo = useMemo(() => {
    const map = new Map<string, { vendas: number; sup: number }>();
    const add = (forma: string, campo: 'vendas' | 'sup', valor: number) => { const cur = map.get(forma) || { vendas: 0, sup: 0 }; cur[campo] += valor; map.set(forma, cur); };
    (detail?.recebimentos || []).forEach((rec) => (rec.formas || []).forEach((f) => add(f.forma || 'Outros', 'vendas', Number(f.valor || 0))));
    if (detail?.suprimento) add('Dinheiro', 'sup', Number(detail.suprimento));
    (detail?.movimentos || []).filter((m) => m.tipo === 'SUPRIMENTO').forEach((m) => add(m.forma || 'Dinheiro', 'sup', Number(m.valor || 0)));
    const linhas = Array.from(map.entries()).map(([forma, v]) => ({ forma, vendas: v.vendas, sup: v.sup, resultado: v.vendas + v.sup }));
    const tot = linhas.reduce((s, l) => ({ vendas: s.vendas + l.vendas, sup: s.sup + l.sup, resultado: s.resultado + l.resultado }), { vendas: 0, sup: 0, resultado: 0 });
    return { linhas, tot };
  }, [detail]);

  const saldoDinheiro = useMemo(() => {
    if (!detail) return 0;
    const cash = (detail.recebimentos || []).reduce((s, r) => s + (r.formas || []).filter((f) => ehDinheiro(f.forma)).reduce((a, f) => a + Number(f.valor || 0), 0), 0);
    const movs = detail.movimentos || [];
    const ent = movs.filter((m) => m.tipo === 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor || 0), 0);
    const sai = movs.filter((m) => m.tipo !== 'SUPRIMENTO').reduce((s, m) => s + Number(m.valor || 0), 0);
    return Number(detail.suprimento || 0) + cash + ent - sai;
  }, [detail]);

  const pagoPorAppt = useMemo(() => { const m = new Map<string, number>(); (detail?.recebimentos || []).forEach((r) => { if (r.appointmentId) m.set(r.appointmentId, (m.get(r.appointmentId) || 0) + Number(r.valorTotal || 0)); }); return m; }, [detail]);

  const statusVenda = (value: number, pago: number) => {
    const saldo = value - pago;
    if (saldo <= 0.001) return { label: 'Baixado', bg: '#e1f5ee', fg: GREEN };
    if (pago > 0.001) return { label: 'Baixa parcial', bg: '#fdf6e3', fg: '#854F0B' };
    return { label: 'Em atendimento', bg: '#fef0e8', fg: '#993C1D' };
  };

  const movLinhas = useMemo(() => {
    const linhas: { id?: string; data: string; tipo: string; descricao: string; conta: string; valor: number; entrada: boolean }[] = [];
    if (detail?.suprimento && detail.suprimento > 0) linhas.push({ data: detail.abertura, tipo: 'Suprimento', descricao: `Abertura de caixa${detail.observacao ? ' — ' + detail.observacao : ''}`, conta: 'Caixa', valor: Number(detail.suprimento), entrada: true });
    (detail?.movimentos || []).forEach((m) => linhas.push({ id: m.id, data: m.data, tipo: tipoLabel[m.tipo] || m.tipo, descricao: m.descricao || '—', conta: m.conta || 'Caixa', valor: Number(m.valor || 0), entrada: ehEntrada(m.tipo) }));
    return linhas.sort((a, b) => +new Date(b.data) - +new Date(a.data));
  }, [detail]);

  const abrirCaixa = async () => {
    try {
      const r = await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suprimento: Number(String(abrirForm.suprimento).replace(',', '.')) || 0, observacao: abrirForm.observacao || null }) });
      if (!r.ok) throw new Error('Erro ao abrir caixa');
      toast.success('Caixa aberto!'); setAbrirOpen(false); setAbrirForm({ suprimento: '', observacao: '' }); await fetchCaixas();
    } catch (e: any) { toast.error(e.message || 'Erro ao abrir caixa'); }
  };
  const abrirFechar = () => { setFecharForm({ valorContado: '', observacao: '' }); setFecharOpen(true); };
  const fecharCaixa = async () => {
    if (!detail) return;
    const valorContado = fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.'));
    try {
      const r = await fetch(`/api/caixa/${detail.id}/fechar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valorEsperado: Number(saldoDinheiro.toFixed(2)), valorContado, observacao: fecharForm.observacao || null }) });
      if (!r.ok) throw new Error('Erro ao encerrar caixa');
      toast.success('Caixa encerrado!'); setFecharOpen(false); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao encerrar caixa'); }
  };
  const reabrirCaixa = async () => {
    if (!detail) return; if (!confirm(`Reabrir o Caixa nº ${detail.numero}?`)) return;
    try { const r = await fetch(`/api/caixa/${detail.id}/reabrir`, { method: 'PATCH' }); if (!r.ok) throw new Error('Erro ao reabrir caixa'); toast.success('Caixa reaberto!'); await fetchCaixas(); await fetchDetail(detail.id); }
    catch (e: any) { toast.error(e.message || 'Erro ao reabrir caixa'); }
  };
  const abrirReceber = async (venda: Appointment) => {
    setVendaSel(venda); setFormas([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]); setDesconto(0); setObsReceb(''); setTutorSaldo(null); setReceberOpen(true);
    const tid = tutorIdDe(venda);
    if (tid) { try { const r = await fetch(`/api/credito/tutor/${tid}`, { cache: 'no-store' }); if (r.ok) { const d = await r.json(); setTutorSaldo(Number(d.saldo || 0)); } } catch { /* ignore */ } }
  };

  // ---- exclusoes (apenas com caixa ABERTO) ----
  const delMov = async (movId: string) => {
    if (!detail || !confirm('Excluir esta movimentação?')) return;
    const r = await fetch(`/api/caixa/${detail.id}/movimento?itemId=${encodeURIComponent(movId)}`, { method: 'DELETE' });
    if (!r.ok) { toast.error('Erro ao excluir'); return; }
    toast.success('Movimentação excluída'); await fetchDetail(detail.id);
  };
  const delRec = async (recId: string) => {
    if (!detail || !confirm('Excluir este recebimento? A baixa da venda será revertida.')) return;
    const r = await fetch(`/api/caixa/${detail.id}/recebimento?itemId=${encodeURIComponent(recId)}`, { method: 'DELETE' });
    if (!r.ok) { toast.error('Erro ao excluir'); return; }
    toast.success('Recebimento excluído'); await fetchDetail(detail.id); await fetchAppointments();
  };
  const delCred = async (credId: string) => {
    if (!detail || !confirm('Excluir este lançamento de crédito?')) return;
    const r = await fetch(`/api/caixa/${detail.id}/credito?itemId=${encodeURIComponent(credId)}`, { method: 'DELETE' });
    if (!r.ok) { toast.error('Erro ao excluir'); return; }
    toast.success('Crédito excluído'); await fetchDetail(detail.id);
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
      const r = await fetch(`/api/caixa/${detail.id}/recebimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: vendaSel.id, valorTotal: valorAplicado, desconto, troco, formas, observacao: obsReceb || null }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao registrar recebimento'); }
      toast.success('Recebimento registrado!'); setReceberOpen(false); await fetchDetail(detail.id); await fetchAppointments();
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar recebimento'); }
  };
  const abrirMov = (tipo: string) => { setMovTipo(tipo); setMovForm({ valor: '', forma: 'Dinheiro', conta: 'Banco', descricao: '', observacao: '' }); setMovOpen(true); };
  const registrarMovimento = async () => {
    if (!detail) return; const valor = Number(String(movForm.valor).replace(',', '.')) || 0;
    if (valor <= 0) { toast.error('Informe o valor'); return; }
    try {
      const r = await fetch(`/api/caixa/${detail.id}/movimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: movTipo, valor, forma: movForm.forma || null, conta: movTipo === 'TRANSFERENCIA' ? movForm.conta : null, descricao: movForm.descricao || null, observacao: movForm.observacao || null }) });
      if (!r.ok) throw new Error('Erro ao registrar movimento');
      toast.success(`${tipoLabel[movTipo]} registrada!`); setMovOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar movimento'); }
  };
  const abrirCredito = () => { setCredForm({ appointmentId: appointments[0]?.id || '', tipo: 'RECARGA', valor: '', descricao: '' }); setCredOpen(true); };
  const adicionarCredito = async () => {
    if (!detail) return; const valor = Number(String(credForm.valor).replace(',', '.')) || 0;
    if (!credForm.appointmentId) { toast.error('Selecione o cliente'); return; } if (valor <= 0) { toast.error('Informe o valor'); return; }
    try {
      const r = await fetch('/api/credito', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: credForm.appointmentId, tipo: credForm.tipo, valor, descricao: credForm.descricao || null, caixaSessaoId: detail.id }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao adicionar crédito'); }
      toast.success('Crédito adicionado!'); setCredOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao adicionar crédito'); }
  };

  const vendasEmAberto = appointments.filter((a) => { const pago = pagoPorAppt.get(a.id) || 0; return Number(a.value) - pago > 0.001; });
  const aberto = detail?.status === 'ABERTO';
  const contado = fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.'));
  const difPrevia = contado === null ? null : Number((contado - saldoDinheiro).toFixed(2));

  const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '14px 15px' };
  const cardH = (icon: React.ReactNode, txt: string) => (
    <div style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 7 }}>
      <span style={{ color: TEAL, display: 'flex' }}>{icon}</span>{txt}
    </div>
  );
  const tabBtn = (id: typeof tab, label: string) => {
    const on = tab === id;
    return <button onClick={() => setTab(id)} style={{ fontSize: 13.5, color: on ? TEAL_DARK : '#5C6B70', fontWeight: on ? 600 : 400, padding: '10px 2px', cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${on ? TEAL : 'transparent'}`, whiteSpace: 'nowrap' }}>{label}</button>;
  };
  const delBtn = (fn: () => void) => (
    <button onClick={fn} title="Excluir" className="no-print" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
      <LuTrash2 size={15} color="#b0408a" style={{ opacity: .7 }} />
    </button>
  );

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>

        {/* barra de acoes (titulo vem do cabecalho global) */}
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => setOcultar((v) => !v)} title={ocultar ? 'Mostrar valores' : 'Esconder valores'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>
            {ocultar ? <LuEyeOff size={15} /> : <LuEye size={15} />}{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #E8E2D6', borderRadius: 9, overflow: 'hidden' }}>
            <button onClick={() => mudarDia(-1)} style={{ border: 'none', background: '#fff', padding: '8px 11px', color: TEAL_DARK, cursor: 'pointer' }} aria-label="Dia anterior"><LuChevronLeft size={16} /></button>
            <span style={{ fontSize: 13, fontWeight: 500, padding: '0 12px' }}>{date === hojeStr() ? 'Hoje · ' : ''}{fmtDataLabel(date)}</span>
            <button onClick={() => mudarDia(1)} style={{ border: 'none', background: '#fff', padding: '8px 11px', color: TEAL_DARK, cursor: 'pointer' }} aria-label="Próximo dia"><LuChevronRight size={16} /></button>
          </div>
          <button onClick={() => setAbrirOpen(true)} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuPlus size={15} /> Abrir caixa</button>
        </div>

        {loading && <p style={{ color: '#5C6B70' }}>Carregando…</p>}
        {!loading && caixas.length === 0 && (
          <div style={{ ...cardStyle, textAlign: 'center', padding: 40 }}>
            <LuWallet size={28} style={{ color: TEAL }} />
            <p style={{ color: '#5C6B70', margin: '10px 0 0' }}>Nenhum caixa neste dia.</p>
            <p style={{ color: '#374151', fontSize: 13, margin: '4px 0 0' }}>Clique em “Abrir caixa” para começar.</p>
          </div>
        )}

        {detail && (
          <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* COLUNA ESQUERDA */}
            <div style={{ width: 280, flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={cardStyle}>
                {cardH(<LuWallet size={15} />, `Caixa nº ${detail.numero}`)}
                <div style={{ fontSize: 12.5, lineHeight: 1.95 }}>
                  <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Usuário:</span> {detail.user?.name || '—'}</div>
                  <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Abertura:</span> {dataHora(detail.abertura)}</div>
                  {detail.fechamento && <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Fechamento:</span> {dataHora(detail.fechamento)}</div>}
                  <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Status:</span>{' '}
                    <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, ...(aberto ? { background: '#e1f5ee', color: GREEN } : { background: '#eef2f3', color: '#5C6B70' }) }}>{aberto ? 'ABERTO' : 'FECHADO'}</span>
                  </div>
                </div>
                {caixas.length > 1 && (
                  <div className="no-print" style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {caixas.map((c) => (
                      <button key={c.id} onClick={() => setSelectedId(c.id)} style={{ flex: 1, fontSize: 11.5, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', border: c.id === selectedId ? `1.5px solid ${TEAL}` : '1px solid #E8E2D6', background: c.id === selectedId ? '#e8f7f9' : '#fff', color: c.id === selectedId ? '#014D5E' : '#5C6B70' }}>nº {c.numero}</button>
                    ))}
                  </div>
                )}
              </div>

              {aberto ? (
                <div style={cardStyle}>
                  {cardH(<LuCircleDollarSign size={15} />, 'Saldo em dinheiro')}
                  <div style={{ fontSize: 22, fontWeight: 600, color: TEAL_DARK }}>{money(saldoDinheiro)}</div>
                  <div style={{ fontSize: 12, color: '#5C6B70', marginTop: 3 }}>Suprimento + dinheiro − saídas</div>
                </div>
              ) : (
                <div style={cardStyle}>
                  {cardH(<LuCircleDollarSign size={15} />, 'Conferência')}
                  <div style={{ fontSize: 12.5, lineHeight: 1.95 }}>
                    <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Esperado:</span> {money(Number(detail.valorEsperado ?? saldoDinheiro))}</div>
                    <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Contado:</span> {detail.valorContado != null ? money(Number(detail.valorContado)) : '—'}</div>
                    <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Diferença:</span>{' '}
                      <b style={{ color: detail.diferenca == null ? '#374151' : Math.abs(Number(detail.diferenca)) < 0.005 ? GREEN : Number(detail.diferenca) > 0 ? GREEN : ORANGE }}>
                        {detail.diferenca == null ? '—' : (Number(detail.diferenca) > 0 ? 'Sobra ' : Number(detail.diferenca) < 0 ? 'Falta ' : '') + money(Math.abs(Number(detail.diferenca)))}
                      </b>
                    </div>
                  </div>
                </div>
              )}

              <div className="no-print" style={cardStyle}>
                {cardH(<LuSettings size={15} />, 'Ações')}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
                  <button onClick={() => abrirMov('SUPRIMENTO')} disabled={!aberto} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Suprimento</button>
                  <button onClick={() => abrirMov('SANGRIA')} disabled={!aberto} style={{ background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Sangria</button>
                  <button onClick={() => abrirMov('DESPESA')} disabled={!aberto} style={{ background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Despesa</button>
                  <button onClick={() => abrirMov('TRANSFERENCIA')} disabled={!aberto} style={{ background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Transferência</button>
                  <button onClick={abrirCredito} disabled={!aberto} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL, border: `1px solid ${TEAL}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: aberto ? 1 : .4 }}><LuGift size={14} /> Crédito do pet</button>
                  <button onClick={() => window.print()} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuPrinter size={14} /> Imprimir relatório</button>
                  {aberto ? (
                    <button onClick={abrirFechar} style={{ gridColumn: '1 / -1', background: TEAL_DARK, color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '9px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuLock size={14} /> Revisar e encerrar</button>
                  ) : (
                    <button onClick={reabrirCaixa} style={{ gridColumn: '1 / -1', background: '#fff', color: '#5C6B70', border: '1px solid #E8E2D6', fontSize: 12, fontWeight: 500, padding: '9px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuLockOpen size={14} /> Reabrir caixa</button>
                  )}
                </div>
                {!aberto && <p style={{ fontSize: 11, color: '#374151', margin: '8px 0 0' }}>Reabra o caixa para lançar ou excluir registros.</p>}
              </div>
            </div>

            {/* AREA PRINCIPAL */}
            <div style={{ flex: '1 1 480px', minWidth: 0 }}>
              <div className="no-print" style={{ display: 'flex', gap: 26, borderBottom: `1px solid ${LINE}`, overflowX: 'auto' }}>
                {tabBtn('resumo', 'Resumo')}{tabBtn('receb', 'Recebimentos')}{tabBtn('mov', 'Movimentações')}{tabBtn('cred', 'Créditos')}
              </div>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderTop: 'none', borderRadius: '0 0 11px 11px', padding: 18 }}>

                {tab === 'resumo' && (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px' }}>Valores recebidos no caixa</div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th style={thStyle}>Forma de recebimento</th><th style={{ ...thStyle, textAlign: 'right' }}>Vendas</th><th style={{ ...thStyle, textAlign: 'right' }}>Suprimentos</th><th style={{ ...thStyle, textAlign: 'right' }}>Resultado</th></tr></thead>
                      <tbody>
                        {resumo.linhas.length === 0 && (<tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Nenhum valor recebido ainda.</td></tr>)}
                        {resumo.linhas.map((l) => (
                          <tr key={l.forma}>
                            <td style={{ ...tdStyle, color: '#014D5E' }}>{l.forma}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{l.vendas ? money(l.vendas) : '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right' }}>{l.sup ? money(l.sup) : '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{money(l.resultado)}</td>
                          </tr>
                        ))}
                        {resumo.linhas.length > 0 && (
                          <tr style={{ borderTop: '1px solid #E8E2D6' }}>
                            <td style={{ ...tdStyle, fontWeight: 600 }}>Total</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{money(resumo.tot.vendas)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{money(resumo.tot.sup)}</td>
                            <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: TEAL_DARK }}>{money(resumo.tot.resultado)}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </>
                )}

                {tab === 'receb' && (
                  <>
                    {aberto && (
                      <div className="no-print" style={{ marginBottom: 12 }}>
                        {vendasEmAberto.length > 0 ? (
                          <details style={{ fontSize: 13 }}>
                            <summary style={{ cursor: 'pointer', fontWeight: 500, color: TEAL }}>+ Registrar recebimento ({vendasEmAberto.length} venda(s) em aberto)</summary>
                            <div style={{ marginTop: 8, border: '1px solid #eef2f3', borderRadius: 10 }}>
                              {vendasEmAberto.map((v) => (
                                <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderBottom: '1px solid #F0EBE0' }}>
                                  <span style={{ color: '#1F2A2E' }}>{v.numeroVenda != null && <b style={{ color: '#014D5E', fontWeight: 500, marginRight: 6 }}>{vendaLabel(v)}</b>}{v.tutor?.name || 'Cliente'} · {v.pet?.name || 'Pet'}</span>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <span style={{ color: ORANGE, fontWeight: 500 }}>{money(Number(v.value) - (pagoPorAppt.get(v.id) || 0))}</span>
                                    <button onClick={() => abrirReceber(v)} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12, padding: '6px 12px', borderRadius: 8, cursor: 'pointer' }}>Receber</button>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </details>
                        ) : (<p style={{ fontSize: 13, color: '#374151' }}>Nenhuma venda em aberto neste dia.</p>)}
                      </div>
                    )}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead><tr><th style={thStyle}>Venda</th><th style={thStyle}>Hora</th><th style={thStyle}>Cliente · Pet</th><th style={thStyle}>Formas</th><th style={{ ...thStyle, textAlign: 'right' }}>Valor</th><th style={{ ...thStyle, textAlign: 'right' }}>Status</th>{aberto && <th style={{ ...thStyle, textAlign: 'right' }} className="no-print"></th>}</tr></thead>
                      <tbody>
                        {(detail.recebimentos || []).length === 0 && (<tr><td colSpan={aberto ? 7 : 6} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Nenhum recebimento registrado.</td></tr>)}
                        {(detail.recebimentos || []).map((rec) => {
                          const value = Number(rec.appointment?.value || 0);
                          const pago = rec.appointmentId ? pagoPorAppt.get(rec.appointmentId) || 0 : 0;
                          const st = statusVenda(value, pago);
                          return (
                            <tr key={rec.id}>
                              <td style={{ ...tdStyle, color: '#014D5E', fontWeight: 500, whiteSpace: 'nowrap' }}>{vendaLabel(rec.appointment)}</td>
                              <td style={{ ...tdStyle, color: '#5C6B70' }}>{hora(rec.data)}</td>
                              <td style={{ ...tdStyle, color: '#1F2A2E' }}>{rec.appointment?.tutor?.name || 'Cliente'} · {rec.appointment?.pet?.name || 'Pet'}</td>
                              <td style={{ ...tdStyle, color: '#374151' }}>{(rec.formas || []).map((f) => f.forma).join(' + ') || '—'}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>{money(Number(rec.valorTotal))}</td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}><span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span></td>
                              {aberto && <td style={{ ...tdStyle, textAlign: 'right' }} className="no-print">{delBtn(() => delRec(rec.id))}</td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </>
                )}

                {tab === 'mov' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr><th style={thStyle}>Data</th><th style={thStyle}>Tipo</th><th style={thStyle}>Descrição</th><th style={thStyle}>Conta</th><th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>{aberto && <th style={{ ...thStyle }} className="no-print"></th>}</tr></thead>
                    <tbody>
                      {movLinhas.length === 0 && (<tr><td colSpan={aberto ? 6 : 5} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Sem movimentações.</td></tr>)}
                      {movLinhas.map((m, i) => (
                        <tr key={m.id || i}>
                          <td style={{ ...tdStyle, color: '#5C6B70' }}>{dataHora(m.data)}</td>
                          <td style={{ ...tdStyle, color: m.entrada ? GREEN : ORANGE }}>{m.tipo}</td>
                          <td style={{ ...tdStyle, color: '#5C6B70' }}>{m.descricao}</td>
                          <td style={{ ...tdStyle, color: '#374151' }}>{m.conta}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500, color: m.entrada ? GREEN : ORANGE }}>{m.entrada ? '' : '− '}{money(m.valor)}</td>
                          {aberto && <td style={{ ...tdStyle, textAlign: 'right' }} className="no-print">{m.id ? delBtn(() => delMov(m.id!)) : null}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {tab === 'cred' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr><th style={thStyle}>Data</th><th style={thStyle}>Cliente</th><th style={thStyle}>Descrição</th><th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>{aberto && <th style={{ ...thStyle }} className="no-print"></th>}</tr></thead>
                    <tbody>
                      {(detail.creditosUtilizados || []).length === 0 && (<tr><td colSpan={aberto ? 5 : 4} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Nenhum crédito utilizado.</td></tr>)}
                      {(detail.creditosUtilizados || []).map((c) => (
                        <tr key={c.id}>
                          <td style={{ ...tdStyle, color: '#5C6B70' }}>{dataHora(c.data)}</td>
                          <td style={{ ...tdStyle, color: '#1F2A2E' }}>{c.tutor?.name || 'Cliente'}</td>
                          <td style={{ ...tdStyle, color: '#374151' }}>{c.descricao || '—'}</td>
                          <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500, color: ORANGE }}>− {money(Number(c.valor))}</td>
                          {aberto && <td style={{ ...tdStyle, textAlign: 'right' }} className="no-print">{delBtn(() => delCred(c.id))}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAIS */}
      {abrirOpen && (
        <Modal title="Abrir caixa" onClose={() => setAbrirOpen(false)} onConfirm={abrirCaixa} confirmLabel="Abrir caixa">
          <Field label="Suprimento (fundo de troco)"><input value={abrirForm.suprimento} onChange={(e) => setAbrirForm({ ...abrirForm, suprimento: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field>
          <Field label="Observação"><input value={abrirForm.observacao} onChange={(e) => setAbrirForm({ ...abrirForm, observacao: e.target.value })} placeholder="Ex: Abertura de caixa Isabela" style={inp} /></Field>
        </Modal>
      )}

      {fecharOpen && detail && (
        <Modal title="Revisar e encerrar" onClose={() => setFecharOpen(false)} onConfirm={fecharCaixa} confirmLabel="Encerrar caixa" dark>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e8f7f9', borderRadius: 8, padding: '11px 12px' }}>
            <span style={{ color: '#014D5E', fontSize: 13 }}>Esperado em dinheiro (gaveta)</span><b style={{ color: TEAL_DARK, fontSize: 15 }}>{brl(saldoDinheiro)}</b>
          </div>
          <Field label="Dinheiro contado"><input value={fecharForm.valorContado} onChange={(e) => setFecharForm({ ...fecharForm, valorContado: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field>
          {difPrevia !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', borderRadius: 8, padding: '10px 12px', fontSize: 13, background: Math.abs(difPrevia) < 0.005 ? '#e1f5ee' : '#fef0e8' }}>
              <span style={{ color: difPrevia >= 0 ? GREEN : '#993C1D' }}>{Math.abs(difPrevia) < 0.005 ? 'Caixa confere' : difPrevia > 0 ? 'Sobra' : 'Falta'}</span>
              <b style={{ color: difPrevia >= 0 ? GREEN : ORANGE }}>{brl(Math.abs(difPrevia))}</b>
            </div>
          )}
          <Field label="Observação"><input value={fecharForm.observacao} onChange={(e) => setFecharForm({ ...fecharForm, observacao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}

      {movOpen && (
        <Modal title={tipoLabel[movTipo]} onClose={() => setMovOpen(false)} onConfirm={registrarMovimento} confirmLabel="Confirmar" dark={!ehEntrada(movTipo)}>
          <Field label="Valor"><input value={movForm.valor} onChange={(e) => setMovForm({ ...movForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field>
          {movTipo === 'TRANSFERENCIA' ? (
            <Field label="Conta destino"><select value={movForm.conta} onChange={(e) => setMovForm({ ...movForm, conta: e.target.value })} style={inp}>{CONTAS.filter((c) => c !== 'Caixa').map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
          ) : (
            <Field label="Forma"><select value={movForm.forma} onChange={(e) => setMovForm({ ...movForm, forma: e.target.value })} style={inp}>{FORMAS_PADRAO.filter((f) => !ehCredito(f)).map((f) => <option key={f} value={f}>{f}</option>)}</select></Field>
          )}
          <Field label="Descrição"><input value={movForm.descricao} onChange={(e) => setMovForm({ ...movForm, descricao: e.target.value })} style={inp} /></Field>
          <Field label="Observação"><input value={movForm.observacao} onChange={(e) => setMovForm({ ...movForm, observacao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}

      {credOpen && (
        <Modal title="Adicionar crédito do pet" onClose={() => setCredOpen(false)} onConfirm={adicionarCredito} confirmLabel="Adicionar">
          <Field label="Cliente (pela venda do dia)">
            <select value={credForm.appointmentId} onChange={(e) => setCredForm({ ...credForm, appointmentId: e.target.value })} style={inp}>
              <option value="">Selecione…</option>
              {appointments.map((a) => <option key={a.id} value={a.id}>{a.tutor?.name || 'Cliente'} · {a.pet?.name || 'Pet'}</option>)}
            </select>
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Tipo"><select value={credForm.tipo} onChange={(e) => setCredForm({ ...credForm, tipo: e.target.value })} style={inp}><option value="RECARGA">Recarga / pré-pago</option><option value="ESTORNO">Devolução / estorno</option></select></Field></div>
            <div style={{ flex: 1 }}><Field label="Valor"><input value={credForm.valor} onChange={(e) => setCredForm({ ...credForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field></div>
          </div>
          <Field label="Descrição"><input value={credForm.descricao} onChange={(e) => setCredForm({ ...credForm, descricao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}

      {receberOpen && vendaSel && (
        <Modal title="Registrar recebimento" onClose={() => setReceberOpen(false)} onConfirm={registrarRecebimento} confirmLabel="Confirmar recebimento" confirmDisabled={creditoExcede}>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#FBF9F4', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <span style={{ color: '#1F2A2E' }}>{vendaSel.tutor?.name || 'Cliente'} · {vendaSel.pet?.name || 'Pet'}</span>
            <span style={{ color: '#5C6B70', fontSize: 12 }}>Total {brl(Number(vendaSel.value))} · Saldo <b style={{ color: ORANGE }}>{brl(valorDevido)}</b></span>
          </div>
          {tutorSaldo !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e8f7f9', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <span style={{ color: '#014D5E' }}>Crédito disponível do cliente</span><b style={{ color: TEAL_DARK }}>{brl(tutorSaldo)}</b>
            </div>
          )}
          <div>
            <label style={lbl}>Formas de pagamento</label>
            {formas.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <select value={f.forma} onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, forma: e.target.value } : x))} style={{ ...inp, flex: 1.4 }}>{FORMAS_PADRAO.map((op) => <option key={op} value={op}>{op}</option>)}</select>
                <input value={f.valor || ''} inputMode="decimal" placeholder="R$" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, valor: Number(String(e.target.value).replace(',', '.')) || 0 } : x))} style={{ ...inp, flex: 1 }} />
                <input value={f.parcelas || 1} type="number" min={1} title="Parcelas" onChange={(e) => setFormas(formas.map((x, j) => j === i ? { ...x, parcelas: Number(e.target.value) || 1 } : x))} style={{ ...inp, width: 52, textAlign: 'center' }} />
                {formas.length > 1 && <button onClick={() => setFormas(formas.filter((_, j) => j !== i))} aria-label="Remover" style={{ border: 'none', background: 'none', cursor: 'pointer' }}><LuTrash2 size={15} color="#374151" /></button>}
              </div>
            ))}
            <button onClick={() => setFormas([...formas, { forma: 'Pix', valor: 0, parcelas: 1, nsu: '' }])} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}><LuPlus size={13} /> adicionar forma</button>
            {creditoExcede && <p style={{ fontSize: 11, color: ORANGE, margin: '6px 0 0' }}>Crédito usado ({brl(creditoNasFormas)}) maior que o disponível ({brl(tutorSaldo || 0)}).</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Desconto"><input value={desconto || ''} inputMode="decimal" placeholder="0,00" onChange={(e) => setDesconto(Number(String(e.target.value).replace(',', '.')) || 0)} style={inp} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Troco (auto)"><div style={{ ...inp, color: '#374151', background: '#FBF9F4' }}>{brl(troco)}</div></Field></div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e8f7f9', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <span style={{ color: '#014D5E' }}>Total pago <b style={{ color: TEAL_DARK }}>{brl(somaFormas)}</b></span>
            <span style={{ color: '#014D5E' }}>Saldo restante <b style={{ color: saldoRestante <= 0.001 ? GREEN : ORANGE }}>{brl(saldoRestante)}</b></span>
          </div>
          <Field label="Observação"><input value={obsReceb} onChange={(e) => setObsReceb(e.target.value)} style={inp} /></Field>
        </Modal>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', border: '1px solid #E8E2D6', borderRadius: 8, fontSize: 13, fontFamily: 'inherit' };
const lbl: React.CSSProperties = { fontSize: 13, color: '#5C6B70', display: 'block', marginBottom: 6 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

function Modal({ title, children, onClose, onConfirm, confirmLabel, confirmDisabled, dark }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string; confirmDisabled?: boolean; dark?: boolean }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 430, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #F0EBE0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1F2A2E' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><LuX size={18} color="#374151" /></button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '15px 18px', borderTop: '1px solid #F0EBE0' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E8E2D6', background: '#fff', color: '#5C6B70', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} disabled={confirmDisabled} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', background: dark ? TEAL_DARK : TEAL, opacity: confirmDisabled ? .4 : 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// redeploy 1782313464
