// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/caixa/page.tsx
// Caixa no PADRAO DO SISTEMA: 2 colunas, largura total, titulo "Caixa",
// botao de esconder valores e exclusao de registros.
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { usePodeEditar } from '@/lib/permissions/context';
import { useRolePreview } from '@/lib/ui/RolePreview';
import { ehDinheiro, carregarFormasRecebimento, PagForma, FormaCfg, TaxaRow } from '@/lib/formasPagamento';
import DecimalInput from '@/components/DecimalInput';
import PagamentoFormas from '@/components/financeiro/PagamentoFormas';
import {
  LuPlus, LuLock, LuLockOpen, LuPrinter, LuChevronLeft, LuChevronRight,
  LuX, LuWallet, LuTrash2, LuGift, LuSettings, LuCircleDollarSign, LuEye, LuEyeOff,
} from 'react-icons/lu';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';
const LINE = '#E8E2D6';

type Forma = PagForma; // fonte única (lib/formasPagamento): forma+valor +modalidade/bandeira/parcelas/nsu
interface Movimento { id: string; tipo: string; valor: number; forma?: string | null; conta?: string | null; descricao?: string | null; observacao?: string | null; data: string; }
interface CreditoUtil { id: string; tipo: string; valor: number; descricao?: string | null; data: string; appointmentId?: string | null; tutor?: { id: string; name: string } | null; }
interface Recebimento { id: string; valorTotal: number; desconto: number; troco: number; formas: Forma[]; observacao?: string | null; data: string; appointmentId?: string | null; appointment?: { id: string; date?: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; pet?: { name: string }; tutor?: { name: string } } | null; }
interface Caixa { id: string; numero: number; status: string; abertura: string; fechamento?: string | null; suprimento: number; observacao?: string | null; valorEsperado?: number | null; valorContado?: number | null; diferenca?: number | null; obsFechamento?: string | null; user?: { id: string; name: string } | null; recebimentos: Recebimento[]; movimentos?: Movimento[]; creditosUtilizados?: CreditoUtil[]; }
interface Appointment { id: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; paymentStatus?: string; tutorId?: string; pet?: { name: string } | null; tutor?: { id?: string; name: string } | null; start?: string; }

