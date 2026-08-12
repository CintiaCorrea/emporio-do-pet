// DESTINO: vet-crm/app/(user)/dashboard/erp/ponto-de-venda/page.tsx
'use client';
// [EMP-COWORK] Ponto de venda repaginado no padrão Base44 (header leve, emojis, bege, sem barras sólidas). Lógica preservada.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { useRolePreview } from '@/lib/ui/RolePreview';
import BuscaClientePet, { SelecaoClientePet } from '@/components/common/BuscaClientePet';
import { carregarCatalogoVendavel, linhaDoItem, labDoItem } from '@/lib/catalogoVendavel';
import { ehDinheiro, carregarFormasRecebimento, PagForma } from '@/lib/formasPagamento';
import PagamentoFormas from '@/components/financeiro/PagamentoFormas';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const INK = '#1F2A2E';
const INK2 = '#5C6B70';
const MUT = '#374151';
const LINE = '#E8E2D6';
const SOFT = '#F0EBE0';
const AGUA = '#E0F4F6';
const SUAVE = '#FBF9F4';
const OK = '#0F6E56'; const OKB = '#E1F5EE';
const WARN = '#8a6400'; const WARNB = '#FBF3E3';
const ERR = '#b23b39'; const ERRB = '#FDECEC';

const AV = [
  { bg: '#E6F1FB', fg: '#185fa5' }, { bg: '#FBEAF0', fg: '#993556' },
  { bg: '#EEF6E2', fg: '#639922' }, { bg: '#FAEEDA', fg: '#854f0b' },
  { bg: '#EEEDFE', fg: '#534ab7' }, { bg: '#FAECE7', fg: '#993c1d' },
];

interface Pet { id: string; name: string }
interface Tutor { id: string; name: string; pets?: Pet[] }
interface Servico { id: string; nome: string; valorPadrao?: number | null; _exame?: boolean; _fornecedorId?: string | null; _fornecedorNome?: string | null }
interface Prof { id: string; name: string }
interface CartItem { servicoId?: string; descricao: string; quantidade: number; valorUnitario: number; custoUnitario?: number; desconto: number; descTipo?: '$' | '%'; executorUserId?: string; _exame?: boolean; catalogoExameId?: string; fornecedorId?: string | null; fornecedorNome?: string | null }
interface Venda { id: string; tutor: string; pet: string; valor: number; pago: number; status: string; pagoTotal: boolean; date: string; tutorId?: string }

