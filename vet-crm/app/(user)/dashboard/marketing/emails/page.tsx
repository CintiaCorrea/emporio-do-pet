"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
// [EMP-COWORK] Emails — log dos emails enviados (Listas emaillog_, gravado em /api/email/send) (Cintia 07/06, Marketing)
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuTrash } from "react-icons/lu";

const fmt = (s?: string) => { if (!s) return "—"; try { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

export default function EmailsPage() {
  usePageTitle("Emails", "Histórico de emails enviados");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [fStatus, setFStatus] = useState("todos");

  const load = async () => {
    setLoading(true);
    try {
      const l = await fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
      const la = Array.isArray(l) ? l : (l.itens || l.data || []);
      setRows(la.filter((x: any) => (x.lista || "").startsWith("emaillog_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, ...d }; }).sort((a: any, b: any) => (b.at || "").localeCompare(a.at || "")));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lista = useMemo(() => fStatus === "todos" ? rows : rows.filter((r) => r.status === fStatus), [rows, fStatus]);
  const kpis = useMemo(() => ({ total: rows.length, enviados: rows.filter((r) => r.status === "enviado").length, falhados: rows.filter((r) => r.status === "falhou").length }), [rows]);
  const excluir = async (id: string) => { if (!(await confirmDelete({ entityLabel: "registro", itemName: "este registro" }))) return; try { await fetch(`/api/listas/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-[12px] text-[#64748b]">{kpis.total} emails · <span className="text-[#0F6E56]">{kpis.enviados} enviados</span>{kpis.falhados ? <span className="text-[#A32D2D]"> · {kpis.falhados} falhados</span> : null}</span>
      </div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[{ k: "todos", l: "Todos" }, { k: "enviado", l: "Enviados" }, { k: "falhou", l: "Falhados" }].map((f) => <button key={f.k} onClick={() => setFStatus(f.k)} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={fStatus === f.k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>{f.l}</button>)}
      </div>
      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase tracking-wide text-[#6b7280]">
            <th className="text-left font-medium px-3 py-2">Data</th><th className="text-left font-medium px-3 py-2">Destinatário</th><th className="text-left font-medium px-3 py-2">Assunto</th><th className="text-left font-medium px-3 py-2">Status</th><th className="px-2 py-2"></th>
          </tr></thead>
          <tbody className="text-[12.5px] text-[#0E2244]">
            {loading ? (<tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Carregando...</td></tr>)
            : lista.length === 0 ? (<tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Nenhum email registrado ainda. Os envios feitos pelo sistema aparecem aqui.</td></tr>)
            : lista.map((r) => (
              <tr key={r.id} className="border-t hover:bg-[#fdfaee]" style={{ borderColor: "#f4eede" }}>
                <td className="px-3 py-2 text-[#5b6470] whitespace-nowrap">{fmt(r.at)}</td>
                <td className="px-3 py-2">{r.to || "—"}</td>
                <td className="px-3 py-2 text-[#5b6470] truncate max-w-[280px]">{r.subject || "—"}</td>
                <td className="px-3 py-2"><span className="text-[10px] px-2 py-0.5 rounded-full" style={r.status === "enviado" ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#FCEBEB", color: "#A32D2D" }}>{r.status === "enviado" ? "Enviado" : "Falhou"}</span></td>
                <td className="px-2 py-2 text-right"><button onClick={() => excluir(r.id)} className="text-[#94a3b8] hover:text-[#A32D2D]"><LuTrash className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
