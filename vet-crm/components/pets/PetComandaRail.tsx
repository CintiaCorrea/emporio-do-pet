"use client";
// A VENDA E O ORÇAMENTO DA FICHA DO PET — o carrinho.
//
// Cintia, 16/09/2026: "Quero que possa lançar os itens e salvar, seja como orçamento ou como venda
// (no SimplesVet ele separa isso por abas) e as ações nesse caso são salvar e imprimir. Tem que
// separar orçamento e venda, só transformar quando solicitado." E: "nada é para entrar como texto
// solto em vendas, tudo deve vir do catálogo", "sem preço à mão, peso tem que estar registrado".
//
// Até ali o carrinho GRAVAVA SOZINHO: 800 ms depois de cada item, criava uma venda de verdade no
// servidor — inclusive quando a pessoa estava montando um orçamento, que então virava venda e
// orçamento ao mesmo tempo. Agora nada vai ao servidor até alguém clicar em Salvar. O que está
// sendo montado fica guardado neste computador (por pet e por aba) até salvar.

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { LuShoppingCart, LuTrash, LuX, LuPrinter, LuArrowRight } from "react-icons/lu";
import toast from "react-hot-toast";
import { textoDoOrcamento } from "@/lib/textoDoOrcamento";
import BotaoAbrirNoPDV from "@/components/vendas/BotaoAbrirNoPDV";
import PesoDaVenda from "@/components/vendas/PesoDaVenda";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { imprimirVenda } from "@/lib/documentos/venda-print";
import { carregarCatalogoVendavel, lancarDoCadastro, itemParaVenda, labDoItem, nomeSemMarcador, type ItemVendavel } from "@/lib/catalogoVendavel";
import { aplicarPeso, lerFaixas, type FaixaPorte } from "@/lib/porte";
import { carregarEstoqueComprometido, avisoDeEstoque, MapaEstoque } from "@/lib/estoqueComprometido";
import { buscarItens, avisoDeCorte } from "@/lib/buscaCatalogo";
import SeletorModeloVenda from "@/components/vendas/SeletorModeloVenda";
import { casarNoCatalogo, juntarObservacao, ModeloVenda } from "@/lib/modelosVenda";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Item = { _faixas?: FaixaPorte[]; _faixaRotulo?: string | null; _avisoPorte?: string | null; descricao: string; servicoId?: string; quantidade: number; valorUnitario: number; custoUnitario?: number; fornecedorId?: string | null; fornecedorNome?: string | null; catalogoExameId?: string; _exame?: boolean; _novo?: boolean; catalogoItemId?: string; _convenio?: boolean; convenioId?: string; _convLabel?: string };
type Aba = "VENDA" | "ORCAMENTO";

const ST: any = {
  RASCUNHO: { l: "Aberto", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};

// Serializa um item p/ o servidor — NÚCLEO ÚNICO `itemParaVenda` (o mesmo do ponto de venda).
const linhaBody = (it: Item) => it._convenio
  ? { descricao: it.descricao, valorUnitario: Number(it.valorUnitario) || 0, convenioId: it.convenioId, quantidade: Number(it.quantidade) || 1, valorTotal: (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) }
  : ({ ...itemParaVenda(it as any), quantidade: Number(it.quantidade) || 1, valorTotal: (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) });
const somaDe = (arr: Item[]) => arr.reduce((s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0), 0);
// Total que o TUTOR paga = exclui itens do convênio (esses viram a-receber mensal do convênio).
const somaTutor = (arr: Item[]) => arr.reduce((s, it) => s + (it._convenio ? 0 : (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0)), 0);
const somaConvenio = (arr: Item[]) => arr.reduce((s, it) => s + (it._convenio ? (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) : 0), 0);

const ler = (k: string, padrao: any) => { try { const v = localStorage.getItem(k); return v == null ? padrao : JSON.parse(v); } catch { return padrao; } };
const gravar = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* sem armazenamento: segue na memória */ } };