const FORMAS_PADRAO = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const CONTAS = ['Caixa', 'Banco', 'Cofre'];
const ehCredito = (f?: string | null) => /cr[eé]dito do pet/i.test(f || '');
const ehEntrada = (tipo: string) => tipo === 'SUPRIMENTO';
const tipoLabel: Record<string, string> = { SUPRIMENTO: 'Suprimento', SANGRIA: 'Sangria', DESPESA: 'Despesa', TRANSFERENCIA: 'Transferência', CAIXA: 'Transferir para outro caixa' };
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
  // #8 (Cintia): "A receber das maquininhas" (previsão de crédito) só aparece pro ADMIN.
  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === 'ADMIN';
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde ações do caixa

  const [date, setDate] = useState(hojeStr());
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<Caixa | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<'resumo' | 'receb' | 'mov' | 'cred'>('resumo');
  const [movModo, setMovModo] = useState<'caixa' | 'periodo'>('caixa'); // aba Movimentações: só este caixa ou por período
  const [movFrom, setMovFrom] = useState('');
  const [movTo, setMovTo] = useState('');
  const [movTipoF, setMovTipoF] = useState('');
  const [movContaF, setMovContaF] = useState('');
  const [movPeriodo, setMovPeriodo] = useState<any[]>([]);
  // Status do caixa (4 estados, string) + grade filtrável
  const STATUS_UI = (s: string) => {
    const S = String(s || '').toUpperCase();
    if (S === 'ABERTO') return { label: '🟢 Aberto', bg: '#E1F5EE', fg: GREEN };
    if (S === 'EM_REVISAO') return { label: '🔎 Em revisão', bg: '#FBF1E2', fg: '#B26A00' };
    if (S === 'ENCERRADO') return { label: '🔒 Encerrado', bg: '#EDE7FA', fg: '#6A4FB0' };
    return { label: '⚪ Fechado', bg: '#EEF2F3', fg: '#5C6B70' };
  };
  const miniBtn: React.CSSProperties = { fontSize: 11.5, padding: '5px 9px', borderRadius: 8, border: '1px solid #E8E2D6', background: '#fff', color: '#5C6B70', cursor: 'pointer' };
  const [gradeOpen, setGradeOpen] = useState(false);
  const [gradeFrom, setGradeFrom] = useState('');
  const [gradeTo, setGradeTo] = useState('');
  const [gradeStatus, setGradeStatus] = useState('');
  const [gradeRows, setGradeRows] = useState<any[]>([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  const fetchGrade = async () => {
    setGradeLoading(true);
    try {
      const p = new URLSearchParams();
      if (gradeFrom) p.set('from', gradeFrom); if (gradeTo) p.set('to', gradeTo); if (gradeStatus) p.set('status', gradeStatus);
      const r = await fetch(`/api/caixa/grade?${p.toString()}`, { cache: 'no-store' });
      setGradeRows(r.ok ? await r.json() : []);
    } catch { setGradeRows([]); } finally { setGradeLoading(false); }
  };
  const mudarStatus = async (novo: string) => {
    if (!detail) return;
    try {
      const r = await fetch(`/api/caixa/${detail.id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: novo }) });
      if (!r.ok) throw new Error();
      toast.success('Status atualizado'); await fetchCaixas(); await fetchDetail(detail.id);
    } catch { toast.error('Erro ao mudar status'); }
  };
  const [editSup, setEditSup] = useState(false);
  const [supVal, setSupVal] = useState('');
  const [savingSup, setSavingSup] = useState(false);
  const salvarSuprimento = async () => {
    if (!detail) return;
    setSavingSup(true);
    try {
      const novo = Number(String(supVal).replace(',', '.')) || 0;
      const r = await fetch(`/api/caixa/${detail.id}/suprimento`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suprimento: novo }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || 'Erro'); }
      toast.success('Valor de abertura atualizado'); setEditSup(false); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e?.message || 'Erro ao editar o valor de abertura'); } finally { setSavingSup(false); }
  };
  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);

  // money(): respeita o botao de esconder valores
  const money = (v: number) => (ocultar ? 'R$ ••••••' : brl(v));

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [abrirForm, setAbrirForm] = useState({ suprimento: '', observacao: '', abertura: '', userId: '', contaOrigemId: '', forma: 'Dinheiro' });
  const [receberOpen, setReceberOpen] = useState(false);
  const [vendaSel, setVendaSel] = useState<Appointment | null>(null);
  const [formas, setFormas] = useState<Forma[]>([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]);
  const [desconto, setDesconto] = useState(0);
  const [obsReceb, setObsReceb] = useState('');
  const [tutorSaldo, setTutorSaldo] = useState<number | null>(null);
  const [tutorAReceber, setTutorAReceber] = useState<number | null>(null); // total a receber do cliente (todas as vendas)
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState('SUPRIMENTO');
  const [movForm, setMovForm] = useState({ valor: '', forma: 'Dinheiro', conta: 'Banco', descricao: '', observacao: '', categoriaId: '', contaOrigemId: '', contaDestinoId: '', destinoCaixaId: '' });
  const [categoriasDespesa, setCategoriasDespesa] = useState<any[]>([]); // categorias de DESPESA (DRE)
  const [contasFin, setContasFin] = useState<any[]>([]); // contas reais (id+nome) p/ transferência
  const [caixasTransfer, setCaixasTransfer] = useState<any[]>([]); // caixas ABERTOS p/ "transferir para outro caixa"
  const [credOpen, setCredOpen] = useState(false);
  const [credForm, setCredForm] = useState({ appointmentId: '', tipo: 'RECARGA', valor: '', descricao: '', forma: 'Dinheiro' });
  const [credFormas, setCredFormas] = useState<PagForma[]>([{ forma: 'Dinheiro', valor: 0 }]); // forma da recarga (igual venda)
  const credSomaFormas = useMemo(() => credFormas.reduce((s, f) => s + Number(f.valor || 0), 0), [credFormas]);
  const [prevCred, setPrevCred] = useState<{ totalCentavos: number; porData: { data: string; liquidoCentavos: number }[] } | null>(null); // item 10 — previsão de crédito das maquininhas (D+1)
  const [fecharOpen, setFecharOpen] = useState(false);
  const [fecharForm, setFecharForm] = useState({ valorContado: '', observacao: '', data: '', hora: '', semMov: false });
  const [usuarios, setUsuarios] = useState<any[]>([]); // operadores (p/ Usuário do caixa)
  const [reabrirOpen, setReabrirOpen] = useState(false);
  const [reabrirMotivo, setReabrirMotivo] = useState('');
  const [formasCfg, setFormasCfg] = useState<string[]>([]); // formas cadastradas (fonte única — igual PDV)
  const [formasConfig, setFormasConfig] = useState<FormaCfg[]>([]); // config completa por forma (p/ cartão: adquirente/bandeira)
  const [taxas, setTaxas] = useState<TaxaRow[]>([]); // tabela TaxaContratada (mostra bandeiras do cartão)
  const [contasCfg, setContasCfg] = useState<string[]>([]); // contas financeiras reais
  const formasList = formasCfg.length ? formasCfg : FORMAS_PADRAO;
  const contasList = contasCfg.length ? contasCfg : CONTAS;

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
  useEffect(() => { if (!isAdmin) { setPrevCred(null); return; } fetch('/api/caixa/previsao-credito', { cache: 'no-store' }).then((r) => r.json()).then(setPrevCred).catch(() => setPrevCred(null)); }, [date, isAdmin]);
  useEffect(() => { // fonte única: formas + contas cadastradas no Financeiro
    (async () => {
      try {
        // FONTE ÚNICA (lib/formasPagamento) — mesma lista + config + taxas do PDV.
        const { formasList, formasConfig, taxas } = await carregarFormasRecebimento();
        if (formasList.length) setFormasCfg(formasList);
        setFormasConfig(formasConfig); setTaxas(taxas);
      } catch { /* usa padrão */ }
      try {
        const cs = await fetch('/api/financeiro/contas', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        const list = Array.isArray(cs) ? cs : (cs.itens || cs.data || []);
        const nomes = list.map((c: any) => c?.nome).filter(Boolean);
        if (nomes.length) setContasCfg(nomes);
        setContasFin(list.filter((c: any) => c?.id && c?.nome).map((c: any) => ({ id: c.id, nome: c.nome })));
      } catch { /* usa padrão */ }
      try {
        const cx = await fetch('/api/caixa/abertos-para-transferencia', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        setCaixasTransfer(Array.isArray(cx) ? cx : []);
      } catch { /* sem lista */ }
      try {
        const cats = await fetch('/api/financeiro/categorias', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(cats) ? cats : (cats.itens || cats.data || []);
        setCategoriasDespesa(arr.filter((c: any) => String(c?.tipo || '') === 'DESPESA').sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')));
      } catch { /* sem categorias */ }
      try {
        const us = await fetch('/api/users', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(us) ? us : (us.itens || us.data || us.users || []);
        setUsuarios(arr.filter((u: any) => u?.id).map((u: any) => ({ id: u.id, name: u.name || u.nome || 'Sem nome' })));
      } catch { /* sem usuários */ }
    })();
  }, []);

  const mudarDia = (delta: number) => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + delta); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); };
  const tutorIdDe = (a?: Appointment | null) => a?.tutorId || a?.tutor?.id || null;

  const resumo = useMemo(() => {
    const map = new Map<string, { vendas: number; sup: number }>();
    const add = (forma: string, campo: 'vendas' | 'sup', valor: number) => { const cur = map.get(forma) || { vendas: 0, sup: 0 }; cur[campo] += valor; map.set(forma, cur); };
    (detail?.recebimentos || []).forEach((rec) => {
      // formas pode vir malformado (ex.: [[]] de baixa sem forma) → achata e filtra objetos válidos.
      const fs = (Array.isArray(rec.formas) ? (rec.formas as any[]).flat() : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));
      let soma = 0;
      fs.forEach((f: any) => { const v = Number(f.valor || 0); soma += v; add(f.forma || 'Outros', 'vendas', v); });
      // o que sobrou do valorTotal (recebimento sem forma / forma parcial) NÃO some — cai em "Outros".
      const resto = Number(rec.valorTotal || 0) - soma;
      if (resto > 0.005) add('Outros', 'vendas', resto);
    });
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
    const ent = movs.filter((m) => m.tipo === 'SUPRIMENTO' && ehDinheiro(m.forma || 'Dinheiro')).reduce((s, m) => s + Number(m.valor || 0), 0);
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

  // Movimentos POR PERÍODO (substitui a tela avulsa "Movimentos de caixa" — agora dentro da aba).
  const fetchMovPeriodo = useCallback(async () => {
    const p = new URLSearchParams();
    if (movFrom) p.set('from', movFrom); if (movTo) p.set('to', movTo);
    try { const r = await fetch(`/api/caixa/movimentos?${p.toString()}`, { cache: 'no-store' }); if (!r.ok) return; const d = await r.json(); setMovPeriodo(Array.isArray(d) ? d : (d.data || [])); } catch { /* ignore */ }
  }, [movFrom, movTo]);
  useEffect(() => { if (movModo === 'periodo') fetchMovPeriodo(); }, [movModo, fetchMovPeriodo]);
  // Movimentos do período já mapeados p/ o mesmo formato + filtro por tipo/conta.
  const movPeriodoLinhas = useMemo(() => (movPeriodo || [])
    .map((m: any) => ({ id: m.id, data: m.data, tipoRaw: m.tipo, tipo: tipoLabel[m.tipo] || m.tipo, descricao: m.descricao || '—', conta: m.conta || 'Caixa', valor: Number(m.valor || 0), entrada: ehEntrada(m.tipo) }))
    .filter((m) => (!movTipoF || m.tipoRaw === movTipoF) && (!movContaF || m.conta === movContaF))
    .sort((a, b) => +new Date(b.data) - +new Date(a.data)), [movPeriodo, movTipoF, movContaF]);
  const movTotais = useMemo(() => { let ent = 0, sai = 0; movPeriodoLinhas.forEach((m) => { if (m.entrada) ent += m.valor; else sai += m.valor; }); return { ent, sai }; }, [movPeriodoLinhas]);

  const abrirCaixa = async () => {
    try {
      // Conta + forma do suprimento vão junto na observação (registro), Usuário vira o dono do caixa.
      const contaNome = contasFin.find((c) => c.id === abrirForm.contaOrigemId)?.nome;
      const obs = [abrirForm.observacao, abrirForm.forma && `Forma: ${abrirForm.forma}`, contaNome && `Conta: ${contaNome}`].filter(Boolean).join(' · ') || null;
      const r = await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suprimento: Number(String(abrirForm.suprimento).replace(',', '.')) || 0, observacao: obs, abertura: abrirForm.abertura || undefined, userId: abrirForm.userId || undefined }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || 'Erro ao abrir caixa'); }
      toast.success(abrirForm.abertura ? `Caixa aberto para ${abrirForm.abertura.split('-').reverse().join('/')}!` : 'Caixa aberto!'); setAbrirOpen(false); setAbrirForm({ suprimento: '', observacao: '', abertura: '', userId: '', contaOrigemId: '', forma: 'Dinheiro' }); await fetchCaixas();
    } catch (e: any) { toast.error(e.message || 'Erro ao abrir caixa'); }
  };
  const abrirFechar = () => {
    const now = new Date();
    const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const h = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setFecharForm({ valorContado: '', observacao: '', data: d, hora: h, semMov: false }); setFecharOpen(true);
  };
  const enviarFechamento = async (status: 'FECHADO' | 'EM_REVISAO') => {
    if (!detail) return;
    const valorContado = fecharForm.semMov ? Number(saldoDinheiro.toFixed(2)) : (fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.')));
    const fechamento = fecharForm.data ? new Date(`${fecharForm.data}T${fecharForm.hora || '23:59'}:00`).toISOString() : undefined;
    try {
      const r = await fetch(`/api/caixa/${detail.id}/fechar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status, fechamento, valorEsperado: Number(saldoDinheiro.toFixed(2)), valorContado, observacao: fecharForm.observacao || (fecharForm.semMov ? 'Caixa sem movimento' : null) }) });
      if (!r.ok) throw new Error('Erro ao processar');
      toast.success(status === 'EM_REVISAO' ? 'Caixa colocado em revisão!' : 'Caixa encerrado!'); setFecharOpen(false); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao processar o fechamento'); }
  };
  const fecharCaixa = () => enviarFechamento('FECHADO');
  const reabrirCaixa = () => { if (!detail) return; setReabrirMotivo(''); setReabrirOpen(true); };
  const confirmarReabrir = async () => {
    if (!detail) return;
    try { const r = await fetch(`/api/caixa/${detail.id}/reabrir`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observacao: reabrirMotivo || null }) }); if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || 'Erro ao reabrir caixa'); } toast.success('Caixa reaberto!'); setReabrirOpen(false); await fetchCaixas(); await fetchDetail(detail.id); }
    catch (e: any) { toast.error(e.message || 'Erro ao reabrir caixa'); }
  };
  const abrirReceber = async (venda: Appointment) => {
    setVendaSel(venda); setFormas([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]); setDesconto(0); setObsReceb(''); setTutorSaldo(null); setTutorAReceber(null); setReceberOpen(true);
    const tid = tutorIdDe(venda);
    if (tid) { try { const r = await fetch(`/api/credito/tutor/${tid}/resumo`, { cache: 'no-store' }); if (r.ok) { const d = await r.json(); setTutorSaldo(Number(d.credito || 0)); setTutorAReceber(Number(d.aReceber || 0)); } } catch { /* ignore */ } }
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
      // Remonta as formas como objetos literais NOVOS (o objeto de estado ia como `[]` no JSON → formas [[]] no backend).
      const formasEnvio = (Array.isArray(formas) ? formas : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f) && Number(f.valor) > 0).map((f: any) => ({ forma: String(f.forma || ''), valor: Number(f.valor) || 0, modalidade: f.modalidade ?? undefined, bandeira: f.bandeira ?? undefined, parcelas: f.parcelas ?? undefined, nsu: f.nsu ?? undefined }));
      const r = await fetch(`/api/caixa/${detail.id}/recebimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: vendaSel.id, valorTotal: valorAplicado, desconto, troco, formas: formasEnvio, formasStr: JSON.stringify(formasEnvio), observacao: obsReceb || null }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao registrar recebimento'); }
      toast.success('Recebimento registrado!'); setReceberOpen(false); await fetchDetail(detail.id); await fetchAppointments();
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar recebimento'); }
  };
  const abrirMov = (tipo: string) => { setMovTipo(tipo); setMovForm({ valor: '', forma: 'Dinheiro', conta: 'Banco', descricao: '', observacao: '', categoriaId: '', contaOrigemId: '', contaDestinoId: '', destinoCaixaId: '' }); setMovOpen(true); };
  const registrarMovimento = async () => {
    if (!detail) return; const valor = Number(String(movForm.valor).replace(',', '.')) || 0;
    if (valor <= 0) { toast.error('Informe o valor'); return; }
    // 🔄 Transferir para outro caixa: sai daqui (sangria) e entra no destino (suprimento), num só passo.
    if (movTipo === 'CAIXA') {
      if (!movForm.destinoCaixaId) { toast.error('Escolha o caixa de destino.'); return; }
      try {
        const r = await fetch(`/api/caixa/${detail.id}/transferir-caixa`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valor, destinoCaixaId: movForm.destinoCaixaId, descricao: movForm.descricao || null }) });
        if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao transferir'); }
        toast.success('Transferência entre caixas registrada!'); setMovOpen(false); await fetchDetail(detail.id); await fetchCaixas();
      } catch (e: any) { toast.error(e.message || 'Erro ao transferir'); }
      return;
    }
    try {
      const r = await fetch(`/api/caixa/${detail.id}/movimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tipo: movTipo, valor, forma: movForm.forma || null, conta: movTipo === 'TRANSFERENCIA' ? movForm.conta : null, descricao: movForm.descricao || null, observacao: movForm.observacao || null, ...(movTipo === 'DESPESA' && movForm.categoriaId ? { categoriaId: movForm.categoriaId } : {}), ...((movTipo === 'SUPRIMENTO' || movTipo === 'TRANSFERENCIA') && movForm.contaOrigemId ? { contaOrigemId: movForm.contaOrigemId } : {}), ...((movTipo === 'SANGRIA' || movTipo === 'TRANSFERENCIA') && movForm.contaDestinoId ? { contaDestinoId: movForm.contaDestinoId } : {}) }) });
      if (!r.ok) throw new Error('Erro ao registrar movimento');
      toast.success(`${tipoLabel[movTipo]} registrada!`); setMovOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar movimento'); }
  };
  const abrirCredito = () => { setCredForm({ appointmentId: appointments[0]?.id || '', tipo: 'RECARGA', valor: '', descricao: '', forma: 'Dinheiro' }); setCredFormas([{ forma: 'Dinheiro', valor: 0 }]); setCredOpen(true); };
  const adicionarCredito = async () => {
    if (!detail) return;
    const recarga = credForm.tipo === 'RECARGA';
    // RECARGA: valor = soma das formas (igual venda). ESTORNO: valor do campo (sem forma/caixa).
    const valor = recarga ? credSomaFormas : (Number(String(credForm.valor).replace(',', '.')) || 0);
    if (!credForm.appointmentId) { toast.error('Selecione o cliente'); return; } if (valor <= 0) { toast.error(recarga ? 'Informe a forma e o valor' : 'Informe o valor'); return; }
    // Remonta as formas como literais novos (mesma blindagem do recebimento contra o bug [[]]).
    const formasEnvio = recarga ? (Array.isArray(credFormas) ? credFormas : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f) && Number(f.valor) > 0).map((f: any) => ({ forma: String(f.forma || ''), valor: Number(f.valor) || 0, modalidade: f.modalidade ?? undefined, bandeira: f.bandeira ?? undefined, parcelas: f.parcelas ?? undefined, nsu: f.nsu ?? undefined })) : [];
    try {
      const r = await fetch('/api/credito', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: credForm.appointmentId, tipo: credForm.tipo, valor, descricao: credForm.descricao || null, caixaSessaoId: detail.id, formasStr: JSON.stringify(formasEnvio), formas: formasEnvio }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao adicionar crédito'); }
      toast.success('Crédito adicionado!'); setCredOpen(false); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao adicionar crédito'); }
  };

  const vendasEmAberto = appointments.filter((a) => { const pago = pagoPorAppt.get(a.id) || 0; return Number(a.value) - pago > 0.001; });
  const aberto = detail?.status === 'ABERTO';
  const contado = fecharForm.semMov ? Number(saldoDinheiro.toFixed(2)) : (fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.')));
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
  const delBtn = (fn: () => void) => podeEditar ? (
    <button onClick={fn} title="Excluir" className="no-print" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 4, lineHeight: 0 }}>
      <LuTrash2 size={15} color="#b0408a" style={{ opacity: .7 }} />
    </button>
  ) : null;

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
          <button onClick={() => { setGradeOpen(true); fetchGrade(); }} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: '1px solid #E8E2D6', background: '#fff', color: TEAL_DARK }}>📋 Todos os caixas</button>
          {podeEditar && <button onClick={() => setAbrirOpen(true)} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><LuPlus size={15} /> Abrir caixa</button>}
        </div>

        {gradeOpen && (
          <div className="no-print" onClick={() => setGradeOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 760, maxWidth: '100%', background: '#fff', border: '1px solid #E8E2D6', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: '1px solid #E8E2D6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#014D5E', fontSize: 15, fontWeight: 600 }}>📋 Todos os caixas</span>
                <button onClick={() => setGradeOpen(false)} style={{ border: 'none', background: 'none', color: '#5C6B70', cursor: 'pointer', fontSize: 16 }}>✕</button>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                  <label style={{ fontSize: 11, color: '#5C6B70' }}>De<br /><input type="date" value={gradeFrom} onChange={(e) => setGradeFrom(e.target.value)} style={{ border: '1px solid #E8E2D6', borderRadius: 8, padding: '7px 9px', fontSize: 13 }} /></label>
                  <label style={{ fontSize: 11, color: '#5C6B70' }}>Até<br /><input type="date" value={gradeTo} onChange={(e) => setGradeTo(e.target.value)} style={{ border: '1px solid #E8E2D6', borderRadius: 8, padding: '7px 9px', fontSize: 13 }} /></label>
                  <label style={{ fontSize: 11, color: '#5C6B70' }}>Status<br />
                    <select value={gradeStatus} onChange={(e) => setGradeStatus(e.target.value)} style={{ border: '1px solid #E8E2D6', borderRadius: 8, padding: '7px 9px', fontSize: 13, minWidth: 140 }}>
                      <option value="">Todos</option><option value="ABERTO">Aberto</option><option value="FECHADO">Fechado</option><option value="ENCERRADO">Encerrado</option><option value="EM_REVISAO">Em revisão</option>
                    </select>
                  </label>
                  <button onClick={fetchGrade} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🔍 Filtrar</button>
                </div>
                <div style={{ border: '1px solid #E8E2D6', borderRadius: 10, overflow: 'hidden', maxHeight: '55vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#FBF9F4' }}>{['Nº', 'Usuário', 'Abertura', 'Fechamento', 'Status', 'Diferença'].map((h, i) => <th key={h} style={{ padding: '9px 11px', fontSize: 10.5, color: '#5C6B70', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px', textAlign: i === 5 ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {gradeLoading ? <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#5C6B70' }}>Carregando…</td></tr>
                        : gradeRows.length === 0 ? <tr><td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#5C6B70' }}>Nenhum caixa no filtro.</td></tr>
                        : gradeRows.map((c) => { const u = STATUS_UI(c.status); return (
                          <tr key={c.id} style={{ borderTop: '1px solid #F0EBE0', cursor: 'pointer' }} onClick={() => { const d = new Date(c.abertura); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); setSelectedId(c.id); setGradeOpen(false); }}>
                            <td style={{ padding: '9px 11px', color: '#014D5E', fontWeight: 500 }}>nº {c.numero}</td>
                            <td style={{ padding: '9px 11px', color: '#374151' }}>{c.user?.name || '—'}</td>
                            <td style={{ padding: '9px 11px', color: '#5C6B70' }}>{c.abertura ? new Date(c.abertura).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td style={{ padding: '9px 11px', color: '#5C6B70' }}>{c.fechamento ? new Date(c.fechamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td style={{ padding: '9px 11px' }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: u.bg, color: u.fg }}>{u.label}</span></td>
                            <td style={{ padding: '9px 11px', textAlign: 'right', color: c.diferenca != null && c.diferenca < 0 ? '#C0392B' : '#5C6B70' }}>{c.diferenca != null ? (ocultar ? '•••' : c.diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })) : '—'}</td>
                          </tr>
                        ); })}
                    </tbody>
                  </table>
                </div>
                <p style={{ fontSize: 11, color: '#8A938F', marginTop: 8 }}>Clique numa linha pra abrir aquele caixa.</p>
              </div>
            </div>
          </div>
        )}

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ color: '#014D5E', fontWeight: 500 }}>Valor de abertura:</span>
                    {!editSup && <span>{money(Number(detail.suprimento || 0))}</span>}
                    {!editSup && podeEditar && detail.status === 'ABERTO' && (
                      <button onClick={() => { setSupVal(String(detail.suprimento ?? '')); setEditSup(true); }} style={miniBtn} title="Corrigir o valor de abertura (fundo de troco)">✏️ editar</button>
                    )}
                    {editSup && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <input value={supVal} inputMode="decimal" placeholder="0,00" onChange={(e) => setSupVal(e.target.value)} autoFocus style={{ width: 90, border: '1px solid #E8E2D6', borderRadius: 8, padding: '4px 8px', fontSize: 13 }} />
                        <button onClick={salvarSuprimento} disabled={savingSup} style={{ ...miniBtn, background: TEAL, color: '#fff', border: 'none', opacity: savingSup ? .5 : 1 }}>{savingSup ? '...' : 'Salvar'}</button>
                        <button onClick={() => setEditSup(false)} style={miniBtn}>cancelar</button>
                      </span>
                    )}
                  </div>
                  {detail.fechamento && <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Fechamento:</span> {dataHora(detail.fechamento)}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ color: '#014D5E', fontWeight: 500 }}>Status:</span>
                    {(() => { const u = STATUS_UI(detail.status); return <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: u.bg, color: u.fg }}>{u.label}</span>; })()}
                    {podeEditar && detail.status !== 'ABERTO' && detail.status !== 'ENCERRADO' && <button onClick={() => mudarStatus('ENCERRADO')} style={miniBtn} title="Encerrar definitivamente">🔒 Encerrar</button>}
                    {podeEditar && detail.status !== 'ABERTO' && detail.status !== 'EM_REVISAO' && <button onClick={() => mudarStatus('EM_REVISAO')} style={miniBtn} title="Marcar em revisão">🔎 Em revisão</button>}
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
                  {podeEditar && <button onClick={() => abrirMov('SUPRIMENTO')} disabled={!aberto} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Suprimento</button>}
                  {podeEditar && <button onClick={() => abrirMov('SANGRIA')} disabled={!aberto} style={{ background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Sangria</button>}
                  <button onClick={() => abrirMov('DESPESA')} disabled={!aberto} style={{ background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Despesa</button>
                  <button onClick={() => abrirMov('TRANSFERENCIA')} disabled={!aberto} style={{ background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', opacity: aberto ? 1 : .4 }}>Transferência</button>
                  {podeEditar && <button onClick={() => abrirMov('CAIXA')} disabled={!aberto || caixasTransfer.filter((c) => c.id !== detail?.id).length === 0} title="Passar dinheiro deste caixa para outro caixa aberto" style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: (aberto && caixasTransfer.filter((c) => c.id !== detail?.id).length) ? 'pointer' : 'not-allowed', opacity: (aberto && caixasTransfer.filter((c) => c.id !== detail?.id).length) ? 1 : .4 }}>🔄 Transferir para outro caixa</button>}
                  <button onClick={abrirCredito} disabled={!aberto} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL, border: `1px solid ${TEAL}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: aberto ? 1 : .4 }}><LuGift size={14} /> Crédito do pet</button>
                  <button onClick={() => window.print()} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuPrinter size={14} /> Imprimir relatório</button>
                  {aberto ? (
                    <button onClick={abrirFechar} style={{ gridColumn: '1 / -1', background: TEAL_DARK, color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '9px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuLock size={14} /> Revisar e encerrar</button>
                  ) : podeEditar ? (
                    <button onClick={reabrirCaixa} style={{ gridColumn: '1 / -1', background: '#fff', color: '#5C6B70', border: '1px solid #E8E2D6', fontSize: 12, fontWeight: 500, padding: '9px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuLockOpen size={14} /> Reabrir caixa</button>
                  ) : null}
                </div>
                {!aberto && <p style={{ fontSize: 11, color: '#374151', margin: '8px 0 0' }}>Reabra o caixa para lançar ou excluir registros.</p>}
              </div>
            </div>

            {/* AREA PRINCIPAL */}
            <div style={{ flex: '1 1 480px', minWidth: 0 }}>
              <div className="no-print" style={{ display: 'flex', gap: 26, borderBottom: `1px solid ${LINE}`, overflowX: 'auto' }}>
                {tabBtn('resumo', 'Resumo')}{tabBtn('receb', 'Recebimentos')}{tabBtn('mov', 'Movimentações')}
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
                    {(detail.creditosUtilizados || []).length > 0 && (
                      <>
                        <div style={{ fontSize: 14, fontWeight: 600, margin: '18px 0 10px' }}>Créditos utilizados</div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead><tr><th style={thStyle}>Data</th><th style={thStyle}>Cliente</th><th style={thStyle}>Venda</th><th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>{aberto && <th style={{ ...thStyle }} className="no-print"></th>}</tr></thead>
                          <tbody>
                            {(detail.creditosUtilizados || []).map((c) => (
                              <tr key={c.id}>
                                <td style={{ ...tdStyle, color: '#5C6B70' }}>{dataHora(c.data)}</td>
                                <td style={{ ...tdStyle, color: '#1F2A2E' }}>{c.tutor?.name || 'Cliente'}</td>
                                <td style={{ ...tdStyle, color: '#374151' }}>{(c as any).appointment?.numeroVenda != null ? `#${(c as any).appointment.numeroVenda}` : (c.descricao || '—')}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{money(Number(c.valor))}</td>
                                {aberto && <td style={{ ...tdStyle, textAlign: 'right' }} className="no-print">{delBtn(() => delCred(c.id))}</td>}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </>
                    )}
                  </>
                )}

                {tab === 'receb' && (
                  <>
                    {aberto && (
                      <div className="no-print" style={{ marginBottom: 12, fontSize: 12.5, color: '#5C6B70', background: '#EAF6F7', border: '1px solid #CFE7EA', borderRadius: 10, padding: '10px 13px' }}>
                        💡 Recebimentos são registrados no <b style={{ color: '#014D5E' }}>Ponto de venda</b> (aba “Não pago”). Aqui você <b>acompanha e confere</b> os recebimentos do dia para o fechamento.
                      </div>
                    )}
                    {isAdmin && prevCred && prevCred.totalCentavos > 0 && (
                      <div className="no-print" style={{ marginBottom: 12, background: '#F0FAF6', border: '1px solid #BFE6D4', borderRadius: 12, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                          <div style={{ fontSize: 13, color: '#0F5132', fontWeight: 600 }}>💳 A receber das maquininhas <span style={{ fontWeight: 400, color: '#5C6B70' }}>(previsão de crédito · líquido · pelo prazo de cada maquininha)</span></div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: '#0F5132' }}>{money(prevCred.totalCentavos / 100)}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {prevCred.porData.map((p) => {
                            const [y, m, d] = p.data.split('-');
                            const base = new Date(); base.setHours(0, 0, 0, 0);
                            const diff = Math.round((new Date(Number(y), Number(m) - 1, Number(d)).getTime() - base.getTime()) / 86400000);
                            const quando = diff <= 0 ? 'hoje' : diff === 1 ? 'amanhã' : `${d}/${m}`;
                            return (
                              <div key={p.data} style={{ background: '#fff', border: '1px solid #D8ECE0', borderRadius: 9, padding: '6px 11px', fontSize: 12.5 }}>
                                <span style={{ color: '#5C6B70' }}>{quando}</span> · <b style={{ color: '#0F5132' }}>{money(p.liquidoCentavos / 100)}</b>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(detail.recebimentos || []).length === 0 && <p style={{ textAlign: 'center', color: '#374151', padding: 16, fontSize: 13 }}>Nenhum recebimento registrado.</p>}
                      {(detail.recebimentos || []).map((rec) => {
                        const fs = (Array.isArray(rec.formas) ? (rec.formas as any[]).flat() : []).filter((f: any) => f && typeof f === 'object' && !Array.isArray(f));
                        const value = Number(rec.appointment?.value || 0);
                        const pago = rec.appointmentId ? pagoPorAppt.get(rec.appointmentId) || 0 : 0;
                        const st = statusVenda(value, pago);
                        // Recarga de crédito do pet: recebimento sem venda, observacao "Crédito do pet · <cliente> ||credito:<id>"
                        const ehRecarga = /^Crédito do pet/.test(String(rec.observacao || ''));
                        const recargaCliente = ehRecarga ? String(rec.observacao || '').replace(/^Crédito do pet · /, '').replace(/\s*\|\|credito:.*$/, '') : '';
                        return (
                          <div key={rec.id} style={{ border: '1px solid #F0EBE0', borderRadius: 10, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, background: ehRecarga ? '#F3EEFB' : '#FBF9F4', padding: '8px 12px', fontSize: 12.5 }}>
                              <span style={{ color: ehRecarga ? '#6D28D9' : '#014D5E', fontWeight: 600 }}>{ehRecarga ? '🎁 Crédito do pet' : <>Venda: {vendaLabel(rec.appointment)}{rec.appointment?.date ? <span style={{ fontWeight: 400, color: '#5C6B70' }}> em {new Date(rec.appointment.date).toLocaleDateString('pt-BR')}</span> : null}</>}</span>
                              <span style={{ color: '#5C6B70' }}>Baixa em {dataHora(rec.data)}</span>
                              <span style={{ color: '#1F2A2E' }}>Cliente: {ehRecarga ? recargaCliente : (rec.appointment?.tutor?.name || 'Cliente')}{!ehRecarga && rec.appointment?.pet?.name ? ` · ${rec.appointment.pet.name}` : ''}</span>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>{!ehRecarga && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span>}<b style={{ color: '#014D5E' }}>{money(Number(rec.valorTotal))}</b></span>
                            </div>
                            <div>
                              {fs.length === 0 ? <div style={{ padding: '8px 12px', color: '#8A6D00', fontSize: 12 }}>Sem forma identificada</div> :
                                fs.map((f: any, k: number) => (
                                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', borderTop: '1px solid #F5F1E8', fontSize: 12.5 }}>
                                    <span style={{ flex: 1, color: '#1F2A2E' }}>{f.forma || 'Outros'} <span style={{ color: '#8A857A' }}>({f.modalidade || 'À Vista'})</span></span>
                                    <span style={{ color: '#014D5E', fontWeight: 500 }}>{money(Number(f.valor || 0))}</span>
                                    {aberto && <span className="no-print">{delBtn(() => delRec(rec.id))}</span>}
                                  </div>
                                ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {tab === 'mov' && (() => {
                  const periodo = movModo === 'periodo';
                  const lbl2: React.CSSProperties = { fontSize: 11, color: '#5C6B70', display: 'block', marginBottom: 3 };
                  const linhas = periodo ? movPeriodoLinhas : movLinhas;
                  const mostraDel = !periodo && aberto;
                  return (
                    <>
                      <div className="no-print" style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 12 }}>
                        <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                          {(['caixa', 'periodo'] as const).map((k) => (
                            <button key={k} onClick={() => { setMovModo(k); if (k === 'periodo' && !movFrom) { const f = new Date(Date.now() - 30 * 86400000); setMovFrom(`${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`); setMovTo(hojeStr()); } }} style={{ border: 'none', background: movModo === k ? TEAL : '#fff', color: movModo === k ? '#fff' : '#5C6B70', fontSize: 12.5, fontWeight: 500, padding: '7px 13px', cursor: 'pointer' }}>{k === 'caixa' ? 'Deste caixa' : '🗓️ Por período'}</button>
                          ))}
                        </div>
                        {periodo && (<>
                          <div><label style={lbl2}>De</label><input type="date" value={movFrom} onChange={(e) => setMovFrom(e.target.value)} style={inp} /></div>
                          <div><label style={lbl2}>Até</label><input type="date" value={movTo} onChange={(e) => setMovTo(e.target.value)} style={inp} /></div>
                          <div><label style={lbl2}>Tipo</label><select value={movTipoF} onChange={(e) => setMovTipoF(e.target.value)} style={inp}><option value="">Todos</option>{Object.keys(tipoLabel).map((t) => <option key={t} value={t}>{tipoLabel[t]}</option>)}</select></div>
                          <div><label style={lbl2}>Conta</label><select value={movContaF} onChange={(e) => setMovContaF(e.target.value)} style={inp}><option value="">Todas</option>{contasList.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                          <div style={{ marginLeft: 'auto', fontSize: 12.5, alignSelf: 'center' }}><span style={{ color: GREEN }}>Entradas {money(movTotais.ent)}</span> · <span style={{ color: ORANGE }}>Saídas {money(movTotais.sai)}</span></div>
                        </>)}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead><tr><th style={thStyle}>Data</th><th style={thStyle}>Tipo</th><th style={thStyle}>Descrição</th><th style={thStyle}>Conta</th><th style={{ ...thStyle, textAlign: 'right' }}>Valor</th>{mostraDel && <th style={{ ...thStyle }} className="no-print"></th>}</tr></thead>
                        <tbody>
                          {linhas.length === 0 && (<tr><td colSpan={mostraDel ? 6 : 5} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Sem movimentações{periodo ? ' no período' : ''}.</td></tr>)}
                          {linhas.map((m: any, i: number) => (
                            <tr key={m.id || i}>
                              <td style={{ ...tdStyle, color: '#5C6B70' }}>{dataHora(m.data)}</td>
                              <td style={{ ...tdStyle, color: m.entrada ? GREEN : ORANGE }}>{m.tipo}</td>
                              <td style={{ ...tdStyle, color: '#5C6B70' }}>{m.descricao}</td>
                              <td style={{ ...tdStyle, color: '#374151' }}>{m.conta}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500, color: m.entrada ? GREEN : ORANGE }}>{m.entrada ? '' : '− '}{money(m.valor)}</td>
                              {mostraDel && <td style={{ ...tdStyle, textAlign: 'right' }} className="no-print">{m.id ? delBtn(() => delMov(m.id!)) : null}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  );
                })()}

              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAIS */}
      {abrirOpen && (
        <Modal title="Abrir caixa" onClose={() => setAbrirOpen(false)} onConfirm={abrirCaixa} confirmLabel="Abrir caixa">
          <Field label="Usuário (operador do caixa)"><select value={abrirForm.userId} onChange={(e) => setAbrirForm({ ...abrirForm, userId: e.target.value })} style={inp}><option value="">Eu mesmo(a)</option>{usuarios.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></Field>
          <Field label="Data do caixa (deixe vazio = hoje; escolha um dia passado p/ lançar retroativo)"><input type="date" value={abrirForm.abertura} max={hojeStr()} onChange={(e) => setAbrirForm({ ...abrirForm, abertura: e.target.value })} style={inp} /></Field>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#014D5E', marginTop: 2 }}>Suprimento (fundo de troco)</div>
          <Field label="Conta de origem"><select value={abrirForm.contaOrigemId} onChange={(e) => setAbrirForm({ ...abrirForm, contaOrigemId: e.target.value })} style={inp}><option value="">— Escolher —</option>{contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="Valor"><input value={abrirForm.suprimento} onChange={(e) => setAbrirForm({ ...abrirForm, suprimento: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Forma de pagamento"><select value={abrirForm.forma} onChange={(e) => setAbrirForm({ ...abrirForm, forma: e.target.value })} style={inp}>{formasList.map((f) => <option key={f} value={f}>{f}</option>)}</select></Field></div>
          </div>
          <Field label="Descrição"><input value={abrirForm.observacao} onChange={(e) => setAbrirForm({ ...abrirForm, observacao: e.target.value })} placeholder="Ex: Fundo de troco" style={inp} /></Field>
        </Modal>
      )}

      {fecharOpen && detail && (
        <Modal title={`Encerramento do caixa nº ${detail.numero}`} onClose={() => setFecharOpen(false)} onConfirm={fecharCaixa} confirmLabel="✅ Encerrar caixa" dark
          secondary={{ label: '🔄 Colocar em revisão', onClick: () => enviarFechamento('EM_REVISAO'), color: '#7C5CBF' }}>
          <button type="button" onClick={() => setFecharForm({ ...fecharForm, semMov: !fecharForm.semMov })} style={{ width: '100%', padding: '12px', borderRadius: 8, border: fecharForm.semMov ? `2px solid ${TEAL}` : '1px solid #E8E2D6', background: fecharForm.semMov ? '#e8f7f9' : '#F4F6F7', color: '#5C6B70', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>{fecharForm.semMov ? '✓ ' : ''}Caixa sem movimento</button>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="Data"><input type="date" value={fecharForm.data} onChange={(e) => setFecharForm({ ...fecharForm, data: e.target.value })} style={inp} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Hora"><input type="time" value={fecharForm.hora} onChange={(e) => setFecharForm({ ...fecharForm, hora: e.target.value })} style={inp} /></Field></div>
          </div>
          {!fecharForm.semMov && (
            <>
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
            </>
          )}
          <Field label="Comentário"><input value={fecharForm.observacao} onChange={(e) => setFecharForm({ ...fecharForm, observacao: e.target.value })} placeholder="Opcional" style={inp} /></Field>
        </Modal>
      )}

      {reabrirOpen && detail && (
        <Modal title={`Reabrir o caixa nº ${detail.numero}`} onClose={() => setReabrirOpen(false)} onConfirm={confirmarReabrir} confirmLabel="Reabrir caixa">
          <p style={{ fontSize: 12.5, color: '#5C6B70', margin: 0 }}>O caixa volta a ficar <b>Aberto</b>. Informe o motivo (fica registrado no histórico do caixa).</p>
          <Field label="Motivo da reabertura"><input value={reabrirMotivo} onChange={(e) => setReabrirMotivo(e.target.value)} placeholder="Ex: faltou lançar uma venda em dinheiro" style={inp} /></Field>
        </Modal>
      )}

      {movOpen && (
        <Modal title={tipoLabel[movTipo]} onClose={() => setMovOpen(false)} onConfirm={registrarMovimento} confirmLabel="Confirmar" dark={!ehEntrada(movTipo)}>
          <Field label="Valor"><input value={movForm.valor} onChange={(e) => setMovForm({ ...movForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field>
          {movTipo === 'TRANSFERENCIA' && (<>
            <Field label="Conta de origem"><select value={movForm.contaOrigemId} onChange={(e) => setMovForm({ ...movForm, contaOrigemId: e.target.value })} style={inp}><option value="">— Escolher —</option>{contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
            <Field label="Conta de destino"><select value={movForm.contaDestinoId} onChange={(e) => setMovForm({ ...movForm, contaDestinoId: e.target.value })} style={inp}><option value="">— Escolher —</option>{contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          </>)}
          {movTipo === 'SANGRIA' && (
            <Field label="Conta de destino (sai do caixa em dinheiro)"><select value={movForm.contaDestinoId} onChange={(e) => setMovForm({ ...movForm, contaDestinoId: e.target.value })} style={inp}><option value="">— Escolher —</option>{contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          )}
          {movTipo === 'SUPRIMENTO' && (
            <Field label="Conta de origem (entra no caixa em dinheiro)"><select value={movForm.contaOrigemId} onChange={(e) => setMovForm({ ...movForm, contaOrigemId: e.target.value })} style={inp}><option value="">— Escolher —</option>{contasFin.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></Field>
          )}
          {movTipo === 'CAIXA' && (<>
            <Field label="Caixa de destino"><select value={movForm.destinoCaixaId} onChange={(e) => setMovForm({ ...movForm, destinoCaixaId: e.target.value })} style={inp}>
              <option value="">— Escolher caixa —</option>
              {caixasTransfer.filter((c) => c.id !== detail?.id).map((c) => <option key={c.id} value={c.id}>#{c.numero} · {c.operador}</option>)}
            </select></Field>
            <Field label="Descrição (opcional)"><input value={movForm.descricao} onChange={(e) => setMovForm({ ...movForm, descricao: e.target.value })} placeholder="Ex: repasse de troco" style={inp} /></Field>
            <p style={{ fontSize: 11.5, color: '#5C6B70', margin: '2px 0 0' }}>Sai em dinheiro deste caixa e entra no caixa escolhido — aparece nos dois.</p>
          </>)}
          {movTipo === 'DESPESA' && (
            <Field label="Forma"><select value={movForm.forma} onChange={(e) => setMovForm({ ...movForm, forma: e.target.value })} style={inp}>{formasList.filter((f) => !ehCredito(f)).map((f) => <option key={f} value={f}>{f}</option>)}</select></Field>
          )}
          {movTipo === 'DESPESA' && (
            <Field label="Categoria (entra no DRE)"><select value={movForm.categoriaId} onChange={(e) => setMovForm({ ...movForm, categoriaId: e.target.value })} style={inp}>
              <option value="">— Escolher categoria —</option>
              {categoriasDespesa.map((c: any) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>{categoriasDespesa.length === 0 ? <div style={{ fontSize: 11, color: '#5C6B70', marginTop: 3 }}>Sem categorias — a despesa entra sem classificação.</div> : null}</Field>
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
            {credForm.tipo !== 'RECARGA' && <div style={{ flex: 1 }}><Field label="Valor"><input value={credForm.valor} onChange={(e) => setCredForm({ ...credForm, valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field></div>}
          </div>
          {credForm.tipo === 'RECARGA' && (
            <>
              <Field label="Forma de pagamento (igual venda)"><PagamentoFormas formas={credFormas} onChange={setCredFormas} formasList={formasList} formasConfig={formasConfig} taxas={taxas} /></Field>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e8f7f9', borderRadius: 8, padding: '9px 12px', fontSize: 13 }}>
                <span style={{ color: '#014D5E' }}>Vira crédito do cliente</span><b style={{ color: TEAL_DARK, fontSize: 15 }}>{money(credSomaFormas)}</b>
              </div>
            </>
          )}
          <Field label="Descrição"><input value={credForm.descricao} onChange={(e) => setCredForm({ ...credForm, descricao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}

      {receberOpen && vendaSel && (
        <Modal title="Registrar recebimento" slide onClose={() => setReceberOpen(false)} onConfirm={registrarRecebimento} confirmLabel="Confirmar recebimento" confirmDisabled={creditoExcede}>
          <div style={{ display: 'flex', justifyContent: 'space-between', background: '#FBF9F4', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <span style={{ color: '#1F2A2E' }}>{vendaSel.tutor?.name || 'Cliente'} · {vendaSel.pet?.name || 'Pet'}</span>
            <span style={{ color: '#5C6B70', fontSize: 12 }}>Total {brl(Number(vendaSel.value))} · Saldo <b style={{ color: ORANGE }}>{brl(valorDevido)}</b></span>
          </div>
          {tutorAReceber !== null && tutorAReceber > valorDevido + 0.5 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#FDF6E9', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <span style={{ color: '#9A6C1F' }}>Total a receber do cliente (todas as vendas)</span><b style={{ color: '#9A6C1F' }}>{brl(tutorAReceber)}</b>
            </div>
          )}
          {tutorSaldo !== null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', background: '#e8f7f9', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
              <span style={{ color: '#014D5E' }}>Crédito disponível do cliente</span><b style={{ color: TEAL_DARK }}>{brl(tutorSaldo)}</b>
            </div>
          )}
          <div>
            <label style={lbl}>Formas de pagamento</label>
            {/* FONTE ÚNICA: mesmo componente do PDV (captura modalidade/bandeira → taxa correta no Financeiro). */}
            <PagamentoFormas formas={formas} onChange={setFormas} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />
            {creditoExcede && <p style={{ fontSize: 11, color: ORANGE, margin: '6px 0 0' }}>Crédito usado ({brl(creditoNasFormas)}) maior que o disponível ({brl(tutorSaldo || 0)}).</p>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Desconto"><DecimalInput value={desconto} onValue={(n) => setDesconto(n)} placeholder="0,00" style={inp} /></Field></div>
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

function Modal({ title, children, onClose, onConfirm, confirmLabel, confirmDisabled, dark, slide, secondary }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string; confirmDisabled?: boolean; dark?: boolean; slide?: boolean; secondary?: { label: string; onClick: () => void; color?: string } }) {
  // slide=painel deslizante pela direita (mantém a lista de vendas visível atrás — padrão SimplesVet).
  const painel: React.CSSProperties = slide
    ? { background: '#fff', width: '100%', maxWidth: 480, height: '100vh', overflow: 'auto', borderLeft: '1px solid #F0EBE0', boxShadow: '-12px 0 30px rgba(0,0,0,.14)', animation: 'cxSlideOver .18s ease-out' }
    : { background: '#fff', borderRadius: 14, width: '100%', maxWidth: 430, maxHeight: '92vh', overflow: 'auto' };
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: slide ? 'flex-end' : 'center', padding: slide ? 0 : 16, zIndex: 50 }}>
      <style>{`@keyframes cxSlideOver{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
      <div style={painel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: '1px solid #F0EBE0' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: '#1F2A2E' }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer' }}><LuX size={18} color="#374151" /></button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '15px 18px', borderTop: '1px solid #F0EBE0' }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, border: '1px solid #E8E2D6', background: '#fff', color: '#5C6B70', cursor: 'pointer' }}>Cancelar</button>
          {secondary && <button onClick={secondary.onClick} style={{ padding: '9px 16px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', background: secondary.color || '#7C5CBF' }}>{secondary.label}</button>}
          <button onClick={onConfirm} disabled={confirmDisabled} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', background: dark ? TEAL_DARK : TEAL, opacity: confirmDisabled ? .4 : 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// redeploy 1782313464
