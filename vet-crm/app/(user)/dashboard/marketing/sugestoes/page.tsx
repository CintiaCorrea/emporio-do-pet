"use client";
import { useEffect, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { confirmDelete } from "@/lib/ui/confirmDelete";

type Sugestao = { id: string; tutorNome: string; texto: string; at: string };

function fmtData(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SugestoesPage() {
  usePageTitle("Sugestões", "Sugestões enviadas pelos tutores no aplicativo");
  const [itens, setItens] = useState<Sugestao[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/listas?lista=portal_sugestao", { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
      const parsed: Sugestao[] = arr
        .map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = {}; } return { id: i.id, tutorNome: o.tutorNome || "Cliente", texto: o.texto || "", at: o.at || "" }; })
        .filter((s: Sugestao) => s.texto)
        .sort((a: Sugestao, b: Sugestao) => (a.at < b.at ? 1 : -1));
      setItens(parsed);
    } catch { /* noop */ } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function remover(id: string) {
    if (!(await confirmDelete({ entityLabel: "sugestão", itemName: "esta sugestão" }))) return;
    await fetch(`/api/listas/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-3">
      <p className="text-xs text-[#64748b]">Sugestões que os tutores enviaram pelo aplicativo. As <b>avaliações</b> (estrelas) entram em <b>Marketing › NPS</b>.</p>
      {loading ? (
        <div className="text-center text-sm text-gray-400 py-8">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center text-sm text-gray-400 py-10">Nenhuma sugestão ainda.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((s) => (
            <div key={s.id} className="bg-white border rounded-2xl p-4" style={{ borderColor: "#e8edf0" }}>
              <div className="flex items-center justify-between mb-1.5 gap-2">
                <span className="text-[13px] font-semibold truncate" style={{ color: "#014D5E" }}>💬 {s.tutorNome}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[11px] text-gray-400 tabular-nums">{fmtData(s.at)}</span>
                  <button onClick={() => remover(s.id)} className="text-gray-400 hover:text-[#E24B4A] text-xs">Remover</button>
                </div>
              </div>
              <p className="text-[13.5px] text-[#0E2244] whitespace-pre-wrap">{s.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
