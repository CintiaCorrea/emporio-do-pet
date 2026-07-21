"use client";
// [EMP-COWORK] Grupos (categorias do catálogo) — cadastro simples: listar, criar, renomear, excluir.
// Reusa /api/servicos/categorias (o "Grupo" do item = categoria).

import { useCallback, useEffect, useState , useRef} from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

const B = { line: "#E8E2D6", soft: "#FBF9F4", lineSoft: "#F0EBE0", navy: "#014D5E", primary: "#009AAC", t1: "#1F2A2E", t2: "#5C6B70", t3: "#374151" };
interface Cat { id: string; nome: string; _count?: { produtos?: number; servicos?: number } }

export default function GruposPage() {
  usePageTitle("Grupos", "Categorias de produtos e serviços do catálogo.");
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const jaCarregou = useRef(false);
  const [novo, setNovo] = useState("");

  const load = useCallback(async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const d = await fetch("/api/servicos/categorias", { cache: "no-store" }).then((r) => r.json());
      setCats(Array.isArray(d) ? d : (d.data || d.itens || []));
    } catch { toast.error("Erro ao carregar grupos"); }
    jaCarregou.current = true; setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const criar = async () => {
    const nome = novo.trim();
    if (!nome) return;
    try {
      const r = await fetch("/api/servicos/categorias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
      if (!r.ok) throw new Error();
      setNovo(""); toast.success("Grupo criado"); load();
    } catch { toast.error("Erro ao criar"); }
  };
  const renomear = async (c: Cat) => {
    const nome = window.prompt("Novo nome do grupo:", c.nome);
    if (!nome || !nome.trim() || nome.trim() === c.nome) return;
    try {
      const r = await fetch(`/api/servicos/categorias/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim() }) });
      if (!r.ok) throw new Error();
      toast.success("Renomeado"); load();
    } catch { toast.error("Erro ao renomear"); }
  };
  const excluir = async (c: Cat) => {
    if (!confirm(`Excluir o grupo "${c.nome}"? Os itens dele ficam sem grupo.`)) return;
    try {
      const r = await fetch(`/api/servicos/categorias/${c.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Excluído"); load();
    } catch { toast.error("Erro ao excluir (talvez tenha itens ligados)"); }
  };

  return (
    <div style={{ width: "100%", padding: "6px 2px 48px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 460 }}>
        <input value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") criar(); }} placeholder="Nome do novo grupo…" style={{ flex: 1, border: `1px solid ${B.line}`, borderRadius: 9, padding: "9px 12px", fontSize: 13, background: "#fff", color: B.t1, fontFamily: "inherit" }} />
        <button onClick={criar} style={{ background: B.primary, color: "#fff", border: "none", borderRadius: 9, padding: "9px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>➕ Criar</button>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${B.line}`, borderRadius: 14, overflow: "hidden", maxWidth: 620 }}>
        <div style={{ padding: "11px 15px", borderBottom: `1px solid ${B.lineSoft}`, fontSize: 13, fontWeight: 500, color: B.navy }}>{cats.length} grupo(s)</div>
        {loading ? (
          <div style={{ padding: 30, textAlign: "center", color: B.t3, fontSize: 13 }}>Carregando…</div>
        ) : cats.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center", color: B.t3, fontSize: 13 }}>Nenhum grupo ainda. Crie o primeiro acima.</div>
        ) : cats.map((c, i) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 15px", borderTop: i ? `1px solid ${B.lineSoft}` : "none" }}>
            <span style={{ flex: 1, fontSize: 13.5, color: B.t1 }}>📁 {c.nome}</span>
            <button onClick={() => renomear(c)} title="Renomear" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14 }}>✏️</button>
            <button onClick={() => excluir(c)} title="Excluir" style={{ border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#b0408a" }}>🗑️</button>
          </div>
        ))}
      </div>
    </div>
  );
}
