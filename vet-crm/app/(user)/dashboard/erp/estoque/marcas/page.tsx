"use client";
// Marcas — catálogo de marcas dos produtos. Guardado na lista `marcas` (/api/listas),
// que alimenta o autocompletar do campo "Marca" no cadastro do produto.
// Mostra também as marcas EM USO nos produtos (derivado), pra não perder nenhuma.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

const B = { line: "#E8E2D6", soft: "#FBF9F4", lineSoft: "#F0EBE0", navy: "#014D5E", primary: "#009AAC", t1: "#1F2A2E", t2: "#5C6B70", t3: "#374151" };
interface Marca { id: string; valor: string }

export default function MarcasPage() {
  usePageTitle("Marcas", "Catálogo de marcas dos produtos (alimenta o campo Marca no cadastro).");
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [emUso, setEmUso] = useState<Record<string, number>>({}); // marca (string) -> nº de produtos
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [novo, setNovo] = useState("");

  const load = useCallback(async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [lst, prod] = await Promise.all([
        fetch("/api/listas?lista=marcas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/products?limit=2000", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      const arr = Array.isArray(lst) ? lst : (lst.itens || lst.data || []);
      setMarcas(arr.map((x: any) => ({ id: x.id, valor: x.valor })).sort((a: Marca, b: Marca) => a.valor.localeCompare(b.valor)));
      const prods: any[] = Array.isArray(prod?.products) ? prod.products : (Array.isArray(prod) ? prod : []);
      const cont: Record<string, number> = {};
      prods.forEach((p) => { const m = (p.marca || "").trim(); if (m) cont[m] = (cont[m] || 0) + 1; });
      setEmUso(cont);
    } catch { toast.error("Erro ao carregar marcas"); }
    jaCarregou.current = true; setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const nomes = useMemo(() => new Set(marcas.map((m) => m.valor.toLowerCase())), [marcas]);
  const faltando = useMemo(() => Object.keys(emUso).filter((m) => !nomes.has(m.toLowerCase())).sort(), [emUso, nomes]);

  const criar = async (nome?: string) => {
    const v = (nome ?? novo).trim();
    if (!v) return;
    if (nomes.has(v.toLowerCase())) { toast.error("Essa marca já está no catálogo."); return; }
    try {
      const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: "marcas", valor: v }) });
      if (!r.ok) throw new Error();
      if (!nome) setNovo("");
      toast.success("Marca adicionada"); load();
    } catch { toast.error("Erro ao adicionar"); }
  };
  const renomear = async (m: Marca) => {
    const nome = window.prompt("Novo nome da marca:", m.valor);
    if (!nome || !nome.trim() || nome.trim() === m.valor) return;
    try {
      const r = await fetch(`/api/listas/${m.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: nome.trim() }) });
      if (!r.ok) throw new Error();
      toast.success("Renomeada"); load();
    } catch { toast.error("Erro ao renomear"); }
  };
  const excluir = async (m: Marca) => {
    const n = emUso[m.valor] || 0;
    if (!confirm(`Excluir a marca "${m.valor}" do catálogo?${n ? `\n\n⚠️ ${n} produto(s) usam essa marca — eles continuam com o texto, só some do autocompletar.` : ""}`)) return;
    try {
      const r = await fetch(`/api/listas/${m.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Excluída"); load();
    } catch { toast.error("Erro ao excluir"); }
  };

  return (
    <div style={{ width: "100%", padding: "6px 2px 48px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 460 }}>
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") criar(); }} placeholder="Nome da nova marca… (ex.: Royal Canin)" style={{ flex: 1, border: `1px solid ${B.line}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, background: "#fff", color: B.t1, fontFamily: "inherit" }} />
        <button onClick={() => criar()} style={{ background: B.primary, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>➕ Criar</button>
      </div>

      {/* marcas em uso que ainda não estão no catálogo */}
      {faltando.length > 0 && (
        <div style={{ background: "#FBF3D9", border: "1px solid #e8dca0", borderRadius: 12, padding: "12px 14px", marginBottom: 14, maxWidth: 620 }}>
          <div style={{ fontSize: 12.5, color: "#8a6400", fontWeight: 600, marginBottom: 8 }}>⚠️ Marcas usadas em produtos mas fora do catálogo — clique pra adicionar:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {faltando.map((m) => (
              <button key={m} onClick={() => criar(m)} style={{ background: "#fff", border: "1px solid #e8dca0", borderRadius: 999, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: "#8a6400" }}>+ {m} <span style={{ color: "#b3934e" }}>({emUso[m]})</span></button>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: "#fff", border: `1px solid ${B.line}`, borderRadius: 14, overflow: "hidden", maxWidth: 620 }}>
        <div style={{ padding: "11px 15px", borderBottom: `1px solid ${B.lineSoft}`, fontSize: 13, fontWeight: 500, color: B.navy }}>{marcas.length} marca(s) no catálogo</div>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: B.t3, fontSize: 13 }}>Carregando…</div>
        ) : marcas.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: B.t3, fontSize: 13 }}>Nenhuma marca no catálogo ainda. Crie a primeira acima.</div>
        ) : marcas.map((m, i) => (
          <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 15px", borderTop: i ? `1px solid ${B.lineSoft}` : "none" }}>
            <span style={{ flex: 1, fontSize: 13.5, color: B.t1 }}>🏷️ {m.valor}</span>
            {emUso[m.valor] ? <span style={{ fontSize: 11, color: B.t2 }}>{emUso[m.valor]} produto(s)</span> : <span style={{ fontSize: 11, color: "#b0b7b5" }}>sem uso</span>}
            <button onClick={() => renomear(m)} title="Renomear" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>
            <button onClick={() => excluir(m)} title="Excluir" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#b0408a" }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
