"use client";
import { useEffect, useMemo, useState } from "react";
import { LuPencil, LuX, LuTrash2, LuPlus, LuLink } from "react-icons/lu";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { usePodeEditar } from "@/lib/permissions/context";

// ─────────────────────────────────────────────────────────────────────────────
// De-para Categoria (catálogo) → Departamento (Linha de Serviço do Financeiro).
// Guardado como config NEUTRA (listaItem `config_depara_dep`) — não mexe no CRM
// nem cria tabela. É a ponte que faz a venda do caixa cair no departamento certo
// da DRE. Departamentos = as Linhas de Serviço (fonte única, CRUD no financeiro).
// ─────────────────────────────────────────────────────────────────────────────

const LISTA = "config_depara_dep";
const C = { turq: "#009AAC", navy: "#014D5E", bege: "#E8DFC8", fundo: "#FBF9F4", ink: "#0E2244", mut: "#5C6B70", line: "#EFE9DC", green: "#0F7B5A", amber: "#B45309", red: "#A32D2D" };

interface Linha { id: string; nome: string; ativo?: boolean }
interface Cat { nome: string; tipo: "catalogo" | "manual"; id?: string; itens?: number }
interface Cfg { map: Record<string, string>; manuais: string[]; ignoradas: string[] }

export default function DeparaDepartamentoPage() {
  usePageTitle("Departamentos", "De-para: categoria do catálogo → departamento da DRE");
  const podeEditar = usePodeEditar();

  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [catsCatalogo, setCatsCatalogo] = useState<{ nome: string; id?: string; itens?: number }[]>([]);
  const [cfg, setCfg] = useState<Cfg>({ map: {}, manuais: [], ignoradas: [] });
  const [cfgItemId, setCfgItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function carregar() {
    setLoading(true);
    try {
      const [rCat, rLin, rCfg] = await Promise.all([
        fetch(`/api/servicos/categorias`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch(`/api/financeiro/linhas-servico/gestao`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=${LISTA}`, { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const cats = (Array.isArray(rCat) ? rCat : (rCat.categorias || rCat.data || rCat.itens || []))
        .map((c: any) => ({ nome: (c.nome || c.name || c.categoria || "").trim(), id: c.id, itens: c._count?.produtos ?? c._count?.itens ?? c.itens }))
        .filter((c: any) => c.nome);
      setCatsCatalogo(cats);
      const lin = (Array.isArray(rLin) ? rLin : (rLin.linhas || rLin.data || [])).map((l: any) => ({ id: l.id, nome: l.nome || l.name, ativo: l.ativo !== false }));
      setLinhas(lin);
      const arr = Array.isArray(rCfg) ? rCfg : (rCfg.itens || rCfg.data || []);
      if (arr[0]?.valor) { try { const v = JSON.parse(arr[0].valor); setCfg({ map: v.map || {}, manuais: v.manuais || [], ignoradas: v.ignoradas || [] }); setCfgItemId(arr[0].id); } catch {} }
      else { setCfg({ map: {}, manuais: [], ignoradas: [] }); setCfgItemId(null); }
    } catch { toast.error("Erro ao carregar"); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); }, []);

  // Linhas visíveis nas rows: categorias do catálogo (menos as ignoradas) + as manuais
  const rows: Cat[] = useMemo(() => {
    const ign = new Set(cfg.ignoradas);
    const doCat = catsCatalogo.filter((c) => !ign.has(c.nome)).map((c) => ({ nome: c.nome, tipo: "catalogo" as const, id: c.id, itens: c.itens }));
    const manuais = cfg.manuais.map((n) => ({ nome: n, tipo: "manual" as const }));
    const vistos = new Set(doCat.map((c) => c.nome));
    return [...doCat, ...manuais.filter((m) => !vistos.has(m.nome))].sort((a, b) => a.nome.localeCompare(b.nome));
  }, [catsCatalogo, cfg]);

  const semDep = rows.filter((r) => !cfg.map[r.nome]).length;
  const linhasAtivas = linhas.filter((l) => l.ativo !== false);

  function setDep(nome: string, linhaId: string) { setCfg((c) => ({ ...c, map: { ...c.map, [nome]: linhaId } })); }

  async function escolherDep(nome: string, val: string) {
    if (val === "__novo__") {
      const nn = window.prompt("Nome do novo departamento:")?.trim();
      if (!nn) return;
      try {
        const r = await fetch(`/api/financeiro/linhas-servico`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nn }) });
        if (!r.ok) throw new Error();
        const nova = await r.json();
        setLinhas((ls) => [...ls, { id: nova.id, nome: nova.nome || nn, ativo: true }]);
        setDep(nome, nova.id);
        toast.success("Departamento criado");
      } catch { toast.error("Não consegui criar o departamento"); }
      return;
    }
    setDep(nome, val);
  }

  async function editarCat(row: Cat) {
    const nn = window.prompt("Renomear categoria:", row.nome)?.trim();
    if (!nn || nn === row.nome) return;
    if (row.tipo === "catalogo" && row.id) {
      try {
        const r = await fetch(`/api/servicos/categorias/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nn }) });
        if (!r.ok) throw new Error();
      } catch { toast.error("Não consegui renomear no catálogo"); return; }
    }
    // move o mapeamento p/ o novo nome (nas duas: catálogo e manual)
    setCfg((c) => {
      const map = { ...c.map }; if (map[row.nome] != null) { map[nn] = map[row.nome]; delete map[row.nome]; }
      const manuais = c.manuais.map((m) => (m === row.nome ? nn : m));
      return { ...c, map, manuais };
    });
    if (row.tipo === "catalogo") setCatsCatalogo((cs) => cs.map((c) => (c.nome === row.nome ? { ...c, nome: nn } : c)));
    toast.success("Renomeado");
  }

  async function excluirCat(row: Cat) {
    if (!window.confirm(row.tipo === "catalogo"
      ? `Excluir a categoria "${row.nome}" do CATÁLOGO? Os itens dela ficam sem categoria.`
      : `Excluir a categoria manual "${row.nome}"?`)) return;
    if (row.tipo === "catalogo" && row.id) {
      try { const r = await fetch(`/api/servicos/categorias/${row.id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); setCatsCatalogo((cs) => cs.filter((c) => c.nome !== row.nome)); }
      catch { toast.error("Não consegui excluir no catálogo"); return; }
    }
    setCfg((c) => { const map = { ...c.map }; delete map[row.nome]; return { ...c, map, manuais: c.manuais.filter((m) => m !== row.nome) }; });
    toast.success("Excluída");
  }

  function removerDepara(row: Cat) {
    // Tira a categoria do de-para (não apaga do catálogo). Catálogo → "ignorada"; manual → some.
    setCfg((c) => {
      const map = { ...c.map }; delete map[row.nome];
      if (row.tipo === "manual") return { ...c, map, manuais: c.manuais.filter((m) => m !== row.nome) };
      return { ...c, map, ignoradas: [...new Set([...c.ignoradas, row.nome])] };
    });
    toast("Removida do de-para", { icon: "🗑" });
  }

  function addManual() {
    const nn = window.prompt("Nome da categoria manual:")?.trim();
    if (!nn) return;
    if (rows.some((r) => r.nome.toLowerCase() === nn.toLowerCase())) { toast.error("Essa categoria já existe"); return; }
    setCfg((c) => ({ ...c, manuais: [...c.manuais, nn], ignoradas: c.ignoradas.filter((i) => i !== nn) }));
  }

  async function salvar() {
    setSaving(true);
    try {
      const valor = JSON.stringify(cfg);
      const r = cfgItemId
        ? await fetch(`/api/listas/${cfgItemId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor }) })
        : await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: LISTA, valor }) });
      if (!r.ok) throw new Error();
      if (!cfgItemId) { const d = await r.json().catch(() => null); if (d?.id) setCfgItemId(d.id); }
      toast.success("De-para salvo");
    } catch { toast.error("Erro ao salvar"); }
    finally { setSaving(false); }
  }

  const iconBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 8, border: `1px solid ${C.bege}`, background: "#fff", cursor: "pointer", marginLeft: 6, color: C.navy };
  const delBtn: React.CSSProperties = { ...iconBtn, color: C.red, borderColor: "#F0D5D5" };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto", padding: "6px 4px 60px" }}>
      <p style={{ fontSize: 13.5, color: C.mut, lineHeight: 1.55, margin: "0 0 16px", maxWidth: "74ch" }}>
        Diga <b style={{ color: C.turq }}>de qual departamento</b> é cada categoria do catálogo. Depois, toda venda no caixa cai sozinha no departamento certo da <b>DRE</b>. É por categoria (não item a item). Em cada linha você <b>edita</b> (lápis), <b>exclui</b> (X) ou <b>remove do de-para</b> (lixeira); o departamento sai no seletor (que tem "Novo departamento").
      </p>

      <div style={{ background: "#fff", border: `1px solid ${C.bege}`, borderRadius: 14, overflow: "hidden", boxShadow: "0 1px 3px rgba(40,38,34,.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: `1px solid ${C.line}`, flexWrap: "wrap" }}>
          <LuLink size={16} style={{ color: C.turq }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: C.navy }}>Categoria → Departamento</span>
          {semDep > 0 && <span style={{ fontSize: 11, fontWeight: 600, background: "#FEF3E2", color: C.amber, border: "1px solid #F3D9AE", borderRadius: 999, padding: "3px 10px" }}>{semDep} sem departamento</span>}
          <span style={{ flex: 1 }} />
          {podeEditar && <button onClick={salvar} disabled={saving} style={{ background: C.turq, color: "#fff", border: "none", borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.6 : 1 }}>{saving ? "Salvando…" : "💾 Salvar"}</button>}
        </div>

        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: C.mut, fontSize: 14 }}>Carregando…</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: C.mut, fontWeight: 600, padding: "10px 16px", borderBottom: `1px solid ${C.line}` }}>Categoria (do catálogo)</th>
                <th style={{ width: 24, borderBottom: `1px solid ${C.line}` }}></th>
                <th style={{ textAlign: "left", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: C.mut, fontWeight: 600, padding: "10px 16px", borderBottom: `1px solid ${C.line}` }}>Departamento</th>
                <th style={{ textAlign: "right", fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: C.mut, fontWeight: 600, padding: "10px 16px", borderBottom: `1px solid ${C.line}` }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: C.mut }}>Nenhuma categoria. Adicione uma manual abaixo ou cadastre categorias no catálogo.</td></tr>}
              {rows.map((row) => {
                const dep = cfg.map[row.nome] || "";
                return (
                  <tr key={row.tipo + row.nome}>
                    <td style={{ padding: "9px 16px", borderBottom: `1px solid ${C.line}`, fontSize: 13.5, fontWeight: 500, color: C.ink }}>
                      {row.nome}
                      <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".03em", color: row.tipo === "manual" ? C.green : C.turq, background: row.tipo === "manual" ? "#E9F7EF" : "#E1F2F4", borderRadius: 5, padding: "1px 5px", marginLeft: 8 }}>{row.tipo}</span>
                      {row.itens != null && <span style={{ fontSize: 11, color: C.mut, marginLeft: 6 }}>{row.itens} itens</span>}
                    </td>
                    <td style={{ textAlign: "center", color: C.turq, fontWeight: 700, borderBottom: `1px solid ${C.line}` }}>→</td>
                    <td style={{ padding: "9px 16px", borderBottom: `1px solid ${C.line}` }}>
                      <select value={dep} disabled={!podeEditar} onChange={(e) => escolherDep(row.nome, e.target.value)}
                        style={{ width: "100%", maxWidth: 250, border: `1px solid ${dep ? C.bege : "#F3D9AE"}`, background: dep ? "#fff" : "#FFFDF5", borderRadius: 8, padding: "7px 10px", fontSize: 13, color: dep ? C.navy : C.amber, fontFamily: "inherit" }}>
                        <option value="">— escolher —</option>
                        {linhasAtivas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                        {podeEditar && <option value="__novo__">➕ Novo departamento…</option>}
                      </select>
                    </td>
                    <td style={{ padding: "9px 16px", borderBottom: `1px solid ${C.line}`, textAlign: "right", whiteSpace: "nowrap" }}>
                      {podeEditar ? (<>
                        <button title="Editar (renomear)" onClick={() => editarCat(row)} style={iconBtn}><LuPencil size={15} /></button>
                        <button title="Excluir categoria" onClick={() => excluirCat(row)} style={delBtn}><LuX size={16} /></button>
                        <button title="Remover do de-para" onClick={() => removerDepara(row)} style={iconBtn}><LuTrash2 size={15} /></button>
                      </>) : <span style={{ color: C.mut, fontSize: 12 }}>—</span>}
                    </td>
                  </tr>
                );
              })}
              {podeEditar && (
                <tr><td colSpan={4} style={{ padding: "11px 16px", background: C.fundo }}>
                  <button onClick={addManual} style={{ background: "#fff", color: C.turq, border: `1px solid ${C.turq}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 5 }}><LuPlus size={14} /> Adicionar categoria manual</button>
                  <span style={{ fontSize: 11.5, color: C.mut, marginLeft: 8 }}>(as do catálogo aparecem sozinhas)</span>
                </td></tr>
              )}
            </tbody>
          </table>
        )}
        <div style={{ fontSize: 12, color: C.mut, padding: "12px 16px", background: C.fundo, borderTop: `1px solid ${C.line}`, lineHeight: 1.5 }}>
          Selo <b>catalogo</b> = veio dos seus produtos/serviços · <b>manual</b> = você criou. Categoria sem departamento fica em <b>destaque âmbar</b> e cai em "A classificar" na DRE. Os departamentos são as <b>Linhas de Serviço</b> do Financeiro (fonte única).
        </div>
      </div>
    </div>
  );
}
