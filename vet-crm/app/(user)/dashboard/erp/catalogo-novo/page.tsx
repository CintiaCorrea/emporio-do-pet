"use client";
// 🗂️ Catálogo Único (rebuild — Fatia 1). Cadastro único de Produto/Serviço/Exame/Vacina/Pacote/Kit.
// Fonte: /api/catalogo/* (tabelas cat_). NÃO mexe no catálogo antigo (arquivado à parte).
import { useEffect, useMemo, useState, useCallback } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";
import { FAIXAS_PADRAO, lerFaixas, rotuloDaFaixa, erroDasFaixas, ordenarFaixas, type FaixaPorte } from "@/lib/porte";

const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", PAPER = "#F6F2EA", INK = "#1F2A2E", MUT = "#5C6B70";
type Tipo = "PRODUTO" | "SERVICO" | "EXAME" | "VACINA" | "PACOTE" | "KIT";
const TIPOS: { k: Tipo; lbl: string; emoji: string }[] = [
  { k: "PRODUTO", lbl: "Produto", emoji: "📦" }, { k: "SERVICO", lbl: "Serviço", emoji: "🩺" },
  { k: "EXAME", lbl: "Exame", emoji: "🔬" }, { k: "VACINA", lbl: "Vacina", emoji: "💉" },
  { k: "PACOTE", lbl: "Pacote", emoji: "🎁" }, { k: "KIT", lbl: "Kit", emoji: "🧰" },
];
const emojiDe = (t: string) => TIPOS.find((x) => x.k === t)?.emoji || "•";
const brl = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const temEstoque = (t: Tipo) => t === "PRODUTO" || t === "VACINA";
const temComposicao = (t: Tipo) => t === "PACOTE" || t === "KIT";

const FORM0: any = {
  tipo: "PRODUTO", nome: "", grupoId: "", fornecedorId: "", custo: "", markup: "", preco: "", exibeListaPreco: true, permiteAlterarPreco: true,
  codigoBarras: "", unidadeVenda: "", marcaId: "", proposito: "VENDA", duracaoMin: "",
  controlaEstoque: false, estoqueAtual: "", estoqueMin: "", estoqueMax: "", controlaValidade: false,
  comissionado: false, comissaoTipo: "PERCENTUAL", comissaoValor: "", descontoModo: "LIMITE_GERAL", descontoLimite: "",
  protocoloTemplateId: "", ativo: true,
  controlePlano: "", planoUnidades: "", planoIntervaloDias: "", // pacote/kit: o que a venda cria
  exame: { fornecedorId: "", custoLab: "", prazoResultadoDias: "", categoria: "", externo: false },
  composicao: [] as any[],
  // PRECO POR PORTE: faixas vazias = preco unico (a maioria dos itens).
  faixas: [] as FaixaPorte[],
};

