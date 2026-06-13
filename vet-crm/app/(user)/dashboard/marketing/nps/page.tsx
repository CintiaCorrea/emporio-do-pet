"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
// [EMP-COWORK] NPS — avaliações via Listas npsava_<id> (Cintia 07/06, Marketing)
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuPlus, LuTrash, LuX } from "react-icons/lu";

const CATEGORIAS = ["Consulta", "Retorno", "Fisioterapia", "Cirurgia", "Exame", "Vacinação", "Banho e Tosa", "Internação", "Geral"];
const CANAIS = ["WhatsApp", "Presencial", "Telefone", "Email"];
const classif = (s: number) => s >= 9 ? { l: "Promotor", bg: "#E1F5EE", fg: "#0F6E56" } : s >= 7 ? { l: "Neutro", bg: "#FAEEDA", fg: "#854F0B" } : { l: "Detrator", bg: "#FCEBEB", fg: "#A32D2D" };
const fmtData = (s?: string) => { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return "—"; } };

export default function NpsPage() {
  usePageTitle("NPS", "Avaliações de satisfação dos clientes");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<"todas" | "Promotor" | "Neutro" | "Detrator">("todas");
  const [open, setOpen] = useState(false);
  const [pets, setPets] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ tutorId: "", tutorNome: "", petNome: "", categoria: "Consulta", profissional: "", score: "", canal: "WhatsApp", data: new Date().toISOString().slice(0, 10), comentario: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, t, u] = await Promise.all([
        fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/tutors?limit=1000", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/users", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const la = Array.isArray(l) ? l : (l.itens || l.data || []);
      setRows(la.filter((x: any) => (x.lista || "").startsWith("npsava_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, ...d }; }).sort((a: any, b: any) => (b.data || "").localeCompare(a.data || "")));
      setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
      setUsers(Array.isArray(u) ? u : (u.users || u.data || []));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  useEffect(() => { if (!form.tutorId) { setPets([]); return; } (async () => { try { const d = await fetch(`/api/tutors/${form.tutorId}/pets`).then((r) => r.json()); setPets(Array.isArray(d) ? d : (d.pets || d.data || [])); } catch { setPets([]); } })(); }, [form.tutorId]);

  const kpis = useMemo(() => {
    const n = rows.length; if (!n) return { n: 0, prom: 0, neu: 0, det: 0, nps: 0 };
    const prom = rows.filter((r) => Number(r.score) >= 9).length;
    const neu = rows.filter((r) => Number(r.score) >= 7 && Number(r.score) < 9).length;
    const det = rows.filter((r) => Number(r.score) < 7).length;
    return { n, prom, neu, det, nps: Math.round((prom / n) * 100 - (det / n) * 100) };
  }, [rows]);
  const lista = useMemo(() => filtro === "todas" ? rows : rows.filter((r) => classif(Number(r.score)).l === filtro), [rows, filtro]);

  const salvar = async () => {
    if (!form.tutorId || form.score === "" || !form.profissional) { alert("Preencha cliente, profissional e score."); return; }
    setSaving(true);
    try {
      const tutor = tutors.find((t) => t.id === form.tutorId);
      const payload = { tutorId: form.tutorId, tutorNome: tutor?.name || form.tutorNome, petNome: form.petNome, categoria: form.categoria, profissional: form.profissional, score: Number(form.score), canal: form.canal, data: form.data, comentario: form.comentario };
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `npsava_${Date.now()}`, valor: JSON.stringify(payload) }) });
      setOpen(false); setForm({ tutorId: "", tutorNome: "", petNome: "", categoria: "Consulta", profissional: "", score: "", canal: "WhatsApp", data: new Date().toISOString().slice(0, 10), comentario: "" }); load();
    } catch { alert("Erro ao salvar."); } finally { setSaving(false); }
  };
  const excluir = async (id: string) => { if (!(await confirmDelete({ entityLabel: "avaliação", itemName: "esta avaliação" }))) return; try { await fetch(`/api/listas/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  const FILTROS: { k: any; l: string }[] = [{ k: "todas", l: "Todas" }, { k: "Promotor", l: "Promotores" }, { k: "Neutro", l: "Neutros" }, { k: "Detrator", l: "Detratores" }];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          <div className="rounded-lg px-3.5 py-1.5" style={{ background: "#E6F6F8" }}><div className="text-[10.5px]" style={{ color: "#00798A" }}>NPS</div><div className="text-[18px] font-bold" style={{ color: "#00798A" }}>{kpis.nps > 0 ? "+" : ""}{kpis.nps}</div></div>
          <div className="rounded-lg px-3.5 py-1.5" style={{ background: "#E1F5EE" }}><div className="text-[10.5px]" style={{ color: "#0F6E56" }}>Promotores</div><div className="text-[18px] font-bold" style={{ color: "#0F6E56" }}>{kpis.prom}</div></div>
          <div className="rounded-lg px-3.5 py-1.5" style={{ background: "#FAEEDA" }}><div className="text-[10.5px]" style={{ color: "#854F0B" }}>Neutros</div><div className="text-[18px] font-bold" style={{ color: "#854F0B" }}>{kpis.neu}</div></div>
          <div className="rounded-lg px-3.5 py-1.5" style={{ background: "#FCEBEB" }}><div className="text-[10.5px]" style={{ color: "#A32D2D" }}>Detratores</div><div className="text-[18px] font-bold" style={{ color: "#A32D2D" }}>{kpis.det}</div></div>
        </div>
        <button onClick={() => setOpen(true)} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova avaliação</button>
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {FILTROS.map((f) => <button key={f.k} onClick={() => setFiltro(f.k)} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={filtro === f.k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>{f.l}</button>)}
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        <table className="w-full" style={{ borderCollapse: "collapse" }}>
          <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase tracking-wide text-[#6b7280]">
            <th className="text-left font-medium px-3 py-2">Data</th><th className="text-left font-medium px-3 py-2">Cliente / Pet</th><th className="text-left font-medium px-3 py-2">Categoria</th><th className="text-left font-medium px-3 py-2">Profissional</th><th className="text-center font-medium px-2 py-2">Score</th><th className="text-left font-medium px-3 py-2">Classificação</th><th className="text-left font-medium px-3 py-2">Comentário</th><th className="px-2 py-2"></th>
          </tr></thead>
          <tbody className="text-[12.5px] text-[#0E2244]">
            {loading ? (<tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Carregando...</td></tr>)
            : lista.length === 0 ? (<tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Nenhuma avaliação.</td></tr>)
            : lista.map((r) => { const c = classif(Number(r.score)); return (
              <tr key={r.id} className="border-t hover:bg-[#fdfaee]" style={{ borderColor: "#f4eede" }}>
                <td className="px-3 py-2 text-[#5b6470] whitespace-nowrap">{fmtData(r.data)}</td>
                <td className="px-3 py-2">{r.tutorNome}{r.petNome ? <span className="text-[#94a3b8]"> · {r.petNome}</span> : ""}</td>
                <td className="px-3 py-2 text-[#5b6470]">{r.categoria}</td>
                <td className="px-3 py-2 text-[#5b6470]">{r.profissional}</td>
                <td className="px-2 py-2 text-center font-semibold">{r.score}</td>
                <td className="px-3 py-2"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>{c.l}</span></td>
                <td className="px-3 py-2 text-[#5b6470] truncate max-w-[200px]">{r.comentario || "—"}</td>
                <td className="px-2 py-2 text-right"><button onClick={() => excluir(r.id)} className="text-[#94a3b8] hover:text-[#A32D2D]"><LuTrash className="w-3.5 h-3.5" /></button></td>
              </tr>
            ); })}
          </tbody>
        </table>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}><h3 className="text-base font-semibold text-[#014D5E]">Nova avaliação NPS</h3><button onClick={() => setOpen(false)} className="text-[#94a3b8]"><LuX className="w-4 h-4" /></button></div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Cliente *</label><select value={form.tutorId} onChange={(e) => setForm({ ...form, tutorId: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"><option value="">Selecione...</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Pet</label><select value={form.petNome} onChange={(e) => setForm({ ...form, petNome: e.target.value })} disabled={!form.tutorId} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] disabled:bg-[#f6f5f0]"><option value="">—</option>{pets.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Categoria *</label><select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Profissional *</label><select value={form.profissional} onChange={(e) => setForm({ ...form, profissional: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"><option value="">Selecione...</option>{users.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Score (0-10) *</label><input type="number" min={0} max={10} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} placeholder="Ex: 9" className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Canal</label><select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Data de coleta</label><input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Comentário</label><textarea value={form.comentario} onChange={(e) => setForm({ ...form, comentario: e.target.value })} rows={2} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] resize-none" /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}><button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button><button onClick={salvar} disabled={saving} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Salvar"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
