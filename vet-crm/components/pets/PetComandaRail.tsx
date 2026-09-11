"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { LuShoppingCart, LuPlus, LuTrash, LuX, LuPrinter, LuArrowRight } from "react-icons/lu";
import toast from "react-hot-toast";
import { textoDoOrcamento } from "@/lib/textoDoOrcamento";
import BotaoAbrirNoPDV from "@/components/vendas/BotaoAbrirNoPDV";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { imprimirVenda } from "@/lib/documentos/venda-print";
import { carregarCatalogoVendavel, linhaDoItem, itemParaVenda, labDoItem } from "@/lib/catalogoVendavel";
import FaixaDePesoDaLinha from "@/components/vendas/FaixaDePesoDaLinha";
import { aplicarFaixa, type FaixaPorte } from "@/lib/porte";
import { carregarEstoqueComprometido, avisoDeEstoque, MapaEstoque } from "@/lib/estoqueComprometido";
import { buscarItens, avisoDeCorte } from "@/lib/buscaCatalogo";
import SeletorModeloVenda from "@/components/vendas/SeletorModeloVenda";
import { casarNoCatalogo, juntarObservacao, ModeloVenda } from "@/lib/modelosVenda";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Item = { _faixas?: FaixaPorte[]; _faixaRotulo?: string | null; _avisoPorte?: string | null; descricao: string; servicoId?: string; quantidade: number; valorUnitario: number; custoUnitario?: number; fornecedorId?: string | null; fornecedorNome?: string | null; catalogoExameId?: string; _exame?: boolean; _novo?: boolean; catalogoItemId?: string; _convenio?: boolean; convenioId?: string; _convLabel?: string };

const ST: any = {
  RASCUNHO: { l: "Rascunho", c: "#64748b", b: "#eef2f4" },
  APROVADO: { l: "Aprovado", c: "#0F6E56", b: "#E7F6EF" },
  RECUSADO: { l: "Recusado", c: "#A32D2D", b: "#fbe6e6" },
  EXPIRADO: { l: "Expirado", c: "#92400e", b: "#fef3c7" },
};

// Serializa um item da comanda p/ o formato de venda do backend — NÚCLEO ÚNICO `itemParaVenda`
// (mesmo do PDV/atendimento/internação/orçamento). A tela só acrescenta quantidade + total.
const linhaBody = (it: Item) => it._convenio
  // Item de convênio (Petlife): vai marcado com convenioId (sai do total do tutor, vira a-receber mensal). Sem servicoId/produto.
  ? { descricao: it.descricao, valorUnitario: Number(it.valorUnitario) || 0, convenioId: it.convenioId, quantidade: Number(it.quantidade) || 1, valorTotal: (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) }
  : ({ ...itemParaVenda(it as any), quantidade: Number(it.quantidade) || 1, valorTotal: (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) });
const somaDe = (arr: Item[]) => arr.reduce((s, it) => s + (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0), 0);
// Total que o TUTOR paga = exclui itens do convênio (esses viram a-receber mensal do convênio).
const somaTutor = (arr: Item[]) => arr.reduce((s, it) => s + (it._convenio ? 0 : (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0)), 0);
const somaConvenio = (arr: Item[]) => arr.reduce((s, it) => s + (it._convenio ? (Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0) : 0), 0);

