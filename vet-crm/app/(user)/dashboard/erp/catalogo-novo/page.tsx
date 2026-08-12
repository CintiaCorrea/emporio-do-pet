"use client";
// 🗂️ Catálogo Único (rebuild — Fatia 1). Cadastro único de Produto/Serviço/Exame/Vacina/Pacote/Kit.
// Fonte: /api/catalogo/* (tabelas cat_). NÃO mexe no catálogo antigo (arquivado à parte).
import { useEffect, useMemo, useState, useCallback } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

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
  tipo: "PRODUTO", nome: "", grupoId: "", custo: "", markup: "", preco: "", exibeListaPreco: true, permiteAlterarPreco: true,
  codigoBarras: "", unidadeVenda: "", marcaId: "", proposito: "VENDA", duracaoMin: "",
  controlaEstoque: false, estoqueAtual: "", estoqueMin: "", estoqueMax: "", controlaValidade: false,
  comissionado: false, comissaoTipo: "PERCENTUAL", comissaoValor: "", descontoModo: "LIMITE_GERAL", descontoLimite: "",
  protocoloTemplateId: "", ativo: true,
  exame: { fornecedorId: "", custoLab: "", prazoResultadoDias: "", categoria: "", externo: false },
  composicao: [] as any[],
};

export default function CatalogoNovoPage() {
  usePageTitle("Catálogo (novo)", "Cadastro único — produto, serviço, exame, vacina, pacote e kit.");
  const [itens, setItens] = useState<any[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [marcas, setMarcas] = useState<any[]>([]);
  const [labs, setLabs] = useState<any[]>([]);
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
      const [g, m, f, pr] = await Promise.all([
        fetch("/api/catalogo/grupos", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
        fetch("/api/catalogo/marcas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/fornecedores", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/protocolos/templates", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setGrupos(Array.isArray(g?.flat) ? g.flat : []);
      setMarcas(Array.isArray(m) ? m : (m?.data || []));
      const fArr = Array.isArray(f) ? f : (f?.data || f?.itens || []);
      setLabs(fArr.filter((x: any) => !x.tipo || /LABORATORIO|PROFISSIONAL/i.test(x.tipo)));
      setProtocolos(Array.isArray(pr) ? pr : (pr?.data || pr?.templates || []));
    } catch {}
  }, []);

  useEffect(() => { (async () => { setLoading(true); await carregarApoio(); await carregarItens(); setLoading(false); })(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { const t = setTimeout(carregarItens, 250); return () => clearTimeout(t); }, [carregarItens]);

  const gruposFolha = useMemo(() => grupos.filter((g) => !g.agrupador), [grupos]);
  const nomeGrupo = (id?: string) => grupos.find((g) => g.id === id)?.nome || "—";

  function novo() { setForm({ ...FORM0, exame: { ...FORM0.exame }, composicao: [] }); }
  async function editar(id: string) {
    try {
      const it = await fetch(`/api/catalogo/itens/${id}`, { cache: "no-store" }).then((r) => r.json());
      setForm({
        ...FORM0, ...it,
        custo: it.custo ?? "", markup: it.markup ?? "", preco: it.preco ?? "", duracaoMin: it.duracaoMin ?? "",
        estoqueAtual: it.estoqueAtual ?? "", estoqueMin: it.estoqueMin ?? "", estoqueMax: it.estoqueMax ?? "",
        comissaoValor: it.comissaoValor ?? "", descontoLimite: it.descontoLimite ?? "",
        grupoId: it.grupoId || "", marcaId: it.marcaId || "", protocoloTemplateId: it.protocoloTemplateId || "",
        exame: it.exame ? { fornecedorId: it.exame.fornecedorId || "", custoLab: it.exame.custoLab ?? "", prazoResultadoDias: it.exame.prazoResultadoDias ?? "", categoria: it.exame.categoria || "", externo: !!it.exame.externo } : { ...FORM0.exame },
        composicao: (it.composicao || []).map((c: any) => ({ itemId: c.itemId, nome: c.item?.nome, quantidade: c.quantidade })),
      });
    } catch { toast.error("Não consegui abrir o item"); }
  }

  const up = (patch: any) => setForm((f: any) => ({ ...f, ...patch }));
  const markupReal = useMemo(() => {
    const c = Number(form?.custo), p = Number(form?.preco);
    if (!form || !c || c <= 0 || !p) return null;
    return Math.round(((p - c) / c) * 100);
  }, [form]);

  async function salvar() {
    if (!form?.nome?.trim()) { toast.error("Informe o nome"); return; }
    if (!form?.grupoId) { toast.error("Escolha um grupo"); return; }
    setSalvando(true);
    try {
      const body = { ...form };
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
        <button onClick={() => setImportOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>📥 Importar</button>
        <button onClick={() => setGrupoOpen(true)} className="text-[13px] font-semibold px-3 py-2 rounded-lg border" style={{ borderColor: LINE, color: B, background: "#fff" }}>🌳 Grupos</button>
        <button onClick={novo} className="text-[13px] font-semibold px-3.5 py-2 rounded-lg text-white" style={{ background: T }}>＋ Novo item</button>
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
                {TIPOS.map((t) => <button key={t.k} disabled={!!form.id} onClick={() => up({ tipo: t.k })} className="text-[12.5px] font-semibold px-3 py-1.5 rounded-full border disabled:opacity-50" style={form.tipo === t.k ? { background: T, color: "#fff", borderColor: T } : { background: "#fff", color: MUT, borderColor: LINE }}>{t.emoji} {t.lbl}</button>)}
              </div>

              {/* dados básicos */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label style={lbl}>Nome *</label><input value={form.nome} onChange={(e) => up({ nome: e.target.value })} style={inp} placeholder="Nome do item" /></div>
                <div><label style={lbl}>Grupo *</label><select value={form.grupoId} onChange={(e) => up({ grupoId: e.target.value })} style={inp}><option value="">— escolher —</option>{gruposFolha.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}</select></div>
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
                  <div><label style={lbl}>Custo</label><input value={form.custo} onChange={(e) => up({ custo: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                  <div><label style={lbl}>Markup %</label><input value={form.markup} onChange={(e) => up({ markup: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                  <div><label style={lbl}>Preço venda *</label><input value={form.preco} onChange={(e) => up({ preco: e.target.value.replace(",", ".") })} inputMode="decimal" style={inp} /></div>
                </div>
                {markupReal != null && <div className="text-[11.5px] mt-1.5" style={{ color: markupReal < 0 ? "#A32D2D" : "#0F6E56" }}>Markup real: <b>{markupReal}%</b> {markupReal < 0 && "⚠️ preço abaixo do custo"}</div>}
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
                    <div><label style={lbl}>Custo do lab</label><input value={form.exame.custoLab} onChange={(e) => up({ exame: { ...form.exame, custoLab: e.target.value.replace(",", ".") } })} inputMode="decimal" style={inp} /></div>
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
                  {(form.composicao || []).map((c: any, i: number) => (
                    <div key={i} className="flex gap-2 items-center mb-1.5">
                      <select value={c.itemId} onChange={(e) => { const arr = [...form.composicao]; arr[i] = { ...arr[i], itemId: e.target.value }; up({ composicao: arr }); }} style={{ ...inp, flex: 1 }}><option value="">— item —</option>{itens.filter((x) => x.id !== form.id).map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
                      <input value={c.quantidade} onChange={(e) => { const arr = [...form.composicao]; arr[i] = { ...arr[i], quantidade: e.target.value.replace(/\D/g, "") }; up({ composicao: arr }); }} style={{ ...inp, width: 64 }} placeholder="qtd" />
                      <button onClick={() => up({ composicao: form.composicao.filter((_: any, j: number) => j !== i) })} className="text-[#b23b39] text-[15px] px-1">🗑</button>
                    </div>
                  ))}
                  <button onClick={() => up({ composicao: [...(form.composicao || []), { itemId: "", quantidade: "1" }] })} className="text-[12px] font-semibold" style={{ color: T }}>＋ adicionar item</button>
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
