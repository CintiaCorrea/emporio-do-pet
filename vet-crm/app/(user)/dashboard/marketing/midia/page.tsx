"use client";
// [EMP-COWORK] Mídia — lançamentos de investimento (Listas midia_<id>), ligados a campanhas (Cintia 07/06, Marketing)
import { useEffect, useMemo, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { LuTrash } from "react-icons/lu";

const PLATAFORMAS = ["Meta Ads", "Google Ads", "Instagram", "Facebook", "TikTok", "Outro"];
const PERIODOS = ["Diário", "Semanal", "Quinzenal", "Mensal", "Avulso"];
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
const fmtD = (s?: string) => { if (!s) return ""; try { return new Date(s + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return s; } };
const EMPTY = { campanhaId: "", plataforma: "Meta Ads", periodicidade: "Semanal", ini: "", fim: "", investimento: "", impressoes: "", cliques: "", conversoes: "", alcance: "", obs: "" };

export default function MidiaPage() {
  usePageTitle("Mídia", "Lançamentos de investimento de mídia");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<any[]>([]);
  const [campanhas, setCampanhas] = useState<any[]>([]);
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const l = await fetch("/api/listas", { cache: "no-store" }).then((r) => r.json()).catch(() => []);
      const la = Array.isArray(l) ? l : (l.itens || l.data || []);
      setRows(la.filter((x: any) => (x.lista || "").startsWith("midia_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, ...d }; }).sort((a: any, b: any) => (b.ini || "").localeCompare(a.ini || "")));
      setCampanhas(la.filter((x: any) => (x.lista || "").startsWith("campanha_")).map((x: any) => { let d: any = {}; try { d = JSON.parse(x.valor); } catch {} return { id: x.id, nome: d.nome, plataforma: d.plataforma }; }));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const registrar = async () => {
    if (!form.campanhaId) { alert("Escolha a campanha."); return; }
    setSaving(true);
    try {
      const camp = campanhas.find((c) => c.id === form.campanhaId);
      const payload = { campanhaId: form.campanhaId, campanhaNome: camp?.nome || "", plataforma: form.plataforma, periodicidade: form.periodicidade, ini: form.ini, fim: form.fim, investimento: Number(form.investimento) || 0, impressoes: Number(form.impressoes) || 0, cliques: Number(form.cliques) || 0, conversoes: Number(form.conversoes) || 0, alcance: Number(form.alcance) || 0, obs: form.obs };
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `midia_${Date.now()}`, valor: JSON.stringify(payload) }) });
      setForm({ ...EMPTY }); load();
    } catch { alert("Erro ao registrar."); } finally { setSaving(false); }
  };
  const excluir = async (id: string) => { if (!confirm("Excluir este lançamento?")) return; try { await fetch(`/api/listas/${id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  const totalInv = useMemo(() => rows.reduce((s, r) => s + (Number(r.investimento) || 0), 0), [rows]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="bg-white border rounded-2xl p-4 mb-4" style={{ borderColor: "#e8dfc8" }}>
        <div className="text-[13px] font-medium text-[#014D5E] mb-3">Novo lançamento</div>
        {campanhas.length === 0 ? (
          <div className="text-[12px] text-[#A32D2D]">Cadastre uma campanha primeiro (menu Campanhas) pra registrar lançamentos.</div>
        ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-[13px]">
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Campanha *</label><select value={form.campanhaId} onChange={(e) => setForm({ ...form, campanhaId: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]"><option value="">Selecione...</option>{campanhas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Plataforma</label><select value={form.plataforma} onChange={(e) => setForm({ ...form, plataforma: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]">{PLATAFORMAS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Periodicidade</label><select value={form.periodicidade} onChange={(e) => setForm({ ...form, periodicidade: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]">{PERIODOS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Data início</label><input type="date" value={form.ini} onChange={(e) => setForm({ ...form, ini: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Data fim</label><input type="date" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Investimento (R$)</label><input type="number" min={0} step="0.01" value={form.investimento} onChange={(e) => setForm({ ...form, investimento: e.target.value })} placeholder="0,00" className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Impressões</label><input type="number" min={0} value={form.impressoes} onChange={(e) => setForm({ ...form, impressoes: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Cliques</label><input type="number" min={0} value={form.cliques} onChange={(e) => setForm({ ...form, cliques: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Conversões</label><input type="number" min={0} value={form.conversoes} onChange={(e) => setForm({ ...form, conversoes: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div><label className="text-[11px] text-[#6b7280] block mb-1">Alcance</label><input type="number" min={0} value={form.alcance} onChange={(e) => setForm({ ...form, alcance: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div className="lg:col-span-2"><label className="text-[11px] text-[#6b7280] block mb-1">Observações</label><input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} className="w-full border border-[#d8d0bc] rounded-lg px-3 py-2 focus:outline-none focus:border-[#009AAC]" /></div>
          <div className="col-span-2 lg:col-span-3 flex justify-end"><button onClick={registrar} disabled={saving} className="bg-[#009AAC] text-white px-4 py-2 rounded-lg text-[13px] font-medium disabled:opacity-60">{saving ? "Registrando..." : "Registrar lançamento"}</button></div>
        </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-2">
        <div className="text-[13px] font-medium text-[#014D5E]">Histórico de lançamentos</div>
        <div className="text-[12px] text-[#5b6470]">Total investido: <b>{fmtBRL(totalInv)}</b></div>
      </div>
      <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#d8d0bc" }}>
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead><tr className="bg-[#F8F3E4] text-[10.5px] uppercase tracking-wide text-[#6b7280]">
              <th className="text-left font-medium px-3 py-2">Período</th><th className="text-left font-medium px-2 py-2">Campanha</th><th className="text-left font-medium px-2 py-2">Plataforma</th><th className="text-right font-medium px-2 py-2">Investimento</th><th className="text-right font-medium px-2 py-2">Cliques</th><th className="text-right font-medium px-2 py-2">Conv.</th><th className="text-right font-medium px-2 py-2">CPC</th><th className="px-2 py-2"></th>
            </tr></thead>
            <tbody className="text-[12.5px] text-[#0E2244]">
              {loading ? (<tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Carregando...</td></tr>)
              : rows.length === 0 ? (<tr><td colSpan={8} className="px-4 py-10 text-center text-sm text-[#94a3b8]">Nenhum lançamento registrado.</td></tr>)
              : rows.map((r) => { const cpc = Number(r.cliques) > 0 ? Number(r.investimento) / Number(r.cliques) : 0; return (
                <tr key={r.id} className="border-t hover:bg-[#fdfaee]" style={{ borderColor: "#f4eede" }}>
                  <td className="px-3 py-2 text-[#5b6470] whitespace-nowrap">{fmtD(r.ini)}{r.fim ? `–${fmtD(r.fim)}` : ""}</td>
                  <td className="px-2 py-2">{r.campanhaNome || "—"}</td>
                  <td className="px-2 py-2 text-[#5b6470]">{r.plataforma}</td>
                  <td className="px-2 py-2 text-right">{fmtBRL(Number(r.investimento))}</td>
                  <td className="px-2 py-2 text-right">{r.cliques || 0}</td>
                  <td className="px-2 py-2 text-right">{r.conversoes || 0}</td>
                  <td className="px-2 py-2 text-right text-[#5b6470]">{cpc ? fmtBRL(cpc) : "—"}</td>
                  <td className="px-2 py-2 text-right"><button onClick={() => excluir(r.id)} className="text-[#94a3b8] hover:text-[#A32D2D]"><LuTrash className="w-3.5 h-3.5" /></button></td>
                </tr>
              ); })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