const FORMAS = ['Dinheiro', 'Pix', 'Cartão crédito', 'Cartão débito', 'Crédito do pet'];
const TIPOS_VENDA = ['Presencial, para consumidor final', 'Online / delivery', 'Entrega a domicílio'];
const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const num = (s: any) => Number(String(s ?? '').replace(',', '.')) || 0;
const hoje = () => new Date().toISOString().slice(0, 10);
const iniciais = (n: string) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const avatarOf = (n: string) => AV[(n || '').length % AV.length];
const inp: React.CSSProperties = { padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', background: '#fff', color: INK };
const lbl: React.CSSProperties = { display: 'block', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.3px', color: MUT, marginBottom: 4 };

export default function PDVPage() {
  usePageTitle('Ponto de venda', 'Registrar venda, orçamento e recebimento');

  const { effectiveRole } = useRolePreview();
  const isAdmin = effectiveRole === 'ADMIN';

  const [data, setData] = useState(hoje());
  const [tipo, setTipo] = useState<'VENDA' | 'ORCAMENTO'>('VENDA');
  const [tipoVenda, setTipoVenda] = useState(TIPOS_VENDA[0]);
  const [caixaAberto, setCaixaAberto] = useState<boolean | null>(null);
  const [caixaAbertoId, setCaixaAbertoId] = useState<string | null>(null);

  const [profs, setProfs] = useState<Prof[]>([]);
  const [profId, setProfId] = useState('');

  const [cliBusca, setCliBusca] = useState('');
  const [cliRes, setCliRes] = useState<Tutor[]>([]);
  const [cliAberto, setCliAberto] = useState(false);
  const [cliente, setCliente] = useState<Tutor | null>(null);
  const [petId, setPetId] = useState('');

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [itemBusca, setItemBusca] = useState('');
  const [itemAberto, setItemAberto] = useState(false);
  const [qtd, setQtd] = useState(1);
  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [descontoGlobalTipo, setDescontoGlobalTipo] = useState<'$' | '%'>('$');
  const [obs, setObs] = useState('');

  const [modal, setModal] = useState(false);
  const [formas, setFormas] = useState<PagForma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [formasCfg, setFormasCfg] = useState<string[]>([]); // nomes das formas (Fase 2)
  const [formasConfig, setFormasConfig] = useState<any[]>([]); // config completa (tipo/adquirente/conta)
  const [taxas, setTaxas] = useState<any[]>([]); // tabela de taxas por bandeira (TaxaContratada)
  const [salvando, setSalvando] = useState(false);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [vendaTab, setVendaTab] = useState<'NAO' | 'PAGO'>('NAO');
  // Baixar todas as comandas de um cliente de uma vez (portado do "Em atendimento")
  const [grupoBaixa, setGrupoBaixa] = useState<{ tutor: string; itens: Venda[]; total: number } | null>(null);
  const [formaGrupo, setFormaGrupo] = useState('Dinheiro');
  const [baixandoGrupo, setBaixandoGrupo] = useState(false);
  const buscaTimer = useRef<any>(null);
  const [vendaDia, setVendaDia] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [vendaAbertas, setVendaAbertas] = useState(false); // ver abertas de TODOS os dias
  const [detVenda, setDetVenda] = useState<any>(null);      // venda aberta no modal de detalhe
  const [detLoad, setDetLoad] = useState(false);
  const [detExcluindo, setDetExcluindo] = useState(false);
  const [editItens, setEditItens] = useState<any[] | null>(null); // itens em edição no detalhe (null = modo leitura)
  const [savingEdit, setSavingEdit] = useState(false);
  const [recOpen, setRecOpen] = useState(false);            // modal de recebimento de venda existente
  const [recFormas, setRecFormas] = useState<PagForma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [recSaving, setRecSaving] = useState(false);

  const loadVendas = useCallback(async () => {
    try {
      const qs = vendaAbertas
        ? '?abertas=true'
        : `?from=${vendaDia}&to=${vendaDia}`;
      const r = await fetch(`/api/caixa/vendas${qs}`, { cache: 'no-store' });
      if (r.ok) setVendas(await r.json());
    } catch { /* */ }
  }, [vendaDia, vendaAbertas]);

  // Abre o detalhe de uma venda (itens) num modal.
  async function abrirDetVenda(v: any) {
    setDetVenda({ ...v, itens: null });
    setDetLoad(true);
    try {
      const r = await fetch(`/api/atendimentos/${v.id}`, { cache: 'no-store' });
      const d = await r.json().catch(() => ({}));
      const itens = d.items || d.appointmentItems || d.itens || [];
      setDetVenda((prev: any) => (prev ? { ...prev, itens } : prev));
    } catch { setDetVenda((prev: any) => (prev ? { ...prev, itens: [] } : prev)); }
    setDetLoad(false);
  }
  // ----- Editar itens da venda existente -----
  function abrirEdicaoItens() {
    const its = (detVenda?.itens || []).map((it: any) => ({
      servicoId: it.servicoId ?? undefined,
      productId: it.productId ?? undefined,
      descricao: it.descricao || it.nome || '',
      quantidade: Number(it.quantidade ?? it.qtd ?? 1),
      valorUnitario: Number(it.valorUnitario ?? 0),
      desconto: Number(it.desconto ?? 0),
    }));
    setEditItens(its.length ? its : [{ descricao: '', quantidade: 1, valorUnitario: 0, desconto: 0 }]);
  }
  const editTotal = useMemo(() => (editItens || []).reduce((s, it) => s + Math.max(0, it.quantidade * it.valorUnitario - (it.desconto || 0)), 0), [editItens]);
  async function salvarEdicaoItens() {
    if (!detVenda || !editItens) return;
    const limpos = editItens.filter((it) => (it.descricao || '').trim());
    if (limpos.length === 0) { toast.error('Adicione ao menos um item.'); return; }
    setSavingEdit(true);
    try {
      const items = limpos.map((it) => ({
        servicoId: it.servicoId || undefined, productId: it.productId || undefined,
        descricao: it.descricao, quantidade: Number(it.quantidade) || 1,
        valorUnitario: Number(it.valorUnitario) || 0, desconto: Number(it.desconto) || 0,
        valorTotal: Math.max(0, (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) - (Number(it.desconto) || 0)),
      }));
      const value = items.reduce((s, it) => s + it.valorTotal, 0);
      const r = await fetch(`/api/appointments/${detVenda.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, value }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao salvar'); }
      toast.success('Venda atualizada!');
      setEditItens(null);
      await abrirDetVenda({ ...detVenda, valor: value });
      await loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); } finally { setSavingEdit(false); }
  }

  // ----- Registrar recebimento de venda existente -----
  function abrirRecVenda() {
    if (!caixaAbertoId) { toast.error('Abra o caixa primeiro (Outros caixas › Novo caixa).'); return; }
    const aReceber = Math.max(0, Number(detVenda.valor || 0) - Number(detVenda.pago || 0));
    setRecFormas([{ forma: 'Dinheiro', valor: Number(aReceber.toFixed(2)) }]);
    setRecOpen(true);
  }
  async function confirmarRecVenda() {
    if (!detVenda || !caixaAbertoId) return;
    const formasValidas = recFormas.filter((f) => Number(f.valor) > 0);
    const soma = formasValidas.reduce((s, f) => s + Number(f.valor || 0), 0);
    if (soma <= 0.001) { toast.error('Informe o valor recebido.'); return; }
    const aReceber = Math.max(0, Number(detVenda.valor || 0) - Number(detVenda.pago || 0));
    const temDin = formasValidas.some((f) => ehDinheiro(f.forma));
    const trocoR = temDin && soma > aReceber ? Number((soma - aReceber).toFixed(2)) : 0;
    const valorAplicado = Math.max(0, Number((soma - trocoR).toFixed(2)));
    setRecSaving(true);
    try {
      const r = await fetch(`/api/caixa/${caixaAbertoId}/recebimento`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointmentId: detVenda.id, valorTotal: valorAplicado, troco: trocoR, formas: formasValidas, observacao: 'Recebimento de venda' }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao receber'); }
      toast.success('Recebimento registrado!' + (trocoR ? ` · troco ${brl(trocoR)}` : ''));
      setRecOpen(false);
      const novoPago = Number(detVenda.pago || 0) + valorAplicado;
      await abrirDetVenda({ ...detVenda, pago: novoPago });
      await loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao receber'); } finally { setRecSaving(false); }
  }

  // Exclui a venda (appointment) com confirmação.
  async function excluirVenda() {
    if (!detVenda) return;
    if (!window.confirm(`Excluir a venda de ${detVenda.tutor}${detVenda.pet ? ' · ' + detVenda.pet : ''} (${brl(detVenda.valor)})? Não dá pra desfazer.`)) return;
    setDetExcluindo(true);
    try {
      const r = await fetch(`/api/appointments/${detVenda.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error();
      setDetVenda(null);
      await loadVendas();
    } catch { window.alert('Não consegui excluir. Tente de novo.'); }
    setDetExcluindo(false);
  }

  useEffect(() => {
    (async () => {
      try {
        // FONTE ÚNICA (lib/catalogoVendavel): serviços + produtos + medicamentos/vacinas (todos ativos, sem truncar) + exames.
        const itens = await carregarCatalogoVendavel({ exames: true });
        setServicos(itens as any);
      } catch { /* */ }
      try {
        const r = await fetch('/api/users', { cache: 'no-store' });
        if (r.ok) { const d = await r.json(); const arr = Array.isArray(d) ? d : (d.users || d.data || []); setProfs(arr.map((u: any) => ({ id: u.id, name: u.name || u.nome || u.email }))); }
      } catch { /* */ }
      try {
        const r = await fetch('/api/caixa', { cache: 'no-store' });
        if (r.ok) { const d = await r.json(); const arr = Array.isArray(d) ? d : (d.data || []); const ab = arr.find((c: any) => c.status === 'ABERTO'); setCaixaAberto(!!ab); setCaixaAbertoId(ab?.id || null); }
        else setCaixaAberto(false);
      } catch { setCaixaAberto(false); }
      try {
        // FONTE ÚNICA (lib/formasPagamento): formas de recebimento + tabela de taxas.
        const { formasConfig, formasList, taxas } = await carregarFormasRecebimento();
        setFormasConfig(formasConfig); setFormasCfg(formasList); setTaxas(taxas);
      } catch { /* */ }
    })();
    loadVendas();
  }, [loadVendas]);

  // Fatia B: ?venda=<atendimentoId> — abre direto o detalhe dessa venda pra registrar recebimento.
  useEffect(() => {
    const vid = new URLSearchParams(window.location.search).get('venda');
    if (!vid) return;
    (async () => {
      try {
        const abertas = await fetch(`/api/caixa/vendas?abertas=true`, { cache: 'no-store' }).then((r) => r.json()).catch(() => []);
        let v = (Array.isArray(abertas) ? abertas : []).find((x: any) => x.id === vid);
        if (!v) {
          const a = await fetch(`/api/atendimentos/${vid}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
          if (a?.id) { const pago = (a.recebimentos || []).reduce((s: number, r: any) => s + Number(r.valorTotal || 0), 0); v = { id: a.id, tutor: a.tutor?.name || 'Cliente', pet: a.pet?.name || '', valor: Number(a.value || 0), pago, date: a.date, numeroVenda: a.numeroVenda ?? null }; }
        }
        if (v) abrirDetVenda(v);
      } catch { /* */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pré-seleciona cliente + pet vindos pela URL (ex.: botão Venda do inbox)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const tid = sp.get('tutorId');
    const pid = sp.get('petId');
    if (!tid) return;
    (async () => {
      try {
        const r = await fetch(`/api/tutors/${tid}`, { cache: 'no-store' });
        if (!r.ok) return;
        const t = await r.json();
        setCliente(t as Tutor);
        const pets = (t.pets || []) as { id: string }[];
        setPetId(pid && pets.some((p) => p.id === pid) ? pid : (pets.length === 1 ? pets[0].id : ''));
      } catch { /* */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (buscaTimer.current) clearTimeout(buscaTimer.current);
    if (cliBusca.trim().length < 2) { setCliRes([]); return; }
    buscaTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tutors?search=${encodeURIComponent(cliBusca.trim())}&take=8`, { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        setCliRes(d.tutors || d.data || d || []); setCliAberto(true);
      } catch { /* */ }
    }, 350);
  }, [cliBusca]);

  const selCliente = (t: Tutor) => {
    setCliente(t); setCliAberto(false); setCliBusca('');
    const pets = t.pets || [];
    setPetId(pets.length === 1 ? pets[0].id : '');
  };
  // Busca padrão Cliente+Pet: escolhe os dois de uma vez.
  const selClientePet = (sel: SelecaoClientePet) => {
    setCliente(sel.tutor as Tutor);
    const pets = sel.tutor.pets || [];
    setPetId(sel.pet?.id || (pets.length === 1 ? pets[0].id : ''));
    setCliAberto(false); setCliBusca('');
  };
  const limparCliente = () => { setCliente(null); setPetId(''); setCliBusca(''); };

  const itensFiltrados = useMemo(() => {
    const q = itemBusca.trim().toLowerCase();
    if (!q) return [];
    return servicos.filter((s) => (s.nome || '').toLowerCase().includes(q)).slice(0, 12);
  }, [servicos, itemBusca]);

  const addItem = (s: Servico) => {
    const l = linhaDoItem(s as any);   // núcleo único: exame × produto/serviço, id certo, tira "🔬"
    setCarrinho((c) => {
      const i = l._exame ? c.findIndex((x) => x.catalogoExameId === l.catalogoExameId) : c.findIndex((x) => x.servicoId === l.servicoId);
      if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], quantidade: cp[i].quantidade + qtd }; return cp; }
      const base = { descricao: l.descricao, quantidade: qtd, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, desconto: 0, executorUserId: profId || undefined };
      return [...c, l._exame
        ? { ...base, _exame: true, catalogoExameId: l.catalogoExameId, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome }
        : { ...base, servicoId: l.servicoId }];
    });
    setItemBusca(''); setItemAberto(false); setQtd(1);
  };
  const addAvulso = () => setCarrinho((c) => [...c, { descricao: '', quantidade: 1, valorUnitario: 0, desconto: 0, executorUserId: profId || undefined }]);
  const updItem = (i: number, patch: Partial<CartItem>) => setCarrinho((c) => c.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmItem = (i: number) => setCarrinho((c) => c.filter((_, j) => j !== i));

  // Desconto do item: resolve % → R$ (backend recebe sempre R$)
  const descItemVal = (it: CartItem) => { const bruto = it.quantidade * it.valorUnitario; const d = Number(it.desconto) || 0; return it.descTipo === '%' ? bruto * d / 100 : d; };
  const itemTotal = (it: CartItem) => Math.max(0, it.quantidade * it.valorUnitario - descItemVal(it));
  const subtotal = useMemo(() => carrinho.reduce((s, it) => s + itemTotal(it), 0), [carrinho]);
  // Desconto total: resolve % → R$
  const descGlobalVal = () => descontoGlobalTipo === '%' ? subtotal * num(descontoGlobal) / 100 : num(descontoGlobal);
  const total = useMemo(() => Math.max(0, subtotal - (descontoGlobalTipo === '%' ? subtotal * num(descontoGlobal) / 100 : num(descontoGlobal))), [subtotal, descontoGlobal, descontoGlobalTipo]);

  const somaFormas = useMemo(() => formas.reduce((s, f) => s + Number(f.valor || 0), 0), [formas]);
  const temDinheiro = formas.some((f) => ehDinheiro(f.forma));
  const troco = temDinheiro && somaFormas > total ? somaFormas - total : 0;
  const pago = Math.max(0, somaFormas - troco);
  const restante = Math.max(0, total - pago);

  const pets = cliente?.pets || [];
  const baseValida = !!cliente && !!petId && carrinho.length > 0 && carrinho.every((it) => it.descricao.trim() && it.valorUnitario >= 0);

  const recebidoHoje = useMemo(() => vendas.reduce((s, v) => s + v.pago, 0), [vendas]);
  const aReceberHoje = useMemo(() => vendas.reduce((s, v) => s + Math.max(0, v.valor - v.pago), 0), [vendas]);

  const reset = () => {
    setCliente(null); setPetId(''); setCliBusca(''); setCarrinho([]); setDescontoGlobal(''); setDescontoGlobalTipo('$'); setObs('');
    setFormas([{ forma: 'Dinheiro', valor: 0 }]); setTipo('VENDA'); setQtd(1);
  };

  const payload = (extra: any) => ({
    tutorId: cliente!.id, petId, userId: profId || undefined, date: new Date(data + 'T12:00:00').toISOString(),
    itens: carrinho.map((it) => ({ servicoId: it._exame ? undefined : it.servicoId, productId: it._exame ? undefined : it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: Number(descItemVal(it).toFixed(2)), executorUserId: it.executorUserId || profId || undefined, ...(it._exame ? { tipoItem: 'EXAME', catalogoExameId: it.catalogoExameId, fornecedorId: it.fornecedorId, custoUnitario: it.custoUnitario } : {}) })),
    desconto: Number(descGlobalVal().toFixed(2)), observacao: obs || null, ...extra,
  });

  const enviar = async (body: any, msg: string) => {
    setSalvando(true);
    try {
      const r = await fetch('/api/caixa/pdv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Erro ao salvar');
      toast.success(msg + (d.troco ? ` · troco ${brl(d.troco)}` : ''));
      setModal(false); reset(); loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); } finally { setSalvando(false); }
  };

  const abrirRecebimento = () => { if (!baseValida) return; setFormas([{ forma: 'Dinheiro', valor: Number(total.toFixed(2)) }]); setModal(true); };
  const confirmarRecebimento = () => enviar(payload({ tipo: 'VENDA', formas: formas.filter((f) => Number(f.valor) > 0) }), 'Venda registrada!');
  const salvar = () => { if (tipo === 'ORCAMENTO') return salvarOrcamento(); return enviar(payload({ tipo }), 'Venda salva (a receber)'); };
  // Orçamento vai pro MÓDULO de orçamentos (salvar/aprovar/converter), não pro endpoint de venda.
  const salvarOrcamento = async () => {
    if (!cliente) { toast.error('Escolha o cliente'); return; }
    if (!petId) { toast.error('Escolha o pet do orçamento'); return; }
    setSalvando(true);
    try {
      const body = {
        petId, tutorId: cliente.id, observacao: obs || null,
        itens: carrinho.map((it) => ({ servicoId: it._exame ? undefined : it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: Number(descItemVal(it).toFixed(2)), ...(it._exame ? { tipoItem: 'EXAME', catalogoExameId: it.catalogoExameId, fornecedorId: it.fornecedorId } : {}) })),
      };
      const r = await fetch('/api/orcamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || 'Erro ao salvar orçamento');
      toast.success('Orçamento salvo!'); setModal(false); reset(); loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar orçamento'); } finally { setSalvando(false); }
  };

  // Só venda com valor (> 0) — atendimentos de R$ 0 (agenda/clínico) não são comanda nem venda.
  const vendasFiltradas = vendas.filter((v) => Number(v.valor) > 0 && (vendaTab === 'PAGO' ? v.pagoTotal : !v.pagoTotal));
  const formasList = formasCfg.length ? formasCfg : FORMAS;

  // Clientes com 2+ contas abertas (pra baixar todas de uma vez)
  const gruposMulti = useMemo(() => {
    const map = new Map<string, { tutor: string; itens: Venda[]; total: number }>();
    for (const v of vendas) {
      if (v.pagoTotal) continue;
      const aReceber = Math.max(0, Number(v.valor || 0) - Number(v.pago || 0));
      if (aReceber <= 0) continue;
      const key = v.tutorId || v.tutor || v.id;
      const g = map.get(key) || { tutor: v.tutor || 'Cliente', itens: [], total: 0 };
      g.itens.push(v); g.total += aReceber;
      map.set(key, g);
    }
    return [...map.values()].filter((g) => g.itens.length >= 2).sort((a, b) => b.total - a.total);
  }, [vendas]);

  async function baixarGrupoPDV() {
    if (!grupoBaixa) return;
    if (!caixaAbertoId) { toast.error('Abra o caixa primeiro (Outros caixas › Novo caixa).'); return; }
    setBaixandoGrupo(true);
    let ok = 0;
    try {
      for (const v of grupoBaixa.itens) {
        const aReceber = Math.max(0, Number(v.valor || 0) - Number(v.pago || 0));
        if (aReceber <= 0) continue;
        const r = await fetch(`/api/caixa/${caixaAbertoId}/recebimento`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ appointmentId: v.id, valorTotal: aReceber, formas: [{ forma: formaGrupo, valor: aReceber }], observacao: 'Baixa em lote (cliente)' }),
        });
        if (r.ok) ok++;
      }
      toast.success(`${ok} comanda(s) de ${grupoBaixa.tutor} baixada(s) em ${formaGrupo}.`);
      setGrupoBaixa(null);
      await loadVendas();
    } catch (e: any) { toast.error(e?.message || 'Erro ao baixar'); } finally { setBaixandoGrupo(false); }
  }

  const card: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' };
  const chLeve: React.CSSProperties = { padding: '13px 16px', borderBottom: `1px solid ${SOFT}`, display: 'flex', alignItems: 'center', gap: 9 };
  const step = (emoji: string, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 11px' }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>
      <span style={{ fontSize: 13.5, fontWeight: 500, color: NAVY }}>{label}</span>
    </div>
  );

  return (
    <div style={{ width: '100%', background: '#F6F2EA', minHeight: '100%' }}>
      <div style={{ width: '100%', padding: '18px 24px 60px', boxSizing: 'border-box', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* ===== NOVA VENDA ===== */}
        <div style={{ flex: '1.7 1 480px', minWidth: 0, ...card }}>
          <div style={chLeve}>
            <span style={{ fontSize: 18 }}>🛒</span>
            <div><div style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>Nova venda</div><div style={{ color: MUT, fontSize: 11.5 }}>{new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div></div>
            {caixaAberto !== null && (
              <span style={{ marginLeft: 'auto', background: caixaAberto ? OKB : WARNB, color: caixaAberto ? OK : WARN, fontSize: 11.5, fontWeight: 500, padding: '4px 11px', borderRadius: 999 }}>
                {caixaAberto ? '✅ Caixa aberto' : '⚠️ Caixa fechado'}
              </span>
            )}
          </div>
          <div style={{ padding: 18 }}>

            {/* linha topo */}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={lbl}>📅 Data</label>
                <input type="date" value={data} onChange={(e) => setData(e.target.value)} style={{ ...inp, width: '100%' }} />
              </div>
              <div style={{ minWidth: 160 }}>
                <label style={lbl}>Tipo</label>
                <div style={{ display: 'inline-flex', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                  {(['VENDA', 'ORCAMENTO'] as const).map((t) => (
                    <button key={t} onClick={() => setTipo(t)} style={{ padding: '9px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', background: tipo === t ? TEAL : '#fff', color: tipo === t ? '#fff' : INK2 }}>{t === 'VENDA' ? 'Venda' : 'Orçamento'}</button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <label style={lbl}>Tipo de venda</label>
                <select value={tipoVenda} onChange={(e) => setTipoVenda(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {TIPOS_VENDA.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* 1 cliente */}
            {step('👤', 'Cliente')}
            {!cliente ? (
              <div style={{ marginBottom: 20 }}>
                {/* Busca padrão Cliente+Pet (duas caixinhas que se cruzam) */}
                <BuscaClientePet onSelecionar={selClientePet} autoFocus />
              </div>
            ) : (
              <div style={{ background: AGUA, border: `1px solid ${LINE}`, borderRadius: 12, padding: 13, marginBottom: 20, display: 'flex', gap: 11, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ width: 40, height: 40, borderRadius: '50%', background: '#fff', color: NAVY, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{iniciais(cliente.name)}</span>
                <div style={{ flex: 1, minWidth: 120 }}><div style={{ fontWeight: 500, color: NAVY }}>{cliente.name}</div><div style={{ fontSize: 11.5, color: INK2 }}>{pets.length} pet(s) cadastrado(s)</div></div>
                {pets.length === 0 ? (
                  <span style={{ fontSize: 12.5, color: WARN }}>Sem pets cadastrados</span>
                ) : (
                  <select value={petId} onChange={(e) => setPetId(e.target.value)} style={{ ...inp, minWidth: 150 }}>
                    <option value="">Selecione o pet…</option>
                    {pets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
                <button onClick={limparCliente} style={{ border: `1px solid ${LINE}`, background: '#fff', borderRadius: 9, padding: '8px 11px', cursor: 'pointer', color: INK2, fontSize: 12 }}>↺ trocar</button>
              </div>
            )}

            {/* 2 produtos */}
            {step('🛒', 'Produtos e serviços')}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
              <select value={profId} onChange={(e) => { const novo = e.target.value; setCarrinho((c) => c.map((it) => (!it.executorUserId || it.executorUserId === profId) ? { ...it, executorUserId: novo || undefined } : it)); setProfId(novo); }} style={{ ...inp, minWidth: 150 }} title="Profissional — preenche o vendedor de cada item que você adicionar (trocável por linha)">
                <option value="">Profissional…</option>
                {profs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <div style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${LINE}`, borderRadius: 9, overflow: 'hidden' }}>
                <button onClick={() => setQtd((q) => Math.max(1, q - 1))} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', color: TEAL, fontSize: 15 }}>−</button>
                <span style={{ padding: '8px 12px', borderLeft: `1px solid ${SOFT}`, borderRight: `1px solid ${SOFT}`, minWidth: 18, textAlign: 'center', color: INK }}>{qtd}</span>
                <button onClick={() => setQtd((q) => q + 1)} style={{ padding: '8px 12px', border: 'none', background: '#fff', cursor: 'pointer', color: TEAL, fontSize: 15 }}>+</button>
              </div>
              <div style={{ position: 'relative', flex: 1, minWidth: 150 }}>
                <input value={itemBusca} onChange={(e) => { setItemBusca(e.target.value); setItemAberto(true); }} placeholder="🔍 Produto, serviço ou pacote" style={{ ...inp, width: '100%' }} />
                {itemAberto && itensFiltrados.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20, marginTop: 4, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, boxShadow: '0 8px 24px -6px rgba(0,0,0,.12)', maxHeight: 240, overflowY: 'auto' }}>
                    {itensFiltrados.map((s) => (
                      <button key={s.id} onClick={() => addItem(s)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none', borderBottom: `1px solid ${SOFT}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <span style={{ color: INK, display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
                          {(() => { const lab = labDoItem(s); return lab ? <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: lab.veter ? '#E1F5EE' : '#EEF2F6', color: lab.veter ? '#0F6E56' : '#4D6A8A' }}>{lab.veter ? '⭐ ' : '🏥 '}{lab.nome}</span> : null; })()}
                        </span>
                        <span style={{ color: MUT, flexShrink: 0 }}>{brl(Number(s.valorPadrao || 0))}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* carrinho */}
            <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
              {carrinho.length === 0 && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 26, marginBottom: 4 }}>🛒</div>
                  <p style={{ fontSize: 12.5, color: MUT, margin: 0 }}>Busque acima para adicionar itens.</p>
                </div>
              )}
              {carrinho.map((it, i) => {
                const vendDiff = !!it.executorUserId && it.executorUserId !== profId;
                return (
                <div key={i} style={{ borderBottom: `1px solid ${SOFT}`, padding: '10px 12px', display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: SUAVE, border: `1px solid ${SOFT}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1, fontSize: 15 }}>🏷️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* linha 1: descrição + total + excluir */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input value={it.descricao} onChange={(e) => updItem(i, { descricao: e.target.value })} placeholder="Descrição do item" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                      <span style={{ fontSize: 13, fontWeight: 500, color: NAVY, minWidth: 78, textAlign: 'right' }}>{brl(itemTotal(it))}</span>
                      <button onClick={() => rmItem(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} title="Remover">🗑️</button>
                    </div>
                    {/* linha 2: qtd × unit · desc · vendedor compacto */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
                      <input type="number" min={1} value={it.quantidade} onChange={(e) => updItem(i, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} title="Qtd" style={{ ...inp, width: 46, padding: '5px 6px', textAlign: 'center', fontSize: 12 }} />
                      <span style={{ color: MUT, fontSize: 12 }}>×</span>
                      <input value={it.valorUnitario || ''} inputMode="decimal" placeholder="Unit." onChange={(e) => updItem(i, { valorUnitario: num(e.target.value) })} title="Valor unitário" style={{ ...inp, width: 96, padding: '5px 8px', fontSize: 12 }} />
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <input value={it.desconto || ''} inputMode="decimal" placeholder="Desc." onChange={(e) => updItem(i, { desconto: num(e.target.value) })} title="Desconto" style={{ ...inp, width: 52, padding: '5px 6px', fontSize: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                        <button type="button" onClick={() => updItem(i, { descTipo: it.descTipo === '%' ? '$' : '%' })} title="Alternar R$ / %" style={{ border: `1px solid ${SOFT}`, borderLeft: 'none', background: SUAVE, color: NAVY, fontSize: 11, fontWeight: 600, padding: '5px 6px', cursor: 'pointer', borderTopRightRadius: 7, borderBottomRightRadius: 7 }}>{it.descTipo === '%' ? '%' : 'R$'}</button>
                      </span>
                      <span title="Vendedor deste item" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 4, background: vendDiff ? AGUA : SUAVE, border: `1px solid ${vendDiff ? TEAL : SOFT}`, borderRadius: 999, padding: '2px 4px 2px 9px' }}>
                        <span style={{ fontSize: 11 }}>👤</span>
                        <select value={it.executorUserId || ''} onChange={(e) => updItem(i, { executorUserId: e.target.value || undefined })} style={{ border: 'none', background: 'transparent', padding: '3px 4px', fontSize: 12, color: NAVY, fontWeight: 500, maxWidth: 150, fontFamily: 'inherit', cursor: 'pointer' }}>
                          <option value="">— vendedor —</option>
                          {profs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </span>
                    </div>
                  </div>
                </div>
                );
              })}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
                <button onClick={addAvulso} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>➕ item avulso</button>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: INK2 }}>Desconto</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <input value={descontoGlobal} inputMode="decimal" placeholder="0,00" onChange={(e) => setDescontoGlobal(e.target.value)} style={{ ...inp, width: 76, padding: '6px 8px', textAlign: 'right', borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                    <button type="button" onClick={() => setDescontoGlobalTipo((t) => t === '%' ? '$' : '%')} title="Alternar R$ / %" style={{ border: `1px solid ${SOFT}`, borderLeft: 'none', background: SUAVE, color: NAVY, fontSize: 12, fontWeight: 600, padding: '6px 9px', cursor: 'pointer', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>{descontoGlobalTipo === '%' ? '%' : 'R$'}</button>
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: SUAVE, borderTop: `1px solid ${SOFT}` }}>
                <span style={{ color: INK2, fontSize: 13 }}>Total da venda</span>
                <span style={{ fontSize: 21, fontWeight: 500, color: NAVY }}>{brl(total)}</span>
              </div>
            </div>

            {/* 3 observações */}
            {step('📝', 'Observações')}
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="" style={{ ...inp, width: '100%', resize: 'vertical' }} />
            <p style={{ fontSize: 11, color: MUT, margin: '6px 0 18px' }}>As observações serão impressas no demonstrativo de venda ou orçamento.</p>

            {/* rodapé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${SOFT}`, paddingTop: 16 }}>
              <button onClick={abrirRecebimento} disabled={!baseValida || tipo === 'ORCAMENTO'} style={{ border: 'none', borderRadius: 9, background: (baseValida && tipo === 'VENDA') ? TEAL : '#cfd8d9', color: '#fff', padding: '11px 18px', fontSize: 13.5, fontWeight: 500, cursor: (baseValida && tipo === 'VENDA') ? 'pointer' : 'not-allowed' }}>💰 Registrar recebimento</button>
              <button onClick={salvar} disabled={!baseValida || salvando} style={{ border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', padding: '11px 18px', fontSize: 13.5, cursor: baseValida ? 'pointer' : 'not-allowed', color: INK }}>{tipo === 'ORCAMENTO' ? '💾 Salvar orçamento' : '💾 Salvar'}</button>
              <button onClick={reset} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: MUT, padding: '11px', fontSize: 13, cursor: 'pointer' }}>✕ Cancelar</button>
            </div>
          </div>
        </div>

        {/* ===== COLUNA DIREITA ===== */}
        <div style={{ flex: '1 1 230px', minWidth: 215, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ ...chLeve, justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 13.5, fontWeight: 500 }}>🧾 Vendas</span>
              <button onClick={loadVendas} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 14 }} aria-label="Atualizar">🔄</button>
            </div>
            <div style={{ padding: '2px 13px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <input type="date" value={vendaDia} disabled={vendaAbertas} onChange={(e) => setVendaDia(e.target.value)}
                style={{ padding: '5px 8px', border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 12, color: INK, opacity: vendaAbertas ? 0.5 : 1 }} />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, color: MUT, cursor: 'pointer' }}>
                <input type="checkbox" checked={vendaAbertas} onChange={(e) => setVendaAbertas(e.target.checked)} />
                Abertas (todos os dias)
              </label>
            </div>
            <div style={{ padding: 13, display: 'flex', gap: 9 }}>
              <div style={{ flex: 1, background: OKB, borderRadius: 11, padding: '10px 12px' }}><div style={{ fontSize: 11, color: OK }}>Recebido</div><div style={{ fontSize: 16, fontWeight: 500, color: OK }}>{brl(recebidoHoje)}</div></div>
              <div style={{ flex: 1, background: WARNB, borderRadius: 11, padding: '10px 12px' }}><div style={{ fontSize: 11, color: WARN }}>A receber</div><div style={{ fontSize: 16, fontWeight: 500, color: WARN }}>{brl(aReceberHoje)}</div></div>
            </div>
            <div style={{ padding: '0 13px' }}>
              <div style={{ display: 'flex', fontSize: 12, borderBottom: `1px solid ${SOFT}` }}>
                {(['NAO', 'PAGO'] as const).map((t) => (
                  <button key={t} onClick={() => setVendaTab(t)} style={{ flex: 1, textAlign: 'center', border: 'none', background: 'none', cursor: 'pointer', paddingBottom: 8, fontFamily: 'inherit', fontSize: 12, color: vendaTab === t ? NAVY : MUT, fontWeight: 500, borderBottom: vendaTab === t ? `2px solid ${TEAL}` : '2px solid transparent' }}>{t === 'NAO' ? 'Não pago' : 'Pago'}</button>
                ))}
              </div>
            </div>
            <div style={{ padding: '6px 13px 13px', minHeight: 90 }}>
              {vendaTab === 'NAO' && gruposMulti.map((g) => (
                <div key={g.tutor} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', marginBottom: 6, background: '#EAF7F8', border: `1px solid ${TEAL}`, borderRadius: 10 }}>
                  <span style={{ fontSize: 16 }}>👥</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: NAVY, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.tutor}</div>
                    <div style={{ fontSize: 10.5, color: MUT }}>{g.itens.length} contas abertas · {brl(g.total)}</div>
                  </div>
                  <button onClick={() => { setGrupoBaixa(g); setFormaGrupo(formasList[0] || 'Dinheiro'); }} style={{ border: 'none', background: TEAL, color: '#fff', fontSize: 11, fontWeight: 600, padding: '6px 10px', borderRadius: 8, cursor: 'pointer', flexShrink: 0 }}>Baixar todas</button>
                </div>
              ))}
              {vendasFiltradas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '18px 0' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>🧾</div>
                  <p style={{ fontSize: 12, color: MUT, margin: 0 }}>Nenhuma venda {vendaTab === 'PAGO' ? 'paga' : 'pendente'}.</p>
                </div>
              )}
              {vendasFiltradas.slice(0, 8).map((v) => (
                <div key={v.id} onClick={() => abrirDetVenda(v)} title="Abrir venda" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: `1px solid ${SOFT}`, cursor: 'pointer', borderRadius: 8 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAF7')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: avatarOf(v.tutor).bg, color: avatarOf(v.tutor).fg, fontSize: 11.5, fontWeight: 500, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{iniciais(v.tutor)}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.tutor}</div>
                    <div style={{ fontSize: 11, color: MUT }}>{v.pet}</div>
                  </div>
                  <span style={{ background: v.pagoTotal ? OKB : WARNB, color: v.pagoTotal ? OK : WARN, fontSize: 11, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{brl(v.valor)}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={chLeve}><span style={{ color: NAVY, fontSize: 13.5, fontWeight: 500 }}>💵 Outros caixas</span></div>
            <div style={{ padding: 13, display: 'flex', gap: 9 }}>
              <Link href="/dashboard/erp/caixa" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', border: 'none', borderRadius: 9, background: TEAL, color: '#fff', padding: '10px', fontSize: 12.5, fontWeight: 500 }}>➕ Novo caixa</Link>
              <Link href="/dashboard/erp/caixa" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', color: INK2, padding: '10px', fontSize: 12.5 }}>💵 Meus caixas</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL BAIXAR TODAS DO CLIENTE ===== */}
      {grupoBaixa && (
        <div onClick={() => setGrupoBaixa(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>👥 {grupoBaixa.tutor}</span>
              <button onClick={() => setGrupoBaixa(null)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 11.5, color: MUT, marginBottom: 8 }}>{grupoBaixa.itens.length} contas abertas · baixar tudo junto</div>
              <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, overflow: 'hidden', marginBottom: 12 }}>
                {grupoBaixa.itens.map((v, i) => {
                  const aReceber = Math.max(0, Number(v.valor || 0) - Number(v.pago || 0));
                  return (
                    <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderTop: i ? `1px solid ${SOFT}` : 'none', fontSize: 13 }}>
                      <span style={{ color: INK }}>{v.pet || v.tutor}</span>
                      <span style={{ fontWeight: 500, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{brl(aReceber)}</span>
                    </div>
                  );
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderTop: `1px solid ${LINE}`, background: '#FBF9F4' }}>
                  <span style={{ fontSize: 12.5, color: MUT }}>Total a receber</span>
                  <span style={{ fontSize: 17, fontWeight: 600, color: NAVY, fontVariantNumeric: 'tabular-nums' }}>{brl(grupoBaixa.total)}</span>
                </div>
              </div>
              <div style={{ fontSize: 10.5, color: '#374151', textTransform: 'uppercase', letterSpacing: '.03em', marginBottom: 6 }}>Forma de recebimento</div>
              <select value={formaGrupo} onChange={(e) => setFormaGrupo(e.target.value)} style={{ ...inp, width: '100%', padding: '9px', marginBottom: 14 }}>{formasList.map((op) => <option key={op} value={op}>{op}</option>)}</select>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setGrupoBaixa(null)} disabled={baixandoGrupo} style={{ flex: 1, border: `1px solid ${LINE}`, background: '#fff', color: MUT, borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={baixarGrupoPDV} disabled={baixandoGrupo} style={{ flex: 2, border: 'none', background: baixandoGrupo ? '#9DBDC2' : TEAL, color: '#fff', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 600, cursor: baixandoGrupo ? 'default' : 'pointer' }}>{baixandoGrupo ? 'Baixando…' : '💰 Baixar tudo'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== MODAL RECEBIMENTO ===== */}
      {modal && (
        <div onClick={() => setModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>💰 Registrar recebimento</span>
              <button onClick={() => setModal(false)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '11px 14px' }}>
                <span style={{ fontSize: 13, color: INK2 }}>Total da venda</span>
                <span style={{ fontSize: 20, fontWeight: 500, color: NAVY }}>{brl(total)}</span>
              </div>
              <PagamentoFormas formas={formas} onChange={setFormas} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />

              <div style={{ marginTop: 12, fontSize: 13, lineHeight: 2, borderTop: `1px solid ${SOFT}`, paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Pago</span><b style={{ color: NAVY }}>{brl(pago)}</b></div>
                {troco > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Troco</span><b style={{ color: OK }}>{brl(troco)}</b></div>}
                {restante > 0.001 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Saldo a receber</span><b style={{ color: WARN }}>{brl(restante)}</b></div>}
              </div>

              <button onClick={confirmarRecebimento} disabled={salvando} style={{ width: '100%', marginTop: 14, background: TEAL, color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, padding: 12, borderRadius: 9, cursor: 'pointer' }}>{salvando ? 'Registrando…' : '✓ Confirmar recebimento'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETALHE DA VENDA ===== */}
      {detVenda && (
        <div onClick={() => { setDetVenda(null); setEditItens(null); setRecOpen(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16 }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>🧾 Venda {detVenda.numeroVenda ? `#${detVenda.numeroVenda}` : ''}</span>
              <button onClick={() => { setDetVenda(null); setEditItens(null); setRecOpen(false); }} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, color: INK, fontSize: 14 }}>{detVenda.tutor}{detVenda.pet ? ` · ${detVenda.pet}` : ''}</div>
              <div style={{ fontSize: 12, color: MUT, marginBottom: 12 }}>{detVenda.date ? new Date(detVenda.date).toLocaleDateString('pt-BR') : ''}{detVenda.vet ? ` · ${detVenda.vet}` : ''}</div>

              {(() => {
                const temRecebimento = Number(detVenda.pago || 0) > 0.001;
                const aReceber = Math.max(0, Number(detVenda.valor || 0) - Number(detVenda.pago || 0));
                const podeEditar = !temRecebimento || isAdmin;
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: MUT, textTransform: 'uppercase', letterSpacing: 0.4 }}>Itens</span>
                      {editItens === null && !detLoad && (
                        podeEditar
                          ? <button onClick={abrirEdicaoItens} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>✏️ Editar</button>
                          : <span style={{ fontSize: 11, color: MUT }}>🔒 só administrador</span>
                      )}
                    </div>

                    {detLoad ? (
                      <div style={{ color: MUT, fontSize: 13, padding: '8px 0' }}>Carregando…</div>
                    ) : editItens !== null ? (
                      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12, background: '#fff' }}>
                        {editItens.map((it: any, i: number) => (
                          <div key={i} style={{ borderBottom: `1px solid ${SOFT}`, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                              <input value={it.descricao} onChange={(e) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, descricao: e.target.value } : x))} placeholder="Descrição do item" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                              <button onClick={() => setEditItens((c) => c!.filter((_, j) => j !== i))} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} title="Remover">🗑️</button>
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input type="number" min={1} value={it.quantidade} onChange={(e) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : x))} title="Qtd" style={{ ...inp, width: 52, padding: '6px 6px', textAlign: 'center' }} />
                              <span style={{ color: MUT, fontSize: 12 }}>×</span>
                              <input value={it.valorUnitario || ''} inputMode="decimal" placeholder="Unit." onChange={(e) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, valorUnitario: num(e.target.value) } : x))} title="Valor unitário" style={{ ...inp, flex: 1, padding: '6px 8px' }} />
                              <input value={it.desconto || ''} inputMode="decimal" placeholder="Desc." onChange={(e) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, desconto: num(e.target.value) } : x))} title="Desconto" style={{ ...inp, width: 66, padding: '6px 8px' }} />
                              <span style={{ fontSize: 12.5, fontWeight: 500, color: NAVY, minWidth: 72, textAlign: 'right' }}>{brl(Math.max(0, it.quantidade * it.valorUnitario - (it.desconto || 0)))}</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px' }}>
                          <button onClick={() => setEditItens((c) => [...(c || []), { descricao: '', quantidade: 1, valorUnitario: 0, desconto: 0 }])} style={{ border: 'none', background: 'none', color: TEAL, fontSize: 12.5, fontWeight: 500, cursor: 'pointer' }}>➕ item</button>
                          <span style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>Total {brl(editTotal)}</span>
                        </div>
                      </div>
                    ) : (detVenda.itens && detVenda.itens.length > 0) ? (
                      <div style={{ border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', marginBottom: 12 }}>
                        {detVenda.itens.map((it: any, i: number) => (
                          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '7px 10px', borderTop: i ? `1px solid ${SOFT}` : 'none', fontSize: 12.5, color: INK }}>
                            <span>{(it.quantidade || it.qtd || 1)}× {it.descricao || it.nome || 'Item'}</span>
                            <span style={{ fontWeight: 500 }}>{brl(Number(it.valorTotal ?? (it.quantidade || 1) * (it.valorUnitario || 0)))}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: MUT, fontSize: 12.5, padding: '4px 0 12px' }}>Sem itens detalhados.</div>
                    )}

                    {temRecebimento && editItens === null && !detLoad && (
                      <div style={{ fontSize: 11.5, color: MUT, marginBottom: 12 }}>Esta venda já tem recebimento{isAdmin ? ' — como administrador, você pode editar os itens.' : ' — só um administrador pode alterar os itens.'}</div>
                    )}

                    <div style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
                      <div style={{ flex: 1, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 10.5, color: MUT }}>Total</div><div style={{ fontSize: 14, fontWeight: 600, color: INK }}>{brl(editItens !== null ? editTotal : detVenda.valor)}</div></div>
                      <div style={{ flex: 1, background: OKB, borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 10.5, color: OK }}>Pago</div><div style={{ fontSize: 14, fontWeight: 600, color: OK }}>{brl(detVenda.pago)}</div></div>
                      <div style={{ flex: 1, background: WARNB, borderRadius: 10, padding: '8px 10px' }}><div style={{ fontSize: 10.5, color: WARN }}>A receber</div><div style={{ fontSize: 14, fontWeight: 600, color: WARN }}>{brl(aReceber)}</div></div>
                    </div>

                    {editItens !== null ? (
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditItens(null)} style={{ flex: 1, background: '#fff', color: INK2, border: `1px solid ${LINE}`, borderRadius: 9, padding: 10, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                        <button onClick={salvarEdicaoItens} disabled={savingEdit} style={{ flex: 1.4, background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{savingEdit ? 'Salvando…' : '💾 Salvar alterações'}</button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={excluirVenda} disabled={detExcluindo} style={{ flex: 1, minWidth: 120, background: '#fff', color: '#A32D2D', border: '1px solid #F0C9C9', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{detExcluindo ? 'Excluindo…' : '🗑 Excluir'}</button>
                        {aReceber > 0.001 && (
                          <button onClick={abrirRecVenda} style={{ flex: 1.6, minWidth: 150, background: TEAL, color: '#fff', border: 'none', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>💰 Registrar recebimento</button>
                        )}
                        <button onClick={() => { setDetVenda(null); setEditItens(null); setRecOpen(false); }} style={{ flex: 1, minWidth: 90, background: '#fff', color: INK2, border: `1px solid ${LINE}`, borderRadius: 9, padding: 10, fontSize: 13, cursor: 'pointer' }}>Fechar</button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEBIMENTO DE VENDA EXISTENTE ===== */}
      {recOpen && detVenda && (() => {
        const aReceber = Math.max(0, Number(detVenda.valor || 0) - Number(detVenda.pago || 0));
        const soma = recFormas.reduce((s, f) => s + Number(f.valor || 0), 0);
        const temDin = recFormas.some((f) => ehDinheiro(f.forma));
        const trocoR = temDin && soma > aReceber ? soma - aReceber : 0;
        const pagoR = Math.max(0, soma - trocoR);
        const restanteR = Math.max(0, aReceber - pagoR);
        return (
          <div onClick={() => setRecOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 420, maxWidth: '100%', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: NAVY, fontSize: 15, fontWeight: 500 }}>💰 Registrar recebimento</span>
                <button onClick={() => setRecOpen(false)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
              </div>
              <div style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 11, padding: '11px 14px' }}>
                  <span style={{ fontSize: 13, color: INK2 }}>Saldo a receber</span>
                  <span style={{ fontSize: 20, fontWeight: 500, color: NAVY }}>{brl(aReceber)}</span>
                </div>
                <PagamentoFormas formas={recFormas} onChange={setRecFormas} formasList={formasList} formasConfig={formasConfig} taxas={taxas} />

                <div style={{ marginTop: 12, fontSize: 13, lineHeight: 2, borderTop: `1px solid ${SOFT}`, paddingTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Recebido agora</span><b style={{ color: NAVY }}>{brl(pagoR)}</b></div>
                  {trocoR > 0 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Troco</span><b style={{ color: OK }}>{brl(trocoR)}</b></div>}
                  {restanteR > 0.001 && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: INK2 }}>Ainda faltará</span><b style={{ color: WARN }}>{brl(restanteR)}</b></div>}
                </div>

                <button onClick={confirmarRecVenda} disabled={recSaving} style={{ width: '100%', marginTop: 14, background: TEAL, color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, padding: 12, borderRadius: 9, cursor: 'pointer' }}>{recSaving ? 'Registrando…' : '✓ Confirmar recebimento'}</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
