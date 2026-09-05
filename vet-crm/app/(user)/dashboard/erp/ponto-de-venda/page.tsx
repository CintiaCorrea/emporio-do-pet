// DESTINO: vet-crm/app/(user)/dashboard/erp/ponto-de-venda/page.tsx
'use client';
// [EMP-COWORK] Ponto de venda repaginado no padrão Base44 (header leve, emojis, bege, sem barras sólidas). Lógica preservada.

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { useRolePreview } from '@/lib/ui/RolePreview';
import { useSession } from 'next-auth/react';
import { carregarMeuCaixa, rotuloCaixa, caixaParaReceber, CaixaAberto, CaixaParaReceber } from '@/lib/caixaAtual';
import { carregarEstoqueComprometido, avisoDeEstoque, MapaEstoque } from '@/lib/estoqueComprometido';
import BuscaClientePet, { SelecaoClientePet } from '@/components/common/BuscaClientePet';
import { imprimirVenda } from '@/lib/documentos/venda-print';
import { imprimirOrcamento } from '@/lib/documentos/orcamento-print';
import { carregarCatalogoVendavel, linhaDoItem, labDoItem } from '@/lib/catalogoVendavel';
import { ehDinheiro, carregarFormasRecebimento, validarPagamentosCartao, PagForma } from '@/lib/formasPagamento';
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
interface CartItem { servicoId?: string; descricao: string; quantidade: number; valorUnitario: number; custoUnitario?: number; desconto: number; descTipo?: '$' | '%'; executorUserId?: string; _exame?: boolean; catalogoExameId?: string; fornecedorId?: string | null; fornecedorNome?: string | null; _novo?: boolean; catalogoItemId?: string; descontoModo?: string; descontoLimite?: number | null; _convenio?: boolean; convenioId?: string; _convLabel?: string }
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
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || '';

  const [data, setData] = useState(hoje());
  const [tipo, setTipo] = useState<'VENDA' | 'ORCAMENTO'>('VENDA');
  const [tipoVenda, setTipoVenda] = useState(TIPOS_VENDA[0]);
  const [caixaAberto, setCaixaAberto] = useState<boolean | null>(null);
  const [caixaAbertoId, setCaixaAbertoId] = useState<string | null>(null);
  const [caixaAberturaTs, setCaixaAberturaTs] = useState<number | null>(null); // início do caixa aberto (regra de exclusão)
  const [meuCaixa, setMeuCaixa] = useState<CaixaAberto | null>(null); // núcleo lib/caixaAtual: o caixa de QUEM ESTÁ LOGADA
  const [caixaUsado, setCaixaUsado] = useState<CaixaParaReceber | null>(null); // decisão dos 3 casos
  const [caixasDeOutros, setCaixasDeOutros] = useState<CaixaAberto[]>([]);
  const [estoque, setEstoque] = useState<MapaEstoque>(new Map()); // núcleo lib/estoqueComprometido

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
  // 🏥 Convênio do pet (Petlife etc.): buscador da tabela do convênio, precificado por porte.
  const [convPet, setConvPet] = useState<{ convenio: { id: string; nome: string; diaFechamento: number | null }; isCat: boolean; porteSugerido: string } | null>(null);
  const [convItens, setConvItens] = useState<{ precoId: string; itemNome: string; codigo: string | null; preco: number }[]>([]);
  const [convBusca, setConvBusca] = useState('');
  const [convPorte, setConvPorte] = useState('');
  const [convOpen, setConvOpen] = useState(false);
  const [descontoGlobal, setDescontoGlobal] = useState('');
  const [descontoGlobalTipo, setDescontoGlobalTipo] = useState<'$' | '%'>('$');
  const [obs, setObs] = useState('');

  const [modal, setModal] = useState(false);
  const [formas, setFormas] = useState<PagForma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [formasCfg, setFormasCfg] = useState<string[]>([]); // nomes das formas (Fase 2)
  const [formasConfig, setFormasConfig] = useState<any[]>([]); // config completa (tipo/adquirente/conta)
  const [taxas, setTaxas] = useState<any[]>([]); // tabela de taxas por bandeira (TaxaContratada)
  const [salvando, setSalvando] = useState(false);
  // MODO EDICAO (?editar=<id>): a venda que ja existe e carregada AQUI, no formulario grande, e
  // nao no box estreito do lado. Foi o pedido da Cintia — no box nao dava pra procurar item.
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNum, setEditandoNum] = useState<number | null>(null);

  const [vendas, setVendas] = useState<Venda[]>([]);
  const [orcamentos, setOrcamentos] = useState<{ id: string; tutor: string; pet: string; valor: number; tutorId?: string; petId?: string; dia?: string; _orc?: any }[]>([]);
  const [detOrc, setDetOrc] = useState<any>(null); // orçamento aberto no modal de detalhe
  const [vendaTab, setVendaTab] = useState<'NAO' | 'PAGO'>('NAO');
  // Baixar todas as comandas de um cliente de uma vez (portado do "Em atendimento")
  const [grupoBaixa, setGrupoBaixa] = useState<{ tutor: string; itens: Venda[]; total: number } | null>(null);
  const [formaGrupo, setFormaGrupo] = useState('Dinheiro');
  const [baixandoGrupo, setBaixandoGrupo] = useState(false);
  const buscaTimer = useRef<any>(null);
  const [vendaDia, setVendaDia] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [vendaAbertas, setVendaAbertas] = useState(false); // ver abertas de TODOS os dias
  const vendaDiaRef = useRef<HTMLInputElement>(null);       // date picker escondido do navegador de dia
  const [detVenda, setDetVenda] = useState<any>(null);      // venda aberta no modal de detalhe
  const [detLoad, setDetLoad] = useState(false);
  const [detExcluindo, setDetExcluindo] = useState(false);
  const [editItens, setEditItens] = useState<any[] | null>(null); // itens em edição no detalhe (null = modo leitura)
  const [savingEdit, setSavingEdit] = useState(false);
  const [recOpen, setRecOpen] = useState(false);            // modal de recebimento de venda existente
  const [recFormas, setRecFormas] = useState<PagForma[]>([{ forma: 'Dinheiro', valor: 0 }]);
  const [recSaving, setRecSaving] = useState(false);
  // 🔓 Liberação de gerente (desconto acima do limite) — modal com senha mascarada
  const [libOpen, setLibOpen] = useState(false);
  const [libEmail, setLibEmail] = useState('');
  const [libSenha, setLibSenha] = useState('');
  const libResolver = useRef<((v: { email: string; senha: string } | null) => void) | null>(null);
  const pedirLiberacao = () => new Promise<{ email: string; senha: string } | null>((resolve) => {
    libResolver.current = resolve; setLibEmail(''); setLibSenha(''); setLibOpen(true);
  });
  const fecharLiberacao = (v: { email: string; senha: string } | null) => {
    setLibOpen(false); const r = libResolver.current; libResolver.current = null; if (r) r(v);
  };

  const loadVendas = useCallback(async () => {
    try {
      const qs = vendaAbertas
        ? '?abertas=true'
        : `?from=${vendaDia}&to=${vendaDia}`;
      const r = await fetch(`/api/caixa/vendas${qs}`, { cache: 'no-store' });
      if (r.ok) setVendas(await r.json());
    } catch { /* */ }
  }, [vendaDia, vendaAbertas]);

  // 📄 Orçamentos EM ABERTO (não convertidos) — aparecem na MESMA lista "Não pago", em cor
  // diferente (roxo), pra você converter em venda ali mesmo. Interconecta ficha/PDV/WhatsApp → Caixa.
  const loadOrcamentos = useCallback(async () => {
    try {
      const r = await fetch('/api/orcamentos', { cache: 'no-store' });
      if (!r.ok) return;
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.data || d.orcamentos || []);
      setOrcamentos(arr
        .filter((o: any) => !o.appointmentId && o.status !== 'RECUSADO' && o.status !== 'EXPIRADO')
        .map((o: any) => ({ id: o.id, tutor: o.tutor?.name || 'Cliente', pet: o.pet?.name || '', valor: Number(o.valorTotal) || 0, tutorId: o.tutorId, petId: o.petId, dia: String(o.createdAt || '').slice(0, 10), _orc: o })));
    } catch { /* */ }
  }, []);
  async function converterOrcamento(o: { id: string; tutor: string; valor: number }) {
    if (!confirm(`Converter o orçamento de ${o.tutor} (${brl(o.valor)}) em venda?\nEla vai para "Não pago" para receber no caixa.`)) return;
    try {
      const r = await fetch(`/api/orcamentos/${o.id}/converter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!r.ok) throw new Error();
      toast.success('Orçamento virou venda ✅');
      await Promise.all([loadVendas(), loadOrcamentos()]);
    } catch { toast.error('Erro ao converter orçamento'); }
  }

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
    // Item da venda so pode vir do catalogo (regra da casa). Antes isso era garantido
    // APAGANDO o campo assim que a pessoa saia dele — o que parecia que a busca "nao
    // trazia nada". Agora a conferencia e no salvar, dizendo QUAL item nao serve.
    const foraDoCatalogo = limpos.find((it) => !servicos.some((x: any) => (x.nome || '') === (it.descricao || '').trim()));
    if (foraDoCatalogo) { toast.error(`"${foraDoCatalogo.descricao}" nao esta no catalogo. Escolha um item da lista.`); return; }
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

  // Núcleo lib/caixaAtual: o caixa é o DE QUEM ESTÁ LOGADA (duas funcionárias, dois caixas abertos).
  const recarregarMeuCaixa = useCallback(async () => {
    const m = await carregarMeuCaixa(meId);
    setMeuCaixa(m.meu); setCaixasDeOutros(m.deOutros);
    // Três casos (lib/caixaAtual): o meu; ou o único aberto quando não tenho o meu; ou
    // recusa quando há mais de um e nenhum é meu. Antes bastava não ter o meu pra travar.
    const r = caixaParaReceber(m);
    setCaixaUsado(r);
    setCaixaAberto(!!r.caixa); setCaixaAbertoId(r.caixa?.id || null);
    setCaixaAberturaTs(r.caixa?.abertura ? new Date(r.caixa.abertura).getTime() : null);
  }, [meId]);
  // Quando a sessão carrega depois da tela, refaz a escolha do caixa.
  useEffect(() => { if (meId) recarregarMeuCaixa(); }, [meId, recarregarMeuCaixa]);

  // ----- Registrar recebimento de venda existente -----
  function abrirRecVenda() {
    if (!caixaAbertoId) { toast.error(caixaUsado?.erro || 'Abra o seu caixa para receber.'); return; }
    const aReceber = Math.max(0, Number(detVenda.valor || 0) - Number(detVenda.pago || 0));
    setRecFormas([{ forma: 'Dinheiro', valor: Number(aReceber.toFixed(2)) }]);
    setRecOpen(true);
  }
  async function confirmarRecVenda() {
    if (!detVenda || !caixaAbertoId) return;
    const formasValidas = recFormas.filter((f) => Number(f.valor) > 0);
    const soma = formasValidas.reduce((s, f) => s + Number(f.valor || 0), 0);
    if (soma <= 0.001) { toast.error('Informe o valor recebido.'); return; }
    const faltaCartao = validarPagamentosCartao(formasValidas, formasConfig);
    if (faltaCartao) { toast.error(faltaCartao); return; }
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

  // Quem pode excluir a venda aberta na telinha. ADM sempre; os demais só enquanto a venda está
  // EM ABERTO (nada recebido) e dentro do caixa que está aberto agora. O backend decide de verdade —
  // isto aqui é só pra não oferecer um botão que vai dar erro. Ver appointments.service.remove.
  const exclusaoDaVenda = useMemo(() => {
    if (!detVenda) return { pode: false, motivo: '' };
    if (isAdmin) return { pode: true, motivo: '' };
    if (Number(detVenda.pago || 0) > 0) {
      return { pode: false, motivo: 'Essa venda já tem recebimento. Apague o recebimento no Caixa (a venda volta a "não paga") ou peça pra um administrador.' };
    }
    if (!caixaAbertoId || !caixaAberturaTs) {
      return { pode: false, motivo: 'Não há caixa aberto. Venda de caixa fechado só um administrador exclui.' };
    }
    // vale o DIA do caixa aberto (a comanda pode ter nascido antes de abrirem o caixa)
    const inicioDoDia = new Date(new Date(caixaAberturaTs).toLocaleDateString('en-CA', { timeZone: 'America/Fortaleza' }) + 'T00:00:00-03:00').getTime();
    const nascimento = new Date(detVenda.date || 0).getTime();
    if (!nascimento || nascimento < inicioDoDia) {
      return { pode: false, motivo: 'Essa venda é de um caixa que já foi fechado. Só um administrador exclui.' };
    }
    return { pode: true, motivo: '' };
  }, [detVenda, isAdmin, caixaAbertoId, caixaAberturaTs]);

  // Exclui a venda (appointment) com confirmação.
  async function excluirVenda() {
    if (!detVenda) return;
    if (!window.confirm(`Excluir a venda de ${detVenda.tutor}${detVenda.pet ? ' · ' + detVenda.pet : ''} (${brl(detVenda.valor)})? Não dá pra desfazer.`)) return;
    setDetExcluindo(true);
    try {
      let r = await fetch(`/api/appointments/${detVenda.id}`, { method: 'DELETE' });
      if (!r.ok) {
        const e = await r.json().catch(() => ({} as any));
        const msg = String(e?.message || '');
        // Atendimento com gravação de áudio: o backend pede confirmação explícita (só ADM).
        if (msg.startsWith('TEM_GRAVACAO') && isAdmin) {
          if (!window.confirm('Esse atendimento tem uma gravação de áudio salva. Excluir apaga a gravação junto. Apagar mesmo assim?')) { setDetExcluindo(false); return; }
          r = await fetch(`/api/appointments/${detVenda.id}?force=true`, { method: 'DELETE' });
          if (!r.ok) { const e2 = await r.json().catch(() => ({} as any)); throw new Error(String(e2?.message || '').replace(/^[A-Z_]+:\s*/, '') || 'Não consegui excluir.'); }
        } else {
          // Tira o código técnico (VENDA_PAGA:, CAIXA_FECHADO:) e mostra o motivo de verdade.
          throw new Error(msg.replace(/^[A-Z_]+:\s*/, '') || 'Não consegui excluir. Tente de novo.');
        }
      }
      toast.success('Venda excluída.');
      setDetVenda(null);
      await loadVendas();
    } catch (e: any) { toast.error(e?.message || 'Não consegui excluir. Tente de novo.'); }
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
      // O recebimento vai pro caixa de QUEM ESTÁ LOGADA (lib/caixaAtual) — nunca pro caixa da colega.
      await recarregarMeuCaixa();
      setEstoque(await carregarEstoqueComprometido());
      try {
        // FONTE ÚNICA (lib/formasPagamento): formas de recebimento + tabela de taxas.
        const { formasConfig, formasList, taxas } = await carregarFormasRecebimento();
        setFormasConfig(formasConfig); setFormasCfg(formasList); setTaxas(taxas);
      } catch { /* */ }
    })();
    loadVendas();
    loadOrcamentos();
  }, [loadVendas, loadOrcamentos]);

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

  // ?editar=<atendimentoId> — abre a venda JA EXISTENTE dentro deste formulario, com o mesmo
  // buscador de itens da venda nova. Ao salvar, faz PATCH em vez de criar outra venda.
  useEffect(() => {
    const eid = new URLSearchParams(window.location.search).get('editar');
    if (!eid) return;
    (async () => {
      try {
        const a = await fetch(`/api/atendimentos/${eid}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
        if (!a?.id) { toast.error('Não encontrei essa venda.'); return; }
        setEditandoId(a.id);
        setEditandoNum(a.numeroVenda ?? null);
        if (a.date) setData(String(a.date).slice(0, 10));
        setObs(a.observacao || '');
        if (a.userId) setProfId(a.userId);
        if (a.tutorId) {
          const t = await fetch(`/api/tutors/${a.tutorId}`, { cache: 'no-store' }).then((r) => r.json()).catch(() => null);
          if (t?.id) { setCliente(t as Tutor); setPetId(a.petId || ''); }
        }
        const itens = a.items || a.appointmentItems || a.itens || [];
        setCarrinho(itens.map((it: any) => ({
          servicoId: it.servicoId ?? it.productId ?? undefined,
          descricao: it.descricao || it.nome || '',
          quantidade: Number(it.quantidade ?? it.qtd ?? 1),
          valorUnitario: Number(it.valorUnitario ?? 0),
          desconto: Number(it.desconto ?? 0),
          descTipo: '$' as const,
          executorUserId: it.executorUserId || undefined,
        })));
      } catch { toast.error('Não consegui abrir essa venda para editar.'); }
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
    // Avisa (sem travar) quando o saldo já está prometido em outra venda aberta — lib/estoqueComprometido.
    const jaNoCarrinho = carrinho.filter((x) => x.catalogoItemId === l.catalogoItemId).reduce((n, x) => n + (Number(x.quantidade) || 0), 0);
    const aviso = avisoDeEstoque(estoque, l.catalogoItemId, qtd, jaNoCarrinho);
    if (aviso) toast(`⚠️ ${aviso}`, { duration: 6000 });
    setCarrinho((c) => {
      const i = l._novo ? c.findIndex((x) => x.catalogoItemId === l.catalogoItemId) : l._exame ? c.findIndex((x) => x.catalogoExameId === l.catalogoExameId) : c.findIndex((x) => x.servicoId === l.servicoId);
      if (i >= 0) { const cp = [...c]; cp[i] = { ...cp[i], quantidade: cp[i].quantidade + qtd }; return cp; }
      const base = { descricao: l.descricao, quantidade: qtd, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, desconto: 0, executorUserId: profId || undefined };
      return [...c, l._novo
        ? { ...base, _novo: true, ...(l._exame ? { _exame: true } : {}), catalogoItemId: l.catalogoItemId, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, descontoModo: l.descontoModo, descontoLimite: l.descontoLimite }
        : l._exame
        ? { ...base, _exame: true, catalogoExameId: l.catalogoExameId, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome }
        : { ...base, servicoId: l.servicoId }];
    });
    setItemBusca(''); setItemAberto(false); setQtd(1);
  };
  const updItem = (i: number, patch: Partial<CartItem>) => setCarrinho((c) => c.map((x, j) => j === i ? { ...x, ...patch } : x));
  const rmItem = (i: number) => setCarrinho((c) => c.filter((_, j) => j !== i));

  // 🏥 Carrega/atualiza a tabela do convênio DO PET (resolve pela etiqueta do pet + porte).
  async function carregarConv(petIdArg: string, busca: string, porte: string) {
    if (!petIdArg) { setConvPet(null); setConvItens([]); return; }
    try {
      const qs = new URLSearchParams({ petId: petIdArg }); if (busca) qs.set('busca', busca); if (porte) qs.set('porte', porte);
      const r = await fetch(`/api/catalogo/convenios/tabela-pet?${qs.toString()}`, { cache: 'no-store' });
      const d = await r.json();
      if (d && d.convenio) { setConvPet({ convenio: d.convenio, isCat: !!d.isCat, porteSugerido: d.porteSugerido || 'm' }); setConvItens(Array.isArray(d.itens) ? d.itens : []); }
      else { setConvPet(null); setConvItens([]); }
    } catch { setConvPet(null); setConvItens([]); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setConvBusca(''); setConvPorte(''); setConvOpen(false); carregarConv(petId, '', ''); }, [petId]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (petId && convPet?.convenio) carregarConv(petId, convBusca, convPorte); }, [convBusca, convPorte]);
  const addConvenioItem = (item: { itemNome: string; preco: number }) => {
    if (!convPet?.convenio) return;
    setCarrinho((c) => [...c, { descricao: item.itemNome, quantidade: 1, valorUnitario: Number(item.preco) || 0, desconto: 0, executorUserId: profId || undefined, _convenio: true, convenioId: convPet.convenio.id, _convLabel: convPet.convenio.nome }]);
  };

  // Desconto do item: resolve % → R$ (backend recebe sempre R$)
  const descItemVal = (it: CartItem) => { const bruto = it.quantidade * it.valorUnitario; const d = Number(it.desconto) || 0; return it.descTipo === '%' ? bruto * d / 100 : d; };
  // Política de desconto POR ITEM (catálogo novo): bloqueia/limita o desconto no caixa.
  const clampDesc = (it: CartItem, valor: number) => {
    if (it.descontoModo === 'SEM_DESCONTO') return 0;
    if (it.descontoModo === 'LIMITE_ITEM' && it.descontoLimite != null) {
      const lim = Number(it.descontoLimite);
      if (it.descTipo === '%') return Math.min(valor, lim);
      const total = (Number(it.valorUnitario) || 0) * (it.quantidade || 1);
      return Math.min(valor, total * lim / 100);
    }
    return valor;
  };
  const itemTotal = (it: CartItem) => Math.max(0, it.quantidade * it.valorUnitario - descItemVal(it));
  const subtotal = useMemo(() => carrinho.reduce((s, it) => s + (it._convenio ? 0 : itemTotal(it)), 0), [carrinho]);
  // Total faturado ao convênio (não entra no que o tutor paga).
  const totalConvenio = useMemo(() => carrinho.reduce((s, it) => s + (it._convenio ? itemTotal(it) : 0), 0), [carrinho]);
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

  // Sai do modo edicao e limpa o ?editar= da barra de enderecos, pra um F5 nao reabrir a venda.
  const sairDaEdicao = () => {
    setEditandoId(null); setEditandoNum(null);
    try {
      const u = new URL(window.location.href);
      if (u.searchParams.has('editar')) { u.searchParams.delete('editar'); window.history.replaceState({}, '', u.toString()); }
    } catch { /* */ }
  };
  const reset = () => {
    setCliente(null); setPetId(''); setCliBusca(''); setCarrinho([]); setDescontoGlobal(''); setDescontoGlobalTipo('$'); setObs('');
    setFormas([{ forma: 'Dinheiro', valor: 0 }]); setTipo('VENDA'); setQtd(1);
    sairDaEdicao();
  };

  const payload = (extra: any) => ({
    tutorId: cliente!.id, petId, userId: profId || undefined, date: new Date(data + 'T12:00:00').toISOString(),
    itens: carrinho.map((it) => ({ servicoId: (it._exame || it._novo || it._convenio) ? undefined : it.servicoId, productId: (it._exame || it._novo || it._convenio) ? undefined : it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: Number(descItemVal(it).toFixed(2)), executorUserId: it.executorUserId || profId || undefined, ...(it._novo ? { catalogoItemId: it.catalogoItemId, fornecedorId: it.fornecedorId, custoUnitario: it.custoUnitario } : {}), ...(it._exame ? { tipoItem: 'EXAME', catalogoExameId: it.catalogoExameId, fornecedorId: it.fornecedorId, custoUnitario: it.custoUnitario } : {}), ...(it._convenio ? { convenioId: it.convenioId } : {}) })),
    desconto: Number(descGlobalVal().toFixed(2)), observacao: obs || null, ...extra,
  });

  const enviar = async (body: any, msg: string) => {
    setSalvando(true);
    try {
      let r = await fetch('/api/caixa/pdv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      let d = await r.json().catch(() => ({}));
      // 🔓 Desconto acima do limite → pede LIBERAÇÃO de um gerente (admin) e reenvia 1 vez.
      if (!r.ok && /liberação de um gerente|passa do limite/i.test(String(d?.message || ''))) {
        const lib = await pedirLiberacao();
        if (lib?.email && lib?.senha) {
          r = await fetch('/api/caixa/pdv', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, liberacaoEmail: lib.email, liberacaoSenha: lib.senha }) });
          d = await r.json().catch(() => ({}));
        }
      }
      if (!r.ok) throw new Error(d.message || 'Erro ao salvar');
      toast.success(msg + (d.troco ? ` · troco ${brl(d.troco)}` : ''));
      setModal(false); reset(); loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar'); } finally { setSalvando(false); }
  };

  const abrirRecebimento = () => { if (!baseValida) return; setFormas([{ forma: 'Dinheiro', valor: Number(total.toFixed(2)) }]); setModal(true); };
  const confirmarRecebimento = () => {
    // Cartão exige operadora + NSU + AUT: é o que casa a venda com a linha do extrato.
    const falta = validarPagamentosCartao(formas.filter((f) => Number(f.valor) > 0), formasConfig);
    if (falta) { toast.error(falta); return; }
    return enviar(payload({ tipo: 'VENDA', formas: formas.filter((f) => Number(f.valor) > 0) }), 'Venda registrada!');
  };
  // Salvar EDITANDO: PATCH na venda que ja existe, o mesmo endpoint que o box do lado usava.
  // Muda so de onde os itens vem — e aqui vem do buscador que funciona.
  const salvarEdicaoVenda = async () => {
    if (!editandoId) return;
    if (!baseValida) { toast.error('Escolha o cliente, o pet e ao menos um item.'); return; }
    setSalvando(true);
    try {
      const items = carrinho.map((it) => ({
        servicoId: (it._exame || it._novo || it._convenio) ? undefined : it.servicoId,
        productId: (it._exame || it._novo || it._convenio) ? undefined : it.servicoId,
        descricao: it.descricao, quantidade: Number(it.quantidade) || 1,
        valorUnitario: Number(it.valorUnitario) || 0,
        desconto: Number(descItemVal(it).toFixed(2)),
        valorTotal: Number(itemTotal(it).toFixed(2)),
        executorUserId: it.executorUserId || profId || undefined,
      }));
      const value = Number(total.toFixed(2));
      const r = await fetch(`/api/appointments/${editandoId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items, value }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(String((e as any)?.message || '').replace(/^[A-Z_]+:\s*/, '') || 'Erro ao salvar'); }
      toast.success(`Venda ${editandoNum ? '#' + editandoNum + ' ' : ''}atualizada!`);
      reset(); loadVendas();
    } catch (e: any) { toast.error(e?.message || 'Erro ao salvar'); } finally { setSalvando(false); }
  };
  const salvar = () => { if (editandoId) return salvarEdicaoVenda(); if (tipo === 'ORCAMENTO') return salvarOrcamento(); return enviar(payload({ tipo }), 'Venda salva (a receber)'); };
  // 🖨️ Imprime o que está na tela (venda ou orçamento, conforme o tipo) — mesmo antes de salvar.
  const imprimirAtual = () => {
    if (!carrinho.length) { toast.error('Adicione itens primeiro'); return; }
    const itens = carrinho.map((it) => ({ descricao: it.descricao || 'Item', quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: Number(descItemVal(it).toFixed(2)), valorTotal: itemTotal(it) }));
    const petObj = (cliente?.pets || []).find((x: any) => x.id === petId);
    if (tipo === 'ORCAMENTO') {
      imprimirOrcamento({ itens, valorTotal: total, pet: petObj || undefined, tutor: cliente || undefined, createdAt: new Date().toISOString(), observacao: obs || undefined });
    } else {
      imprimirVenda({ itens, valor: total, pet: petObj || undefined, tutor: cliente || undefined, date: new Date().toISOString(), observacao: obs || undefined }, { rotulo: 'Venda' });
    }
  };
  // Orçamento vai pro MÓDULO de orçamentos (salvar/aprovar/converter), não pro endpoint de venda.
  const salvarOrcamento = async () => {
    if (!cliente) { toast.error('Escolha o cliente'); return; }
    if (!petId) { toast.error('Escolha o pet do orçamento'); return; }
    setSalvando(true);
    try {
      const body = {
        petId, tutorId: cliente.id, observacao: obs || null,
        itens: carrinho.map((it) => ({ servicoId: (it._exame || it._novo) ? undefined : it.servicoId, descricao: it.descricao, quantidade: it.quantidade, valorUnitario: it.valorUnitario, desconto: Number(descItemVal(it).toFixed(2)), ...(it._novo ? { catalogoItemId: it.catalogoItemId, fornecedorId: it.fornecedorId, custoUnitario: it.custoUnitario } : {}), ...(it._exame ? { tipoItem: 'EXAME', catalogoExameId: it.catalogoExameId, fornecedorId: it.fornecedorId, custoUnitario: it.custoUnitario } : {}) })),
      };
      const r = await fetch('/api/orcamentos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || d.error || 'Erro ao salvar orçamento');
      toast.success('Orçamento salvo!'); setModal(false); reset(); loadVendas();
    } catch (e: any) { toast.error(e.message || 'Erro ao salvar orçamento'); } finally { setSalvando(false); }
  };

  // Só venda com valor (> 0) — atendimentos de R$ 0 (agenda/clínico) não são comanda nem venda.
  // Venda lançada com data pra frente não some: sai da lista de agora e vai pra faixa "a cobrar em
  // breve" (o backend marca com `futura`). Antes ela não aparecia pra ninguém cobrar.
  const vendasDaAba = vendas.filter((v) => Number(v.valor) > 0 && (vendaTab === 'PAGO' ? v.pagoTotal : !v.pagoTotal));
  const vendasFiltradas = vendasDaAba.filter((v: any) => !v.futura);
  // Orçamento fica no SEU dia, igual à venda: com a lista por dia, só aparece o que foi feito
  // naquele dia; com "abertas de todos os dias" marcado, aparecem todos os não convertidos.
  const orcamentosDoDia = vendaAbertas ? orcamentos : orcamentos.filter((o: any) => o.dia === vendaDia);
  const vendasFuturas = vendaTab === 'NAO'
    ? vendasDaAba.filter((v: any) => v.futura).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];
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
    if (!caixaAbertoId) { toast.error(caixaUsado?.erro || 'Abra o seu caixa para receber.'); return; }
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
      toast.success(`${ok} venda(s) de ${grupoBaixa.tutor} recebida(s) em ${formaGrupo}.`);
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
                {meuCaixa ? `✅ ${rotuloCaixa(meuCaixa)}` : '⚠️ Você não tem caixa aberto'}
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

            {/* Editando uma venda que ja existe: precisa ficar OBVIO, senao a pessoa acha que
                esta criando outra. Sair volta o formulario pra venda nova. */}
            {editandoId && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', background: '#FBF3E3', border: '1px solid #E8CF97', borderRadius: 11, padding: '10px 13px', marginBottom: 16 }}>
                <span style={{ fontSize: 16 }}>✏️</span>
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#8a6400' }}>Editando a venda {editandoNum ? '#' + editandoNum : 'selecionada'}</div>
                  <div style={{ fontSize: 11.5, color: '#8a6400' }}>Alterou o que precisava? Clique em <b>Salvar alterações</b> no fim da tela. Nenhuma venda nova será criada.</div>
                </div>
                <button onClick={reset} style={{ border: '1px solid #E8CF97', background: '#fff', color: '#8a6400', borderRadius: 9, padding: '7px 12px', fontSize: 12.5, cursor: 'pointer', flexShrink: 0 }}>✕ Sair da edição</button>
              </div>
            )}

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
                      <button key={s.id} title={s.nome} onClick={() => addItem(s)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '9px 12px', border: 'none', borderBottom: `1px solid ${SOFT}`, background: '#fff', cursor: 'pointer', fontSize: 13 }}>
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

            {/* 🏥 Convênio do pet (Petlife etc.) — buscador da tabela, precificado por porte */}
            {convPet?.convenio && (
              <div style={{ border: '1px solid #CDE8EA', background: '#F3FAFB', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, color: '#0E5560', fontSize: 13 }}>🏥 {convPet.convenio.nome} paga</span>
                  <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', flexWrap: 'wrap', fontSize: 11.5, color: MUT }}>
                    Porte:
                    {/* 🐱 Gato entra como opção selecionável junto com P/M/G/GG. Pré-seleciona pelo porte sugerido
                        (felino → gato; cão → porte pelo peso), mas dá pra trocar na mão. */}
                    {['gato', 'p', 'm', 'g', 'gg'].map((pt) => { const on = (convPorte || convPet.porteSugerido) === pt; return <button key={pt} onClick={() => setConvPorte(pt)} style={{ padding: '3px 9px', borderRadius: 999, border: `1px solid ${on ? '#0C93A6' : LINE}`, background: on ? '#0C93A6' : '#fff', color: on ? '#fff' : INK2, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>{pt === 'gato' ? '🐱 Gato' : pt.toUpperCase()}</button>; })}
                  </span>
                  <button onClick={() => setConvOpen((o) => !o)} style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: TEAL, border: `1px solid ${LINE}`, background: '#fff', borderRadius: 8, padding: '5px 10px', cursor: 'pointer' }}>{convOpen ? 'fechar' : `＋ item ${convPet.convenio.nome}`}</button>
                </div>
                {convOpen && (
                  <div style={{ marginTop: 8 }}>
                    <input value={convBusca} onChange={(e) => setConvBusca(e.target.value)} placeholder={`🔍 Buscar na tabela ${convPet.convenio.nome}…`} style={{ ...inp, width: '100%', marginBottom: 6 }} />
                    <div style={{ maxHeight: 240, overflowY: 'auto', border: `1px solid ${SOFT}`, borderRadius: 9, background: '#fff' }}>
                      {convItens.length === 0 ? <div style={{ padding: 14, textAlign: 'center', color: MUT, fontSize: 12.5 }}>Nada encontrado nessa tabela.</div> :
                        convItens.map((it) => (
                          <button key={it.precoId} onClick={() => addConvenioItem(it)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '8px 11px', border: 'none', borderBottom: `1px solid ${SOFT}`, background: '#fff', cursor: 'pointer', fontSize: 12.5, textAlign: 'left' }}>
                            <span style={{ color: INK, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.itemNome}{it.codigo ? <span style={{ color: '#9aa', fontSize: 10.5, marginLeft: 5 }}>#{it.codigo}</span> : null}</span>
                            <span style={{ color: '#0F6E56', fontWeight: 600, flexShrink: 0 }}>{brl(Number(it.preco))}</span>
                          </button>
                        ))}
                    </div>
                    <div style={{ fontSize: 10.5, color: MUT, marginTop: 5 }}>O item escolhido entra marcado <b>“{convPet.convenio.nome} paga”</b> — sai do total do tutor e vira a-receber mensal do convênio.</div>
                  </div>
                )}
              </div>
            )}

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
                      <input value={it.descricao} readOnly title={it.descricao} style={{ ...inp, flex: 1, padding: '6px 8px', background: '#F7F5EF', cursor: 'default' }} />
                      {it._convenio ? <span title={`Faturado ao convênio ${it._convLabel}`} style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: '#E0F0F2', color: '#0E5560' }}>🏥 {it._convLabel} paga</span> : null}
                      {(() => { const lab = labDoItem({ _exame: !!it.fornecedorNome, _fornecedorNome: it.fornecedorNome }); return lab ? <span title={`Laboratório: ${lab.nome}`} style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 999, background: lab.veter ? '#E1F5EE' : '#EEF2F6', color: lab.veter ? '#0F6E56' : '#4D6A8A' }}>{lab.veter ? '⭐ ' : '🏥 '}{lab.nome}</span> : null; })()}
                      <span style={{ fontSize: 13, fontWeight: 500, color: NAVY, minWidth: 78, textAlign: 'right' }}>{brl(itemTotal(it))}</span>
                      <button onClick={() => rmItem(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 }} title="Remover">🗑️</button>
                    </div>
                    {/* linha 2: qtd × unit · desc · vendedor compacto */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, flexWrap: 'wrap' }}>
                      <input type="number" min={1} value={it.quantidade} onChange={(e) => updItem(i, { quantidade: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} title="Qtd" style={{ ...inp, width: 46, padding: '5px 6px', textAlign: 'center', fontSize: 12 }} />
                      <span style={{ color: MUT, fontSize: 12 }}>×</span>
                      <input value={it.valorUnitario || ''} inputMode="decimal" placeholder="Unit." onChange={(e) => updItem(i, { valorUnitario: num(e.target.value) })} title="Valor unitário" style={{ ...inp, width: 96, padding: '5px 8px', fontSize: 12 }} />
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <input value={it.desconto || ''} disabled={it.descontoModo === 'SEM_DESCONTO'} inputMode="decimal" placeholder="Desc." onChange={(e) => updItem(i, { desconto: clampDesc(it, num(e.target.value)) })} title={it.descontoModo === 'SEM_DESCONTO' ? 'Este item não permite desconto' : it.descontoModo === 'LIMITE_ITEM' && it.descontoLimite != null ? `Desconto máximo: ${it.descontoLimite}%` : 'Desconto'} style={{ ...inp, width: 52, padding: '5px 6px', fontSize: 12, borderTopRightRadius: 0, borderBottomRightRadius: 0, opacity: it.descontoModo === 'SEM_DESCONTO' ? 0.5 : 1 }} />
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
                <span style={{ fontSize: 11.5, color: MUT }}>🔒 Itens vêm do catálogo (busca acima)</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 12, color: INK2 }}>Desconto</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                    <input value={descontoGlobal} inputMode="decimal" placeholder="0,00" onChange={(e) => setDescontoGlobal(e.target.value)} style={{ ...inp, width: 76, padding: '6px 8px', textAlign: 'right', borderTopRightRadius: 0, borderBottomRightRadius: 0 }} />
                    <button type="button" onClick={() => setDescontoGlobalTipo((t) => t === '%' ? '$' : '%')} title="Alternar R$ / %" style={{ border: `1px solid ${SOFT}`, borderLeft: 'none', background: SUAVE, color: NAVY, fontSize: 12, fontWeight: 600, padding: '6px 9px', cursor: 'pointer', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>{descontoGlobalTipo === '%' ? '%' : 'R$'}</button>
                  </span>
                </div>
              </div>
              {totalConvenio > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', background: '#F3FAFB', borderTop: `1px solid ${SOFT}` }}>
                  <span style={{ color: '#0E5560', fontSize: 12.5, fontWeight: 600 }}>🏥 {convPet?.convenio?.nome || 'Convênio'} paga (a receber)</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#0E5560' }}>{brl(totalConvenio)}</span>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 14px', background: SUAVE, borderTop: `1px solid ${SOFT}` }}>
                <span style={{ color: INK2, fontSize: 13 }}>{totalConvenio > 0 ? '👤 Tutor paga agora' : 'Total da venda'}</span>
                <span style={{ fontSize: 21, fontWeight: 500, color: NAVY }}>{brl(total)}</span>
              </div>
            </div>

            {/* 3 observações */}
            {step('📝', 'Observações')}
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="" style={{ ...inp, width: '100%', resize: 'vertical' }} />
            <p style={{ fontSize: 11, color: MUT, margin: '6px 0 18px' }}>As observações serão impressas no demonstrativo de venda ou orçamento.</p>

            {/* rodapé */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: `1px solid ${SOFT}`, paddingTop: 16 }}>
              {!editandoId && <button onClick={abrirRecebimento} disabled={!baseValida || tipo === 'ORCAMENTO'} style={{ border: 'none', borderRadius: 9, background: (baseValida && tipo === 'VENDA') ? TEAL : '#cfd8d9', color: '#fff', padding: '11px 18px', fontSize: 13.5, fontWeight: 500, cursor: (baseValida && tipo === 'VENDA') ? 'pointer' : 'not-allowed' }}>💰 Registrar recebimento</button>}
              <button onClick={salvar} disabled={!baseValida || salvando} style={{ border: editandoId ? 'none' : `1px solid ${LINE}`, borderRadius: 9, background: editandoId ? (baseValida ? TEAL : '#cfd8d9') : '#fff', padding: '11px 18px', fontSize: 13.5, fontWeight: editandoId ? 500 : 400, cursor: baseValida ? 'pointer' : 'not-allowed', color: editandoId ? '#fff' : INK }}>{salvando ? 'Salvando…' : editandoId ? '💾 Salvar alterações' : tipo === 'ORCAMENTO' ? '💾 Salvar orçamento' : '💾 Salvar'}</button>
              <button onClick={imprimirAtual} disabled={!carrinho.length} title={tipo === 'ORCAMENTO' ? 'Imprimir o orçamento' : 'Imprimir a venda'} style={{ border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', padding: '11px 16px', fontSize: 13.5, cursor: carrinho.length ? 'pointer' : 'not-allowed', color: INK, opacity: carrinho.length ? 1 : 0.5 }}>🖨️ Imprimir {tipo === 'ORCAMENTO' ? 'orçamento' : 'venda'}</button>
              <button onClick={reset} style={{ marginLeft: 'auto', border: 'none', background: 'none', color: MUT, padding: '11px', fontSize: 13, cursor: 'pointer' }}>✕ Cancelar</button>
            </div>
          </div>
        </div>

        {/* ===== COLUNA DIREITA ===== */}
        <div style={{ flex: '1 1 230px', minWidth: 215, maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={card}>
            <div style={{ ...chLeve, justifyContent: 'space-between' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: NAVY, fontSize: 13.5, fontWeight: 500 }}>🧾 Vendas</span>
              <button onClick={() => { loadVendas(); loadOrcamentos(); }} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 14 }} aria-label="Atualizar">🔄</button>
            </div>
            <div style={{ padding: '2px 13px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {(() => {
                const ehHoje = vendaDia === hoje();
                const fmtBR = (s: string) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
                const shiftDia = (delta: number) => { const dt = new Date(vendaDia + 'T12:00:00'); dt.setDate(dt.getDate() + delta); setVendaDia(dt.toISOString().slice(0, 10)); };
                const btn = { width: 28, height: 28, borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', color: MUT, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, lineHeight: 1 } as const;
                return (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, opacity: vendaAbertas ? 0.5 : 1, pointerEvents: vendaAbertas ? 'none' : 'auto' }}>
                    <button onClick={() => shiftDia(-1)} aria-label="Dia anterior" style={btn}>‹</button>
                    <button
                      onClick={() => { const el = vendaDiaRef.current; if (!el) return; if ((el as any).showPicker) (el as any).showPicker(); else el.click(); }}
                      style={{ position: 'relative', height: 28, padding: '0 12px', borderRadius: 8, border: `1px solid ${LINE}`, background: '#fff', color: NAVY, cursor: 'pointer', fontSize: 12.5, fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                      {ehHoje ? 'Hoje · ' : ''}{fmtBR(vendaDia)}
                      <input ref={vendaDiaRef} type="date" value={vendaDia} onChange={(e) => e.target.value && setVendaDia(e.target.value)} tabIndex={-1} style={{ position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' }} />
                    </button>
                    <button onClick={() => shiftDia(1)} aria-label="Próximo dia" style={btn}>›</button>
                  </div>
                );
              })()}
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
              {vendasFiltradas.length === 0 && (vendaTab !== 'NAO' || orcamentosDoDia.length === 0) && (
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
              {/* 🗓️ A COBRAR EM BREVE — venda com data pra frente (não some mais da tela). */}
              {vendasFuturas.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px dashed ${LINE}` }}>
                  <div style={{ fontSize: 10.5, color: MUT, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>
                    🗓️ A cobrar em breve · {vendasFuturas.length}
                  </div>
                  {vendasFuturas.slice(0, 6).map((v: any) => (
                    <div key={v.id} onClick={() => abrirDetVenda(v)} title="Abrir venda" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 4px', cursor: 'pointer', borderRadius: 8 }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAF7')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                      <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#FBF0DA', color: '#8A5A12', fontSize: 13, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>🗓️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.tutor}</div>
                        <div style={{ fontSize: 11, color: MUT }}>{v.pet} · {new Date(v.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</div>
                      </div>
                      <span style={{ background: '#FBF0DA', color: '#8A5A12', fontSize: 11, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{brl(v.valor)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 📄 ORÇAMENTOS em aberto — MESMA lista, valor em ROXO pra diferenciar + botão converter. */}
              {vendaTab === 'NAO' && orcamentosDoDia.slice(0, 8).map((o) => (
                <div key={o.id} onClick={() => setDetOrc(o._orc || o)} title="Abrir orçamento" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderTop: `1px solid ${SOFT}`, borderRadius: 8, cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#FAFAF7')} onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ width: 32, height: 32, borderRadius: '50%', background: '#EDE9FE', color: '#6D28D9', fontSize: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.tutor}</div>
                    <div style={{ fontSize: 11, color: MUT }}>{o.pet}{o.pet ? ' · ' : ''}<span style={{ color: '#6D28D9', fontWeight: 600 }}>orçamento</span></div>
                  </div>
                  <span style={{ background: '#EDE9FE', color: '#6D28D9', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap' }}>{brl(o.valor)}</span>
                  {/* Converter em venda só ao ABRIR o orçamento (botão no modal de detalhe) — não na lista. */}
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

      {/* ===== DETALHE DO ORÇAMENTO (abre ao clicar na linha roxa) ===== */}
      {detOrc && (
        <div onClick={() => setDetOrc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16 }}>
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#6D28D9', fontSize: 15, fontWeight: 500 }}>📄 Orçamento</span>
              <button onClick={() => setDetOrc(null)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontWeight: 600, color: INK, fontSize: 14 }}>{detOrc.tutor?.name || 'Cliente'}{detOrc.pet?.name ? ` · ${detOrc.pet.name}` : ''}</div>
              <div style={{ fontSize: 12, color: MUT, marginBottom: 12 }}>{detOrc.createdAt ? new Date(detOrc.createdAt).toLocaleDateString('pt-BR') : ''}{detOrc.validade ? ` · válido até ${new Date(detOrc.validade).toLocaleDateString('pt-BR')}` : ''}</div>
              <div style={{ border: `1px solid ${SOFT}`, borderRadius: 10, overflow: 'hidden' }}>
                {(detOrc.itens || []).length === 0 ? (
                  <div style={{ padding: 12, textAlign: 'center', color: MUT, fontSize: 12 }}>Sem itens.</div>
                ) : (detOrc.itens || []).map((it: any, i: number) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '8px 12px', borderTop: i ? `1px solid ${SOFT}` : 'none', fontSize: 13 }}>
                    <span style={{ color: INK }}>{it.descricao || it.servico?.nome || it.product?.name || 'Item'}{Number(it.quantidade) > 1 ? ` ×${it.quantidade}` : ''}</span>
                    <span style={{ color: NAVY, fontWeight: 500, whiteSpace: 'nowrap' }}>{brl(Number(it.valorTotal ?? (Number(it.quantidade || 1) * Number(it.valorUnitario || 0))))}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ color: INK2, fontSize: 13 }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: NAVY }}>{brl(Number(detOrc.valorTotal || 0))}</span>
              </div>
              {detOrc.observacao && <div style={{ marginTop: 10, fontSize: 12, color: '#374151' }}><b>Obs:</b> {detOrc.observacao}</div>}
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={() => imprimirOrcamento(detOrc)} style={{ border: `1px solid ${LINE}`, borderRadius: 9, background: '#fff', padding: '10px 14px', fontSize: 13, cursor: 'pointer', color: INK }}>🖨️ Imprimir orçamento</button>
                <button onClick={async () => { await converterOrcamento({ id: detOrc.id, tutor: detOrc.tutor?.name || 'Cliente', valor: Number(detOrc.valorTotal || 0) }); setDetOrc(null); }} style={{ marginLeft: 'auto', border: 'none', borderRadius: 9, background: '#6D28D9', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>→ Converter em venda</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETALHE DA VENDA ===== */}
      {detVenda && (
        <div onClick={() => { setDetVenda(null); setEditItens(null); setRecOpen(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 70, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
          <style>{`@keyframes pdvSlideOver{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', height: '100vh', overflowY: 'auto', background: SUAVE, borderLeft: `1px solid ${LINE}`, boxShadow: '-12px 0 30px rgba(0,0,0,.14)', animation: 'pdvSlideOver .18s ease-out' }}>
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
                        {/* a lista embutida de 2.000 opcoes virou o ItemPicker (dropdown de 12) — ver o fim do arquivo */}
                        {editItens.map((it: any, i: number) => (
                          <div key={i} style={{ borderBottom: `1px solid ${SOFT}`, padding: '8px 10px' }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                              <ItemPicker value={it.descricao} servicos={servicos} inpStyle={{ ...inp, width: '100%', padding: '6px 8px' }} onType={(val) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, descricao: val } : x))} onPick={(nome, valor) => setEditItens((c) => c!.map((x, j) => j === i ? { ...x, descricao: nome, valorUnitario: valor || x.valorUnitario } : x))} />
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
                        {exclusaoDaVenda.pode ? (
                          <button onClick={excluirVenda} disabled={detExcluindo} style={{ flex: 1, minWidth: 120, background: '#fff', color: '#A32D2D', border: '1px solid #F0C9C9', borderRadius: 9, padding: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{detExcluindo ? 'Excluindo…' : '🗑 Excluir'}</button>
                        ) : (
                          <div style={{ flex: 1, minWidth: 200, background: '#FBF7EF', border: `1px solid ${LINE}`, borderRadius: 9, padding: '8px 10px', fontSize: 11.5, color: MUT, lineHeight: 1.35 }}>🔒 {exclusaoDaVenda.motivo}</div>
                        )}
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
          <div onClick={() => setRecOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 80, display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: '100%', height: '100vh', overflowY: 'auto', background: SUAVE, borderLeft: `1px solid ${LINE}`, boxShadow: '-12px 0 30px rgba(0,0,0,.14)', animation: 'pdvSlideOver .18s ease-out' }}>
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

      {/* 🔓 Liberação de gerente — desconto acima do limite (senha mascarada) */}
      {libOpen && (
        <div onClick={() => fecharLiberacao(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); if (libEmail.trim() && libSenha) fecharLiberacao({ email: libEmail.trim(), senha: libSenha }); }}
            style={{ width: 360, maxWidth: '100%', background: SUAVE, border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden' }}
          >
            <div style={{ padding: '13px 18px', borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: NAVY, fontSize: 15 }}>🔓 Liberação do gerente</b>
              <button type="button" onClick={() => fecharLiberacao(null)} style={{ border: 'none', background: 'none', color: MUT, cursor: 'pointer', fontSize: 16 }} aria-label="Fechar">✕</button>
            </div>
            <div style={{ padding: 18 }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: INK2, lineHeight: 1.5 }}>O desconto passa do limite. Um gerente (admin) precisa autorizar com e-mail e senha.</p>
              <label style={{ display: 'block', fontSize: 12, color: MUT, marginBottom: 4 }}>E-mail do gerente</label>
              <input
                type="email" value={libEmail} onChange={(e) => setLibEmail(e.target.value)} autoFocus autoComplete="off"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 14, background: '#fff', color: INK, marginBottom: 12 }}
              />
              <label style={{ display: 'block', fontSize: 12, color: MUT, marginBottom: 4 }}>Senha</label>
              <input
                type="password" value={libSenha} onChange={(e) => setLibSenha(e.target.value)} autoComplete="off"
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 14, background: '#fff', color: INK }}
              />
              <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
                <button type="button" onClick={() => fecharLiberacao(null)} style={{ flex: 1, background: '#fff', color: MUT, border: `1px solid ${LINE}`, fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 9, cursor: 'pointer' }}>Cancelar</button>
                <button type="submit" disabled={!libEmail.trim() || !libSenha} style={{ flex: 1, background: NAVY, color: '#fff', border: 'none', fontSize: 14, fontWeight: 500, padding: 11, borderRadius: 9, cursor: (!libEmail.trim() || !libSenha) ? 'not-allowed' : 'pointer', opacity: (!libEmail.trim() || !libSenha) ? .6 : 1 }}>Autorizar</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}


// Seletor de item do catalogo. Trazido da branch portal-integracao (commit 2afc9e36,
// 01/09/2026), que existia justamente porque as telas de EDICAO usavam <input list> com
// ~700 opcoes e digitar travava. Mostra 12 resultados por vez, com o preco ao lado.
function ItemPicker({ value, servicos, inpStyle, onType, onPick, placeholder }: {
  value: string; servicos: any[]; inpStyle: React.CSSProperties;
  onType: (val: string) => void; onPick: (nome: string, valorPadrao: number) => void; placeholder?: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [q, setQ] = useState(value || '');
  useEffect(() => { setQ(value || ''); }, [value]);
  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [] as any[];
    return servicos.filter((s) => (s.nome || '').toLowerCase().includes(t)).slice(0, 12);
  }, [servicos, q]);
  return (
    <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <input value={q} placeholder={placeholder || 'Buscar no catálogo…'} style={inpStyle}
        onFocus={() => setAberto(true)} onBlur={() => setTimeout(() => setAberto(false), 150)}
        onChange={(e) => { setQ(e.target.value); onType(e.target.value); setAberto(true); }} />
      {aberto && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, marginTop: 2, background: '#fff', border: '1px solid #E8E2D6', borderRadius: 9, boxShadow: '0 8px 24px -6px rgba(0,0,0,.16)', maxHeight: 200, overflowY: 'auto' }}>
          {matches.map((s) => (
            <button key={s.id} type="button" onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onPick(s.nome, Number(s.valorPadrao || 0)); setQ(s.nome); setAberto(false); }}
              style={{ display: 'flex', width: '100%', justifyContent: 'space-between', gap: 8, padding: '7px 10px', border: 'none', borderBottom: '1px solid #F0EBE0', background: '#fff', cursor: 'pointer', fontSize: 12.5, textAlign: 'left' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nome}</span>
              <span style={{ color: '#5C6B70', flexShrink: 0 }}>{Number(s.valorPadrao || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