export default function PetComandaRail({ petId, tutorId, petNome, tutorNome }: { petId: string; tutorId?: string; petNome?: string; tutorNome?: string }) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";

  // PESO DO PET — o registro central é o bloco de peso do prontuário. Item cobrado por faixa não
  // entra sem ele; a caixa de peso deixa registrar aqui mesmo (components/vendas/PesoDaVenda).
  const [pesoPet, setPesoPet] = useState<number | null>(null);
  const [pedindoPeso, setPedindoPeso] = useState(false);
  useEffect(() => {
    if (!petId) { setPesoPet(null); return; }
    let cancelado = false;
    (async () => {
      try {
        const d = await fetch(`/api/pets/${petId}`, { cache: "no-store" }).then((r) => r.json()).catch(() => null);
        const kg = Number(d?.weight ?? d?.pesoAtual);
        if (!cancelado) setPesoPet(Number.isFinite(kg) && kg > 0 ? kg : null);
      } catch { if (!cancelado) setPesoPet(null); }
    })();
    return () => { cancelado = true; };
  }, [petId]);

  const [aberto, setAberto] = useState(false);
  const [aba, setAba] = useState<Aba>("VENDA");
  // Link de outra tela (Orçamentos, ponto de venda): ?carrinho=orcamento abre direto na aba Orçamento.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("carrinho");
      if (q === "orcamento") { setAba("ORCAMENTO"); setAberto(true); }
      else if (q === "venda") { setAba("VENDA"); setAberto(true); }
    } catch { /* */ }
  }, []);
  const orcando = aba === "ORCAMENTO";

  // O QUE ESTÁ SENDO MONTADO, por aba — venda e orçamento não se misturam.
  const chave = (a: Aba, o: "itens" | "obs") => `carrinho_${a === "VENDA" ? "venda" : "orcamento"}_${o}_${petId}`;
  const [itensPorAba, setItensPorAba] = useState<Record<Aba, Item[]>>({ VENDA: [], ORCAMENTO: [] });
  const [obsPorAba, setObsPorAba] = useState<Record<Aba, string>>({ VENDA: "", ORCAMENTO: "" });
  const itens = itensPorAba[aba];
  const obs = obsPorAba[aba];
  const setItens = (fn: (arr: Item[]) => Item[]) => setItensPorAba((p) => ({ ...p, [aba]: fn(p[aba]) }));
  const setObs = (fn: string | ((o: string) => string)) => setObsPorAba((p) => ({ ...p, [aba]: typeof fn === "function" ? fn(p[aba]) : fn }));

  useEffect(() => {
    // A comanda antiga (gravação automática) deixava rascunho e id de venda guardados aqui. A venda
    // já está no servidor; o rascunho não pode reaparecer e ser salvo de novo como outra venda.
    try { localStorage.removeItem(`comanda_${petId}`); localStorage.removeItem(`comanda_appt_${petId}`); localStorage.removeItem(`comanda_obs_${petId}`); } catch { /* */ }
    setItensPorAba({ VENDA: ler(chave("VENDA", "itens"), []), ORCAMENTO: ler(chave("ORCAMENTO", "itens"), []) });
    setObsPorAba({ VENDA: ler(chave("VENDA", "obs"), ""), ORCAMENTO: ler(chave("ORCAMENTO", "obs"), "") });
    // eslint-disable-next-line
  }, [petId]);
  useEffect(() => {
    gravar(chave("VENDA", "itens"), itensPorAba.VENDA); gravar(chave("ORCAMENTO", "itens"), itensPorAba.ORCAMENTO);
    gravar(chave("VENDA", "obs"), obsPorAba.VENDA); gravar(chave("ORCAMENTO", "obs"), obsPorAba.ORCAMENTO);
    // eslint-disable-next-line
  }, [itensPorAba, obsPorAba]);

  const naoSalvos = itensPorAba.VENDA.length + itensPorAba.ORCAMENTO.length;
  // Saiu da página com coisa montada e não salva: o navegador pergunta antes.
  useEffect(() => {
    if (!naoSalvos) return;
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", antes);
    return () => window.removeEventListener("beforeunload", antes);
  }, [naoSalvos]);

  const [estoque, setEstoque] = useState<MapaEstoque>(new Map());
  // O catálogo vem INTEIRO, com as faixas de peso — a cópia reduzida que existia descartava
  // `_precosPorte` e o peso nunca era consultado (11/09/2026).
  const [cat, setCat] = useState<ItemVendavel[]>([]);
  useEffect(() => { carregarCatalogoVendavel().then(setCat).catch(() => {}); }, []);

  /** Lança um item do cadastro na aba aberta. Devolve false quando não entrou (e diz por quê). */
  const addDoCatalogo = (c: ItemVendavel, quantidade = 1, silencioso = false): boolean => {
    const q = Math.max(1, Number(quantidade) || 1);
    const r = lancarDoCadastro(c, pesoPet, petNome);
    if (!r.ok) {
      if (r.motivo === "sem_peso") setPedindoPeso(true);
      if (!silencioso) toast.error(r.mensagem, { duration: 7000 });
      return false;
    }
    const l = r.linha;
    const jaNaVenda = itens.filter((x) => x.catalogoItemId === l.catalogoItemId).reduce((n, x) => n + (Number(x.quantidade) || 0), 0);
    const aviso = avisoDeEstoque(estoque, l.catalogoItemId, q, jaNaVenda);
    if (aviso) toast(`⚠️ ${aviso}`, { duration: 6000 });
    setItens((arr) => [...arr, { descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: q, _faixas: l._faixas, _faixaRotulo: l._faixaRotulo, _avisoPorte: l._avisoPorte }]);
    return true;
  };

  // Peso registrado agora: as linhas cobradas por faixa pegam o preço da faixa do peso novo.
  function aoRegistrarPeso(kg: number) {
    setPesoPet(kg); setPedindoPeso(false);
    setItensPorAba((p) => ({ VENDA: p.VENDA.map((x) => aplicarPeso(x, kg)), ORCAMENTO: p.ORCAMENTO.map((x) => aplicarPeso(x, kg)) }));
  }

  // 📄 Modelo: lança os itens do modelo casados com o cadastro, pelo preço de hoje e pelo peso,
  // e escreve a observação. O que não entrar é dito pelo nome.
  const aplicarModelo = (m: ModeloVenda) => {
    const naoEntraram: string[] = [];
    let entraram = 0;
    for (const it of m.itens) {
      const c = casarNoCatalogo(it, cat as any);
      if (!c) { naoEntraram.push(`${it.descricao || "(item sem nome)"} (fora do cadastro)`); continue; }
      if (addDoCatalogo(c as any, it.quantidade, true)) entraram++;
      else naoEntraram.push(nomeSemMarcador((c as any).nome));
    }
    setObs((o) => juntarObservacao(o, m.observacao));
    if (naoEntraram.length) toast.error(`Não entrou: ${naoEntraram.join(", ")}.${!pesoPet ? " Registre o peso do pet." : ""}`, { duration: 9000 });
    if (entraram || m.observacao) toast.success(`Modelo "${m.nome}" aplicado${entraram ? ` · ${entraram} ${entraram > 1 ? "itens" : "item"}` : ""}`);
    setAberto(true);
  };

  // 📷 Leitor de código de barras: digita o código + Enter.
  function tentarCodigoBarras(q: string): boolean {
    const t = q.trim(); if (!t) return false;
    const c = cat.find((x) => (x.codigoBarras && String(x.codigoBarras) === t) || (x.codigo != null && String(x.codigo) === t));
    if (!c) return false;
    if (addDoCatalogo(c)) { setBusca(""); toast.success(`${nomeSemMarcador(c.nome)} lançado`); }
    return true;
  }
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);

  // 🏥 Convênio do pet (Petlife etc.) — tabela do convênio, precificada por porte.
  const [convPet, setConvPet] = useState<{ convenio: { id: string; nome: string; diaFechamento: number | null }; isCat: boolean; porteSugerido: string } | null>(null);
  const [convItens, setConvItens] = useState<{ precoId: string; itemNome: string; preco: number }[]>([]);
  const [convBusca, setConvBusca] = useState("");
  const [convPorte, setConvPorte] = useState("");
  const [convOpen, setConvOpen] = useState(false);
  async function carregarConv(pid: string, b: string, porte: string) {
    try {
      const qs = new URLSearchParams({ petId: pid }); if (b) qs.set("busca", b); if (porte) qs.set("porte", porte);
      const r = await fetch(`/api/catalogo/convenios/tabela-pet?${qs.toString()}`, { cache: "no-store" });
      if (!r.ok) { setConvPet(null); setConvItens([]); return; }
      const d = await r.json();
      if (d && d.convenio) { setConvPet({ convenio: d.convenio, isCat: !!d.isCat, porteSugerido: d.porteSugerido || "m" }); setConvItens(Array.isArray(d.itens) ? d.itens : []); }
      else { setConvPet(null); setConvItens([]); }
    } catch { setConvPet(null); setConvItens([]); }
  }
  useEffect(() => { setConvBusca(""); setConvPorte(""); setConvOpen(false); if (petId) carregarConv(petId, "", ""); /* eslint-disable-next-line */ }, [petId]);
  useEffect(() => { if (petId && convPet?.convenio) carregarConv(petId, convBusca, convPorte); /* eslint-disable-next-line */ }, [convBusca, convPorte]);
  function addConvenioItem(item: { itemNome: string; preco: number }) {
    if (!convPet?.convenio) return;
    setItens((arr) => [...arr, { descricao: item.itemNome, quantidade: 1, valorUnitario: Number(item.preco) || 0, _convenio: true, convenioId: convPet.convenio.id, _convLabel: convPet.convenio.nome }]);
    setAberto(true);
  }

  const [orcs, setOrcs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [enviandoWhats, setEnviandoWhats] = useState(false);
  // A última venda salva daqui — para ir receber no ponto de venda.
  const [ultimaVenda, setUltimaVenda] = useState<{ id: string; numeroVenda: number | null } | null>(null);
  async function loadOrcs() {
    try { const r = await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || [])); } catch { /* */ }
  }
  useEffect(() => { if (aberto) loadOrcs(); /* eslint-disable-next-line */ }, [aberto, petId]);
  useEffect(() => { if (aberto) carregarEstoqueComprometido().then(setEstoque); }, [aberto]);

  // Outras partes da ficha lançam na VENDA (ex.: cobrar o exame pedido). O item precisa existir no
  // cadastro: acha pelo id do cadastro ou pelo nome — texto solto não entra.
  useEffect(() => {
    function onAdd(e: any) {
      const d = e?.detail; if (!d?.descricao) return;
      const c = cat.find((x) => (d.catalogoItemId && x.id === d.catalogoItemId) || nomeSemMarcador(x.nome).trim().toLowerCase() === String(d.descricao).trim().toLowerCase());
      if (!c) { toast.error(`"${d.descricao}" não está no cadastro de produtos e serviços — não entrou na venda.`); return; }
      setAba("VENDA"); setAberto(true);
      const r = lancarDoCadastro(c, pesoPet, petNome);
      if (!r.ok) { if (r.motivo === "sem_peso") setPedindoPeso(true); toast.error(r.mensagem, { duration: 7000 }); return; }
      const l = r.linha;
      setItensPorAba((p) => ({ ...p, VENDA: [...p.VENDA, { descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: Number(d.quantidade) || 1, _faixas: l._faixas, _faixaRotulo: l._faixaRotulo, _avisoPorte: l._avisoPorte }] }));
      toast.success("Lançado na venda");
    }
    window.addEventListener("comanda:add", onAdd as any);
    return () => window.removeEventListener("comanda:add", onAdd as any);
  }, [cat, pesoPet, petNome]);

  const total = useMemo(() => somaDe(itens), [itens]);
  const totalTutor = useMemo(() => somaTutor(itens), [itens]);
  const totalConvenio = useMemo(() => somaConvenio(itens), [itens]);
  const pendenciaDePreco = itens.find((it) => it._avisoPorte);
  function setQtd(i: number, q: number) { setItens((arr) => arr.map((x, idx) => idx === i ? { ...x, quantidade: Math.max(1, q) } : x)); }
  function del(i: number) { setItens((arr) => arr.filter((_, idx) => idx !== i)); }
  function limpar() {
    if (itens.length && !confirm(`Limpar ${orcando ? "o orçamento" : "a venda"} que está sendo montado?`)) return;
    setItens(() => []); setObs("");
  }
  const busca40 = useMemo(() => buscarItens(cat, busca, (c) => c.nome, 40), [cat, busca]);
  const matches = busca.trim() ? busca40.itens : [];
  const corte = busca.trim() ? avisoDeCorte(busca40) : "";

  function imprimirComanda() {
    if (!itens.length) { toast.error("Nada lançado."); return; }
    // O PAPEL DIZ O QUE É: Orçamento ou Venda. Sem número no papel; com a observação do modelo.
    imprimirVenda(
      { itens: itens.map(linhaBody), valor: total, petNome, tutorNome, petId, observacao: obs || undefined, date: new Date().toISOString() },
      { rotulo: orcando ? "Orçamento" : "Venda" },
    );
  }

  function podeSalvar(): boolean {
    if (!itens.length) { toast.error("Nada lançado."); return false; }
    if (pendenciaDePreco) { toast.error(`${pendenciaDePreco.descricao}: ${pendenciaDePreco._avisoPorte}`); if (!pesoPet) setPedindoPeso(true); return false; }
    return true;
  }

  // SALVAR A VENDA: grava UMA vez, com os itens do cadastro. Ela entra em "A receber".
  async function salvarVenda() {
    if (!podeSalvar()) return;
    if (!tutorId) { toast.error("Pet sem tutor — a venda precisa de um cliente."); return; }
    if (!meId) { toast.error("Sessão ainda carregando. Tente de novo em um instante."); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/appointments`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, tutorId, userId: meId, date: new Date().toISOString(), type: "Venda", status: "COMPLETED", value: somaTutor(itens), items: itens.map(linhaBody), notes: obs.trim() || null }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data?.message || "Não consegui salvar a venda.");
      const numeroVenda = data?.numeroVenda != null ? Number(data.numeroVenda) : null;
      setUltimaVenda({ id: data.id, numeroVenda });
      setItens(() => []); setObs("");
      try { window.dispatchEvent(new Event("pet:venda")); } catch { /* */ }
      toast.success(numeroVenda ? `Venda nº ${numeroVenda} salva — está em “A receber”.` : "Venda salva — está em “A receber”.");
    } catch (e: any) { toast.error(e?.message || "Não consegui salvar a venda."); }
    finally { setSaving(false); }
  }

  // SALVAR O ORÇAMENTO: não cobra ninguém. Vira venda só quando alguém pedir, na lista abaixo.
  async function salvarOrcamento(): Promise<boolean> {
    if (!podeSalvar()) return false;
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, observacao: obs.trim() || undefined, itens: itens.map(linhaBody) }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Não consegui salvar o orçamento."); }
      toast.success("Orçamento salvo ✅");
      setItens(() => []); setObs(""); await loadOrcs();
      return true;
    } catch (e: any) { toast.error(e?.message || "Não consegui salvar o orçamento."); return false; }
    finally { setSaving(false); }
  }

  /**
   * REGISTRA E ENVIA O ORÇAMENTO NO WHATSAPP. O registro vem PRIMEIRO: enviado e não gravado era o
   * caso em que ninguém conseguia cobrar o retorno (Cintia, 09/09/2026).
   */
  async function enviarOrcamentoWhats() {
    if (!podeSalvar()) return;
    if (!tutorId) { toast.error("Pet sem tutor — não dá pra enviar."); return; }
    setEnviandoWhats(true);
    try {
      const texto = textoDoOrcamento({ petNome, tutorNome, itens, total, observacao: obs });
      const salvou = await fetch(`/api/orcamentos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, tutorId, observacao: obs.trim() || undefined, itens: itens.map(linhaBody) }),
      }).then((r) => r.ok).catch(() => false);
      const r = await fetch(`/api/whatsapp/enviar-documentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId, texto, petNome }) });
      if (!r.ok) throw new Error();
      toast.success(salvou ? "Orçamento enviado e registrado ✅" : "Enviado no WhatsApp — mas NÃO consegui registrar o orçamento.");
      if (salvou) { setItens(() => []); setObs(""); await loadOrcs(); }
    } catch { toast.error("Não consegui enviar pelo WhatsApp. Confira o número do tutor."); }
    finally { setEnviandoWhats(false); }
  }

  // TRANSFORMAR EM VENDA: o orçamento some e vira venda (como no SimplesVet).
  async function transformarEmVenda(o: any) {
    if (!confirm(`Transformar o orçamento de ${BRL(o.valorTotal)} em venda?\n\nA venda entra em “A receber” e o orçamento deixa de existir.`)) return;
    try {
      const r = await fetch(`/api/orcamentos/${o.id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Não consegui transformar em venda.");
      setUltimaVenda({ id: d.id, numeroVenda: d?.numeroVenda ?? null });
      toast.success("Orçamento transformado em venda ✅"); await loadOrcs();
      try { window.dispatchEvent(new Event("pet:venda")); } catch { /* */ }
    } catch (e: any) { toast.error(e?.message || "Não consegui transformar em venda."); }
  }
  async function excluirOrcamento(o: any) {
    if (!confirm(`Excluir o orçamento de ${BRL(o.valorTotal)}?`)) return;
    try {
      const r = await fetch(`/api/orcamentos/${o.id}`, { method: "DELETE" });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Não consegui excluir."); }
      toast.success("Orçamento excluído"); await loadOrcs();
    } catch (e: any) { toast.error(e?.message || "Não consegui excluir."); }
  }

  // Esc fecha. O que foi montado continua guardado neste computador até salvar.
  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [aberto]);

  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} title="Abrir venda e orçamento do pet"
        className="fixed z-40 flex items-center gap-2 text-white font-bold shadow-lg print:hidden hover:brightness-105 transition"
        style={{ right: 20, bottom: 20, background: "#009AAC", borderRadius: 999, padding: "12px 18px" }}>
        <LuShoppingCart size={18} />
        <span style={{ fontSize: 13 }}>Venda{naoSalvos ? ` (${naoSalvos} não salvo${naoSalvos > 1 ? "s" : ""})` : ""}</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 print:hidden"
      style={{ background: "rgba(20,26,28,.45)" }} onClick={() => setAberto(false)}>
      <div className="bg-white border shadow-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 720, maxWidth: "96vw", maxHeight: "90vh", borderColor: "#E8DFC8" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
          <b style={{ color: "#014D5E", fontSize: 15 }}>{petNome || "Pet"}{tutorNome ? ` · ${tutorNome}` : ""}</b>
          <button onClick={() => setAberto(false)} className="text-[#94a3b8]" title="Fechar (o que foi montado fica guardado até salvar)"><LuX size={18} /></button>
        </div>
        <div className="flex" role="tablist" style={{ borderBottom: "1px solid #F0EBE0" }}>
          {(["VENDA", "ORCAMENTO"] as const).map((k) => {
            const n = itensPorAba[k].length;
            return (
              <button key={k} role="tab" aria-selected={aba === k} onClick={() => { setAba(k); setBusca(""); }} className="flex-1 text-[13px] font-semibold py-2.5"
                style={{ color: aba === k ? "#009AAC" : "#8A857A", borderBottom: aba === k ? "2px solid #009AAC" : "2px solid transparent" }}>
                {k === "VENDA" ? "🛒 Venda" : "📄 Orçamento"}{n ? ` (${n})` : ""}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-auto">
          <div className="px-3 pt-3 flex flex-col gap-2">
            <PesoDaVenda petId={petId} petNome={petNome} pesoKg={pesoPet} onPeso={aoRegistrarPeso} pedindo={pedindoPeso} />
            <SeletorModeloVenda compacto onAplicar={aplicarModelo} className="w-full border rounded-lg px-2 py-1.5 text-[12.5px] bg-white" style={{ borderColor: "#E8DFC8", color: "#5C6B70" }} />
            <button onClick={() => { setAddOpen((v) => !v); setBusca(""); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Adicionar item do cadastro {addOpen ? "▲" : "▾"}</button>
            {addOpen && (
              <div>
                <input id={`busca-carrinho-${petId}`} value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!tentarCodigoBarras(busca) && matches.length === 1) { if (addDoCatalogo(matches[0])) setBusca(""); } } }} autoFocus placeholder="🔍 Buscar no cadastro ou ler código de barras…" className="w-full border rounded-lg px-2 py-1.5 text-[12.5px]" style={{ borderColor: "#E8DFC8" }} />
                {busca.trim() && (
                  <div className="border rounded-lg mt-1 overflow-auto" style={{ borderColor: "#F0EBE0", maxHeight: "min(40vh, 360px)" }}>
                    {matches.length === 0 ? <div className="text-[12px] text-gray-400 text-center py-3">Nada encontrado no cadastro</div> :
                      matches.map((c) => {
                        const porPeso = lerFaixas(c._precosPorte).length > 0;
                        const lab = labDoItem(c);
                        return (
                          <button key={c.id} title={c.nome} onClick={() => { if (addDoCatalogo(c)) setBusca(""); }} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                            <span className="text-[#1F2A2E] truncate pr-2 flex items-center gap-1.5 min-w-0"><span className="truncate">{nomeSemMarcador(c.nome)}</span>{lab ? <span className="shrink-0 text-[10px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null}</span>
                            <span className="text-[#0F6E56] font-semibold shrink-0">{porPeso ? "⚖️ pelo peso" : BRL(c.valorPadrao)}</span>
                          </button>
                        );
                      })}
                  </div>
                )}
                {corte && <div className="text-[10.5px] text-[#8A857A] mt-1 px-0.5">{corte}</div>}
              </div>
            )}

            {convPet?.convenio && (
              <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: "#BEE3E8", background: "#F0FBFC" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12px] font-bold" style={{ color: "#0E5560" }}>🏥 {convPet.convenio.nome} paga</span>
                  <span className="inline-flex items-center gap-1 text-[11px]" style={{ color: "#5C6B70" }}>Porte:
                    {["gato", "p", "m", "g", "gg"].map((pt) => { const on = (convPorte || convPet.porteSugerido) === pt; return <button key={pt} onClick={() => setConvPorte(pt)} className="rounded-full font-semibold" style={{ padding: "2px 8px", fontSize: 10.5, border: `1px solid ${on ? "#0C93A6" : "#D9D2C0"}`, background: on ? "#0C93A6" : "#fff", color: on ? "#fff" : "#5C6B70", cursor: "pointer" }}>{pt === "gato" ? "🐱" : pt.toUpperCase()}</button>; })}
                  </span>
                  <button onClick={() => setConvOpen((o) => !o)} className="ml-auto text-[11.5px] font-semibold rounded-lg" style={{ color: "#009AAC", border: "1px solid #E8DFC8", background: "#fff", padding: "4px 9px", cursor: "pointer" }}>{convOpen ? "fechar" : "＋ item convênio"}</button>
                </div>
                {convOpen && (
                  <div className="mt-2">
                    <input value={convBusca} onChange={(e) => setConvBusca(e.target.value)} placeholder={`🔍 Buscar na tabela ${convPet.convenio.nome}…`} className="w-full border rounded-lg px-2 py-1.5 text-[12px]" style={{ borderColor: "#E8DFC8" }} />
                    <div className="border rounded-lg mt-1 max-h-40 overflow-auto bg-white" style={{ borderColor: "#F0EBE0" }}>
                      {convItens.length === 0 ? <div className="text-[12px] text-gray-400 text-center py-3">Nada encontrado nessa tabela.</div> :
                        convItens.map((it) => (
                          <button key={it.precoId} title={it.itemNome} onClick={() => addConvenioItem(it)} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                            <span className="text-[#1F2A2E] truncate pr-2">{it.itemNome}</span><span className="text-[#0E5560] font-semibold shrink-0">{BRL(it.preco)}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="px-4 py-2">
            {itens.length > 0 && (
              <div className="grid items-center gap-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400" style={{ gridTemplateColumns: "1fr 64px 96px 24px" }}>
                <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Valor</span><span></span>
              </div>
            )}
            {itens.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-8">Nada lançado {orcando ? "no orçamento" : "na venda"}.<br />Use “Adicionar item do cadastro” ou um modelo.</div>
            ) : itens.map((it, i) => (
              <div key={i} className="grid items-center gap-3 py-2 border-b" style={{ gridTemplateColumns: "1fr 64px 96px 24px", borderColor: "#F5F1E8" }}>
                <div className="min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E] truncate flex items-center gap-1.5" title={it.descricao}>
                    <span className="truncate">{it.descricao}</span>
                    {it._convenio ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: "#E0F0F2", color: "#0E5560" }}>🏥 {it._convLabel} paga</span>
                      : (() => { const lab = labDoItem({ _exame: !!it.fornecedorNome, _fornecedorNome: it.fornecedorNome }); return lab ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}
                  </div>
                  <div className="text-[11px]" style={{ color: it._avisoPorte ? "#8A5A0B" : "#9CA3AF" }}>
                    {BRL(it.valorUnitario)} cada{it._faixaRotulo ? ` · faixa ${it._faixaRotulo}` : ""}{it._avisoPorte ? ` · ${it._avisoPorte}` : ""}
                  </div>
                </div>
                <input type="number" min={1} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} aria-label={`Quantidade de ${it.descricao}`} className="w-full border rounded-lg text-center text-[12.5px] py-1" style={{ borderColor: "#E8DFC8" }} />
                <span className="text-[13.5px] font-semibold text-[#0F6E56] text-right tabular-nums">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                <button onClick={() => del(i)} className="text-[#b23b39]" title="Remover"><LuTrash size={13} /></button>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2">
            <label htmlFor={`obs-carrinho-${petId}`} className="text-[10px] text-[#8A857A] uppercase tracking-wide">Observação {orcando ? "do orçamento" : "da venda"}</label>
            <textarea id={`obs-carrinho-${petId}`} value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="O que o cliente precisa saber (o modelo preenche sozinho)…" className="w-full mt-0.5 border rounded-lg px-2 py-1.5 text-[12px] resize-y" style={{ borderColor: "#E8DFC8" }} />
          </div>

          <div className="border-t px-4 py-3" style={{ borderColor: "#F0EBE0" }}>
            {totalConvenio > 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11.5px] font-semibold" style={{ color: "#0E5560" }}>🏥 {convPet?.convenio?.nome || "Convênio"} paga (a receber)</span>
                <span className="text-[13px] font-semibold tabular-nums" style={{ color: "#0E5560" }}>{BRL(totalConvenio)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-[13px] font-semibold text-[#014D5E]">{totalConvenio > 0 ? "👤 Tutor paga" : "Total"}</span>
              <span className="text-[22px] font-bold text-[#014D5E] tabular-nums">{BRL(totalTutor)}</span>
            </div>
            <p className="text-[11px] mt-0.5 mb-2" style={{ color: orcando ? "#0E5560" : "#8A5A0B" }}>
              {orcando ? "Orçamento não cobra o cliente. Vira venda só quando alguém pedir." : "Ao salvar, a venda entra em “A receber”."}
            </p>
            <div className="flex gap-2">
              <button onClick={imprimirComanda} disabled={!itens.length} className="flex-1 border-2 rounded-lg py-2 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={13} /> Imprimir</button>
              {orcando ? (
                <button onClick={salvarOrcamento} disabled={saving || !itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }}>📄 Salvar orçamento</button>
              ) : (
                <button onClick={salvarVenda} disabled={saving || !itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }}>💰 Salvar venda</button>
              )}
            </div>
            {orcando && (
              <button onClick={enviarOrcamentoWhats} disabled={enviandoWhats || !itens.length || !tutorId} title="Salva o orçamento e envia pro cliente no WhatsApp" className="w-full mt-2 rounded-lg py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#25D366" }}>{enviandoWhats ? "Enviando…" : "💬 Salvar e enviar no WhatsApp"}</button>
            )}
            {!orcando && ultimaVenda && (
              <div className="flex items-center justify-between gap-2 mt-2 text-[11.5px]" style={{ color: "#0F6E56" }}>
                <span>✓ Última venda salva{ultimaVenda.numeroVenda ? ` · nº ${ultimaVenda.numeroVenda}` : ""}</span>
                <BotaoAbrirNoPDV vendaId={ultimaVenda.id} rotulo="Receber no PDV" />
              </div>
            )}
            {itens.length > 0 && <button onClick={limpar} className="w-full text-[11px] text-gray-400 mt-2">limpar</button>}
          </div>

          {orcando && (
            <div className="px-3 pb-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-[#8A857A] px-1 mb-1.5">Orçamentos salvos deste pet</div>
              {orcs.length === 0 ? <div className="text-center text-[12px] text-gray-400 py-4">Nenhum orçamento salvo.</div> :
                orcs.map((o) => {
                  const st = ST[o.status] || ST.RASCUNHO;
                  return (
                    <div key={o.id} className="border rounded-lg px-2.5 py-2 mb-2" style={{ borderColor: "#F0EBE0" }}>
                      <div className="flex justify-between items-center">
                        <span className="text-[12.5px] font-semibold text-[#0F6E56]">{BRL(o.valorTotal)}</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: st.b, color: st.c }}>{st.l}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""} · {(o.itens || []).length} {(o.itens || []).length === 1 ? "item" : "itens"}</div>
                      {(o.itens || []).length > 0 && (
                        <div className="mt-1 border-t pt-1" style={{ borderColor: "#F5F1E8" }}>
                          {(o.itens || []).map((it: any, i: number) => (
                            <div key={i} className="flex justify-between gap-2 text-[11px] text-[#5C6B70] py-[1px]">
                              <span className="truncate">{(Number(it.quantidade) || 1) > 1 ? `${Number(it.quantidade)}× ` : ""}{it.descricao || "Item"}</span>
                              <span className="tabular-nums shrink-0">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {o.observacao ? <div className="text-[10.5px] text-gray-400 mt-1"><b>Obs:</b> {o.observacao}</div> : null}
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        <button onClick={() => imprimirOrcamento(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={11} /> Imprimir</button>
                        <button onClick={() => transformarEmVenda(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-white" style={{ background: "#009AAC" }}><LuArrowRight size={11} /> Transformar em venda</button>
                        <button onClick={() => excluirOrcamento(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#F0CFCF", color: "#A32D2D" }}><LuTrash size={11} /> Excluir</button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
