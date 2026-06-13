"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";
// [EMP-COWORK] Avaliações Google — fluxo de solicitação via Listas googleava_<id> + link em cfg_googlelink (Cintia 07/06, Marketing)
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuSend, LuX, LuTrash, LuStar } from "react-icons/lu";

const CANAIS = ["WhatsApp", "Email"];
const fmtData = (s?: string) => { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return "—"; } };
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function AvaliacoesGooglePage() {
  usePageTitle("Avaliações Google", "Gestão do fluxo de avaliações no Google");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [tutors, setTutors] = useState<any[]>([]);
  const [link, setLink] = useState("");
  const [linkRowId, setLinkRowId] = useState<string | null>(null);
  const [linkEdit, setLinkEdit] = useState("");
  const [fStatus, setFStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ tutorId: "", canal: "WhatsApp" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, t] = await Promise.all([
        fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/tutors?limit=1000", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const la = Array.isArray(l) ? l : (l.itens || l.data || []);
      setRows(la.filter((x: any) => (x.lista || "").startsWith("googleava_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, ...d }; }).sort((a: any, b: any) => (b.data || "").localeCompare(a.data || "")));
      const cfg = la.find((x: any) => (x.lista || "") === "cfg_googlelink");
      if (cfg) { setLinkRowId(cfg.id); try { setLink(JSON.parse(cfg.valor).url || ""); setLinkEdit(JSON.parse(cfg.valor).url || ""); } catch { setLink(cfg.valor); setLinkEdit(cfg.valor); } }
      setTutors(Array.isArray(t) ? t : (t.tutors || t.data || []));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const salvarLink = async () => {
    try {
      const v = JSON.stringify({ url: linkEdit.trim() });
      if (linkRowId) await fetch(`/api/listas/${linkRowId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: v }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "cfg_googlelink", valor: v }) });
      load();
    } catch {}
  };

  const kpis = useMemo(() => {
    const n = rows.length; const votou = rows.filter((r) => r.status === "votou");
    const notas = votou.map((r) => Number(r.nota) || 0).filter((x) => x > 0);
    const media = notas.length ? (notas.reduce((s, x) => s + x, 0) / notas.length) : 0;
    return { n, links: n, votos: votou.length, pct: n ? Math.round((votou.length / n) * 100) : 0, media: media ? media.toFixed(1) : "—" };
  }, [rows]);
  const dist = useMemo(() => { const d: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; rows.filter((r) => r.status === "votou").forEach((r) => { const k = Number(r.nota); if (d[k] !== undefined) d[k]++; }); return d; }, [rows]);
  const lista = useMemo(() => fStatus === "todos" ? rows : rows.filter((r) => r.status === fStatus), [rows, fStatus]);

  const solicitar = async () => {
    if (!form.tutorId) { alert("Escolha o cliente."); return; }
    if (!link) { alert("Configure primeiro o link de avaliação do Google (campo acima)."); return; }
    setSaving(true);
    try {
      const tutor = tutors.find((t) => t.id === form.tutorId);
      const tel = (tutor?.contacts?.find((c: any) => c.isPrimary)?.number || tutor?.contacts?.[0]?.number || "").replace(/\D/g, "");
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `googleava_${Date.now()}`, valor: JSON.stringify({ tutorId: form.tutorId, tutorNome: tutor?.name || "", telefone: tel, canal: form.canal, status: "enviado", nota: 0, data: new Date().toISOString().slice(0, 10) }) }) });
      const msg = encodeURIComponent(`Oi! Tudo bem? Se puder, deixa sua avaliação pra gente no Google 💚: ${link}`);
      if (form.canal === "WhatsApp" && tel) window.open(`https://wa.me/${tel.startsWith("55") ? tel : "55" + tel}?text=${msg}`, "_blank");
      else if (form.canal === "Email" && tutor?.email) window.open(`mailto:${tutor.email}?subject=${encodeURIComponent("Avaliação no Google")}&body=${msg}`, "_blank");
      setOpen(false); setForm({ tutorId: "", canal: "WhatsApp" }); load();
    } catch { alert("Erro."); } finally { setSaving(false); }
  };
  const marcarVotou = async (r: any) => {
    const nota = prompt("Nota da avaliação (1 a 5):", String(r.nota || 5));
    if (nota === null) return; const n = Math.max(1, Math.min(5, Number(nota) || 5));
    try { await fetch(`/api/listas/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify({ ...r, id: undefined, status: "votou", nota: n }) }) }); load(); } catch {}
  };
  const excluir = async (id: string) => { if (!(await confirmDelete({ entityLabel: "solicitação", itemName: "esta solicitação" }))) return; try { await fetch(`/api/listas/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-end mb-3">
        <button onClick={() => setOpen(true)} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"><LuSend className="w-3.5 h-3.5" />Solicitar avaliação</button>
      </div>

      <div className="bg-white border rounded-xl p-3 mb-4 flex items-center gap-2 flex-wrap" style={{ borderColor: "#e8dfc8" }}>
        <span className="text-[11px] text-[#6b7280] whitespace-nowrap">Link de avaliação do Google:</span>
        <input value={linkEdit} onChange={(e) => setLinkEdit(e.target.value)} placeholder="https://g.page/r/..." className="flex-1 min-w-[200px] border border-[#d8d0bc] rounded-lg px-3 py-1.5 text-[12px] focus:outline-none focus:border-[#009AAC]" />
        <button onClick={salvarLink} className="text-[11px] text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">Salvar link</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-white border rounded-xl p-3 text-center" style={{ borderColor: "#ece4d2" }}><div className="text-[22px] font-bold text-[#00798A]">{kpis.n}</div><div className="text-[11px] text-[#94a3b8]">Registradas</div></div>
        <div className="bg-white border rounded-xl p-3 text-center" style={{ borderColor: "#ece4d2" }}><div className="text-[22px] font-bold text-[#0C447C]">{kpis.links}</div><div className="text-[11px] text-[#94a3b8]">Links enviados</div></div>
        <div className="bg-white border rounded-xl p-3 text-center" style={{ borderColor: "#ece4d2" }}><div className="text-[22px] font-bold text-[#0F6E56]">{kpis.votos} <span className="text-[11px] text-[#94a3b8]">({kpis.pct}%)</span></div><div className="text-[11px] text-[#94a3b8]">Votos confirmados</div></div>
        <div className="bg-white border rounded-xl p-3 text-center" style={{ borderColor: "#ece4d2" }}><div className="text-[22px] font-bold text-[#854F0B]">{kpis.media} ★</div><div className="text-[11px] text-[#94a3b8]">Nota média</div></div>
      </div>

      <div className="bg-white border rounded-xl p-3 mb-4 flex gap-4 items-center flex-wrap" style={{ borderColor: "#ece4d2" }}>
        <span className="text-[11px] font-medium text-[#5b6470]">Distribuição:</span>
        {[5, 4, 3, 2, 1].map((s) => <span key={s} className="text-[12px]" style={{ color: dist[s] ? "#854F0B" : "#94a3b8" }}>★ {s} ({dist[s]})</span>)}
      </div>

      <div className="flex gap-1.5 mb-3 flex-wrap">
        {[{ k: "todos", l: "Todos" }, { k: "enviado", l: "Aguardando" }, { k: "votou", l: "Votaram" }].map((f) => <button key={f.k} onClick={() => setFStatus(f.k)} className="text-[11px] font-medium px-3 py-1 rounded-full border" style={fStatus === f.k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#4d5a66", borderColor: "#cfd8e0" }}>{f.l}</button>)}
      </div>

      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        {loading ? (<div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Carregando...</div>)
        : lista.length === 0 ? (<div className="px-6 py-10 text-center text-sm text-[#94a3b8]">Nenhuma solicitação. Use "Solicitar avaliação".</div>)
        : lista.map((r, i) => (
          <div key={r.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? "1px solid #f4eede" : "none" }}>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-[#0E2244]">{r.tutorNome || "Cliente"}</div>
              <div className="text-[11px] text-[#888]">{r.canal} · {fmtData(r.data)}{r.status === "votou" ? <span style={{ color: "#854F0B" }}> · {stars(Number(r.nota) || 0)}</span> : " · link enviado"}</div>
            </div>
            {r.status === "votou" ? (
              <span className="text-[10.5px] bg-[#E1F5EE] text-[#0F6E56] px-3 py-1 rounded-full">Votou</span>
            ) : (
              <button onClick={() => marcarVotou(r)} className="text-[10.5px] bg-[#FAEEDA] text-[#854F0B] px-3 py-1 rounded-full inline-flex items-center gap-1"><LuStar className="w-3 h-3" />Marcar votou</button>
            )}
            <button onClick={() => excluir(r.id)} className="text-[#94a3b8] hover:text-[#A32D2D]"><LuTrash className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}><h3 className="text-base font-semibold text-[#014D5E]">Solicitar avaliação</h3><button onClick={() => setOpen(false)} className="text-[#94a3b8]"><LuX className="w-4 h-4" /></button></div>
            <div className="p-5 space-y-3 text-[13px]">
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Cliente *</label><select value={form.tutorId} onChange={(e) => setForm({ ...form, tutorId: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]"><option value="">Selecione...</option>{tutors.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Canal</label><select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <p className="text-[11px] text-[#94a3b8]">Abre o {form.canal} com a mensagem + link do Google e registra a solicitação.</p>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}><button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button><button onClick={solicitar} disabled={saving} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "..." : "Enviar e registrar"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
