"use client";
// 📦 Painel "Pacotes vendidos" — lê a FONTE VIVA (petpac_ de todos os pets, via
// GET /api/pacotes/vendidos): inclui TODOS os pacotes vendidos/lançados, com as
// sessões já baixadas pela agenda. Substitui a tela antiga (tabela Pacote), que
// ficava desatualizada. Sessões são geridas na ficha/agenda — aqui é o painel.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuSearch, LuPackage } from "react-icons/lu";
import toast from "react-hot-toast";

type Situacao = "ATIVO" | "CONSUMIDO" | "VENCIDO";
interface Pac {
  id: string; petId: string; pet: string; petSpecies?: string | null; tutorId?: string | null;
  cliente: string; nome: string; total: number; used: number; restam: number;
  createdAt?: string | null; validade?: string | null; situacao: Situacao;
}
interface Resumo { total: number; ativos: number; consumidos: number; vencidos: number; validadeDias: number }

const SP_EMOJI = (s?: string | null) => ({ CANINE: "🐶", FELINE: "🐱", BIRD: "🐦", RODENT: "🐹", REPTILE: "🦎", RABBIT: "🐰", FISH: "🐠" } as any)[String(s || "").toUpperCase()] || "🐾";
const fmtD = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR") : "—");
async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

const SIT_BADGE: Record<Situacao, { label: string; bg: string; fg: string }> = {
  ATIVO: { label: "🟢 Ativo", bg: "#E7F6EE", fg: "#0F6E56" },
  CONSUMIDO: { label: "✅ Consumido", bg: "#E0F4F6", fg: "#00798A" },
  VENCIDO: { label: "⏰ Vencido", bg: "#FBF1E2", fg: "#B26A00" },
};

