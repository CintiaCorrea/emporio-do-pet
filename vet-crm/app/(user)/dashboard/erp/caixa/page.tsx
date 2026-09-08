// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/caixa/page.tsx
// Caixa no PADRAO DO SISTEMA: 2 colunas, largura total, titulo "Caixa",
// botao de esconder valores e exclusao de registros.
'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { usePodeEditar } from '@/lib/permissions/context';
import { useSession } from 'next-auth/react';
import { idDoMeuCaixa } from '@/lib/caixaAtual';
import { ehDinheiro, carregarFormasRecebimento, validarPagamentosCartao, PagForma, FormaCfg, TaxaRow } from '@/lib/formasPagamento';
import { montarResumoDoCaixa, avisoDoUsoDeCredito, avisoDoAdiantamento } from '@/lib/resumoDoCaixa';
import { agruparRecebimentos, rotuloDaVenda } from '@/lib/recebimentosDoCaixa';
import { seloDoFechamento, coresDoSelo } from '@/lib/fechamentoDoCaixa';
import { imprimirCaixaDetalhado, imprimirResumoDeCaixas } from '@/lib/documentos/relatorio-caixa-print';
import { trilhaDoCaixa } from '@/lib/trilhaDoCaixa';
import PagamentoFormas from '@/components/financeiro/PagamentoFormas';
import {
  LuPlus, LuLock, LuLockOpen, LuPrinter, LuChevronLeft, LuChevronRight,
  LuX, LuWallet, LuTrash2, LuGift, LuSettings, LuCircleDollarSign, LuEye, LuEyeOff,
} from 'react-icons/lu';
import MovimentoCaixaModal, { TipoMovimento } from '@/components/caixa/MovimentoCaixaModal';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const ORANGE = '#D85A30';
const GREEN = '#0f6e56';
const LINE = '#E8E2D6';

type Forma = PagForma; // fonte única (lib/formasPagamento): forma+valor +modalidade/bandeira/parcelas/nsu
interface Movimento { id: string; tipo: string; valor: number; forma?: string | null; conta?: string | null; descricao?: string | null; observacao?: string | null; data: string; }
interface CreditoUtil { id: string; tipo: string; valor: number; descricao?: string | null; data: string; appointmentId?: string | null; tutor?: { id: string; name: string } | null; }
interface Recebimento { id: string; valorTotal: number; desconto: number; troco: number; formas: Forma[]; observacao?: string | null; data: string; appointmentId?: string | null; appointment?: { id: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; pet?: { name: string }; tutor?: { name: string } } | null; }
interface Caixa { id: string; numero: number; status: string; abertura: string; fechamento?: string | null; suprimento: number; observacao?: string | null; valorEsperado?: number | null; valorContado?: number | null; diferenca?: number | null; obsFechamento?: string | null; user?: { id: string; name: string } | null; recebimentos: Recebimento[]; movimentos?: Movimento[]; creditosUtilizados?: CreditoUtil[]; }
interface Appointment { id: string; value: number; numeroVenda?: number | null; codigoExterno?: string | null; paymentStatus?: string; tutorId?: string; pet?: { name: string } | null; tutor?: { id?: string; name: string } | null; start?: string; }

