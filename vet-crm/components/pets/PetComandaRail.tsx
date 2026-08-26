"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { LuShoppingCart, LuPlus, LuTrash, LuX, LuPrinter, LuArrowRight } from "react-icons/lu";
import toast from "react-hot-toast";
import { imprimirOrcamento } from "@/lib/documentos/orcamento-print";
import { imprimirVenda } from "@/lib/documentos/venda-print";
import { carregarCatalogoVendavel, linhaDoItem, itemParaVenda, labDoItem } from "@/lib/catalogoVendavel";
import EditarOrcamentoModal from "@/components/vendas/EditarOrcamentoModal";
import OrcamentoRapidoModal from "@/components/vendas/OrcamentoRapidoModal";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Item = { descricao: string; servicoId?: string; quantidade: number; valorUnitario: number; custoUnitario?: number; fornecedorId?: string | null; fornecedorNome?: string | null; catalogoExameId?: string; _exame?: boolean; _novo?: boolean; catalogoItemId?: string; _convenio?: boolean; convenioId?: string; _convLabel?: string };

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
  const [aberto, setAberto] = useState(false);
  const [sub, setSub] = useState<"VENDA" | "ORC">("VENDA");
  const [editOrc, setEditOrc] = useState<any | null>(null); // orçamento em edição (modal compartilhado)
  const [orcNovoOpen, setOrcNovoOpen] = useState(false); // novo orçamento com MODELO (modal padrão)
  const [itens, setItens] = useState<Item[]>([]);
  const [cat, setCat] = useState<{ id: string; nome: string; valor: number; custoPadrao?: number; _exame?: boolean; _fornecedorId?: string | null; _fornecedorNome?: string | null; codigo?: number | null; codigoBarras?: string | null }[]>([]);
  const addDoCatalogo = (c: any) => {
    const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor ?? c.valorPadrao, custoPadrao: c.custoPadrao, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome });
    addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: 1 });
  };
  const [modelosVenda, setModelosVenda] = useState<any[]>([]); // modelos (mesmos do orçamento) p/ carregar na comanda
  // 📄 Carrega um MODELO na comanda — resolve cada item pelo catálogo.
  const aplicarModeloComanda = (id: string) => {
    const m = modelosVenda.find((x) => x.id === id); if (!m) return;
    let n = 0;
    for (const it of (m.itens || [])) {
      const nome = String(it.descricao || "").trim(); if (!nome) continue;
      const q = Number(it.quantidade) || 1; const vu = it.valorUnitario != null ? Number(it.valorUnitario) : undefined;
      const c = cat.find((x) => (x.nome || "") === nome);
      if (c) {
        const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor ?? (c as any).valorPadrao, custoPadrao: c.custoPadrao, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome });
        addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: vu != null ? vu : l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: q });
      } else {
        addItem({ descricao: nome, valorUnitario: vu || 0, quantidade: q } as Item);
      }
      n++;
    }
    if (n) toast.success(`Modelo "${m.nome}" carregado`);
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
    carregou.current = true;
    // eslint-disable-next-line
  }, [petId]);
  // Persiste o rascunho local (resposta instantânea, mesmo offline)
  useEffect(() => { if (carregou.current) { try { localStorage.setItem(key, JSON.stringify(itens)); } catch {} } }, [itens, key]);

  // Catálogo (produtos + serviços + medicamentos/vacinas + exames) — FONTE ÚNICA
  useEffect(() => {
    (async () => {
      try {
        const its = await carregarCatalogoVendavel();
        setCat(its.map((i) => ({ id: i.id, nome: i.nome, valor: i.valorPadrao, custoPadrao: i.custoPadrao, _exame: i._exame, _fornecedorId: i._fornecedorId, _fornecedorNome: i._fornecedorNome, codigo: i.codigo ?? null, codigoBarras: i.codigoBarras ?? null })));
      } catch {}
      try {
        const rm = await fetch("/api/listas?lista=orcamentomodelo", { cache: "no-store" }); const d = await rm.json();
        const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
        setModelosVenda(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return null; } }).filter((m: any) => m && m.ativo !== false));
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
      const body: any = { value: somaTutor(arr), items: arr.map(linhaBody) }; // value = só o que o tutor paga (convênio sai do total)
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
    } catch (e: any) { setSync("error"); toast.error("Não consegui salvar a comanda: " + (e?.message || "erro")); }
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

  // Gancho p/ outras partes da ficha lançarem itens na comanda
  useEffect(() => {
    function onAdd(e: any) { const d = e?.detail; if (!d?.descricao) return; addItem({ descricao: d.descricao, servicoId: d.servicoId, valorUnitario: Number(d.valorUnitario) || 0, custoUnitario: d.custoUnitario != null ? Number(d.custoUnitario) : undefined, fornecedorId: d.fornecedorId ?? undefined, fornecedorNome: d.fornecedorNome ?? undefined, catalogoExameId: d.catalogoExameId, _exame: d._exame, _novo: d._novo, catalogoItemId: d.catalogoItemId, quantidade: Number(d.quantidade) || 1 }); setAberto(true); toast.success("Lançado na comanda"); }
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
  async function limpar() {
    if (apptId && !confirm("Limpar a comanda? Ela também sai do Caixa.")) return;
    setItens([]);
  }
  const matches = useMemo(() => { const q = busca.trim().toLowerCase(); if (!q) return cat.slice(0, 20); return cat.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 20); }, [cat, busca]);

  function imprimirComanda() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    imprimirVenda({ itens: itens.map(linhaBody), valor: total, petNome, tutorNome, petId, numeroVenda, date: new Date().toISOString() }, { rotulo: "Comanda" });
  }
  // Comanda = venda (modelo SimplesVet): SALVA a venda, ela vira independente em "A receber" no Caixa
  // (visível a todos, paga ou não), e a comanda FECHA/LIMPA pra iniciar OUTRA venda na hora.
  // NÃO abre a tela de venda (princípio da Cintia). Não apaga a venda salva — só "solta" o vínculo local.
  async function salvarVenda() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    if (!apptIdRef.current) { pendingRef.current = itens; await sincronizar(); }
    if (!apptIdRef.current) { toast.error("Não consegui salvar a venda. Tente de novo."); return; }
    const num = numeroVenda;
    // Solta a venda salva (detacha ANTES de zerar itens, senão o sync apagaria o appointment).
    if (timerRef.current) clearTimeout(timerRef.current);
    setApptId(null); apptIdRef.current = null; setNumeroVenda(null);
    try { localStorage.removeItem(apptKey); localStorage.removeItem(key); } catch {}
    pendingRef.current = [];
    setItens([]);
    try { window.dispatchEvent(new Event("pet:venda")); } catch {} // ficha recarrega Compras / a-receber
    toast.success(`Venda${num ? ` nº ${num}` : ""} salva ✅ — está em “A receber” no Caixa. Pode iniciar outra.`);
  }

  async function gerarOrcamento() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/orcamentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ petId, tutorId, itens: itens.map(linhaBody) }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento gerado ✅"); await limpar(); await loadOrcs(); setSub("ORC");
    } catch { toast.error("Erro ao gerar orçamento"); } finally { setSaving(false); }
  }
  // 💬 Envia o orçamento pro cliente no WhatsApp (mesmo princípio do inbox: cai na conversa do tutor).
  function montarTextoOrcamento() {
    const linhas = itens.map((it) => {
      const q = Number(it.quantidade) || 1;
      const v = q * (Number(it.valorUnitario) || 0);
      const nome = (it.descricao || "Item").trim();
      return q > 1 ? `• ${q}× ${nome} — *${BRL(v)}*` : `• ${nome} — *${BRL(v)}*`;
    });
    const dia = new Date().toLocaleDateString("pt-BR");
    return [
      `💰 *Orçamento — ${petNome || "seu pet"}*`,
      `🏥 Empório do Pet · 🗓️ ${dia}`,
      tutorNome ? `👤 Tutor(a): ${tutorNome}` : null,
      ``,
      `*Itens do orçamento:*`,
      ...linhas,
      ``,
      `━━━━━━━━━━━━━━━`,
      `💵 *Total: ${BRL(total)}*`,
      ``,
      `Qualquer dúvida, é só chamar por aqui! 🐾`,
      `— Equipe Empório do Pet`,
    ].filter((l) => l !== null).join("\n");
  }
  async function enviarOrcamentoWhats() {
    if (!itens.length) { toast.error("Comanda vazia."); return; }
    if (!tutorId) { toast.error("Pet sem tutor — não dá pra enviar."); return; }
    setEnviandoWhats(true);
    try {
      const r = await fetch(`/api/whatsapp/enviar-documentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId, texto: montarTextoOrcamento(), petNome }) });
      if (!r.ok) throw new Error();
      toast.success("Orçamento enviado no WhatsApp ✅");
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
      <button onClick={() => setAberto(true)} title="Abrir comanda"
        className="fixed z-40 flex items-center gap-2 text-white font-bold shadow-lg print:hidden hover:brightness-105 transition"
        style={{ right: 20, bottom: 20, background: "#009AAC", borderRadius: 999, padding: "12px 18px" }}>
        <LuShoppingCart size={18} />
        <span style={{ fontSize: 13 }}>Comanda{nItens ? ` (${nItens})` : ""}</span>
      </button>
    );
  }

  return (
    <div className="fixed z-40 bg-white border shadow-2xl flex flex-col print:hidden"
      style={{ right: 0, top: 64, bottom: 0, width: 330, maxWidth: "92vw", borderColor: "#E8DFC8" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
        <b style={{ color: "#014D5E", fontSize: 14 }}>🛒 Comanda — {petNome || "pet"}</b>
        <button onClick={() => setAberto(false)} className="text-[#94a3b8]" title="Recolher"><LuX size={18} /></button>
      </div>
      <div className="flex" style={{ borderBottom: "1px solid #F0EBE0" }}>
        {(["VENDA", "ORC"] as const).map((k) => (
          <button key={k} onClick={() => setSub(k)} className="flex-1 text-[12.5px] font-semibold py-2" style={{ color: sub === k ? "#009AAC" : "#8A857A", borderBottom: sub === k ? "2px solid #009AAC" : "2px solid transparent" }}>
            {k === "VENDA" ? `🛒 Comanda${nItens ? ` (${nItens})` : ""}` : "📄 Orçamentos"}
          </button>
        ))}
      </div>

      {sub === "VENDA" ? (
        <>
          <div className="px-3 pt-3">
            {modelosVenda.length > 0 && (
              <select value="" onChange={(e) => { if (e.target.value) { aplicarModeloComanda(e.target.value); e.currentTarget.value = ""; } }} className="w-full mb-2 text-[12.5px] rounded-lg px-2 py-2 border" style={{ borderColor: "#6D28D9", color: "#6D28D9" }} title="Carregar um modelo de itens na comanda">
                <option value="">📄 Carregar modelo…</option>
                {modelosVenda.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              </select>
            )}
            <button onClick={() => { setAddOpen((v) => !v); setBusca(""); }} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>➕ Adicionar item {addOpen ? "▲" : "▾"}</button>
            {addOpen && (
              <div className="mt-2">
                <input value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (!tentarCodigoBarras(busca) && matches.length === 1) { addDoCatalogo(matches[0]); setBusca(""); } } }} autoFocus placeholder="🔍 Buscar ou ler código de barras…" className="w-full border rounded-lg px-2 py-1.5 text-[12.5px]" style={{ borderColor: "#E8DFC8" }} />
                {busca.trim() && (
                <div className="border rounded-lg mt-1 max-h-44 overflow-auto" style={{ borderColor: "#F0EBE0" }}>
                  {matches.length === 0 ? <div className="text-[12px] text-gray-400 text-center py-3">Nada encontrado</div> :
                    matches.map((c) => (
                      <button key={c.id} title={c.nome} onClick={() => { const l = linhaDoItem({ id: c.id, nome: c.nome, valorPadrao: c.valor, custoPadrao: c.custoPadrao, _exame: c._exame, _fornecedorId: c._fornecedorId, _fornecedorNome: c._fornecedorNome }); addItem({ descricao: l.descricao, servicoId: l.servicoId, valorUnitario: l.valorUnitario, custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId, fornecedorNome: l.fornecedorNome, catalogoExameId: l.catalogoExameId, _exame: l._exame, _novo: l._novo, catalogoItemId: l.catalogoItemId, quantidade: 1 }); setBusca(""); }} className="flex w-full justify-between items-center px-2.5 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                        <span className="text-[#1F2A2E] truncate pr-2 flex items-center gap-1.5 min-w-0"><span className="truncate">{c.nome}</span>{(() => { const lab = labDoItem(c); return lab ? <span className="shrink-0 text-[10px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}</span><span className="text-[#0F6E56] font-semibold shrink-0">{BRL(c.valor)}</span>
                      </button>
                    ))}
                </div>
                )}
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

          <div className="flex-1 overflow-auto px-3 py-2">
            {itens.length === 0 ? (
              <div className="text-center text-[12px] text-gray-400 py-8">Nada lançado ainda.<br />Use “Adicionar item”.</div>
            ) : itens.map((it, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b" style={{ borderColor: "#F5F1E8" }}>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-[#1F2A2E] truncate flex items-center gap-1.5" title={it.descricao}>
                    <span className="truncate">{it.descricao}</span>
                    {it._convenio ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: "#E0F0F2", color: "#0E5560" }}>🏥 {it._convLabel} paga</span>
                      : (() => { const lab = labDoItem({ _exame: !!it.fornecedorNome, _fornecedorNome: it.fornecedorNome }); return lab ? <span className="shrink-0 text-[9.5px] font-bold px-1.5 py-[1px] rounded-full" style={{ background: lab.veter ? "#E1F5EE" : "#EEF2F6", color: lab.veter ? "#0F6E56" : "#4D6A8A" }}>{lab.veter ? "⭐ " : "🏥 "}{lab.nome}</span> : null; })()}
                  </div>
                  <div className="text-[11px] text-gray-400">{BRL(it.valorUnitario)} cada</div>
                </div>
                <input type="number" min={1} value={it.quantidade} onChange={(e) => setQtd(i, Number(e.target.value))} className="w-11 border rounded text-center text-[12px] py-0.5" style={{ borderColor: "#E8DFC8" }} />
                <span className="text-[12.5px] font-semibold text-[#0F6E56] w-16 text-right tabular-nums">{BRL((Number(it.quantidade) || 1) * (Number(it.valorUnitario) || 0))}</span>
                <button onClick={() => del(i)} className="text-[#b23b39]" title="Remover"><LuTrash size={13} /></button>
              </div>
            ))}
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
              <span className="text-[16px] font-bold text-[#014D5E] tabular-nums">{BRL(totalTutor)}</span>
            </div>
            <div className="text-[10.5px] mb-2 mt-0.5" style={{ color: statusCor }}>{statusTxt}</div>
            <div className="flex gap-2">
              <button onClick={imprimirComanda} disabled={!itens.length} className="flex-1 border-2 rounded-lg py-2 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={13} /> Imprimir comanda</button>
              <button onClick={salvarVenda} disabled={!itens.length} className="flex-1 rounded-lg py-2 text-[12.5px] font-semibold text-white disabled:opacity-50" style={{ background: "#009AAC" }} title="Salva a venda (vai pra ‘A receber’ no Caixa) e limpa a comanda pra iniciar outra.">💰 Salvar a venda</button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={gerarOrcamento} disabled={saving || !itens.length} className="flex-1 border-2 rounded-lg py-1.5 text-[12px] font-semibold disabled:opacity-50" style={{ borderColor: "#009AAC", color: "#009AAC", background: "#F0FBFC" }}>📄 Salvar como orçamento</button>
              <button onClick={enviarOrcamentoWhats} disabled={enviandoWhats || !itens.length || !tutorId} title="Envia o orçamento pro cliente no WhatsApp" className="flex-1 rounded-lg py-1.5 text-[12px] font-semibold text-white disabled:opacity-50" style={{ background: "#25D366" }}>{enviandoWhats ? "Enviando…" : "💬 Enviar no WhatsApp"}</button>
            </div>
            {itens.length > 0 && <button onClick={limpar} className="w-full text-[11px] text-gray-400 mt-2">limpar comanda</button>}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-3">
          <button onClick={() => setOrcNovoOpen(true)} className="w-full text-white text-[12.5px] font-semibold py-2 rounded-lg" style={{ background: "#009AAC" }}>📄 Novo orçamento (com modelo)</button>
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
                  <div className="text-[11px] text-gray-400 mt-0.5">{o.createdAt ? new Date(o.createdAt).toLocaleDateString("pt-BR") : ""} · {(o.itens || []).length} itens</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {!conv && <button onClick={() => setEditOrc(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#E8E2D6", color: "#6D28D9" }}>✏️ Editar</button>}
                    <button onClick={() => imprimirOrcamento(o)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border" style={{ borderColor: "#cfd8e0", color: "#0C447C" }}><LuPrinter size={11} /> Imprimir</button>
                    {!conv && <button onClick={() => converterOrc(o.id)} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded text-white" style={{ background: "#009AAC" }}><LuArrowRight size={11} /> Transformar em venda</button>}
                  </div>
                </div>
              );
            })}
        </div>
      )}
      <EditarOrcamentoModal orc={editOrc} onClose={() => setEditOrc(null)} onSaved={() => loadOrcs()} />
      {orcNovoOpen && <OrcamentoRapidoModal open={orcNovoOpen} onClose={() => { setOrcNovoOpen(false); loadOrcs(); }} pet={petId ? { id: petId, name: petNome || "pet" } : null} tutor={tutorId ? { id: tutorId, name: tutorNome || "Cliente" } : null} />}
    </div>
  );
}