export default function PetComandaRail({ petId, tutorId, petNome, tutorNome }: { petId: string; tutorId?: string; petNome?: string; tutorNome?: string }) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";
  // PESO DO PET — e ele que escolhe a faixa de preco dos itens cobrados por porte.
  // Mesmo caminho do ponto de venda: vem do cadastro e, quando falta, a linha pede a faixa
  // na mao. Peso ausente NUNCA trava o lancamento; so deixa de decidir sozinho.
  const [pesoPet, setPesoPet] = useState<number | null>(null);
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
  const [sub, setSub] = useState<"VENDA" | "ORC">("VENDA");
  const [itens, setItens] = useState<Item[]>([]);
  const [estoque, setEstoque] = useState<MapaEstoque>(new Map()); // núcleo lib/estoqueComprometido
  const [cat, setCat] = useState<{ id: string; nome: string; valor: number; custoPadrao?: number; _precosPorte?: string | null; _exame?: boolean; _fornecedorId?: string | null; _fornecedorNome?: string | null; codigo?: number | null; codigoBarras?: string | null }[]>([]);
  const addDoCatalogo = (c: any, quantidade = 1) => {
    const q = Math.max(1, Number(quantidade) || 1);   // o modelo traz a quantidade dele; a mão lança 1
    const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor ?? c.valorPadrao, custoPadrao: c.custoPadrao, _precosPorte: c._precosPorte ?? null, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome }, pesoPet);
    // Aviso (não trava) quando o saldo já está prometido em outra venda aberta — lib/estoqueComprometido.
    const jaNaVenda = itens.filter((x) => x.catalogoItemId === l.catalogoItemId).reduce((n, x) => n + (Number(x.quantidade) || 0), 0);
    const aviso = avisoDeEstoque(estoque, l.catalogoItemId, q, jaNaVenda);
    if (aviso) toast(`⚠️ ${aviso}`, { duration: 6000 });
    // O aviso do porte aparece na hora: sem peso no cadastro, a pessoa escolhe a faixa na
    // linha. Antes, o item entrava calado pelo preco da faixa mais barata.
    if (l._avisoPorte) toast(`⚖️ ${l._avisoPorte}`, { duration: 7000 });
    addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: q, _faixas: l._faixas, _faixaRotulo: l._faixaRotulo, _avisoPorte: l._avisoPorte });
  };

  // 📄 Modelo de venda: lança os itens do modelo na comanda e escreve a observação. Mesmo núcleo
  // do PDV (lib/modelosVenda) — o item entra casado com o catálogo, pelo preço de hoje. Item que
  // não está mais no catálogo não entra calado: a tela diz o nome.
  const aplicarModelo = (m: ModeloVenda) => {
    const foraDoCatalogo: string[] = [];
    let entraram = 0;
    for (const it of m.itens) {
      const c = casarNoCatalogo(it, cat as any);
      if (!c) { foraDoCatalogo.push(it.descricao || "(item sem nome)"); continue; }
      addDoCatalogo(c, it.quantidade);
      entraram++;
    }
    setObs((o) => juntarObservacao(o, m.observacao));
    if (foraDoCatalogo.length) toast.error(`Fora do catálogo, não entrou: ${foraDoCatalogo.join(", ")}. Cadastre o item ou lance à mão.`, { duration: 9000 });
    if (entraram || m.observacao) toast.success(`Modelo "${m.nome}" aplicado${entraram ? ` · ${entraram} ${entraram > 1 ? "itens" : "item"}` : ""}`);
    setAberto(true);
  };
  // 📷 Leitura de código de barras: o scanner USB digita o código + Enter. No Enter, se casar com um
  // código de barras (ou o código do item), lança direto e limpa o campo.
  function tentarCodigoBarras(q: string): boolean {
    const t = q.trim(); if (!t) return false;
    const c = cat.find((x) => (x.codigoBarras && String(x.codigoBarras) === t) || (x.codigo != null && String(x.codigo) === t));
    if (!c) return false;
    addDoCatalogo(c); setBusca(""); toast.success(`${c.nome} lançado`);
    return true;
  }
  const [busca, setBusca] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  // Observação da venda: o que o modelo escreve ("informações básicas já podem ficar registradas
  // na observação" — Cintia, 06/09/2026) e o que a recepção acrescenta. Vai pro `notes` da venda.
  const [obs, setObs] = useState("");
  const obsRef = useRef("");
  // 🏥 Convênio do pet (Petlife etc.) — mesma tabela do PDV, precificada por porte.
  const [convPet, setConvPet] = useState<{ convenio: { id: string; nome: string; diaFechamento: number | null }; isCat: boolean; porteSugerido: string } | null>(null);
  const [convItens, setConvItens] = useState<{ precoId: string; itemNome: string; preco: number }[]>([]);
  const [convBusca, setConvBusca] = useState("");
  const [convPorte, setConvPorte] = useState("");
  const [convOpen, setConvOpen] = useState(false);
  const [orcs, setOrcs] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [enviandoWhats, setEnviandoWhats] = useState(false);
  // A comanda é uma VENDA em aberto no servidor (aparece no Caixa). Guardamos o id dela.
  const [apptId, setApptId] = useState<string | null>(null);
  const [numeroVenda, setNumeroVenda] = useState<number | null>(null);
  const [sync, setSync] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const key = `comanda_${petId}`;
  const apptKey = `comanda_appt_${petId}`;
  const obsKey = `comanda_obs_${petId}`;
  const carregou = useRef(false);
  const primeira = useRef(true);
  // sincronização com o servidor (debounce + trava anti-duplicidade)
  const apptIdRef = useRef<string | null>(null);
  const pendingRef = useRef<Item[]>([]);
  const timerRef = useRef<any>(null);
  const syncingRef = useRef(false);
  const redoRef = useRef(false);
  useEffect(() => { apptIdRef.current = apptId; }, [apptId]);

  // Carrega a comanda salva (rascunho local + id da venda no servidor)
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setItens(JSON.parse(raw) || []); } catch {}
    try { const a = localStorage.getItem(apptKey); if (a) { setApptId(a); apptIdRef.current = a; } } catch {}
    try { const o = localStorage.getItem(obsKey) || ""; setObs(o); obsRef.current = o; } catch {}
    carregou.current = true;
    // eslint-disable-next-line
  }, [petId]);
  // Persiste o rascunho local (resposta instantânea, mesmo offline)
  useEffect(() => { if (carregou.current) { try { localStorage.setItem(key, JSON.stringify(itens)); } catch {} } }, [itens, key]);
  // A observação segue o mesmo caminho dos itens: guarda local pra não sumir no F5 e sobe pro
  // servidor no mesmo debounce (só faz sentido quando já existe venda com item).
  useEffect(() => {
    obsRef.current = obs;
    if (!carregou.current) return;
    try { localStorage.setItem(obsKey, obs); } catch {}
    if (primeira.current) return;
    if (itens.length) agendarSync(itens);
    // eslint-disable-next-line
  }, [obs]);

  // Catálogo (produtos + serviços + medicamentos/vacinas + exames) — FONTE ÚNICA
  useEffect(() => {
    (async () => {
      try {
        const its = await carregarCatalogoVendavel();
        // `_precosPorte` PRECISA VIR JUNTO. Esta copia reduzida do catalogo descartava as faixas
        // de peso, e o item chegava ao nucleo de preco como se fosse de preco unico — o peso
        // nunca era consultado e ninguem era avisado. Era o defeito que a Cintia via em
        // 11/09/2026 ("o sistema continua nao lendo o peso").
        setCat(its.map((i) => ({ id: i.id, nome: i.nome, valor: i.valorPadrao, custoPadrao: i.custoPadrao, _precosPorte: i._precosPorte ?? null, _exame: i._exame, _fornecedorId: i._fornecedorId, _fornecedorNome: i._fornecedorNome, codigo: i.codigo ?? null, codigoBarras: i.codigoBarras ?? null })));
      } catch {}
    })();
  }, []);

  // 🏥 Carrega a tabela do convênio DO PET (resolve pela etiqueta do pet + porte) — igual ao PDV.
  async function carregarConv(pid: string, busca: string, porte: string) {
    try {
      const qs = new URLSearchParams({ petId: pid }); if (busca) qs.set("busca", busca); if (porte) qs.set("porte", porte);
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
    addItem({ descricao: item.itemNome, quantidade: 1, valorUnitario: Number(item.preco) || 0, _convenio: true, convenioId: convPet.convenio.id, _convLabel: convPet.convenio.nome });
    setAberto(true);
  }

  // 💾 SINCRONIZA a comanda com o servidor (vira venda em aberto → aparece no Caixa).
  // Cria no 1º item, atualiza a cada mudança (sem duplicar), e APAGA quando esvazia.
  async function sincronizar() {
    if (syncingRef.current) { redoRef.current = true; return; }
    if (!tutorId) { setSync("idle"); return; } // sem tutor não dá pra abrir venda
    if (!meId) { setSync("idle"); return; } // sem usuário logado o backend recusa (userId obrigatório) — espera a sessão carregar
    syncingRef.current = true;
    const arr = pendingRef.current;
    try {
      setSync("saving");
      if (arr.length === 0) {
        if (apptIdRef.current) {
          await fetch(`/api/appointments/${apptIdRef.current}`, { method: "DELETE" });
          setApptId(null); apptIdRef.current = null; setNumeroVenda(null);
          try { localStorage.removeItem(apptKey); } catch {}
          try { window.dispatchEvent(new Event("pet:venda")); } catch {}
        }
        setSync("idle");
        return;
      }
      const body: any = { value: somaTutor(arr), items: arr.map(linhaBody), notes: obsRef.current.trim() || null }; // value = só o que o tutor paga (convênio sai do total)
      const eraNovo = !apptIdRef.current;
      let r: Response;
      if (apptIdRef.current) {
        r = await fetch(`/api/appointments/${apptIdRef.current}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        r = await fetch(`/api/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, userId: meId, date: new Date().toISOString(), type: "Venda", status: "COMPLETED", ...body }) });
      }
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message || e?.error || `HTTP ${r.status}`); }
      const data = await r.json().catch(() => ({}));
      if (eraNovo && data?.id) { setApptId(data.id); apptIdRef.current = data.id; try { localStorage.setItem(apptKey, data.id); } catch {} }
      if (data?.numeroVenda != null) setNumeroVenda(Number(data.numeroVenda));
      setSync("saved");
      if (eraNovo) { try { window.dispatchEvent(new Event("pet:venda")); } catch {} } // avisa a ficha só ao CRIAR
    } catch (e: any) { setSync("error"); toast.error("Não consegui salvar a venda: " + (e?.message || "erro")); }
    finally {
      syncingRef.current = false;
      if (redoRef.current) { redoRef.current = false; setTimeout(sincronizar, 60); }
    }
  }
  function agendarSync(next: Item[]) {
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(sincronizar, 800);
  }
  // Dispara a sincronização a cada mudança dos itens (pula o carregamento inicial).
  useEffect(() => {
    if (!carregou.current) return;
    if (primeira.current) { primeira.current = false; pendingRef.current = itens; return; }
    agendarSync(itens);
    // eslint-disable-next-line
  }, [itens]);
  // Ao sair da tela, garante que a última mudança foi salva.
  useEffect(() => () => { if (timerRef.current) { clearTimeout(timerRef.current); sincronizar(); } /* eslint-disable-next-line */ }, []);
  // Se o usuário logado só carregou DEPOIS de já ter itens na comanda, salva agora (antes o POST era recusado por falta de userId).
  useEffect(() => { if (meId && itens.length && !apptIdRef.current) { pendingRef.current = itens; sincronizar(); } /* eslint-disable-next-line */ }, [meId]);

  async function loadOrcs() {
    try { const r = await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" }); const d = await r.json(); setOrcs(Array.isArray(d) ? d : (d.data || d.orcamentos || [])); } catch {}
  }
  useEffect(() => { if (aberto) loadOrcs(); /* eslint-disable-next-line */ }, [aberto, petId]);
  useEffect(() => { if (aberto) carregarEstoqueComprometido().then(setEstoque); }, [aberto]);

  // Gancho p/ outras partes da ficha lançarem itens na comanda
  useEffect(() => {
    function onAdd(e: any) { const d = e?.detail; if (!d?.descricao) return; addItem({ descricao: d.descricao, servicoId: d.servicoId, valorUnitario: Number(d.valorUnitario) || 0, custoUnitario: d.custoUnitario != null ? Number(d.custoUnitario) : undefined, fornecedorId: d.fornecedorId ?? undefined, fornecedorNome: d.fornecedorNome ?? undefined, catalogoExameId: d.catalogoExameId, _exame: d._exame, _novo: d._novo, catalogoItemId: d.catalogoItemId, quantidade: Number(d.quantidade) || 1 }); setAberto(true); toast.success("Lançado na venda"); }
    window.addEventListener("comanda:add", onAdd as any);
    return () => window.removeEventListener("comanda:add", onAdd as any);
    // eslint-disable-next-line
  }, []);

  const total = useMemo(() => somaDe(itens), [itens]);
  const totalTutor = useMemo(() => somaTutor(itens), [itens]);
  const totalConvenio = useMemo(() => somaConvenio(itens), [itens]);
  function addItem(it: Item) { setItens((arr) => [...arr, it]); }
  function setQtd(i: number, q: number) { setItens((arr) => arr.map((x, idx) => idx === i ? { ...x, quantidade: Math.max(1, q) } : x)); }
  function del(i: number) { setItens((arr) => arr.filter((_, idx) => idx !== i)); }
  // Troca a faixa de UMA linha — pet sem peso no cadastro, ou peso que caiu numa faixa sem
  // preco. A regra e do nucleo (lib/porte.aplicarFaixa), a mesma do ponto de venda.
  function trocarFaixa(i: number, rotulo: string) {
    setItens((arr) => arr.map((x, idx) => (idx === i ? aplicarFaixa(x, rotulo) : x)));
  }
  async function limpar() {
    if (apptId && !confirm("Limpar a venda? Ela também sai do Caixa.")) return;
    setItens([]); setObs("");
  }
  // Mesmo nucleo de busca da venda (lib/buscaCatalogo, com teste): sem acento acha,
  // palavra fora de ordem acha. Sem busca, mostra os 20 primeiros como antes.
  const busca40 = useMemo(() => buscarItens(cat, busca, (c) => c.nome, 40), [cat, busca]);
  const matches = busca.trim() ? busca40.itens : cat.slice(0, 20);
  const corte = busca.trim() ? avisoDeCorte(busca40) : "";   // o corte da lista nunca é mudo

  function imprimirComanda() {
    if (!itens.length) { toast.error("Venda sem itens."); return; }
    imprimirVenda({ itens: itens.map(linhaBody), valor: total, petNome, tutorNome, petId, numeroVenda, date: new Date().toISOString() }, { rotulo: "Venda" });
  }
  // Comanda = venda (modelo SimplesVet): SALVA a venda, ela vira independente em "A receber" no Caixa
  // (visível a todos, paga ou não), e a comanda FECHA/LIMPA pra iniciar OUTRA venda na hora.
  // NÃO abre a tela de venda (princípio da Cintia). Não apaga a venda salva — só "solta" o vínculo local.
  async function salvarVenda() {
    if (!itens.length) { toast.error("Venda sem itens."); return; }
    if (!apptIdRef.current) { pendingRef.current = itens; await sincronizar(); }
    if (!apptIdRef.current) { toast.error("Não consegui salvar a venda. Tente de novo."); return; }
    const num = numeroVenda;
    // Solta a venda salva (detacha ANTES de zerar itens, senão o sync apagaria o appointment).
    if (timerRef.current) clearTimeout(timerRef.current);
    setApptId(null); apptIdRef.current = null; setNumeroVenda(null);
    try { localStorage.removeItem(apptKey); localStorage.removeItem(key); } catch {}
    pendingRef.current = [];
    setItens([]); setObs("");
    try { window.dispatchEvent(new Event("pet:venda")); } catch {} // ficha recarrega Compras / a-receber
    toast.success(`Venda${num ? ` nº ${num}` : ""} salva ✅ — está em “A receber” no Caixa. Pode iniciar outra.`);
  }

  async function gerarOrcamento() {
    if (!itens.length) { toast.error("Venda sem itens."); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, observacao: obs.trim() || undefined, itens: itens.map(linhaBody) }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento gerado ✅"); await limpar(); await loadOrcs(); setSub("ORC");
    } catch { toast.error("Erro ao gerar orçamento"); } finally { setSaving(false); }
  }
  // 💬 Envia o orçamento pro cliente no WhatsApp (mesmo princípio do inbox: cai na conversa do tutor).
  // O TEXTO MORA NO NÚCLEO (lib/textoDoOrcamento, com teste). Em 08/09/2026 a Cintia pediu o
  // envio também na aba de Orçamentos da Consulta de vendas — dois textos parecidos seriam dois
  // orçamentos diferentes saindo da mesma clínica, para o mesmo cliente, dependendo de qual tela
  // a pessoa abriu. O cliente não sabe que são duas telas; ele vê a casa se contradizendo.
  function montarTextoOrcamento() {
    return textoDoOrcamento({ petNome, tutorNome, itens, total, observacao: obs });
  }
  /**
   * REGISTRA E ENVIA. A Cintia, 09/09/2026: "hoje você escreve, ele já envia, mas não fica
   * registrado no sistema que já passamos".
   *
   * Era assim: o botao montava o texto e mandava, sem gravar nada. O cliente recebia um
   * orcamento que nao existia em lugar nenhum — ninguem conseguia cobrar o retorno, nem saber
   * quanto foi passado, nem que o orcamento existiu. O do inbox ja salvava antes de enviar; a
   * comanda era a unica que nao.
   *
   * O registro vem PRIMEIRO. Se o WhatsApp falhar, o orcamento fica salvo e da pra reenviar —
   * o contrario (enviar e nao gravar) e o que estava acontecendo.
   */
  async function enviarOrcamentoWhats() {
    if (!itens.length) { toast.error("Venda sem itens."); return; }
    if (!tutorId) { toast.error("Pet sem tutor — não dá pra enviar."); return; }
    setEnviandoWhats(true);
    try {
      const texto = montarTextoOrcamento();
      const salvou = await fetch(`/api/orcamentos`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId, tutorId, observacao: obs.trim() || undefined, itens: itens.map(linhaBody) }),
      }).then((r) => r.ok).catch(() => false);

      const r = await fetch(`/api/whatsapp/enviar-documentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId, texto, petNome }) });
      if (!r.ok) throw new Error();

      // A tela DIZ o que aconteceu com o registro. Enviado e nao gravado precisa aparecer:
      // e o caso em que a pessoa acha que ficou na pasta e nao ficou.
      toast.success(salvou ? "Orçamento enviado e registrado ✅" : "Enviado no WhatsApp — mas NÃO consegui registrar o orçamento.");
      if (salvou) { await loadOrcs(); }
    } catch { toast.error("Não consegui enviar pelo WhatsApp. Confira o número do tutor."); }
    finally { setEnviandoWhats(false); }
  }
  async function converterOrc(id: string) {
    if (!confirm("Transformar este orçamento em venda? (cria a venda com os mesmos itens)")) return;
    try {
      const r = await fetch(`/api/orcamentos/${id}/converter`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!r.ok) throw new Error();
      toast.success("Orçamento transformado em venda ✅"); await loadOrcs();
      try { window.dispatchEvent(new Event("pet:venda")); } catch {} // avisa a ficha p/ recarregar Compras
    } catch { toast.error("Erro ao transformar em venda"); }
  }

  // Esc fecha o pop-up.
  useEffect(() => {
    if (!aberto) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [aberto]);

  const nItens = itens.length;
  const statusTxt = !tutorId ? "sem tutor — não vai ao Caixa"
    : sync === "saving" ? "salvando no Caixa…"
    : sync === "error" ? "⚠️ erro ao salvar — mexa em algo p/ tentar de novo"
    : apptId ? `✓ No Caixa${numeroVenda ? ` · nº ${numeroVenda}` : ""} · a receber`
    : "vai pro Caixa ao adicionar itens";
  const statusCor = sync === "error" ? "#B23B39" : apptId ? "#0F6E56" : "#8A857A";

  // Botão flutuante (canto inferior direito)
  if (!aberto) {
    return (
      <button onClick={() => setAberto(true)} title="Abrir a venda do pet"
        className="fixed z-40 flex items-center gap-2 text-white font-bold shadow-lg print:hidden hover:brightness-105 transition"
        style={{ right: 20, bottom: 20, background: "#009AAC", borderRadius: 999, padding: "12px 18px" }}>
        <LuShoppingCart size={18} />
        <span style={{ fontSize: 13 }}>Venda{nItens ? ` (${nItens})` : ""}</span>
      </button>
    );
  }

  // Pop-up CENTRAL (antes era uma faixa lateral de 330px, difícil de ler): fecha no Esc, clicando
  // fora ou no ✕. O que estava lançado continua salvo — a venda já foi pro Caixa sozinha.
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 print:hidden"
      style={{ background: "rgba(20,26,28,.45)" }} onClick={() => setAberto(false)}>
      <div className="bg-white border shadow-2xl flex flex-col rounded-2xl overflow-hidden"
        style={{ width: 720, maxWidth: "96vw", maxHeight: "88vh", borderColor: "#E8DFC8" }}
        onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
        <b style={{ color: "#014D5E", fontSize: 15 }}>🛒 Venda — {petNome || "pet"}{tutorNome ? ` · ${tutorNome}` : ""}</b>
        <button onClick={() => setAberto(false)} className="text-[#94a3b8]" title="Fechar"><LuX size={18} /></button>
      </div>
      <div className="flex" style={{ borderBottom: "1px solid #F0EBE0" }}>
        {(["VENDA", "ORC"] as const).map((k) => (
          <button key={k} onClick={() => setSub(k)} className="flex-1 text-[12.5px] font-semibold py-2" style={{ color: sub === k ? "#009AAC" : "#8A857A", borderBottom: sub === k ? "2px solid #009AAC" : "2px solid transparent" }}>
            {k === "VENDA" ? `🛒 Venda${nItens ? ` (${nItens})` : ""}` : "📄 Orçamentos"}
          </button>
        ))}
      </div>

      {sub === "VENDA" ? (
        <>
          <div className="px-3 pt-3">
            <SeletorModeloVenda compacto onAplicar={aplicarModelo} className="w-full mb-2 border rounded-lg px-2 py-1.5 text-[12.5px] bg-white" style={{ borderColor: "#E8DFC8", color: "#5C6B70" }} />
            <button onClick={() => { setAddOpen((v) => !v); setBusca(""); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Adicionar item {addOpen ? "▲" : "▾"}</button>
            {addOpen && (
              <div className="mt-2">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!tentarCodigoBarras(busca) && matches.length === 1) { addDoCatalogo(matches[0]); setBusca(""); } } }} autoFocus placeholder="🔍 Buscar ou ler código de barras…" className="w-full border rounded-lg px-2 py-1.5 text-[12.5px]" style={{ borderColor: "#E8DFC8" }} />
                {busca.trim() && (
                <div className="border rounded-lg mt-1 overflow-auto" style={{ borderColor: "#F0EBE0", maxHeight: "min(52vh, 420px)" }}>
                  {matches.length === 0 ? <div className="text-[12px] text-gray-400 text-center py-3">Nada encontrado</div> :
                    matches.map((c) => (
                      <button key={c.id} title={c.nome} onClick={() => { const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor, custoPadrao: c.custoPadrao, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome }); addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: 1 }); setBusca(""); }} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                        <span className="text-[#1F2A2E] truncate pr-2 flex items-center gap-1.5 min-w-0"><span className="truncate">{c.nome}</span>{(() => { const lab = labDoItem(c); return lab ? <span className="shrink-0 text-[10px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}</span><span className="text-[#0F6E56] font-semibold shrink-0">{BRL(c.valor)}</span>
                      </button>
                    ))}
                </div>
                )}
                {corte && <div className="text-[10.5px] text-[#8A857A] mt-1 px-0.5">{corte}</div>}
              </div>
            )}
          </div>

          {convPet?.convenio && (
            <div className="px-3 pt-2">
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
                    <div className="text-[10px] text-gray-400 mt-1">O item entra marcado “{convPet.convenio.nome} paga” — sai do total do tutor e vira a-receber mensal do convênio.</div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto px-4 py-2">
            {itens.length > 0 && (
              <div className="grid items-center gap-3 py-1.5 text-[10px] uppercase tracking-wide text-gray-400"
                style={{ gridTemplateColumns: "1fr 64px 96px 24px" }}>
                <span>Item</span><span className="text-center">Qtd</span><span className="text-right">Valor</span><span></span>
              </div>
            )}
            {itens.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-10">Nada lançado ainda.<br />Use “Adicionar item”.</div>
            ) : itens.map((it, i) => (
              <div key={i} className="grid items-center gap-3 py-2 border-b" style={{ gridTemplateColumns: "1fr 64px 96px 24px", borderColor: "#F5F1E8" }}>
                <div className="min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E] truncate flex items-center gap-1.5" title={it.descricao}>
                    <span className="truncate">{it.descricao}</span>
                    {it._convenio ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: "#E0F0F2", color: "#0E5560" }}>🏥 {it._convLabel} paga</span>
                      : (() => { const lab = labDoItem({ _exame: !!it.fornecedorNome, _fornecedorNome: it.fornecedorNome }); return lab ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}
                  </div>
                  <div className="text-[11px] text-gray-400">{BRL(it.valorUnitario)} cada</div>
                  {/* ⚖️ so aparece em item cobrado por faixa de peso */}
                  <FaixaDePesoDaLinha
                    faixas={it._faixas}
                    faixaRotulo={it._faixaRotulo}
                    aviso={it._avisoPorte}
                    pesoKg={pesoPet}
                    petNome={petNome}
                    onTrocar={(r) => trocarFaixa(i, r)}
                  />
                </div>
                <input type="number" min={1} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} className="w-full border rounded-lg text-center text-[12.5px] py-1" style={{ borderColor: "#E8DFC8" }} />
                <span className="text-[13.5px] font-semibold text-[#0F6E56] text-right tabular-nums">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                <button onClick={() => del(i)} className="text-[#b23b39]" title="Remover"><LuTrash size={13} /></button>
              </div>
            ))}
          </div>

          <div className="px-4 pb-2">
            <label className="text-[10px] text-[#8A857A] uppercase tracking-wide">Observação da venda</label>
            <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} placeholder="O que o cliente precisa saber (o modelo preenche sozinho)…" className="w-full mt-0.5 border rounded-lg px-2 py-1.5 text-[12px] resize-y" style={{ borderColor: "#E8DFC8" }} />
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
            <div className="flex items-center justify-between gap-2 mb-2 mt-0.5 flex-wrap">
              <span className="text-[10.5px]" style={{ color: statusCor }}>{statusTxt}</span>
              {/* A comanda JA E uma venda em aberto no caixa. Daqui se vai ao ponto de venda,
                  que e onde se recebe — a comanda lanca, o PDV cobra. */}
              <BotaoAbrirNoPDV vendaId={apptId} rotulo="Receber no PDV" />
            </div>
            <div className="flex gap-2">
              <button onClick={imprimirComanda} disabled={!itens.length} className="flex-1 border-2 rounded-lg py-2 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={13} /> Imprimir</button>
              <button onClick={salvarVenda} disabled={!itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }} title="Salva a venda (vai pra ‘A receber’ no Caixa) e limpa a tela pra iniciar outra.">💰 Salvar a venda</button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={gerarOrcamento} disabled={saving || !itens.length} className="flex-1 border-2 rounded-lg py-1.5 text-[12px] font-semibold disabled:opacity-50" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#F0FBFC" }}>📄 Salvar como orçamento</button>
              <button onClick={enviarOrcamentoWhats} disabled={enviandoWhats || !itens.length || !tutorId} title="Envia o orçamento pro cliente no WhatsApp" className="flex-1 rounded-lg py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#25D366" }}>{enviandoWhats ? "Enviando…" : "💬 Enviar no WhatsApp"}</button>
            </div>
            {itens.length > 0 && <button onClick={limpar} className="w-full text-[11px] text-gray-400 mt-2">limpar</button>}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-3">
          <button onClick={() => { setSub("VENDA"); setAddOpen(true); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Montar novo orçamento</button>
          <p className="text-[10.5px] text-gray-400 mb-3 mt-1 text-center">Adicione os itens na aba <b>🛒 Comanda</b> e clique <b>“📄 Salvar como orçamento”</b>.</p>
          {orcs.length === 0 ? <div className="text-center text-[12px] text-gray-400 py-8">Nenhum orçamento deste pet.</div> :
            orcs.map((o) => {
              const st = ST[o.status] || ST.RASCUNHO; const conv = !!o.appointmentId;
              return (
                <div key={o.id} className="border rounded-lg px-2.5 py-2 mb-2" style={{ borderColor: "#F0EBE0" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-[12.5px] font-semibold text-[#0F6E56]">{BRL(o.valorTotal)}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: conv ? "#E6F1FB" : st.b, color: conv ? "#185FA5" : st.c }}>{conv ? "Vendido" : st.l}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""} · {(o.itens || []).length} {(o.itens || []).length === 1 ? "item" : "itens"}</div>
                  {/* OS ITENS, e não só a contagem: "com data e itens, como a venda aparece"
                      (Cintia, 07/09/2026). Orçamento que não diz o que tem dentro obriga a
                      abrir o PDF pra saber o que foi proposto ao cliente. */}
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
                    {!conv && <button onClick={() => converterOrc(o.id)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-white" style={{ background: "#009AAC" }}><LuArrowRight size={11} /> Transformar em venda</button>}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      </div>
    </div>
  );
}