const FORMAS_PADRAO = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const CONTAS = ['Caixa', 'Banco', 'Cofre'];
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
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde ações do caixa

  const [date, setDate] = useState(hojeStr());
  const [caixas, setCaixas] = useState<Caixa[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const escolhaManual = useRef(false); // true = a pessoa clicou no seletor de caixa
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || '';
  const [detail, setDetail] = useState<Caixa | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<'resumo' | 'receb' | 'mov' | 'cred'>('resumo');
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
  // PADRAO = ULTIMOS 7 DIAS. A Cintia, sobre o SimplesVet: "o padrao da tela e 'hoje', e hoje
  // quase nunca tem resultado... o usuario cai em 'Nenhum resultado foi encontrado' com
  // frequencia. Um dev deveria considerar default = ultimos 7 dias." Aqui e o padrao.
  const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const [gradeFrom, setGradeFrom] = useState(diasAtras(7));
  const [gradeTo, setGradeTo] = useState(hojeStr());
  const [gradeStatus, setGradeStatus] = useState('');
  const [gradeUser, setGradeUser] = useState('');
  const [gradeNumero, setGradeNumero] = useState('');
  const [operadores, setOperadores] = useState<{ id: string; name: string }[]>([]);
  const [gradeRows, setGradeRows] = useState<any[]>([]);
  const [gradeLoading, setGradeLoading] = useState(false);
  const fetchGrade = async () => {
    setGradeLoading(true);
    try {
      const p = new URLSearchParams();
      if (gradeFrom) p.set('from', gradeFrom); if (gradeTo) p.set('to', gradeTo); if (gradeStatus) p.set('status', gradeStatus);
      if (gradeUser) p.set('userId', gradeUser);
      // O numero ignora o periodo de proposito (quem procura o caixa 12 sabe qual quer).
      // A tela diz isso em vez de mudar o filtro sozinha, que foi o que a incomodou no outro.
      if (gradeNumero.trim()) p.set('numero', gradeNumero.trim());
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
  useEffect(() => {
    if (!gradeOpen || operadores.length) return;
    fetch('/api/caixa/operadores', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setOperadores(Array.isArray(d) ? d : []))
      .catch(() => setOperadores([]));
  }, [gradeOpen, operadores.length]);

  // A TRILHA DO CAIXA. O interceptor de auditoria ja gravava toda escrita (quem, quando, qual
  // rota) e nunca mostramos: o registro existia e nao servia a ninguem. A Cintia viu o Log do
  // SimplesVet e quis o mesmo. Filtra por entityId, que e o :id da rota = o proprio caixa.
  const [logOpen, setLogOpen] = useState(false);
  const [logRows, setLogRows] = useState<any[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  useEffect(() => {
    if (!logOpen || !detail?.id) return;
    setLogLoading(true);
    fetch(`/api/audit-logs?entityId=${encodeURIComponent(detail.id)}&limit=200`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { logs: [] }))
      .then((d) => setLogRows(Array.isArray(d?.logs) ? d.logs : []))
      .catch(() => setLogRows([]))
      .finally(() => setLogLoading(false));
  }, [logOpen, detail?.id]);

  // A ABERTURA nao tem entityId no log (a rota e POST /caixa, sem :id), entao ela viria a
  // faltar justamente no comeco da trilha. Ela esta no proprio caixa — e verdade registrada,
  // nao invencao: aquele caixa foi aberto naquela hora por aquela pessoa.
  const trilha = useMemo(() => trilhaDoCaixa([
    ...(detail?.abertura ? [{ id: `abertura-${detail.id}`, createdAt: detail.abertura, userName: detail.user?.name || null, method: 'POST', path: '/api/caixa', statusCode: 201 }] : []),
    ...logRows,
  ]), [logRows, detail]);

  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);

  // money(): respeita o botao de esconder valores
  const money = (v: number) => (ocultar ? 'R$ ••••••' : brl(v));

  const [abrirOpen, setAbrirOpen] = useState(false);
  const [abrirForm, setAbrirForm] = useState({ suprimento: '', observacao: '', abertura: '' });
  const [receberOpen, setReceberOpen] = useState(false);
  const [vendaSel, setVendaSel] = useState<Appointment | null>(null);
  const [formas, setFormas] = useState<Forma[]>([{ forma: 'Dinheiro', valor: 0, parcelas: 1, nsu: '' }]);
  const [desconto, setDesconto] = useState(0);
  const [obsReceb, setObsReceb] = useState('');
  const [tutorSaldo, setTutorSaldo] = useState<number | null>(null);
  const [tutorAReceber, setTutorAReceber] = useState<number | null>(null); // total a receber do cliente (todas as vendas)
  // O FORMULARIO do movimento virou componente (components/caixa/MovimentoCaixaModal) — o mesmo
  // que o ponto de venda usa desde 07/09/2026. Aqui fica so qual tipo esta aberto.
  const [movOpen, setMovOpen] = useState(false);
  const [movTipo, setMovTipo] = useState<TipoMovimento>('SUPRIMENTO');
  const [categoriasDespesa, setCategoriasDespesa] = useState<any[]>([]); // categorias de DESPESA (DRE)
  const [contasFin, setContasFin] = useState<any[]>([]); // contas reais (id+nome) p/ transferência
  const [credOpen, setCredOpen] = useState(false);
  const [credForm, setCredForm] = useState({ appointmentId: '', tipo: 'RECARGA', valor: '', descricao: '', forma: 'Dinheiro' });
  const [prevCred, setPrevCred] = useState<{ totalCentavos: number; porData: { data: string; liquidoCentavos: number }[] } | null>(null); // item 10 — previsão de crédito das maquininhas (D+1)
  const [fecharOpen, setFecharOpen] = useState(false);
  const [fecharForm, setFecharForm] = useState({ valorContado: '', observacao: '' });
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
      // Abre no caixa de QUEM ESTÁ LOGADA (são dois caixas abertos, um por funcionária).
      // Antes abria sempre no primeiro do dia — a pessoa via o caixa da colega e achava que
      // os lançamentos dela tinham sumido.
      if (data && data.length) {
        const manteve = escolhaManual.current ? data.find((c) => c.id === selectedId) : null;
        setSelectedId(manteve ? manteve.id : idDoMeuCaixa(data as any, meId));
      }
      else { setSelectedId(null); setDetail(null); }
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar caixas'); } finally { setLoading(false); }
  }, [date, selectedId, meId]);

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
  // A sessão carrega DEPOIS da tela: quando ela chega, reabre no caixa de quem está logada
  // (a não ser que a pessoa já tenha escolhido outro no seletor).
  useEffect(() => { if (meId && !escolhaManual.current) fetchCaixas(); }, [meId]); // eslint-disable-line
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId, fetchDetail]);
  useEffect(() => { fetch('/api/caixa/previsao-credito', { cache: 'no-store' }).then((r) => r.json()).then(setPrevCred).catch(() => setPrevCred(null)); }, [date]);
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
        const cats = await fetch('/api/financeiro/categorias', { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        const arr = Array.isArray(cats) ? cats : (cats.itens || cats.data || []);
        setCategoriasDespesa(arr.filter((c: any) => String(c?.tipo || '') === 'DESPESA').sort((a: any, b: any) => (a.nome || '').localeCompare(b.nome || '')));
      } catch { /* sem categorias */ }
    })();
  }, []);

  const mudarDia = (delta: number) => { const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() + delta); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); };
  const tutorIdDe = (a?: Appointment | null) => a?.tutorId || a?.tutor?.id || null;

  // A CONTA DO RESUMO MORA NO NUCLEO (lib/resumoDoCaixa, com teste). Ela estava aqui e estava
  // errada: somava Vendas + Suprimentos e chamava de "Resultado", enquanto sangria, despesa e
  // transferencia ficavam escondidas na aba de Movimentacoes. O resumo anunciava mais dinheiro
  // do que havia na gaveta - e quem confere o caixa le o resumo.
  const resumo = useMemo(() => montarResumoDoCaixa(detail as any), [detail]);

  // A LISTA DE RECEBIMENTOS AGRUPADA POR VENDA, EM ORDEM CRONOLOGICA (lib/recebimentosDoCaixa,
  // com teste). Conferencia de caixa se faz pela hora em que o dinheiro entrou; agrupar por
  // venda e o que deixa a conta legivel. O SimplesVet ordena pelo numero da venda e a Cintia
  // apontou o problema: "para conferencia de caixa, que e cronologica por natureza, atrapalha".
  const recebPorVenda = useMemo(() => agruparRecebimentos((detail?.recebimentos || []) as any), [detail]);

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

  // A MENSAGEM DO SERVIDOR CHEGA INTEIRA. Até 08/09/2026 esta tela trocava tudo por "Erro ao
  // abrir caixa" / "Erro ao encerrar caixa" — e junto ia embora a única explicação que existia
  // ("só a recepção e o administrativo abrem caixa", "o caixa nº 7 é da Gabriela"). A pessoa
  // ficava sem saber o que fazer, e eu ficava sem saber o que tinha acontecido.
  const erroDoServidor = async (r: Response, padrao: string) => {
    const e = await r.json().catch(() => ({} as any));
    return new Error(e?.message || padrao);
  };

  const abrirCaixa = async () => {
    try {
      const r = await fetch('/api/caixa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suprimento: Number(String(abrirForm.suprimento).replace(',', '.')) || 0, observacao: abrirForm.observacao || null, abertura: abrirForm.abertura || undefined }) });
      if (!r.ok) throw await erroDoServidor(r, 'Erro ao abrir caixa');
      // `jaEstavaAberto`: a pessoa já tinha um caixa e o servidor devolveu esse mesmo, em vez de
      // criar um segundo. (Em 05/09 a Victoria abriu três no mesmo dia sem perceber.)
      const c = await r.json().catch(() => ({} as any));
      toast.success(c?.jaEstavaAberto ? `Você já tinha o caixa nº ${c.numero} aberto.`
        : abrirForm.abertura ? `Caixa aberto para ${abrirForm.abertura.split('-').reverse().join('/')}!` : 'Caixa aberto!'); setAbrirOpen(false); setAbrirForm({ suprimento: '', observacao: '', abertura: '' }); await fetchCaixas();
    } catch (e: any) { toast.error(e.message || 'Erro ao abrir caixa'); }
  };
  const abrirFechar = () => { setFecharForm({ valorContado: '', observacao: '' }); setFecharOpen(true); };
  const fecharCaixa = async () => {
    if (!detail) return;
    const valorContado = fecharForm.valorContado === '' ? null : Number(String(fecharForm.valorContado).replace(',', '.'));
    try {
      const r = await fetch(`/api/caixa/${detail.id}/fechar`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ valorEsperado: Number(saldoDinheiro.toFixed(2)), valorContado, observacao: fecharForm.observacao || null }) });
      if (!r.ok) throw await erroDoServidor(r, 'Erro ao encerrar caixa');
      toast.success('Caixa encerrado!'); setFecharOpen(false); await fetchCaixas(); await fetchDetail(detail.id);
    } catch (e: any) { toast.error(e.message || 'Erro ao encerrar caixa'); }
  };
  const reabrirCaixa = async () => {
    if (!detail) return; if (!confirm(`Reabrir o Caixa nº ${detail.numero}?`)) return;
    try { const r = await fetch(`/api/caixa/${detail.id}/reabrir`, { method: 'PATCH' }); if (!r.ok) throw await erroDoServidor(r, 'Erro ao reabrir caixa'); toast.success('Caixa reaberto!'); await fetchCaixas(); await fetchDetail(detail.id); }
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
    // Cartão exige operadora + NSU + AUT: é o que casa a venda com a linha do extrato.
    const faltaCartao = validarPagamentosCartao(formas.filter((f) => Number(f.valor) > 0), formasConfig);
    if (faltaCartao) { toast.error(faltaCartao); return; }
    if (creditoExcede) { toast.error('Crédito do cliente insuficiente'); return; }
    try {
      const r = await fetch(`/api/caixa/${detail.id}/recebimento`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: vendaSel.id, valorTotal: valorAplicado, desconto, troco, formas, observacao: obsReceb || null }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao registrar recebimento'); }
      toast.success('Recebimento registrado!'); setReceberOpen(false); await fetchDetail(detail.id); await fetchAppointments();
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar recebimento'); }
  };
  const abrirMov = (tipo: TipoMovimento) => { setMovTipo(tipo); setMovOpen(true); };
  const abrirCredito = () => { setCredForm({ appointmentId: appointments[0]?.id || '', tipo: 'RECARGA', valor: '', descricao: '', forma: 'Dinheiro' }); setCredOpen(true); };
  const adicionarCredito = async () => {
    if (!detail) return; const valor = Number(String(credForm.valor).replace(',', '.')) || 0;
    if (!credForm.appointmentId) { toast.error('Selecione o cliente'); return; } if (valor <= 0) { toast.error('Informe o valor'); return; }
    try {
      const r = await fetch('/api/credito', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appointmentId: credForm.appointmentId, tipo: credForm.tipo, valor, descricao: credForm.descricao || null, caixaSessaoId: detail.id, forma: credForm.forma || 'Dinheiro' }) });
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
                  <label style={{ fontSize: 11, color: '#5C6B70' }}>Operador<br />
                    <select value={gradeUser} onChange={(e) => setGradeUser(e.target.value)} style={{ border: '1px solid #E8E2D6', borderRadius: 8, padding: '7px 9px', fontSize: 13, minWidth: 160 }}>
                      <option value="">Todos</option>
                      {operadores.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  </label>
                  <label style={{ fontSize: 11, color: '#5C6B70' }}>Nº do caixa<br /><input value={gradeNumero} onChange={(e) => setGradeNumero(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchGrade(); }} inputMode="numeric" placeholder="ex: 12" style={{ border: '1px solid #E8E2D6', borderRadius: 8, padding: '7px 9px', fontSize: 13, width: 92 }} /></label>
                  <button onClick={fetchGrade} style={{ background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>🔍 Filtrar</button>
                </div>
                {gradeNumero.trim() && (
                  <div style={{ fontSize: 11.5, color: '#8A5B00', background: '#FBF1E2', border: '1px solid #F0DCB8', borderRadius: 9, padding: '7px 11px', marginBottom: 10 }}>
                    Buscando o caixa nº {gradeNumero.trim()} em <b>qualquer data</b> — o período acima fica de fora enquanto houver número.
                  </div>
                )}
                <div style={{ border: '1px solid #E8E2D6', borderRadius: 10, overflow: 'hidden', maxHeight: '55vh', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#FBF9F4' }}>{['Nº', 'Usuário', 'Abertura', 'Fechamento', 'Status', 'Conferência', 'Diferença'].map((h, i) => <th key={h} style={{ padding: '9px 11px', fontSize: 10.5, color: '#5C6B70', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.4px', textAlign: i === 6 ? 'right' : 'left' }}>{h}</th>)}</tr></thead>
                    <tbody>
                      {gradeLoading ? <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#5C6B70' }}>Carregando…</td></tr>
                        : gradeRows.length === 0 ? <tr><td colSpan={7} style={{ padding: 20, textAlign: 'center', color: '#5C6B70' }}>Nenhum caixa no filtro.</td></tr>
                        : gradeRows.map((c) => { const u = STATUS_UI(c.status); return (
                          <tr key={c.id} style={{ borderTop: '1px solid #F0EBE0', cursor: 'pointer' }} onClick={() => { const d = new Date(c.abertura); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`); setSelectedId(c.id); setGradeOpen(false); }}>
                            <td style={{ padding: '9px 11px', color: '#014D5E', fontWeight: 500 }}>nº {c.numero}</td>
                            <td style={{ padding: '9px 11px', color: '#374151' }}>{c.user?.name || '—'}</td>
                            <td style={{ padding: '9px 11px', color: '#5C6B70' }}>{c.abertura ? new Date(c.abertura).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td style={{ padding: '9px 11px', color: '#5C6B70' }}>{c.fechamento ? new Date(c.fechamento).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                            <td style={{ padding: '9px 11px' }}><span style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: u.bg, color: u.fg }}>{u.label}</span></td>
                            {/* CONFERIDO x ENCERRADO SOZINHO (lib/fechamentoDoCaixa). Sem esta
                                coluna, os dois aparecem como "Fechado" e a diferença some do
                                histórico. */}
                            <td style={{ padding: '9px 11px' }}>{(() => {
                              const sel = seloDoFechamento(c); if (!sel) return <span style={{ color: '#8A9499', fontSize: 11.5 }}>—</span>;
                              const cor = coresDoSelo(sel.chave);
                              return <span title={sel.detalhe} style={{ fontSize: 10.5, fontWeight: 600, padding: '2px 9px', borderRadius: 20, background: cor.bg, color: cor.fg, whiteSpace: 'nowrap' }}>{sel.texto}</span>;
                            })()}</td>
                            <td style={{ padding: '9px 11px', textAlign: 'right', color: c.diferenca != null && c.diferenca < 0 ? '#C0392B' : '#5C6B70' }}>{c.diferenca != null ? (ocultar ? '•••' : c.diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })) : '—'}</td>
                          </tr>
                        ); })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 11, color: '#8A938F', margin: 0 }}>Clique numa linha pra abrir aquele caixa.</p>
                  <button onClick={() => imprimirResumoDeCaixas(gradeRows as any, gradeNumero.trim() ? `caixa nº ${gradeNumero.trim()}` : `${gradeFrom.split('-').reverse().join('/')} a ${gradeTo.split('-').reverse().join('/')}`)} disabled={!gradeRows.length} style={{ background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, borderRadius: 9, padding: '7px 14px', fontSize: 12.5, fontWeight: 500, cursor: gradeRows.length ? 'pointer' : 'default', opacity: gradeRows.length ? 1 : .5 }}>🖨 Imprimir este resumo</button>
                </div>
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
                  {detail.fechamento && <div><span style={{ color: '#014D5E', fontWeight: 500 }}>Fechamento:</span> {dataHora(detail.fechamento)}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span style={{ color: '#014D5E', fontWeight: 500 }}>Status:</span>
                    {(() => { const u = STATUS_UI(detail.status); return <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: u.bg, color: u.fg }}>{u.label}</span>; })()}
                    {(() => {
                      const sel = seloDoFechamento(detail as any); if (!sel) return null;
                      const cor = coresDoSelo(sel.chave);
                      return <span title={sel.detalhe} style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: cor.bg, color: cor.fg }}>{sel.texto}</span>;
                    })()}
                    {podeEditar && detail.status !== 'ABERTO' && detail.status !== 'ENCERRADO' && <button onClick={() => mudarStatus('ENCERRADO')} style={miniBtn} title="Encerrar definitivamente">🔒 Encerrar</button>}
                    {podeEditar && detail.status !== 'ABERTO' && detail.status !== 'EM_REVISAO' && <button onClick={() => mudarStatus('EM_REVISAO')} style={miniBtn} title="Marcar em revisão">🔎 Em revisão</button>}
                  </div>
                </div>
                {caixas.length > 1 && (
                  <div className="no-print" style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {caixas.map((c) => (
                      <button key={c.id} title={`${c.user?.name || 'sem operador'} · ${c.status === 'ABERTO' ? 'aberto' : 'fechado'}`} onClick={() => { escolhaManual.current = true; setSelectedId(c.id); }} style={{ flex: 1, fontSize: 11.5, padding: '6px 8px', borderRadius: 8, cursor: 'pointer', border: c.id === selectedId ? `1.5px solid ${TEAL}` : '1px solid #E8E2D6', background: c.id === selectedId ? '#e8f7f9' : '#fff', color: c.id === selectedId ? '#014D5E' : '#5C6B70' }}>nº {c.numero}{c.user?.name ? ` · ${c.user.name.split(' ')[0]}` : ''}</button>
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
                  <button onClick={abrirCredito} disabled={!aberto} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL, border: `1px solid ${TEAL}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: aberto ? 1 : .4 }}><LuGift size={14} /> Crédito do pet</button>
                  <button onClick={() => setLogOpen(true)} style={{ gridColumn: '1 / -1', background: '#fff', color: '#5C6B70', border: '1px solid #E8E2D6', fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>🔎 Quem mexeu neste caixa</button>
                  <button onClick={() => imprimirCaixaDetalhado(detail as any)} style={{ gridColumn: '1 / -1', background: '#fff', color: TEAL_DARK, border: `1px solid ${TEAL_DARK}`, fontSize: 12, fontWeight: 500, padding: '8px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><LuPrinter size={14} /> Imprimir movimento do caixa</button>
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
                {tabBtn('resumo', 'Resumo')}{tabBtn('receb', 'Recebimentos')}{tabBtn('mov', 'Movimentações')}{tabBtn('cred', 'Créditos')}
              </div>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderTop: 'none', borderRadius: '0 0 11px 11px', padding: 18 }}>

                {tab === 'resumo' && (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 600, margin: '0 0 10px' }}>Valores recebidos no caixa</div>
                    {/* COLUNAS FIXAS, sempre as mesmas. A Cintia, lendo o SimplesVet: a tabela
                        deles muda de largura conforme o caixa e isso "quebra comparacao visual
                        entre dois caixas". O papel deles acerta; a tela, nao. Aqui vale o papel. */}
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 660 }}>
                        <thead><tr>
                          <th style={thStyle}>Forma de recebimento</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Vendas</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Suprimentos</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Sangrias</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Despesas</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Transferências</th>
                          <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
                        </tr></thead>
                        <tbody>
                          {resumo.linhas.length === 0 && (<tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: '#374151', padding: 16 }}>Nenhum valor recebido ainda.</td></tr>)}
                          {resumo.linhas.map((l) => {
                            // Saida aparece com o sinal na frente: sem isso "300,00" na coluna
                            // Sangria parece dinheiro que entrou.
                            const saida = (v: number) => (v ? <span style={{ color: ORANGE }}>− {money(v)}</span> : '—');
                            return (
                              <tr key={l.forma}>
                                <td style={{ ...tdStyle, color: '#014D5E' }}>{l.forma}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{l.vendas ? money(l.vendas) : '—'}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{l.suprimentos ? money(l.suprimentos) : '—'}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{saida(l.sangrias)}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{saida(l.despesas)}</td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>{saida(l.transferencias)}</td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 500 }}>{money(l.total)}</td>
                              </tr>
                            );
                          })}
                          {resumo.linhas.length > 0 && (
                            <tr style={{ borderTop: '1px solid #E8E2D6' }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>Total</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{money(resumo.total.vendas)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{money(resumo.total.suprimentos)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: resumo.total.sangrias ? ORANGE : undefined }}>{resumo.total.sangrias ? `− ${money(resumo.total.sangrias)}` : money(0)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: resumo.total.despesas ? ORANGE : undefined }}>{resumo.total.despesas ? `− ${money(resumo.total.despesas)}` : money(0)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, color: resumo.total.transferencias ? ORANGE : undefined }}>{resumo.total.transferencias ? `− ${money(resumo.total.transferencias)}` : money(0)}</td>
                              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 700, color: TEAL_DARK }}>{money(resumo.total.total)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* TIPO DE MOVIMENTO QUE O NUCLEO NAO CONHECE. Sai do total (o seguro) e
                        e denunciado - dinheiro nao some calado de uma tela de caixa. */}
                    {resumo.tiposDesconhecidos.length > 0 && (
                      <div style={{ marginTop: 10, fontSize: 12.5, background: '#FBF1E2', border: '1px solid #F0DCB8', color: '#8A5B00', borderRadius: 10, padding: '9px 12px' }}>
                        ⚠️ Há movimento de tipo <b>{resumo.tiposDesconhecidos.join(', ')}</b> neste caixa. Está descontado do total, mas não tem coluna própria — me avise para eu dar um lugar a ele.
                      </div>
                    )}

                    {/* O QUE NAO E DINHEIRO DA GAVETA - mas precisa estar escrito.
                        A Cintia, sobre o SimplesVet: "um caixa pode exibir 'Caixa sem movimento'
                        e ainda assim ter tido quase mil reais de servico prestado". Nos tinhamos
                        o mesmo buraco. Somar seria contar duas vezes; omitir foi o erro dela. */}
                    {(resumo.usoDeCredito > 0.005 || resumo.adiantamentos > 0.005) && (
                      <div style={{ marginTop: 14, border: '1px solid #E8E2D6', borderRadius: 12, overflow: 'hidden' }}>
                        <div style={{ background: '#FAF7F1', padding: '8px 13px', fontSize: 11.5, color: '#5C6B70', textTransform: 'uppercase', letterSpacing: '.4px' }}>Fora do total do caixa</div>
                        {resumo.usoDeCredito > 0.005 && (
                          <div style={{ padding: '11px 13px', borderTop: '1px solid #F0EBE0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <b style={{ fontSize: 13, color: '#1F2A2E' }}>Serviço pago com crédito do cliente</b>
                              <b style={{ fontSize: 13.5, color: TEAL_DARK }}>{money(resumo.usoDeCredito)}</b>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#5C6B70', marginTop: 3 }}>{avisoDoUsoDeCredito(resumo.usoDeCredito)}</div>
                          </div>
                        )}
                        {resumo.adiantamentos > 0.005 && (
                          <div style={{ padding: '11px 13px', borderTop: '1px solid #F0EBE0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                              <b style={{ fontSize: 13, color: '#1F2A2E' }}>Crédito comprado pelo cliente hoje</b>
                              <b style={{ fontSize: 13.5, color: '#1F2A2E' }}>{money(resumo.adiantamentos)}</b>
                            </div>
                            <div style={{ fontSize: 11.5, color: '#5C6B70', marginTop: 3 }}>{avisoDoAdiantamento(resumo.adiantamentos)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {tab === 'receb' && (
                  <>
                    {aberto && (
                      <div className="no-print" style={{ marginBottom: 12, fontSize: 12.5, color: '#5C6B70', background: '#EAF6F7', border: '1px solid #CFE7EA', borderRadius: 10, padding: '10px 13px' }}>
                        💡 Recebimentos são registrados no <b style={{ color: '#014D5E' }}>Ponto de venda</b>. Aqui você <b>acompanha e confere</b> os recebimentos do dia para o fechamento.
                      </div>
                    )}
                    {prevCred && prevCred.totalCentavos > 0 && (
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
                    {recebPorVenda.grupos.length === 0 && (
                      <div style={{ textAlign: 'center', color: '#374151', padding: 20, fontSize: 13 }}>Nenhum recebimento registrado.</div>
                    )}

                    {recebPorVenda.grupos.map((g) => {
                      const st = statusVenda(g.valorDaVenda, g.appointmentId ? (pagoPorAppt.get(g.appointmentId) || 0) : g.recebido);
                      return (
                        <div key={g.chave} style={{ border: '1px solid #E8E2D6', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
                          {/* CABECALHO DA VENDA. Cliente e venda sao LINK: a Cintia chamou de
                              "desperdicio obvio de UX" o SimplesVet mostrar os dois como texto morto. */}
                          <div style={{ background: '#FAF7F1', padding: '9px 13px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, minWidth: 0 }}>
                              {g.numeroVenda ? (
                                <Link href={`/dashboard/erp/consulta-vendas?venda=${g.numeroVenda}`} style={{ fontSize: 13, fontWeight: 600, color: '#014D5E', textDecoration: 'none' }}>Venda {rotuloDaVenda(g)}</Link>
                              ) : (
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#014D5E' }}>Venda {rotuloDaVenda(g)}</span>
                              )}
                              <span style={{ fontSize: 12, color: '#5C6B70' }}>baixa às {hora(g.primeiraBaixa)}</span>
                              {g.tutorId ? (
                                <Link href={`/dashboard/erp/tutores/${g.tutorId}`} style={{ fontSize: 12.5, color: '#1F2A2E', textDecoration: 'none', borderBottom: '1px dotted #B9C4C7' }}>{g.tutorNome}</Link>
                              ) : (
                                <span style={{ fontSize: 12.5, color: '#1F2A2E' }}>{g.tutorNome}</span>
                              )}
                              {g.petNome && <span style={{ fontSize: 12.5, color: '#5C6B70' }}>· {g.petNome}</span>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span>
                              <b style={{ fontSize: 13.5, color: '#1F2A2E' }}>{money(g.recebido)}</b>
                            </div>
                          </div>

                          {/* AS FORMAS, uma por linha, com a condicao. O papel do SimplesVet perde
                              o parcelamento; sem ele nao da pra conferir maquininha. */}
                          {g.linhas.map((l, i) => (
                            <div key={`${l.recebimentoId}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 13px', borderTop: '1px solid #F0EBE0' }}>
                              <span style={{ fontSize: 12.5, color: '#374151', flex: 1, minWidth: 0 }}>
                                {l.forma} <i style={{ color: '#8A9499', fontSize: 11.5 }}>({l.condicao})</i>
                              </span>
                              <span style={{ fontSize: 12.5, color: '#5C6B70' }}>{hora(l.data)}</span>
                              <b style={{ fontSize: 13, minWidth: 92, textAlign: 'right' }}>{money(l.valor)}</b>
                              {aberto && (
                                <span className="no-print" style={{ width: 26, textAlign: 'right' }}>
                                  {l.primeiraDaBaixa ? delBtn(() => delRec(l.recebimentoId)) : null}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {/* O TOTAL DA ABA. "Nao ha total da aba - para conferir o caixa a pessoa
                        precisa ir na aba Resumo. Essa ausencia e uma lacuna real" (Cintia). */}
                    {recebPorVenda.grupos.length > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '2px solid #E8E2D6', paddingTop: 11, marginTop: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2A2E' }}>Total recebido neste caixa</span>
                        <b style={{ fontSize: 16, color: TEAL_DARK }}>{money(recebPorVenda.total)}</b>
                      </div>
                    )}
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
      {/* A GAVETA DA TRILHA. Conferencia de caixa e uma pergunta sobre PESSOAS: quem lancou,
          quem excluiu, quem reabriu. Sem isso, a diferenca da gaveta nao tem a quem perguntar. */}
      {logOpen && (
        <div className="no-print" onClick={() => setLogOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', zIndex: 80, display: 'flex', justifyContent: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', background: '#fff', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 18px', borderBottom: '1px solid #F0EBE0', position: 'sticky', top: 0, background: '#fff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 600, color: '#1F2A2E' }}>Quem mexeu neste caixa</h3>
                <div style={{ fontSize: 11.5, color: '#8A9499' }}>Caixa nº {detail?.numero} · {detail?.user?.name || '—'}</div>
              </div>
              <button onClick={() => setLogOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 17, color: '#374151' }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 16 }}>
              {logLoading && <div style={{ fontSize: 13, color: '#5C6B70' }}>Carregando…</div>}
              {!logLoading && trilha.length === 0 && <div style={{ fontSize: 13, color: '#5C6B70' }}>Nada registrado para este caixa.</div>}
              {trilha.map((e) => (
                <div key={e.id} style={{ borderLeft: `3px solid ${e.falhou ? '#C0392B' : e.desfeito ? ORANGE : '#CFE7EA'}`, paddingLeft: 11, marginBottom: 13 }}>
                  <div style={{ fontSize: 10.5, color: '#8A9499', textTransform: 'uppercase', letterSpacing: '.4px' }}>{e.trilha}</div>
                  <div style={{ fontSize: 13, color: '#1F2A2E', margin: '2px 0' }}>{e.texto}</div>
                  <div style={{ fontSize: 11.5, color: '#5C6B70' }}>
                    {e.quando} · {e.quem}{e.falhou ? ' · a tentativa foi recusada' : ''}
                  </div>
                </div>
              ))}
              {/* O que ainda NAO da pra ver aqui, dito na cara: o log guarda quem/quando/qual
                  acao, mas nao O QUE mudou (qual venda, qual valor). Guardar o corpo da
                  requisicao resolveria — e traria junto senha de liberacao de desconto para
                  dentro do log. Fica para quando houver uma lista do que pode ser guardado. */}
              {trilha.length > 0 && (
                <div style={{ fontSize: 11, color: '#8A9499', borderTop: '1px solid #F0EBE0', paddingTop: 10 }}>
                  A trilha mostra quem fez e quando. O valor de cada lançamento está nas abas do caixa.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {abrirOpen && (
        <Modal title="Abrir caixa" onClose={() => setAbrirOpen(false)} onConfirm={abrirCaixa} confirmLabel="Abrir caixa">
          <Field label="Data do caixa (deixe vazio = hoje; escolha um dia passado p/ lançar retroativo)"><input type="date" value={abrirForm.abertura} max={hojeStr()} onChange={(e) => setAbrirForm({ ...abrirForm, abertura: e.target.value })} style={inp} /></Field>
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

      {movOpen && detail && (
        <MovimentoCaixaModal caixaId={detail.id} tipo={movTipo} onClose={() => setMovOpen(false)} onFeito={() => fetchDetail(detail.id)} />
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
          {credForm.tipo === 'RECARGA' && (
            <Field label="Forma (entra no caixa)"><select value={credForm.forma} onChange={(e) => setCredForm({ ...credForm, forma: e.target.value })} style={inp}>{formasList.map((f) => <option key={f} value={f}>{f}</option>)}</select></Field>
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

function Modal({ title, children, onClose, onConfirm, confirmLabel, confirmDisabled, dark, slide }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string; confirmDisabled?: boolean; dark?: boolean; slide?: boolean }) {
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
          <button onClick={onConfirm} disabled={confirmDisabled} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', background: dark ? TEAL_DARK : TEAL, opacity: confirmDisabled ? .4 : 1 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// redeploy 1782313464