export default function PacotesPage() {
  usePageTitle("Pacotes vendidos", "Pacotes de sessões — fonte viva (ficha/agenda)");
  const [pacotes, setPacotes] = useState<Pac[]>([]);
  const [resumo, setResumo] = useState<Resumo>({ total: 0, ativos: 0, consumidos: 0, vencidos: 0, validadeDias: 365 });
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"ALL" | Situacao>("ALL");
  const [busca, setBusca] = useState("");

  async function carregar() {
    setLoading(true);
    const d = await safeJson<any>(await fetch("/api/pacotes/vendidos", { cache: "no-store" }), { resumo: null, pacotes: [] });
    setPacotes(Array.isArray(d?.pacotes) ? d.pacotes : []);
    if (d?.resumo) setResumo(d.resumo);
    setLoading(false);
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  // 🗑️ Remove o pacote (entrada petpac_ da fonte viva). Some da lista, ficha e agenda.
  async function remover(p: Pac) {
    if (!window.confirm(`Remover o pacote "${p.nome}" de ${p.cliente} (${p.pet})? Some da lista, da ficha e da agenda.`)) return;
    try {
      const r = await fetch(`/api/listas/${p.id}`, { method: "DELETE" });
      if (!r.ok) throw new Error();
      toast.success("Pacote removido");
      await carregar();
    } catch { toast.error("Erro ao remover o pacote"); }
  }

  const filtrados = useMemo(() => {
    let arr = pacotes;
    if (filtro !== "ALL") arr = arr.filter((p) => p.situacao === filtro);
    if (busca.trim()) {
      const s = busca.trim().toLowerCase();
      arr = arr.filter((p) => (p.cliente || "").toLowerCase().includes(s) || (p.pet || "").toLowerCase().includes(s) || (p.nome || "").toLowerCase().includes(s));
    }
    return arr;
  }, [pacotes, filtro, busca]);

  const cartoes: { k: "ALL" | Situacao; label: string; n: number; sub: string; cor: string }[] = [
    { k: "ALL", label: "📦 Total", n: resumo.total, sub: "pacotes", cor: "#014D5E" },
    { k: "ATIVO", label: "🟢 Ativos", n: resumo.ativos, sub: "com sessões a usar", cor: "#0F6E56" },
    { k: "CONSUMIDO", label: "✅ Consumidos", n: resumo.consumidos, sub: "todas as sessões usadas", cor: "#00798A" },
    { k: "VENCIDO", label: "⏰ Vencidos", n: resumo.vencidos, sub: `+${resumo.validadeDias}d c/ sobra`, cor: "#B26A00" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-1">
        <LuPackage size={20} style={{ color: "#009AAC" }} />
        <h1 className="text-xl font-semibold" style={{ color: "#0E2244" }}>Pacotes vendidos</h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">Todos os pacotes vendidos e lançados (ficha/inbox/agenda), com as sessões já baixadas. Vencido = passou {resumo.validadeDias} dias da venda com sessões sobrando.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        {cartoes.map((c) => (
          <button key={c.k} onClick={() => setFiltro(c.k)} className="text-left bg-white border rounded-2xl p-3.5 transition" style={{ borderColor: filtro === c.k ? "#009AAC" : "#E8DFC8", boxShadow: filtro === c.k ? "0 0 0 2px #E0F4F6" : undefined }}>
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-gray-500">{c.label}</div>
            <div className="text-[23px] font-bold tabular-nums mt-1" style={{ color: c.cor }}>{c.n}</div>
            <div className="text-[10.5px] text-gray-400">{c.sub}</div>
          </button>
        ))}
      </div>

      <div className="relative max-w-md mb-3">
        <LuSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por cliente ou pet…" className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} />
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wide text-gray-500" style={{ background: "#FBF9F4", borderBottom: "1px solid #E8DFC8" }}>
                <th className="text-left px-3 py-2.5">Cliente</th>
                <th className="text-left px-3 py-2.5">Pacote</th>
                <th className="text-left px-3 py-2.5 hidden md:table-cell">Animal</th>
                <th className="text-left px-3 py-2.5">Sessões</th>
                <th className="text-left px-3 py-2.5 hidden lg:table-cell">Vendido em</th>
                <th className="text-left px-3 py-2.5 hidden lg:table-cell">Validade</th>
                <th className="text-left px-3 py-2.5">Situação</th>
                <th className="text-right px-3 py-2.5">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Carregando…</td></tr>}
              {!loading && filtrados.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-gray-400">Nenhum pacote {filtro !== "ALL" ? "nesta situação" : "ainda"}.</td></tr>}
              {filtrados.map((p) => {
                const pct = p.total > 0 ? Math.min(100, (p.used / p.total) * 100) : 0;
                const cor = p.situacao === "VENCIDO" ? "#B26A00" : p.situacao === "CONSUMIDO" ? "#009AAC" : "#0F6E56";
                const sb = SIT_BADGE[p.situacao];
                return (
                  <tr key={p.id} className="border-b hover:bg-[#fdfaee] transition" style={{ borderColor: "#F0EBE0" }}>
                    <td className="px-3 py-2.5">
                      {p.tutorId ? <Link href={`/dashboard/erp/tutores/${p.tutorId}`} className="font-medium hover:underline" style={{ color: "#014D5E" }}>{p.cliente}</Link> : <span className="font-medium" style={{ color: "#014D5E" }}>{p.cliente}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700">{p.nome}</td>
                    <td className="px-3 py-2.5 hidden md:table-cell">
                      <Link href={`/dashboard/erp/pets/${p.petId}`} className="text-gray-600 hover:underline">{SP_EMOJI(p.petSpecies)} {p.pet}</Link>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[56px]" style={{ background: "#F0EBE0" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cor }} />
                        </div>
                        <span className="text-[11.5px] tabular-nums text-gray-600 whitespace-nowrap">{p.used} / {p.total}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 hidden lg:table-cell text-gray-500 tabular-nums">{fmtD(p.createdAt)}</td>
                    <td className="px-3 py-2.5 hidden lg:table-cell tabular-nums" style={{ color: p.situacao === "VENCIDO" ? "#B26A00" : "#94a3a0" }}>{fmtD(p.validade)}</td>
                    <td className="px-3 py-2.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: sb.bg, color: sb.fg }}>{sb.label}</span></td>
                    <td className="px-3 py-2.5 text-right"><button onClick={() => remover(p)} title="Remover pacote" className="text-[13px] px-2 py-1 rounded-lg border transition hover:bg-[#FBE9E9]" style={{ borderColor: "#EAC3C1", color: "#CC3366" }}>🗑️</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 mt-3">As sessões são baixadas pela agenda; para lançar/gerir um pacote, abra a ficha do pet. Prazo de validade configurável em Configurações (lista <b>pacote_validade_dias</b>).</p>
    </div>
  );
}