export default function CatalogoNovoPage() {
  usePageTitle("Catálogo (novo)", "Cadastro único — produto, serviço, exame, vacina, pacote e kit.");
  const [itens, setItens] = useState<any[]>([]);
  const [todosItens, setTodosItens] = useState<any[]>([]); // lista COMPLETA p/ o seletor de composição
  const [grupos, setGrupos] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
  const [fornAll, setFornAll] = useState<any[]>([]); // todos os fornecedores — pro seletor de terceirizado (serviço)
  const [protocolos, setProtocolos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fTipo, setFTipo] = useState("");
  const [fGrupo, setFGrupo] = useState("");
  const [fSit, setFSit] = useState("ATIVO");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<any>(null); // item em edição (null = fechado)
  const [salvando, setSalvando] = useState(false);
  const [grupoOpen, setGrupoOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [usarNovo, setUsarNovo] = useState(false); // chave: telas de venda usam este catálogo
  const [flagItemId, setFlagItemId] = useState<string | null>(null);
  const [estoqueItem, setEstoqueItem] = useState<{ id: string; nome: string } | null>(null);
  const [invOpen, setInvOpen] = useState(false);
  const [convOpen, setConvOpen] = useState(false);

  const carregarItens = useCallback(async () => {
    const p = new URLSearchParams();
    if (fTipo) p.set("tipo", fTipo);
    if (fGrupo) p.set("grupoId", fGrupo);
    if (busca) p.set("search", busca);
    p.set("situacao", fSit);
    try {
      const r = await fetch(`/api/catalogo/itens?${p.toString()}`, { cache: "no-store" });
      const d = await r.json(); setItens(Array.isArray(d?.itens) ? d.itens : []);
    } catch { setItens([]); }
  }, [fTipo, fGrupo, fSit, busca]);

  const carregarApoio = useCallback(async () => {
    try {
      const [g, m, f, pr, ti] = await Promise.all([
        fetch("/api/catalogo/grupos", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch("/api/catalogo/marcas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/fornecedores", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/protocolos/templates", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        // Lista COMPLETA (sem o filtro da tela) — pro seletor de composição do pacote/kit.
        fetch("/api/catalogo/itens?situacao=ATIVO", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      setGrupos(Array.isArray(g?.flat) ? g.flat : []);
      setMarcas(Array.isArray(m) ? m : (m?.data || []));
      const fArr = Array.isArray(f) ? f : (f?.data || f?.itens || []);
      setLabs(fArr.filter((x: any) => !x.tipo || /LABORATORIO|PROFISSIONAL/i.test(x.tipo)));
      setFornAll(fArr);
      setProtocolos(Array.isArray(pr) ? pr : (pr?.data || pr?.templates || []));
      setTodosItens(Array.isArray(ti?.itens) ? ti.itens : []);
    } catch {}
  }, []);

  const carregarFlag = useCallback(async () => {
    try {
      const cfg = await fetch("/api/listas?lista=catalogo_config", { cache: "no-store" }).then((r) => r.json()).catch(() => null);
      const arr = Array.isArray(cfg) ? cfg : (cfg?.itens || cfg?.data || []);
      if (arr[0]) { setFlagItemId(arr[0].id); try { setUsarNovo(!!JSON.parse(arr[0].valor)?.usarNovo); } catch {} }
    } catch {}
  }, []);
  async function toggleUsarNovo() {
    const novo = !usarNovo;
    if (novo && itens.length === 0 && !confirm("O catálogo novo ainda parece vazio. Ligar assim vai deixar as telas de venda usando o antigo (segurança) até você importar. Quer ligar mesmo assim?")) return;
    try {
      const valor = JSON.stringify({ usarNovo: novo });
      if (flagItemId) await fetch(`/api/listas/${flagItemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor }) });
      else { const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "catalogo_config", valor }) }).then((r) => r.json()); setFlagItemId(r?.id || null); }
      setUsarNovo(novo);
      toast.success(novo ? "🛒 Vendas agora usam o catálogo NOVO" : "Vendas voltaram ao catálogo antigo");
    } catch { toast.error("Erro ao salvar a chave"); }
  }

  useEffect(() => { (async () => { setLoading(true); await carregarApoio(); await carregarFlag(); await carregarItens(); setLoading(false); })(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const t = setTimeout(carregarItens, 250); return () => clearTimeout(t); }, [carregarItens]);

  const gruposFolha = useMemo(() => grupos.filter((g) => !g.agrupador), [grupos]);
  const nomeGrupo = (id?: string) => grupos.find((g) => g.id === id)?.nome || "—";

  function novo() { setForm({ ...FORM0, exame: { ...FORM0.exame }, composicao: [] }); }
  async function editar(id: string) {
    try {
      const it = await fetch(`/api/catalogo/itens/${id}`, { cache: "no-store" }).then((r) => r.json());
      setForm({
        ...FORM0, ...it,
        custo: it.custo ?? "", markup: it.markup ?? "", preco: it.preco ?? "", duracaoMin: it.duracaoMin ?? "", fornecedorId: it.fornecedorId || "",
        estoqueAtual: it.estoqueAtual ?? "", estoqueMin: it.estoqueMin ?? "", estoqueMax: it.estoqueMax ?? "",
        comissaoValor: it.comissaoValor ?? "", descontoLimite: it.descontoLimite ?? "",
        grupoId: it.grupoId || "", marcaId: it.marcaId || "", protocoloTemplateId: it.protocoloTemplateId || "",
        controlePlano: it.controlePlano || "", planoUnidades: it.planoUnidades ?? "", planoIntervaloDias: it.planoIntervaloDias ?? "",
        exame: it.exame ? { fornecedorId: it.exame.fornecedorId || "", custoLab: it.exame.custoLab ?? "", prazoResultadoDias: it.exame.prazoResultadoDias ?? "", categoria: it.exame.categoria || "", externo: !!it.exame.externo } : { ...FORM0.exame },
        composicao: (it.composicao || []).map((c: any) => ({ itemId: c.itemId, nome: c.item?.nome, quantidade: c.quantidade })),
        faixas: lerFaixas(it.precosPorte),
      });
    } catch { toast.error("Não consegui abrir o item"); }
  }

  const up = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  // Custo-base pro markup: o próprio custo; no exame, cai pro custo do lab quando o custo está vazio.
  const custoBase = (f: any): number => {
    const c = Number(f?.custo);
    if (c > 0) return c;
    if (f?.tipo === "EXAME") { const cl = Number(f?.exame?.custoLab); if (cl > 0) return cl; }
    return 0;
  };
  // Muda custo/markup e RECALCULA o preço = custo × (1 + markup%). (Editar o preço na mão continua valendo.)
  const comMarkup = (patch: any) => setForm((f: any) => {
    const nf = { ...f, ...patch };
    const base = custoBase(nf);
    const mk = Number(nf.markup);
    if (base > 0 && String(nf.markup).trim() !== "" && !Number.isNaN(mk)) {
      nf.preco = String(Math.round(base * (1 + mk / 100) * 100) / 100);
    }
    return nf;
  });
  // O item cobra por porte? E o que decide se o campo de preco unico vale.
  const porPorte = ((form?.faixas || []) as FaixaPorte[]).length > 0;
  const erroFaixas = porPorte ? erroDasFaixas(form.faixas) : null;

  const markupReal = useMemo(() => {
    const c = custoBase(form), p = Number(form?.preco);
    if (!form || !c || c <= 0 || !p) return null;
    return Math.round(((p - c) / c) * 100);
  }, [form]);

  // Pacote/Kit: soma dos itens da composição (preço × quantidade).
  const precoItem = (id: string) => Number(todosItens.find((x) => x.id === id)?.preco) || 0;
  const somaComposicao = useMemo(
    () => (form?.composicao || []).reduce((s: number, c: any) => s + precoItem(c.itemId) * (Number(c.quantidade) || 0), 0),
    [form?.composicao, todosItens], // eslint-disable-line react-hooks/exhaustive-deps
  );
  // soma das QUANTIDADES da composição — sugere o nº de sessões/doses do pacote
  const somaQtdComposicao = useMemo(() => (form?.composicao || []).reduce((s: number, c: any) => s + (Number(c.quantidade) || 0), 0), [form?.composicao]);
  // Muda a composição e, se o preço ainda estiver zerado, já sugere a soma dos itens.
  const setComp = (arr: any[]) => setForm((f: any) => {
    const soma = (arr || []).reduce((s: number, c: any) => s + precoItem(c.itemId) * (Number(c.quantidade) || 0), 0);
    const nf = { ...f, composicao: arr };
    if (!(Number(nf.preco) > 0) && soma > 0) nf.preco = String(Math.round(soma * 100) / 100);
    return nf;
  });

  async function criarGrupoInline() {
    const nome = window.prompt("Nome do novo grupo (ex.: Consultas, Vacinas, Exames):");
    if (!nome || !nome.trim()) return;
    try {
      const r = await fetch("/api/catalogo/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim() }) });
      const g = await r.json().catch(() => null);
      if (!r.ok) throw new Error(g?.message);
      await carregarApoio();
      if (g?.id) up({ grupoId: g.id });
      toast.success("Grupo criado");
    } catch (e: any) { toast.error(String(e?.message || "Erro ao criar grupo").slice(0, 100)); }
  }

  async function salvar() {
    if (!form?.nome?.trim()) { toast.error("Informe o nome"); return; }
    if (!form?.grupoId) { toast.error("Escolha um grupo"); return; }
    setSalvando(true);
    try {
      const body: any = { ...form };
      // Faixas viram o campo que o banco guarda. Vazio = preco unico, e o servidor limpa.
      if ((form.faixas || []).length) {
        const erro = erroDasFaixas(form.faixas);
        if (erro) { toast.error(erro); setSalvando(false); return; }
        body.precosPorte = JSON.stringify(ordenarFaixas(form.faixas));
        // O preco unico passa a ser o da PRIMEIRA faixa com preco — assim relatorio, lista de
        // precos e qualquer tela que ainda nao saiba de porte mostram um numero de verdade.
        const primeiro = ordenarFaixas(form.faixas).find((f: FaixaPorte) => f.preco != null);
        if (primeiro) { body.preco = primeiro.preco; body.custo = primeiro.custo ?? body.custo; }
      } else {
        body.precosPorte = null;
      }
      delete body.faixas;
      const url = form.id ? `/api/catalogo/itens/${form.id}` : "/api/catalogo/itens";
      const r = await fetch(url, { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message || "Erro ao salvar"); }
      toast.success(form.id ? "Item atualizado ✅" : "Item cadastrado ✅");
      setForm(null); await carregarItens();
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); } finally { setSalvando(false); }
  }
  async function arquivar(it: any, arquivar: boolean) {
    try {
      const r = await fetch(`/api/catalogo/itens/${it.id}/arquivar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ arquivar }) });
      if (!r.ok) throw new Error();
      toast.success(arquivar ? "Arquivado" : "Reativado"); await carregarItens();
    } catch { toast.error("Erro"); }
  }
  async function novaMarca() {
    const nome = window.prompt("Nome da marca/fabricante:")?.trim(); if (!nome) return;
    try { const m = await fetch("/api/catalogo/marcas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) }).then((r) => r.json()); await carregarApoio(); if (m?.id) up({ marcaId: m.id }); } catch { toast.error("Erro"); }
  }

  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, width: "100%", background: "#fff", color: INK } as const;
  const lbl = { fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: ".04em", color: MUT, marginBottom: 4, display: "block" };

  return (
    <div className="p-4 md:p-6 min-h-screen" style={{ background: PAPER }}>
      <div className="flex items-center gap-2 flex-wrap mb-4">
        <div>
          <h1 className="text-[21px] font-extrabold flex items-center gap-2" style={{ color: B }}>🗂️ Catálogo <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>NOVO</span></h1>
          <p className="text-[12.5px]" style={{ color: MUT }}>Cadastro único de tudo que se vende. Estrutura nova — o catálogo antigo fica à parte.</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => setConvOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>🏥 Convênios</button>
        <button onClick={() => setInvOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>📋 Inventário</button>
        <button onClick={() => setImportOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>📥 Importar</button>
        <button onClick={() => setGrupoOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>🌳 Grupos</button>
        <button onClick={novo} className="text-[13px] font-semibold px-3.5 py-2 rounded-lg text-white" style={{ background: T }}>＋ Novo item</button>
      </div>

      {/* CHAVE DE VIRADA */}
      <div className="rounded-xl border mb-3 flex items-center gap-3 flex-wrap px-4 py-3" style={{ borderColor: usarNovo ? "#0F6E56" : LINE, background: usarNovo ? "#F3FBF7" : "#FBFAF7" }}>
        <span className="text-[20px]">{usarNovo ? "🛒" : "🔌"}</span>
        <div className="flex-1 min-w-[220px]">
          <div className="text-[13.5px] font-semibold" style={{ color: usarNovo ? "#0F6E56" : B }}>{usarNovo ? "As telas de venda usam ESTE catálogo" : "As telas de venda ainda usam o catálogo ANTIGO"}</div>
          <div className="text-[12px]" style={{ color: MUT }}>{usarNovo ? "PDV, comanda, orçamento e atendimento leem daqui. Se algo faltar, desligue e volta ao antigo na hora." : "Ligue quando seus dados estiverem importados. Rollback é instantâneo."}</div>
        </div>
        <button onClick={toggleUsarNovo} className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white shrink-0" style={{ background: usarNovo ? "#A32D2D" : "#0F6E56" }}>{usarNovo ? "Desligar (voltar ao antigo)" : "🛒 Usar este catálogo nas vendas"}</button>
      </div>

      {/* filtros */}
      <div className="flex gap-2 flex-wrap mb-3">
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar por nome…" style={{ ...inp, width: 240 }} />
        <select value={fTipo} onChange={(e) => setFTipo(e.target.value)} style={{ ...inp, width: "auto" }}><option value="">Todos os tipos</option>{TIPOS.map((t) => <option key={t.k} value={t.k}>{t.emoji} {t.lbl}</option>)}</select>
        <select value={fGrupo} onChange={(e) => setFGrupo(e.target.value)} style={{ ...inp, width: "auto" }}><option value="">Todos os grupos</option>{gruposFolha.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
        <select value={fSit} onChange={(e) => setFSit(e.target.value)} style={{ ...inp, width: "auto" }}><option value="ATIVO">Ativos</option><option value="ARQUIVADO">Arquivados</option></select>
      </div>

      {/* lista */}
      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: LINE }}>
        {loading ? <div className="text-center text-sm text-gray-400 py-12">Carregando…</div> : itens.length === 0 ? (
          <div className="text-center text-sm py-12" style={{ color: MUT }}>Nenhum item ainda. Clique em <b>＋ Novo item</b> pra começar.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead><tr style={{ background: "#FBF9F4", color: MUT }}><th className="text-left px-4 py-2.5 font-semibold">Item</th><th className="text-left px-3 py-2.5 font-semibold">Tipo</th><th className="text-left px-3 py-2.5 font-semibold">Grupo</th><th className="text-right px-3 py-2.5 font-semibold">Preço</th><th className="px-3 py-2.5"></th></tr></thead>
            <tbody>
              {itens.map((it) => (
                <tr key={it.id} style={{ borderTop: `1px solid ${LINE}` }} className="hover:bg-[#F6FBFC]">
                  <td className="px-4 py-2.5"><button onClick={() => editar(it.id)} className="font-medium text-left hover:underline" style={{ color: B }}>{it.nome}</button>{it.codigo ? <span className="text-[11px] ml-2" style={{ color: "#9aa" }}>#{it.codigo}</span> : null}</td>
                  <td className="px-3 py-2.5" style={{ color: MUT }}>{emojiDe(it.tipo)} {TIPOS.find((t) => t.k === it.tipo)?.lbl}{it.exame?.fornecedorId ? "" : ""}</td>
                  <td className="px-3 py-2.5" style={{ color: MUT }}>{nomeGrupo(it.grupoId)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: "#0F6E56", fontWeight: 600 }}>{brl(it.preco)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {temEstoque(it.tipo) && <button onClick={() => setEstoqueItem({ id: it.id, nome: it.nome })} title="Estoque" className="text-[13px] px-2 py-1 rounded-lg border mr-1" style={{ borderColor: LINE, color: B }}>📦</button>}
                    <button onClick={() => editar(it.id)} title="Editar" className="text-[13px] px-2 py-1 rounded-lg border mr-1" style={{ borderColor: LINE, color: T }}>✏️</button>
                    <button onClick={() => arquivar(it, fSit !== "ARQUIVADO")} title={fSit === "ARQUIVADO" ? "Reativar" : "Arquivar"} className="text-[13px] px-2 py-1 rounded-lg border" style={{ borderColor: LINE, color: MUT }}>{fSit === "ARQUIVADO" ? "♻️" : "🗄️"}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[11.5px] mt-2" style={{ color: MUT }}>{itens.length} item(ns).</p>

      {/* ── MODAL: item ── */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={() => !salvando && setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}>
              <div className="font-semibold text-[15px]" style={{ color: B }}>{form.id ? "Editar item" : "Novo item"}</div>
              <button onClick={() => setForm(null)} className="text-[18px]" style={{ color: MUT }}>✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {/* tipo */}
              <div className="flex gap-1.5 flex-wrap">
                {TIPOS.map((t) => <button key={t.k} onClick={() => up({ tipo: t.k })} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full border" style={form.tipo === t.k ? { background: T, color: "#fff", borderColor: T } : { background: "#fff", color: MUT, borderColor: LINE }}>{t.emoji} {t.lbl}</button>)}
              </div>

              {/* dados básicos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label style={lbl}>Nome *</label><input value={form.nome} onChange={(e) => up({ nome: e.target.value })} style={inp} placeholder="Nome do item" /></div>
                <div><label style={lbl}>Grupo *</label>
                  <div style={{ display: "flex", gap: 6 }}>
                    <select value={form.grupoId} onChange={(e) => up({ grupoId: e.target.value })} style={{ ...inp, flex: 1 }}><option value="">— escolher —</option>{gruposFolha.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
                    <button type="button" onClick={criarGrupoInline} title="Criar novo grupo" style={{ border: `1px solid ${T}`, color: T, background: "#fff", borderRadius: 9, padding: "0 13px", fontSize: 18, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}>＋</button>
                  </div>
                </div>
                {(form.tipo === "PRODUTO" || form.tipo === "VACINA") && (
                  <div><label style={lbl}>Marca</label><div className="flex gap-1"><select value={form.marcaId} onChange={(e) => up({ marcaId: e.target.value })} style={inp}><option value="">—</option>{marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select><button onClick={novaMarca} className="text-[16px] px-2 rounded-lg border shrink-0" style={{ borderColor: LINE, color: T }}>＋</button></div></div>
                )}
                {(form.tipo === "PRODUTO" || form.tipo === "VACINA") && (<>
                  <div><label style={lbl}>Código de barras</label><input value={form.codigoBarras} onChange={(e) => up({ codigoBarras: e.target.value })} style={inp} /></div>
                  <div><label style={lbl}>Unidade</label><input value={form.unidadeVenda} onChange={(e) => up({ unidadeVenda: e.target.value })} style={inp} placeholder="UN, KG, ML…" /></div>
                </>)}
                {form.tipo === "SERVICO" && <div><label style={lbl}>Duração (min)</label><input value={form.duracaoMin} onChange={(e) => up({ duracaoMin: e.target.value.replace(/\D/g, "") })} style={inp} /></div>}
              </div>

              {/* preço */}
              <div className="rounded-xl border p-3" style={{ borderColor: LINE, background: "#FBFAF7" }}>
                <div style={lbl}>💲 Preço</div>
                <div className="grid grid-cols-3 gap-3">
                  <div><label style={lbl}>Custo</label><input value={form.custo} onChange={(e) => comMarkup({ custo: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                  <div><label style={lbl}>Markup %</label><input value={form.markup} onChange={(e) => comMarkup({ markup: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} placeholder="ex.: 100" /></div>
                  <div><label style={lbl}>Preço venda {porPorte ? "" : "*"}</label>
                    <input value={porPorte ? "" : form.preco} onChange={(e) => up({ preco: e.target.value.replace(",", ".") })} inputMode="decimal" disabled={porPorte}
                      placeholder={porPorte ? "por faixa, abaixo" : ""} title={porPorte ? "Este item cobra por porte — os preços ficam na tabela abaixo." : ""}
                      style={{ ...inp, ...(porPorte ? { background: "#F3EFE6", color: "#8C979B" } : null) }} /></div>
                </div>
                {markupReal != null && !porPorte && <div className="text-[11.5px] mt-1.5" style={{ color: markupReal < 0 ? "#A32D2D" : "#0F6E56" }}>Markup real: <b>{markupReal}%</b> {markupReal < 0 && "⚠️ preço abaixo do custo"}</div>}

                {/* ⚖️ PRECO POR PORTE — junta os cadastros repetidos por faixa de peso num item so.
                    Hoje "ACEPRAN - 11 A 20 KG" e "ACEPRAN ATE 10KG" sao itens diferentes: a recepcao
                    escolhe pelo NOME em vez de pelo peso do animal, e e assim que se cobra errado. */}
                <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${LINE}` }}>
                  <label className="flex items-center gap-2 cursor-pointer text-[13px]" style={{ color: B }}>
                    <input type="checkbox" checked={porPorte} onChange={(e) => up({ faixas: e.target.checked ? FAIXAS_PADRAO.map((f) => ({ ...f })) : [] })} />
                    <span>⚖️ <b>Preço por porte</b> — o peso do animal escolhe o preço</span>
                  </label>

                  {porPorte && (
                    <div className="mt-2.5">
                      <div className="text-[11.5px] mb-2" style={{ color: "#6C7F86" }}>
                        As cinco faixas abaixo são as suas. Dá pra mudar o limite, renomear, apagar ou
                        acrescentar — a Cerenia, por exemplo, precisa de sete. <b>Faixa em branco</b> quer
                        dizer que não vendemos este item para esse porte.
                      </div>

                      <div className="rounded-xl border overflow-hidden" style={{ borderColor: LINE }}>
                        <div className="grid gap-2 px-2.5 py-1.5 text-[10.5px] uppercase tracking-wide" style={{ gridTemplateColumns: "1.4fr .9fr .9fr .9fr 26px", background: "#FBFAF7", color: "#6C7F86" }}>
                          <div>Faixa</div><div>Até (kg)</div><div>Custo</div><div>Preço venda</div><div></div>
                        </div>
                        {ordenarFaixas(form.faixas).map((fx: FaixaPorte, i: number, arr: FaixaPorte[]) => {
                          const mudar = (patch: Partial<FaixaPorte>) => {
                            const novas = ordenarFaixas(form.faixas).map((x, j) => (j === i ? { ...x, ...patch } : x));
                            up({ faixas: novas });
                          };
                          const numOuNulo = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
                          return (
                            <div key={i} className="grid gap-2 px-2.5 py-1.5 items-center" style={{ gridTemplateColumns: "1.4fr .9fr .9fr .9fr 26px", borderTop: `1px solid ${LINE}` }}>
                              <input value={fx.rotulo} onChange={(e) => mudar({ rotulo: e.target.value })} style={{ ...inp, fontWeight: 500 }} />
                              <input
                                value={fx.ate == null ? "" : String(fx.ate).replace(".", ",")}
                                onChange={(e) => mudar({ ate: numOuNulo(e.target.value) })}
                                inputMode="decimal" placeholder={i === arr.length - 1 ? "sem limite" : ""}
                                title={i === arr.length - 1 ? "A última faixa fica sem limite: pega qualquer animal acima da anterior." : ""}
                                style={{ ...inp, textAlign: "right" }} />
                              <input value={fx.custo == null ? "" : String(fx.custo)} onChange={(e) => mudar({ custo: numOuNulo(e.target.value) })} inputMode="decimal" placeholder="—" style={{ ...inp, textAlign: "right" }} />
                              <input value={fx.preco == null ? "" : String(fx.preco)} onChange={(e) => mudar({ preco: numOuNulo(e.target.value) })} inputMode="decimal" placeholder="não vende" style={{ ...inp, textAlign: "right" }} />
                              <button type="button" title="Tirar esta faixa" onClick={() => up({ faixas: ordenarFaixas(form.faixas).filter((_: any, j: number) => j !== i) })}
                                style={{ border: "none", background: "none", cursor: "pointer", fontSize: 13, color: "#A32D2D" }}>×</button>
                            </div>
                          );
                        })}
                      </div>

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <button type="button" onClick={() => {
                          const arr = ordenarFaixas(form.faixas);
                          const penult = arr.length > 1 ? arr[arr.length - 2] : null;
                          const nova: FaixaPorte = { ate: penult?.ate != null ? penult.ate + 5 : 5, rotulo: "Nova faixa", preco: null };
                          up({ faixas: ordenarFaixas([...arr, nova]) });
                        }} className="text-[12px] font-medium px-2.5 py-1 rounded-lg border" style={{ borderColor: T, color: T, background: "#fff" }}>➕ faixa</button>
                        <div className="text-[11.5px]" style={{ color: erroFaixas ? "#A32D2D" : "#0F6E56" }}>
                          {erroFaixas || `Como vai aparecer na venda: ${ordenarFaixas(form.faixas).map((f: FaixaPorte, i: number, a: FaixaPorte[]) => rotuloDaFaixa(f, a[i - 1])).join(" · ")}`}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {form.tipo !== "EXAME" && (
                  <div className="mt-2.5">
                    <label style={lbl}>Terceirizado (fornecedor) — opcional</label>
                    <select value={form.fornecedorId || ""} onChange={(e) => up({ fornecedorId: e.target.value })} style={inp}>
                      <option value="">— nenhum (serviço próprio) —</option>
                      {fornAll.map((l: any) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                    </select>
                    {form.fornecedorId ? <div className="text-[11.5px] mt-1" style={{ color: MUT }}>Ao vender, gera <b>a-pagar</b> pro fornecedor no valor do <b>Custo</b> (o que ele recebe) — igual ao laboratório do exame.</div> : null}
                  </div>
                )}
                <div className="flex gap-4 mt-2 flex-wrap text-[12.5px]" style={{ color: MUT }}>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.exibeListaPreco} onChange={(e) => up({ exibeListaPreco: e.target.checked })} /> Exibe na lista de preço</label>
                  <label className="flex items-center gap-1.5"><input type="checkbox" checked={form.permiteAlterarPreco} onChange={(e) => up({ permiteAlterarPreco: e.target.checked })} /> Permite alterar preço na venda</label>
                </div>
                {form.tipo === "PRODUTO" && <div className="mt-2"><label style={lbl}>Propósito</label><select value={form.proposito} onChange={(e) => up({ proposito: e.target.value })} style={{ ...inp, width: "auto" }}><option value="VENDA">Apenas venda</option><option value="CONSUMO_INTERNO">Apenas consumo interno</option><option value="AMBOS">Venda e consumo interno</option></select></div>}
              </div>

              {/* estoque (produto/vacina) */}
              {temEstoque(form.tipo) && (
                <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <label className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: B }}><input type="checkbox" checked={form.controlaEstoque} onChange={(e) => up({ controlaEstoque: e.target.checked })} /> 📦 Controla estoque</label>
                  {form.controlaEstoque && (
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      <div><label style={lbl}>Atual</label><input value={form.estoqueAtual} onChange={(e) => up({ estoqueAtual: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                      <div><label style={lbl}>Mínimo</label><input value={form.estoqueMin} onChange={(e) => up({ estoqueMin: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                      <div><label style={lbl}>Máximo</label><input value={form.estoqueMax} onChange={(e) => up({ estoqueMax: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                    </div>
                  )}
                  {form.controlaEstoque && <label className="flex items-center gap-2 text-[12.5px] mt-2" style={{ color: MUT }}><input type="checkbox" checked={form.controlaValidade} onChange={(e) => up({ controlaValidade: e.target.checked })} /> Controla validade (PEPS)</label>}
                </div>
              )}

              {/* exame */}
              {form.tipo === "EXAME" && (
                <div className="rounded-xl border p-3" style={{ borderColor: LINE, background: "#F3FBF7" }}>
                  <div style={lbl}>🔬 Laboratório</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label style={lbl}>Laboratório</label><select value={form.exame.fornecedorId} onChange={(e) => up({ exame: { ...form.exame, fornecedorId: e.target.value } })} style={inp}><option value="">—</option>{labs.map((l) => <option key={l.id} value={l.id}>{l.nome}{/veter/i.test(l.nome) ? " ⭐" : ""}</option>)}</select></div>
                    <div><label style={lbl}>Custo do lab</label><input value={form.exame.custoLab} onChange={(e) => comMarkup({ exame: { ...form.exame, custoLab: e.target.value.replace(",", ".") } })} inputMode="decimal" style={inp} /></div>
                    <div><label style={lbl}>Prazo resultado (dias)</label><input value={form.exame.prazoResultadoDias} onChange={(e) => up({ exame: { ...form.exame, prazoResultadoDias: e.target.value.replace(/\D/g, "") } })} style={inp} /></div>
                    <div><label style={lbl}>Categoria</label><input value={form.exame.categoria} onChange={(e) => up({ exame: { ...form.exame, categoria: e.target.value } })} style={inp} placeholder="Hematologia, Imagem…" /></div>
                  </div>
                  <label className="flex items-center gap-2 text-[12.5px] mt-2" style={{ color: MUT }}><input type="checkbox" checked={form.exame.externo} onChange={(e) => up({ exame: { ...form.exame, externo: e.target.checked } })} /> Enviado pra laboratório externo</label>
                </div>
              )}

              {/* vacina */}
              {form.tipo === "VACINA" && (
                <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <label style={lbl}>💉 Protocolo (agenda as doses/reforço ao vender)</label>
                  <select value={form.protocoloTemplateId} onChange={(e) => up({ protocoloTemplateId: e.target.value })} style={inp}><option value="">— sem protocolo —</option>{protocolos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
                </div>
              )}

              {/* pacote/kit — composição */}
              {temComposicao(form.tipo) && (
                <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <div style={lbl}>🎁 Composição (o que compõe)</div>
                  {(form.composicao || []).map((c: any, i: number) => {
                    const sub = precoItem(c.itemId) * (Number(c.quantidade) || 0);
                    return (
                      <div key={i} className="flex gap-2 items-center mb-1.5">
                        <select value={c.itemId} onChange={(e) => { const arr = [...form.composicao]; arr[i] = { ...arr[i], itemId: e.target.value }; setComp(arr); }} style={{ ...inp, flex: 1 }}><option value="">— item —</option>{todosItens.filter((x) => x.id !== form.id).map((x) => <option key={x.id} value={x.id}>{x.nome} · {brl(x.preco)}</option>)}</select>
                        <input value={c.quantidade} onChange={(e) => { const arr = [...form.composicao]; arr[i] = { ...arr[i], quantidade: e.target.value.replace(/\D/g, "") }; setComp(arr); }} style={{ ...inp, width: 56 }} placeholder="qtd" />
                        <span className="tabular-nums text-[12px]" style={{ width: 78, textAlign: "right", color: MUT }}>{brl(sub)}</span>
                        <button onClick={() => setComp(form.composicao.filter((_: any, j: number) => j !== i))} className="text-[#b23b39] text-[15px] px-1">🗑</button>
                      </div>
                    );
                  })}
                  <button onClick={() => up({ composicao: [...(form.composicao || []), { itemId: "", quantidade: "1" }] })} className="text-[12px] font-semibold" style={{ color: T }}>＋ adicionar item</button>
                  {(form.composicao || []).length > 0 && (
                    <div className="flex items-center justify-between mt-2 pt-2 border-t" style={{ borderColor: LINE }}>
                      <span className="text-[12.5px]" style={{ color: INK }}>Soma dos itens: <b style={{ color: B }}>{brl(somaComposicao)}</b></span>
                      <button type="button" onClick={() => up({ preco: String(Math.round(somaComposicao * 100) / 100) })} className="text-[12px] font-semibold px-2.5 py-1 rounded-lg border" style={{ borderColor: T, color: T, background: "#fff" }}>usar como preço</button>
                    </div>
                  )}
                  {Number(form.preco) > 0 && somaComposicao > 0 && Number(form.preco) < somaComposicao && (
                    <div className="text-[11.5px] mt-1" style={{ color: "#0F6E56" }}>Desconto do pacote: {brl(somaComposicao - Number(form.preco))} ({Math.round((1 - Number(form.preco) / somaComposicao) * 100)}% off)</div>
                  )}

                  {/* 🔗 O que a venda cria (a ponte com o controle de sessões/doses) */}
                  <div className="mt-3 pt-3 border-t" style={{ borderColor: LINE }}>
                    <div style={lbl}>🔗 O que a venda cria</div>
                    <div className="flex gap-2 flex-wrap items-end">
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <label style={lbl}>Controle</label>
                        <select value={form.controlePlano} onChange={(e) => { const v = e.target.value; up({ controlePlano: v, ...((v && !form.planoUnidades && somaQtdComposicao > 0) ? { planoUnidades: String(somaQtdComposicao) } : {}) }); }} style={inp}>
                          <option value="">Kit — só vende junto (sem controle)</option>
                          <option value="SESSOES">Sessões — fisio, banhos, "N usos" (patinhas 🐾)</option>
                          <option value="DOSES">Doses programadas — medicação (agenda + lembrete 💉)</option>
                        </select>
                      </div>
                      {form.controlePlano && (
                        <div style={{ width: 104 }}>
                          <label style={lbl}>{form.controlePlano === "DOSES" ? "Nº doses" : "Nº sessões"}</label>
                          <input value={form.planoUnidades} onChange={(e) => up({ planoUnidades: e.target.value.replace(/\D/g, "") })} inputMode="numeric" style={inp} placeholder={String(somaQtdComposicao || "")} />
                        </div>
                      )}
                      {form.controlePlano === "DOSES" && (
                        <div style={{ width: 118 }}>
                          <label style={lbl}>A cada (dias)</label>
                          <input value={form.planoIntervaloDias} onChange={(e) => up({ planoIntervaloDias: e.target.value.replace(/\D/g, "") })} inputMode="numeric" style={inp} placeholder="30" />
                        </div>
                      )}
                    </div>
                    {form.controlePlano === "SESSOES" && <div className="text-[11px] mt-1" style={{ color: MUT }}>Ao vender, cria o controle de sessões do pet (aparece nas patinhas e baixa na agenda).</div>}
                    {form.controlePlano === "DOSES" && <div className="text-[11px] mt-1" style={{ color: MUT }}>Ao vender, agenda as doses no intervalo e dispara o lembrete de cada uma.</div>}
                  </div>
                </div>
              )}

              {/* comissão + desconto */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <label className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: B }}><input type="checkbox" checked={form.comissionado} onChange={(e) => up({ comissionado: e.target.checked })} /> 💰 Comissionado</label>
                  {form.comissionado && (
                    <div className="flex gap-2 mt-2">
                      <select value={form.comissaoTipo} onChange={(e) => up({ comissaoTipo: e.target.value })} style={{ ...inp, width: "auto" }}><option value="PERCENTUAL">%</option><option value="VALOR_FIXO">R$</option></select>
                      <input value={form.comissaoValor} onChange={(e) => up({ comissaoValor: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} placeholder="valor" />
                    </div>
                  )}
                </div>
                <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
                  <label style={lbl}>🎯 Desconto</label>
                  <select value={form.descontoModo} onChange={(e) => up({ descontoModo: e.target.value })} style={inp}>
                    <option value="LIMITE_GERAL">Segue limite da empresa/usuário</option>
                    <option value="LIMITE_ITEM">Limite próprio deste item</option>
                    <option value="SEM_DESCONTO">Não permite desconto</option>
                    <option value="ATE_100">Permite até 100%</option>
                  </select>
                  {form.descontoModo === "LIMITE_ITEM" && <input value={form.descontoLimite} onChange={(e) => up({ descontoLimite: e.target.value.replace(",", ".") })} inputMode="decimal" style={{ ...inp, marginTop: 6 }} placeholder="limite %" />}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-3.5 border-t" style={{ borderColor: LINE }}>
              <button onClick={() => setForm(null)} className="px-4 py-2 rounded-lg text-[13px] border" style={{ borderColor: LINE, color: MUT }}>Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="px-5 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-60" style={{ background: B }}>{salvando ? "Salvando…" : "💾 Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {grupoOpen && <GruposModal grupos={grupos} onClose={() => setGrupoOpen(false)} onChanged={carregarApoio} />}
      {importOpen && <ImportModal onClose={() => setImportOpen(false)} onDone={() => { carregarApoio(); carregarItens(); }} />}
      {estoqueItem && <EstoqueModal item={estoqueItem} onClose={() => setEstoqueItem(null)} onChanged={carregarItens} />}
      {invOpen && <InventarioModal itensEstoque={itens.filter((i) => temEstoque(i.tipo))} onClose={() => setInvOpen(false)} onChanged={carregarItens} />}
      {convOpen && <ConveniosModal onClose={() => setConvOpen(false)} />}
    </div>
  );
}

// ── Convênios (pagador mensal) + tabela do que o convênio paga ──
function ConveniosModal({ onClose }: { onClose: () => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [atual, setAtual] = useState<any>(null);
  const [novo, setNovo] = useState({ nome: "", diaFechamento: "" });
  const [csv, setCsv] = useState(""); const [nomeArq, setNomeArq] = useState(""); const [prev, setPrev] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", MUT = "#5C6B70";
  const loadLista = async () => { try { const d = await fetch("/api/catalogo/convenios", { cache: "no-store" }).then((r) => r.json()).catch(() => []); setLista(Array.isArray(d) ? d : []); } catch {} };
  const abrir = async (id: string) => { try { const d = await fetch(`/api/catalogo/convenios/${id}`, { cache: "no-store" }).then((r) => r.json()); setAtual(d); setCsv(""); setNomeArq(""); setPrev(null); } catch {} };
  useEffect(() => { loadLista(); /* eslint-disable-next-line */ }, []);
  async function criar() { if (!novo.nome.trim()) { toast.error("Informe o nome"); return; } try { await fetch("/api/catalogo/convenios", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: novo.nome, diaFechamento: novo.diaFechamento ? Number(novo.diaFechamento) : null }) }); setNovo({ nome: "", diaFechamento: "" }); await loadLista(); toast.success("Convênio criado"); } catch { toast.error("Erro"); } }
  const baixarModelo = () => { const blob = new Blob(["﻿item;valor;codigo\nHemograma completo;45,00;40304361\nConsulta;60,00;\nUltrassom abdominal;120,00;"], { type: "text/csv;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "modelo-tabela-convenio.csv"; a.click(); };
  const lerArq = (f: File | null) => { if (!f) return; setNomeArq(f.name); setPrev(null); const r = new FileReader(); r.onload = () => setCsv(String(r.result || "")); r.readAsText(f, "utf-8"); };
  async function enviar(dryRun: boolean) { if (!csv.trim()) { toast.error("Escolha o arquivo"); return; } setBusy(true); try { const r = await fetch(`/api/catalogo/convenios/${atual.id}/precos/importar`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv, dryRun }) }); const d = await r.json(); if (!r.ok) throw new Error(d?.message); if (dryRun) { setPrev(d); toast.success("Prévia gerada"); } else { toast.success(`Tabela importada (${d.gravados}) ✅`); await abrir(atual.id); } } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); } finally { setBusy(false); } }
  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: "#fff", color: "#1F2A2E" } as const;
  const brl = (v: any) => (Number(v) || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}>
          <div className="font-semibold text-[15px]" style={{ color: B }}>🏥 Convênios {atual ? `· ${atual.nome}` : ""}</div>
          <div className="flex items-center gap-2">{atual && <button onClick={() => setAtual(null)} className="text-[12px]" style={{ color: T }}>← lista</button>}<button onClick={onClose} className="text-[18px]" style={{ color: MUT }}>✕</button></div>
        </div>
        <div className="p-5">
          {!atual ? (
            <>
              <div className="rounded-xl border p-3 mb-4 flex gap-2 items-end flex-wrap" style={{ borderColor: LINE, background: "#FBFAF7" }}>
                <div className="flex-1 min-w-[160px]"><label className="text-[10px] uppercase" style={{ color: MUT }}>Novo convênio</label><input value={novo.nome} onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))} placeholder="Ex.: Petlife" style={{ ...inp, width: "100%" }} /></div>
                <div><label className="text-[10px] uppercase" style={{ color: MUT }}>Dia fecham.</label><input value={novo.diaFechamento} onChange={(e) => setNovo((n) => ({ ...n, diaFechamento: e.target.value.replace(/\D/g, "").slice(0, 2) }))} placeholder="20" style={{ ...inp, width: 64 }} /></div>
                <button onClick={criar} className="text-[13px] font-semibold px-3 py-2 rounded-lg text-white" style={{ background: T }}>Adicionar</button>
              </div>
              {lista.length === 0 ? <div className="text-[13px]" style={{ color: MUT }}>Nenhum convênio ainda.</div> : (
                <div className="flex flex-col gap-1">
                  {lista.map((c) => (
                    <button key={c.id} onClick={() => abrir(c.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left hover:bg-[#F6FBFC]" style={{ borderColor: LINE }}>
                      <span className="text-[15px]">🏥</span>
                      <span className="text-[13px] font-medium" style={{ color: B }}>{c.nome}</span>
                      {c.diaFechamento && <span className="text-[11px]" style={{ color: MUT }}>· fecha dia {c.diaFechamento}</span>}
                      <span className="ml-auto text-[11.5px]" style={{ color: MUT }}>{c._count?.precos ?? 0} itens na tabela</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="rounded-xl border p-3 mb-3 flex items-center gap-2 flex-wrap" style={{ borderColor: LINE, background: "#FBFAF7" }}>
                <span className="text-[12px] font-bold uppercase mr-1" style={{ color: MUT }}>Tabela do convênio</span>
                <button onClick={baixarModelo} className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border" style={{ borderColor: T, color: T, background: "#fff" }}>⬇️ Modelo</button>
                <label className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: LINE, color: B, background: "#fff" }}>📄 Arquivo<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => lerArq(e.target.files?.[0] || null)} /></label>
                <span className="text-[11.5px]" style={{ color: nomeArq ? "#1F2A2E" : "#9aa" }}>{nomeArq || "nenhum"}</span>
                {csv && <button onClick={() => enviar(true)} disabled={busy} className="ml-auto text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: T }}>🔎 Analisar</button>}
              </div>
              {prev && (
                <div className="rounded-xl border p-3 mb-3" style={{ borderColor: LINE }}>
                  <div className="text-[12.5px] mb-1" style={{ color: B }}><b>{prev.total}</b> itens na planilha · {prev.duplicadosRemovidos} duplicados. Isto <b>substitui</b> a tabela atual.</div>
                  <div className="flex justify-end"><button onClick={() => enviar(false)} disabled={busy} className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white" style={{ background: B }}>{busy ? "…" : "💾 Confirmar"}</button></div>
                </div>
              )}
              <div className="text-[12px] font-bold uppercase mb-1.5" style={{ color: MUT }}>O que o convênio paga ({(atual.precos || []).length})</div>
              {(atual.precos || []).length === 0 ? <div className="text-[13px]" style={{ color: MUT }}>Nenhum item ainda — importe a tabela do convênio.</div> : (
                <div className="flex flex-col gap-0.5 max-h-72 overflow-y-auto">
                  {atual.precos.map((p: any) => {
                    let pp: any = null; try { pp = p.precosPorte ? JSON.parse(p.precosPorte) : null; } catch {}
                    const sizes: [string, any][] = pp ? ([["🐱", pp.gato], ["P", pp.p], ["M", pp.m], ["G", pp.g], ["GG", pp.gg]] as [string, any][]).filter(([, v]) => v != null) : [];
                    const variavel = sizes.length > 0 && new Set(sizes.map(([, v]) => v)).size > 1;
                    return (
                      <div key={p.id} className="flex items-start gap-2 text-[12.5px] py-1.5 border-b" style={{ borderColor: "#F0EBE0" }}>
                        <span className="flex-1 min-w-0 truncate" style={{ color: "#1F2A2E" }}>{p.itemNome}{p.codigoConvenio ? <span className="text-[10.5px] ml-1" style={{ color: "#9aa" }}>#{p.codigoConvenio}</span> : null}</span>
                        {variavel ? (
                          <span className="flex gap-1 flex-wrap justify-end" style={{ maxWidth: "58%" }}>
                            {sizes.map(([lbl, v]) => (
                              <span key={lbl} className="text-[10.5px] px-1.5 py-0.5 rounded" style={{ background: lbl === "🐱" ? "#F3E9F6" : "#EAF6F1", color: lbl === "🐱" ? "#8A4F9E" : "#0F6E56", whiteSpace: "nowrap" }}><b>{lbl}</b> {brl(v)}</span>
                            ))}
                          </span>
                        ) : (
                          <span className="font-semibold" style={{ color: "#0F6E56", whiteSpace: "nowrap" }}>{brl(p.valor)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inventário (contagem física → ajustes) ──
function InventarioModal({ itensEstoque, onClose, onChanged }: { itensEstoque: any[]; onClose: () => void; onChanged: () => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [atual, setAtual] = useState<any>(null); // inventário aberto/visualizado
  const [busca, setBusca] = useState("");
  const [contagem, setContagem] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", MUT = "#5C6B70", OK = "#0F6E56", WARN = "#B45309";
  const loadLista = async () => { try { const d = await fetch("/api/catalogo/inventarios", { cache: "no-store" }).then((r) => r.json()).catch(() => []); setLista(Array.isArray(d) ? d : []); } catch {} };
  const abrir = async (id: string) => { try { const d = await fetch(`/api/catalogo/inventarios/${id}`, { cache: "no-store" }).then((r) => r.json()); setAtual(d); } catch {} };
  useEffect(() => { loadLista(); /* eslint-disable-next-line */ }, []);
  async function novo() { try { const d = await fetch("/api/catalogo/inventarios", { method: "POST" }).then((r) => r.json()); await loadLista(); setAtual({ ...d, itens: [] }); } catch { toast.error("Erro"); } }
  async function addItem(itemId: string) {
    const q = contagem[itemId]; if (q == null || q === "") { toast.error("Digite a quantidade contada"); return; }
    try { await fetch(`/api/catalogo/inventarios/${atual.id}/contagem`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId, quantidadeContada: Number(String(q).replace(",", ".")) }) }); setContagem((c) => ({ ...c, [itemId]: "" })); setBusca(""); await abrir(atual.id); } catch { toast.error("Erro"); }
  }
  async function delRow(rowId: string) { try { await fetch(`/api/catalogo/inventarios/${atual.id}/itens/${rowId}`, { method: "DELETE" }); await abrir(atual.id); } catch {} }
  async function fechar() {
    if (!confirm(`Fechar o inventário? Os itens contados diferentes do sistema vão ser AJUSTADOS pro valor contado (o físico manda).`)) return;
    setSaving(true);
    try { const d = await fetch(`/api/catalogo/inventarios/${atual.id}/fechar`, { method: "POST" }).then((r) => r.json()); toast.success(`Inventário fechado ✅ — ${d.totalCorrigidos} ajuste(s)`); await abrir(atual.id); await loadLista(); onChanged(); } catch { toast.error("Erro ao fechar"); } finally { setSaving(false); }
  }
  const jaContados = new Set((atual?.itens || []).map((x: any) => x.itemId));
  const matches = busca.trim() ? itensEstoque.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()) && !jaContados.has(i.id)).slice(0, 8) : [];
  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: "#fff", color: "#1F2A2E" } as const;
  const aberto = atual && atual.status === "ABERTO";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}>
          <div className="font-semibold text-[15px]" style={{ color: B }}>📋 Inventário {atual ? (aberto ? "· em contagem" : "· fechado") : ""}</div>
          <div className="flex items-center gap-2">{atual && <button onClick={() => setAtual(null)} className="text-[12px]" style={{ color: T }}>← lista</button>}<button onClick={onClose} className="text-[18px]" style={{ color: MUT }}>✕</button></div>
        </div>
        <div className="p-5">
          {!atual ? (
            <>
              <button onClick={novo} className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white mb-4" style={{ background: T }}>＋ Novo inventário</button>
              <div className="text-[12px] font-bold uppercase mb-2" style={{ color: MUT }}>Inventários</div>
              {lista.length === 0 ? <div className="text-[13px]" style={{ color: MUT }}>Nenhum ainda.</div> : (
                <div className="flex flex-col gap-1">
                  {lista.map((iv) => (
                    <button key={iv.id} onClick={() => abrir(iv.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg border text-left hover:bg-[#F6FBFC]" style={{ borderColor: LINE }}>
                      <span className="text-[15px]">{iv.status === "ABERTO" ? "🟡" : "✅"}</span>
                      <span className="text-[12.5px]" style={{ color: B }}>{new Date(iv.createdAt).toLocaleDateString("pt-BR")}{iv.responsavelNome ? ` · ${iv.responsavelNome.split(" ")[0]}` : ""}</span>
                      <span className="ml-auto text-[11.5px]" style={{ color: MUT }}>{iv.status === "ABERTO" ? `${iv._count?.itens ?? 0} contados` : `${iv.totalCorretos} ok · ${iv.totalCorrigidos} corrigidos`}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {aberto && (
                <div className="rounded-xl border p-3 mb-3" style={{ borderColor: LINE, background: "#FBFAF7" }}>
                  <div className="text-[12px] font-bold uppercase mb-1.5" style={{ color: MUT }}>Adicionar item à contagem</div>
                  <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔍 Buscar produto/vacina…" style={{ ...inp, width: "100%" }} />
                  {matches.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1">
                      {matches.map((i) => (
                        <div key={i.id} className="flex items-center gap-2">
                          <span className="text-[12.5px] flex-1 truncate" style={{ color: B }}>{i.nome}</span>
                          <input value={contagem[i.id] || ""} onChange={(e) => setContagem((c) => ({ ...c, [i.id]: e.target.value }))} placeholder="contado" inputMode="decimal" style={{ ...inp, width: 90 }} />
                          <button onClick={() => addItem(i.id)} className="text-[12px] font-semibold px-2.5 py-1.5 rounded-lg text-white" style={{ background: T }}>Add</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {/* itens contados */}
              <div className="text-[12px] font-bold uppercase mb-1.5" style={{ color: MUT }}>Contagem</div>
              {(atual.itens || []).length === 0 ? <div className="text-[13px]" style={{ color: MUT }}>Nenhum item contado ainda.</div> : (
                <table className="w-full text-[12.5px]">
                  <thead><tr style={{ color: MUT }}><th className="text-left py-1">Item</th><th className="text-right py-1">Sistema</th><th className="text-right py-1">Contado</th><th className="text-right py-1">Dif.</th><th></th></tr></thead>
                  <tbody>
                    {atual.itens.map((it: any) => { const dif = Number(it.quantidadeContada) - Number(it.quantidadeSistema); return (
                      <tr key={it.id} style={{ borderTop: `1px solid ${LINE}` }}>
                        <td className="py-1.5" style={{ color: B }}>{it.itemNome}</td>
                        <td className="py-1.5 text-right" style={{ color: MUT }}>{it.quantidadeSistema}</td>
                        <td className="py-1.5 text-right font-semibold">{it.quantidadeContada}</td>
                        <td className="py-1.5 text-right font-semibold" style={{ color: dif === 0 ? OK : WARN }}>{dif === 0 ? "✓" : (dif > 0 ? `+${dif}` : dif)}</td>
                        <td className="py-1.5 text-right">{aberto && <button onClick={() => delRow(it.id)} className="text-[#b23b39] text-[13px]">🗑</button>}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              )}
              {aberto ? (
                <div className="flex justify-end mt-4 pt-3 border-t" style={{ borderColor: LINE }}>
                  <button onClick={fechar} disabled={saving || (atual.itens || []).length === 0} className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: OK }}>{saving ? "Fechando…" : "✅ Fechar e ajustar estoque"}</button>
                </div>
              ) : (
                <div className="mt-4 pt-3 border-t text-[12.5px]" style={{ borderColor: LINE, color: OK }}>Fechado: <b>{atual.totalCorretos}</b> bateram · <b>{atual.totalCorrigidos}</b> ajustados.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Estoque de um item (saldo + previsão + movimentar) ──
function EstoqueModal({ item, onClose, onChanged }: { item: { id: string; nome: string }; onClose: () => void; onChanged: () => void }) {
  const [dados, setDados] = useState<any>(null);
  const [motivos, setMotivos] = useState<any[]>([]);
  const [tipo, setTipo] = useState<"ENTRADA" | "SAIDA" | "AJUSTE">("ENTRADA");
  const [qtd, setQtd] = useState("");
  const [custo, setCusto] = useState("");
  const [motivoId, setMotivoId] = useState("");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", MUT = "#5C6B70";
  const load = async () => {
    try {
      const [d, m] = await Promise.all([
        fetch(`/api/catalogo/itens/${item.id}/estoque`, { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch(`/api/catalogo/motivos-saida`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setDados(d); setMotivos(Array.isArray(m) ? m : []);
    } catch {}
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [item.id]);
  async function novoMotivo() { const nome = window.prompt("Novo motivo de saída:")?.trim(); if (!nome) return; try { const m = await fetch("/api/catalogo/motivos-saida", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) }).then((r) => r.json()); await load(); if (m?.id) setMotivoId(m.id); } catch {} }
  async function registrar() {
    const q = Number(String(qtd).replace(",", ".")); if (isNaN(q) || q < 0) { toast.error("Quantidade inválida"); return; }
    setSaving(true);
    try {
      const body: any = { tipo, quantidade: q, obs: obs || undefined };
      if (tipo === "ENTRADA" && custo) body.custoUnitario = Number(String(custo).replace(",", "."));
      if (tipo === "SAIDA" && motivoId) body.motivoId = motivoId;
      const r = await fetch(`/api/catalogo/itens/${item.id}/estoque/movimento`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message); }
      toast.success("Estoque atualizado ✅"); setQtd(""); setCusto(""); setObs(""); await load(); onChanged();
    } catch (e: any) { toast.error(e?.message || "Erro"); } finally { setSaving(false); }
  }
  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, background: "#fff", color: "#1F2A2E" } as const;
  const it = dados?.item;
  const abaixoMin = it && it.estoqueMin != null && Number(it.estoqueAtual) < Number(it.estoqueMin);
  const fmtMov = (m: any) => ({ ENTRADA: "⬆️ Entrada", SAIDA: "⬇️ Saída", AJUSTE: "✏️ Ajuste", INVENTARIO: "📋 Inventário" } as any)[m.tipo] || m.tipo;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}><div className="font-semibold text-[15px]" style={{ color: B }}>📦 Estoque · {item.nome}</div><button onClick={onClose} className="text-[18px]" style={{ color: MUT }}>✕</button></div>
        <div className="p-5 flex flex-col gap-4">
          {/* saldo + previsão */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: abaixoMin ? "#C0392B" : LINE, background: abaixoMin ? "#FDF3F2" : "#FBFAF7" }}><div className="text-[22px] font-extrabold" style={{ color: abaixoMin ? "#C0392B" : B }}>{it ? Number(it.estoqueAtual) : "—"}</div><div className="text-[11px]" style={{ color: MUT }}>em estoque{abaixoMin ? " ⚠️" : ""}</div></div>
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: LINE }}><div className="text-[22px] font-extrabold" style={{ color: B }}>{dados?.mediaMensal ?? "—"}</div><div className="text-[11px]" style={{ color: MUT }}>saídas/mês</div></div>
            <div className="rounded-xl border p-3 text-center" style={{ borderColor: LINE }}><div className="text-[22px] font-extrabold" style={{ color: B }}>{dados?.duracaoDias != null ? `${dados.duracaoDias}d` : "—"}</div><div className="text-[11px]" style={{ color: MUT }}>duração estimada</div></div>
          </div>
          {it && (it.estoqueMin != null || it.estoqueMax != null) && <div className="text-[11.5px]" style={{ color: MUT }}>Mínimo: <b>{it.estoqueMin ?? "—"}</b> · Máximo: <b>{it.estoqueMax ?? "—"}</b></div>}

          {/* movimentar */}
          <div className="rounded-xl border p-3" style={{ borderColor: LINE, background: "#FBFAF7" }}>
            <div className="text-[12px] font-bold uppercase mb-2" style={{ color: MUT }}>Movimentar</div>
            <div className="flex gap-1.5 mb-2">
              {(["ENTRADA", "SAIDA", "AJUSTE"] as const).map((tp) => <button key={tp} onClick={() => setTipo(tp)} className="text-[12px] font-semibold px-3 py-1.5 rounded-full border" style={tipo === tp ? { background: T, color: "#fff", borderColor: T } : { background: "#fff", color: MUT, borderColor: LINE }}>{tp === "ENTRADA" ? "⬆️ Entrada" : tp === "SAIDA" ? "⬇️ Saída" : "✏️ Ajuste"}</button>)}
            </div>
            <div className="flex gap-2 flex-wrap items-end">
              <div><label className="text-[10px] uppercase" style={{ color: MUT }}>{tipo === "AJUSTE" ? "Novo saldo" : "Quantidade"}</label><input value={qtd} onChange={(e) => setQtd(e.target.value)} inputMode="decimal" style={{ ...inp, width: 100 }} /></div>
              {tipo === "ENTRADA" && <div><label className="text-[10px] uppercase" style={{ color: MUT }}>Custo un.</label><input value={custo} onChange={(e) => setCusto(e.target.value)} inputMode="decimal" style={{ ...inp, width: 100 }} /></div>}
              {tipo === "SAIDA" && <div className="flex-1 min-w-[160px]"><label className="text-[10px] uppercase" style={{ color: MUT }}>Motivo</label><div className="flex gap-1"><select value={motivoId} onChange={(e) => setMotivoId(e.target.value)} style={{ ...inp, flex: 1 }}><option value="">—</option>{motivos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</select><button onClick={novoMotivo} className="text-[15px] px-2 rounded-lg border" style={{ borderColor: LINE, color: T }}>＋</button></div></div>}
            </div>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" style={{ ...inp, width: "100%", marginTop: 8 }} />
            <div className="flex justify-end mt-2"><button onClick={registrar} disabled={saving} className="text-[13px] font-semibold px-4 py-2 rounded-lg text-white" style={{ background: B }}>{saving ? "…" : "Registrar"}</button></div>
          </div>

          {/* histórico */}
          <div>
            <div className="text-[12px] font-bold uppercase mb-1.5" style={{ color: MUT }}>Últimas movimentações</div>
            {(dados?.movimentos || []).length === 0 ? <div className="text-[12.5px]" style={{ color: MUT }}>Nenhuma ainda.</div> : (
              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {dados.movimentos.map((m: any) => (
                  <div key={m.id} className="flex items-center gap-2 text-[12px] py-1 border-b" style={{ borderColor: "#F0EBE0", color: MUT }}>
                    <span style={{ width: 90 }}>{fmtMov(m)}</span>
                    <span className="font-semibold" style={{ color: B }}>{m.saldoAntes} → {m.saldoDepois}</span>
                    {m.motivoNome && <span className="text-[11px]">· {m.motivoNome}</span>}
                    <span className="ml-auto text-[10.5px]" style={{ color: "#9aa" }}>{new Date(m.createdAt).toLocaleDateString("pt-BR")}{m.userName ? ` · ${m.userName.split(" ")[0]}` : ""}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Importador de catálogo (CSV) ──
function ImportModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [csv, setCsv] = useState("");
  const [nomeArq, setNomeArq] = useState("");
  const [prev, setPrev] = useState<any>(null);
  const [feito, setFeito] = useState<any>(null);
  const [carregando, setCarregando] = useState(false);
  const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", MUT = "#5C6B70";

  const baixarModelo = () => {
    const head = "tipo;nome;grupo;preco;custo;unidade;marca;codigo_barras;controla_estoque;estoque_atual;estoque_min;estoque_max;proposito;comissao_valor;laboratorio;custo_lab;prazo_dias;categoria;protocolo";
    const ex = [
      "PRODUTO;Ração Premium 15kg;Pet Shop;180,00;120,00;UN;Marca Exemplo;7891234567890;sim;10;3;20;VENDA;5;;;;;",
      "SERVICO;Consulta Clínica;Consultas;120,00;;;;;;;;;;;;;;;",
      "EXAME;Hemograma completo;Exames;80,00;;;;;;;;;;;Veter;35,00;2;Hematologia;",
      "VACINA;V10;Vacinas;90,00;40,00;UN;Marca Vac;;sim;5;2;10;VENDA;;;;;;V10",
      "PACOTE;Pacote Fisio 6 sessões;Fisioterapia;540,00;;;;;;;;;;;;;;;",
    ];
    const blob = new Blob(["﻿" + head + "\n" + ex.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "modelo-catalogo.csv"; a.click();
  };
  const lerArquivo = (f: File | null) => { if (!f) return; setNomeArq(f.name); setPrev(null); setFeito(null); const r = new FileReader(); r.onload = () => setCsv(String(r.result || "")); r.readAsText(f, "utf-8"); };
  const enviar = async (dryRun: boolean) => {
    if (!csv.trim()) { toast.error("Escolha o arquivo primeiro"); return; }
    setCarregando(true);
    try {
      const r = await fetch("/api/catalogo/importar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv, dryRun }) });
      const d = await r.json(); if (!r.ok) throw new Error(d?.message || "Erro");
      if (dryRun) { setPrev(d); toast.success("Prévia gerada — confira antes de gravar."); }
      else { setFeito(d); setPrev(null); toast.success("Catálogo importado! ✅"); onDone(); }
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 140)); } finally { setCarregando(false); }
  };
  const rel = feito || prev;
  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13 } as const;
  const Card = ({ n, k, cor }: { n: any; k: string; cor?: string }) => (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 11, padding: "10px 13px" }}><div style={{ fontSize: 20, fontWeight: 800, color: cor || B }}>{n}</div><div style={{ fontSize: 11.5, color: MUT }}>{k}</div></div>
  );
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}><div className="font-semibold text-[15px]" style={{ color: B }}>📥 Importar catálogo</div><button onClick={onClose} className="text-[18px]" style={{ color: MUT }}>✕</button></div>
        <div className="p-5 flex flex-col gap-3">
          <div className="rounded-xl border p-3 flex items-center gap-2 flex-wrap" style={{ borderColor: LINE, background: "#FBFAF7" }}>
            <button onClick={baixarModelo} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border" style={{ borderColor: T, color: T, background: "#fff" }}>⬇️ Baixar modelo</button>
            <label className="text-[12.5px] font-semibold px-3 py-1.5 rounded-lg border cursor-pointer" style={{ borderColor: LINE, color: B, background: "#fff" }}>📄 Escolher arquivo<input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => lerArquivo(e.target.files?.[0] || null)} /></label>
            <span className="text-[12px]" style={{ color: nomeArq ? "#1F2A2E" : "#9aa" }}>{nomeArq || "nenhum arquivo"}</span>
            {csv && <button onClick={() => enviar(true)} disabled={carregando} className="ml-auto text-[12.5px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: T }}>{carregando ? "Analisando…" : "🔎 Analisar"}</button>}
          </div>
          <div className="text-[11.5px]" style={{ color: "#8a6400" }}>Preencha o modelo (uma linha por item, coluna <b>tipo</b>). Grupos, marcas e laboratórios que não existirem são criados. Nada é gravado até você confirmar.</div>

          {rel && (
            <div className="rounded-xl border p-3" style={{ borderColor: LINE }}>
              <div className="font-semibold text-[13px] mb-2" style={{ color: B }}>{feito ? "✅ Importado" : "Prévia — confira antes de gravar"}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                <Card n={rel.total} k="itens na planilha" />
                <Card n={feito ? (rel.criados ?? rel.novos) : rel.novos} k="novos (a criar)" cor="#1c7a47" />
                <Card n={rel.atualizados} k="atualizados" />
                <Card n={rel.duplicadosRemovidos} k="duplicados removidos" cor="#b45309" />
              </div>
              <div className="text-[12px] flex flex-wrap gap-x-4 gap-y-1 mb-2" style={{ color: MUT }}>
                {Object.entries(rel.porTipo || {}).map(([t, n]) => <span key={t}><b style={{ color: B }}>{String(n)}</b> {t.toLowerCase()}</span>)}
              </div>
              {(rel.gruposNovos?.length > 0 || rel.marcasNovas?.length > 0 || rel.labsNovos?.length > 0) && (
                <div className="text-[11.5px] mb-2" style={{ color: MUT }}>Serão criados: {rel.gruposNovos?.length ? `${rel.gruposNovos.length} grupo(s)` : ""} {rel.marcasNovas?.length ? `· ${rel.marcasNovas.length} marca(s)` : ""} {rel.labsNovos?.length ? `· ${rel.labsNovos.length} laboratório(s)` : ""}</div>
              )}
              {rel.totalSuspeitos > 0 && (
                <details><summary className="text-[12px] font-semibold cursor-pointer" style={{ color: "#b45309" }}>⚠️ {rel.totalSuspeitos} item(ns) pra revisar (preço 0 ou sem grupo)</summary>
                  <div className="text-[11.5px] mt-1 max-h-40 overflow-y-auto" style={{ color: MUT }}>{rel.suspeitos?.map((s: string, i: number) => <div key={i}>• {s}</div>)}</div>
                </details>
              )}
              {!feito && (
                <div className="flex justify-end gap-2 mt-3 pt-2 border-t" style={{ borderColor: LINE }}>
                  <button onClick={() => setPrev(null)} className="px-3 py-2 rounded-lg text-[13px] border" style={{ borderColor: LINE, color: MUT }}>Cancelar</button>
                  <button onClick={() => enviar(false)} disabled={carregando} className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white" style={{ background: B }}>{carregando ? "Importando…" : "💾 Confirmar importação"}</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Gestão de grupos (árvore) ──
function GruposModal({ grupos, onClose, onChanged }: { grupos: any[]; onClose: () => void; onChanged: () => void }) {
  const [nome, setNome] = useState("");
  const [paiId, setPaiId] = useState("");
  const [agrupador, setAgrupador] = useState(false);
  const [saving, setSaving] = useState(false);
  const B = "#014D5E", T = "#009AAC", LINE = "#E8DFC8", MUT = "#5C6B70";
  const agrupadores = grupos.filter((g) => g.agrupador);
  async function criar() {
    if (!nome.trim()) { toast.error("Informe o nome"); return; }
    setSaving(true);
    try { await fetch("/api/catalogo/grupos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, paiId: paiId || undefined, agrupador }) }); toast.success("Grupo criado"); setNome(""); setPaiId(""); setAgrupador(false); onChanged(); } catch { toast.error("Erro"); } finally { setSaving(false); }
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este grupo?")) return;
    try { const r = await fetch(`/api/catalogo/grupos/${id}`, { method: "DELETE" }); if (!r.ok) { const e = await r.json().catch(() => null); throw new Error(e?.message); } toast.success("Excluído"); onChanged(); } catch (e: any) { toast.error(e?.message || "Erro"); }
  }
  const inp = { border: `1px solid ${LINE}`, borderRadius: 9, padding: "8px 10px", fontSize: 13, width: "100%", background: "#fff", color: "#1F2A2E" } as const;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(20,35,40,.35)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg my-6" style={{ border: `1px solid ${LINE}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: LINE }}><div className="font-semibold text-[15px]" style={{ color: B }}>🌳 Grupos</div><button onClick={onClose} className="text-[18px]" style={{ color: MUT }}>✕</button></div>
        <div className="p-5">
          <div className="rounded-xl border p-3 mb-4" style={{ borderColor: LINE, background: "#FBFAF7" }}>
            <div className="text-[12px] font-bold uppercase mb-2" style={{ color: MUT }}>Novo grupo</div>
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (ex.: Consultas, Vacinas, Exames)" style={{ ...inp, marginBottom: 8 }} />
            <div className="flex gap-2 items-center flex-wrap">
              <select value={paiId} onChange={(e) => setPaiId(e.target.value)} style={{ ...inp, width: "auto" }}><option value="">Sem pai (raiz)</option>{agrupadores.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select>
              <label className="flex items-center gap-1.5 text-[12.5px]" style={{ color: MUT }}><input type="checkbox" checked={agrupador} onChange={(e) => setAgrupador(e.target.checked)} /> É agrupador (só organiza, não recebe item)</label>
              <button onClick={criar} disabled={saving} className="ml-auto text-[13px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: T }}>Adicionar</button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {grupos.length === 0 ? <div className="text-[13px] text-center py-4" style={{ color: MUT }}>Nenhum grupo ainda.</div> : grupos.map((g) => (
              <div key={g.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg" style={{ background: g.agrupador ? "#F1EFE8" : "#fff", border: `1px solid ${LINE}` }}>
                <span style={{ paddingLeft: g.paiId ? 16 : 0 }}>{g.agrupador ? "📁" : "📄"}</span>
                <span className="text-[13px] font-medium" style={{ color: B }}>{g.nome}</span>
                {g.agrupador && <span className="text-[10px] px-1.5 rounded" style={{ background: "#E8DFC8", color: MUT }}>agrupador</span>}
                <button onClick={() => excluir(g.id)} className="ml-auto text-[#b23b39] text-[13px]">🗑</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
