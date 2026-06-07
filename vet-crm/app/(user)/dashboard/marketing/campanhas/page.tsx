"use client";
// [EMP-COWORK] Campanhas — Listas campanha_<id>; Leads/Conv. auto por Tag Origem (match nos leads do CRM) (Cintia 07/06, Marketing)
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuPlus, LuTrash, LuX, LuPencil } from "react-icons/lu";

const PLATAFORMAS = ["Meta Ads", "Google Ads", "Instagram", "Facebook", "TikTok", "Indicação", "Outro"];
const TIPOS = ["Aquisição", "Remarketing", "Branding", "Conteúdo", "Outro"];
const STATUS = ["Ativa", "Pausada", "Encerrada"];
const stStyle = (s: string) => s === "Ativa" ? { bg: "#E1F5EE", fg: "#0F6E56" } : s === "Pausada" ? { bg: "#FAEEDA", fg: "#854F0B" } : { bg: "#EEF2F4", fg: "#5b6470" };
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v || 0);
const EMPTY = { nome: "", plataforma: "Meta Ads", tipo: "Aquisição", tagOrigem: "", investimento: "", receita: "", inicio: "", fim: "", status: "Ativa" };

export default function CampanhasPage() {
  usePageTitle("Campanhas", "Campanhas de mídia · CAC e ROI");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [l, ld] = await Promise.all([
        fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/leads", { cache: "no-store" }).then((r) => r.json()).catch(() => ({})),
      ]);
      const la = Array.isArray(l) ? l : (l.itens || l.data || []);
      setRows(la.filter((x: any) => (x.lista || "").startsWith("campanha_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, ...d }; }));
      setLeads(Array.isArray(ld) ? ld : (ld.leads || ld.data || []));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const matchTag = (lead: any, tag: string) => {
    if (!tag) return false; const t = tag.toLowerCase().trim();
    const fs = [lead.utmCampaign, lead.utmSource, lead.sourceDetail, lead.origem, lead.source].filter(Boolean).map((x: any) => String(x).toLowerCase());
    return fs.some((f) => f === t || f.includes(t));
  };
  const metrics = (c: any) => {
    const inv = Number(c.investimento) || 0; const rec = Number(c.receita) || 0;
    const lds = leads.filter((l) => matchTag(l, c.tagOrigem));
    const conv = lds.filter((l) => l.status === "CONVERTED" || l.convertedToTutorId).length;
    const cac = lds.length ? inv / lds.length : 0;
    const roi = inv > 0 ? Math.round(((rec - inv) / inv) * 100) : null;
    return { inv, rec, leads: lds.length, conv, cac, roi };
  };

  const salvar = async () => {
    if (!form.nome.trim()) { alert("Informe o nome da campanha."); return; }
    setSaving(true);
    try {
      const payload = { ...form, investimento: Number(form.investimento) || 0, receita: Number(form.receita) || 0 };
      if (editId) await fetch(`/api/listas/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `campanha_${Date.now()}`, valor: JSON.stringify(payload) }) });
      setOpen(false); setEditId(null); setForm({ ...EMPTY }); load();
    } catch { alert("Erro ao salvar."); } finally { setSaving(false); }
  };
  const editar = (c: any) => { setEditId(c.id); setForm({ nome: c.nome || "", plataforma: c.plataforma || "Meta Ads", tipo: c.tipo || "Aquisição", tagOrigem: c.tagOrigem || "", investimento: c.investimento ?? "", receita: c.receita ?? "", inicio: c.inicio || "", fim: c.fim || "", status: c.status || "Ativa" }); setOpen(true); };
  const excluir = async (id: string) => { if (!confirm("Excluir esta campanha?")) return; try { await fetch(`/api/listas/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-[12px] text-[#64748b]">{rows.length} campanha(s) · Leads e conversões automáticos pela Tag Origem</span>
        <button onClick={() => { setEditId(null); setForm({ ...EMPTY }); setOpen(true); }} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5"><LuPlus className="w-3.5 h-3.5" />Nova campanha</button>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase tracking-wide text-[#6b7280]">
              <th className="text-left font-medium px-3 py-2">Campanha</th><th className="text-left font-medium px-2 py-2">Plataforma</th><th className="text-left font-medium px-2 py-2">Status</th><th className="text-right font-medium px-2 py-2">Invest.</th><th className="text-center font-medium px-2 py-2">Leads</th><th className="text-center font-medium px-2 py-2">Conv.</th><th className="text-right font-medium px-2 py-2">Receita</th><th className="text-right font-medium px-2 py-2">CAC</th><th className="text-right font-medium px-2 py-2">ROI</th><th className="px-2 py-2"></th>
            </tr></thead>
            <tbody className="text-[12.5px] text-[#0E2244]">
              {loading ? (<tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Carregando...</td></tr>)
              : rows.length === 0 ? (<tr><td colSpan={10} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Nenhuma campanha. Clique em "Nova campanha".</td></tr>)
              : rows.map((c) => { const m = metrics(c); const st = stStyle(c.status); return (
                <tr key={c.id} className="border-t hover:bg-[#fdfaee]" style={{ borderColor: "#f4eede" }}>
                  <td className="px-3 py-2"><div className="font-medium">{c.nome}</div>{c.tagOrigem && <div className="text-[10px] text-[#94a3b8]">tag: {c.tagOrigem}</div>}</td>
                  <td className="px-2 py-2 text-[#5b6470]">{c.plataforma}</td>
                  <td className="px-2 py-2"><span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>{c.status}</span></td>
                  <td className="px-2 py-2 text-right">{fmtBRL(m.inv)}</td>
                  <td className="px-2 py-2 text-center font-semibold">{m.leads}</td>
                  <td className="px-2 py-2 text-center">{m.conv}</td>
                  <td className="px-2 py-2 text-right">{fmtBRL(m.rec)}</td>
                  <td className="px-2 py-2 text-right text-[#5b6470]">{m.leads ? fmtBRL(m.cac) : "—"}</td>
                  <td className="px-2 py-2 text-right font-semibold" style={{ color: m.roi === null ? "#94a3b8" : m.roi >= 0 ? "#0F6E56" : "#A32D2D" }}>{m.roi === null ? "—" : `${m.roi > 0 ? "+" : ""}${m.roi}%`}</td>
                  <td className="px-2 py-2 text-right whitespace-nowrap"><button onClick={() => editar(c)} className="text-[#94a3b8] hover:text-[#009AAC] mr-1"><LuPencil className="w-3.5 h-3.5" /></button><button onClick={() => excluir(c.id)} className="text-[#94a3b8] hover:text-[#A32D2D]"><LuTrash className="w-3.5 h-3.5" /></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#eef0e6" }}><h3 className="text-base font-semibold text-[#014D5E]">{editId ? "Editar campanha" : "Nova campanha"}</h3><button onClick={() => setOpen(false)} className="text-[#94a3b8]"><LuX className="w-4 h-4" /></button></div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Nome *</label><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Plataforma</label><select value={form.plataforma} onChange={(e) => setForm({ ...form, plataforma: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Tipo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{TIPOS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Tag Origem <span className="text-[#94a3b8]">(liga aos leads — ex.: verao-fisio)</span></label><input value={form.tagOrigem} onChange={(e) => setForm({ ...form, tagOrigem: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Investimento (R$)</label><input type="number" min={0} step="0.01" value={form.investimento} onChange={(e) => setForm({ ...form, investimento: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Receita gerada (R$)</label><input type="number" min={0} step="0.01" value={form.receita} onChange={(e) => setForm({ ...form, receita: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Início</label><input type="date" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div><label className="text-[11px] text-[#6b7280] block mb-1">Fim</label><input type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Status</label><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]">{STATUS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#eef0e6" }}><button onClick={() => setOpen(false)} className="px-4 py-2 text-[13px] text-[#5b6470] bg-[#f3f1ea] rounded-lg">Cancelar</button><button onClick={salvar} disabled={saving} className="px-4 py-2 text-[13px] text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Salvar"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
