"use client";
// [EMP-COWORK] Ficha do paciente internado (Internação F2) — admissão/alta, risco, tutor, evolução médica.
// Internação = appointment (/api/hospitalizations/[id]); extras em vitalSigns (admissao). Evolução em listas intevo_<id>.
// Blocos de F3 (plantão) / F4 (sinais vitais) / F5 (conta) ficam como gancho "próxima fase".

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";

const ESTADOS = [
  { v: "Estável", prio: "LOW", bg: "#E1F5EE", fg: "#0F6E56" },
  { v: "Em observação", prio: "MEDIUM", bg: "#E6F1FB", fg: "#0C447C" },
  { v: "Instável", prio: "HIGH", bg: "#FBEFE0", fg: "#B45309" },
  { v: "Crítico", prio: "CRITICAL", bg: "#FCE9EF", fg: "#CC3366" },
];
const PROGNOSTICOS = ["Bom", "Reservado", "Ruim", "Grave"];
const VIAS = ["IV", "IM", "SC", "VO", "IV (BIC)", "SL", "IN", "Tópico", "Outro"];
const STATUS_MED: Record<string, { lbl: string; bg: string; fg: string }> = {
  atrasado: { lbl: "Atrasada", bg: "#FCE9EF", fg: "#CC3366" },
  pendente: { lbl: "Pendente", bg: "#FDF4DD", fg: "#8a6400" },
  feito: { lbl: "Feita", bg: "#E1F5EE", fg: "#0F6E56" },
};
const hojeISO = () => new Date().toISOString().slice(0, 10);
const prioToEstado: Record<string, string> = { LOW: "Estável", MEDIUM: "Em observação", HIGH: "Instável", CRITICAL: "Crítico" };
function estadoDe(h: any): string { return h?.vitalSigns?.estadoClinico || prioToEstado[h?.priority] || "Estável"; }
function estadoStyle(e: string) { return ESTADOS.find((x) => x.v === e) || ESTADOS[0]; }
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function diasInternado(adm?: string): number { if (!adm) return 1; try { const ms = Date.now() - new Date(adm).getTime(); return Math.max(1, Math.ceil(ms / 86400000)); } catch { return 1; } }
function fmtData(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; } }
function fmtDataHora(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } }
function idadeDe(bd?: string) { if (!bd) return null; try { const anos = Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 86400000)); return anos >= 1 ? `${anos} ano${anos > 1 ? "s" : ""}` : "< 1 ano"; } catch { return null; } }

export default function FichaInternacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "";
  usePageTitle("Ficha de internação", "Paciente internado");

  const [h, setH] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [boxCodigo, setBoxCodigo] = useState<string | null>(null);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [evoTexto, setEvoTexto] = useState("");
  const [evoSaving, setEvoSaving] = useState(false);

  const [admOpen, setAdmOpen] = useState(false);
  const [admForm, setAdmForm] = useState<any>({ pesoEntrada: "", tempEntrada: "", diagnosis: "", prognostico: "", estimatedDischargeDate: "" });
  const [admSaving, setAdmSaving] = useState(false);

  // Prescrição & plantão (F3)
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [doses, setDoses] = useState<any[]>([]);
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescForm, setPrescForm] = useState<any>({ id: "", medicamento: "", via: "IV", dose: "", frequencia: "", horarios: "", observacao: "" });
  const [prescSaving, setPrescSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [d, m, ev, pr, ds] = await Promise.all([
        fetch(`/api/hospitalizations/${id}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/boxes/mapa`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/listas?lista=intevo_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intpresc_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intmed_${id}`).then((r) => r.json()).catch(() => []),
      ]);
      setH(d && d.id ? d : null);
      const card = Array.isArray(m?.boxes) ? m.boxes.find((c: any) => c.internacao?.id === id) : null;
      setBoxCodigo(card?.box?.codigo || null);
      const parse = (raw: any) => { const a = Array.isArray(raw) ? raw : (raw.itens || raw.data || []); return a.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } }); };
      setEvolucoes(parse(ev));
      setPrescricoes(parse(pr));
      setDoses(parse(ds));
    } catch {}
    setLoading(false);
  };
  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const estado = h ? estadoDe(h) : "Estável";
  const adm = h?.vitalSigns?.admissao || {};

  const salvarVital = async (patch: any) => {
    // mescla vitalSigns preservando o que já existe
    const vitalSigns = { ...(h?.vitalSigns || {}), ...patch.vitalSigns };
    const body: any = { ...patch, vitalSigns };
    delete body.vitalSigns_merge;
    const res = await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    if (res.ok) load();
    return res.ok;
  };

  const mudarRisco = async (e: string) => {
    const st = estadoStyle(e);
    await salvarVital({ priority: st.prio, vitalSigns: { estadoClinico: e } });
  };

  const abrirAdm = () => {
    setAdmForm({ pesoEntrada: adm.pesoEntrada || "", tempEntrada: adm.tempEntrada || "", diagnosis: h?.diagnosis || "", prognostico: adm.prognostico || "", estimatedDischargeDate: h?.estimatedDischargeDate ? String(h.estimatedDischargeDate).slice(0, 10) : "" });
    setAdmOpen(true);
  };
  const salvarAdm = async () => {
    setAdmSaving(true);
    try {
      await salvarVital({
        diagnosis: admForm.diagnosis || undefined,
        estimatedDischargeDate: admForm.estimatedDischargeDate || undefined,
        vitalSigns: { admissao: { pesoEntrada: admForm.pesoEntrada, tempEntrada: admForm.tempEntrada, prognostico: admForm.prognostico } },
      });
      setAdmOpen(false);
    } finally { setAdmSaving(false); }
  };

  const registrarEvolucao = async () => {
    if (!evoTexto.trim()) return;
    setEvoSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), texto: evoTexto.trim() });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intevo_${id}`, valor }) });
      setEvoTexto(""); load();
    } catch { alert("Erro ao registrar evolução."); }
    finally { setEvoSaving(false); }
  };
  const excluirEvolucao = async (evoId: string) => {
    if (!confirm("Excluir esta evolução?")) return;
    try { await fetch(`/api/listas/${evoId}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };

  // ── Prescrição & plantão (F3) ─────────────────────────────────────
  const abrirPresc = (p?: any) => {
    setPrescForm(p ? { id: p.id, medicamento: p.medicamento || "", via: p.via || "IV", dose: p.dose || "", frequencia: p.frequencia || "", horarios: (p.horarios || []).join(", "), observacao: p.observacao || "" } : { id: "", medicamento: "", via: "IV", dose: "", frequencia: "", horarios: "", observacao: "" });
    setPrescOpen(true);
  };
  const salvarPresc = async () => {
    if (!prescForm.medicamento.trim()) { alert("Informe a medicação."); return; }
    setPrescSaving(true);
    try {
      const horarios = String(prescForm.horarios || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const payload = { medicamento: prescForm.medicamento.trim(), via: prescForm.via, dose: prescForm.dose.trim(), frequencia: prescForm.frequencia.trim(), horarios, observacao: prescForm.observacao.trim() };
      if (prescForm.id) {
        await fetch(`/api/listas/${prescForm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      } else {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intpresc_${id}`, valor: JSON.stringify(payload) }) });
      }
      setPrescOpen(false); load();
    } catch { alert("Erro ao salvar medicação."); }
    finally { setPrescSaving(false); }
  };
  const excluirPresc = async (p: any) => {
    if (!confirm(`Remover ${p.medicamento} da prescrição?`)) return;
    try { await fetch(`/api/listas/${p.id}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };
  const marcarDose = async (slot: any) => {
    try {
      if (slot.log) {
        await fetch(`/api/listas/${slot.log.id}`, { method: "DELETE", credentials: "include" });
      } else {
        const now = new Date();
        const valor = JSON.stringify({ prescId: slot.p.id, med: slot.p.medicamento, via: slot.p.via, dose: slot.p.dose, slot: slot.hhmm, date: hojeISO(), at: now.toISOString(), por: userName });
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intmed_${id}`, valor }) });
      }
      load();
    } catch {}
  };

  const darAlta = async () => {
    if (!confirm("Confirmar alta deste paciente? O box será liberado.")) return;
    try {
      await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DISCHARGED" }) });
      const m = await fetch(`/api/boxes/mapa`).then((r) => r.json()).catch(() => ({}));
      const card = Array.isArray(m?.boxes) ? m.boxes.find((c: any) => c.internacao?.id === id) : null;
      if (card?.box?.id) await fetch(`/api/boxes/${card.box.id}/liberar`, { method: "POST", credentials: "include" }).catch(() => {});
      router.push("/dashboard/erp/internacoes");
    } catch { alert("Erro ao dar alta."); }
  };

  const evolucoesOrd = useMemo(() => [...evolucoes].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()), [evolucoes]);
  const plantao = useMemo(() => {
    const now = new Date(); const hj = hojeISO(); const arr: any[] = [];
    for (const p of prescricoes) {
      for (const hhmm of (p.horarios || [])) {
        const log = doses.find((d) => d.prescId === p.id && d.slot === hhmm && d.date === hj);
        let status: "feito" | "atrasado" | "pendente";
        if (log) status = "feito";
        else { const [hh, mm] = String(hhmm).split(":").map(Number); const dt = new Date(); dt.setHours(hh || 0, mm || 0, 0, 0); status = dt < now ? "atrasado" : "pendente"; }
        arr.push({ p, hhmm, status, log });
      }
    }
    arr.sort((a, b) => { const da = a.status === "feito" ? 1 : 0, db = b.status === "feito" ? 1 : 0; if (da !== db) return da - db; return String(a.hhmm).localeCompare(String(b.hhmm)); });
    return arr;
  }, [prescricoes, doses]);
  const contMed = useMemo(() => ({ atras: plantao.filter((s) => s.status === "atrasado").length, pend: plantao.filter((s) => s.status === "pendente").length, feito: plantao.filter((s) => s.status === "feito").length }), [plantao]);

  if (loading) return <div className="p-6 text-center text-sm text-[#8A989D]">Carregando ficha...</div>;
  if (!h) return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[13px] text-[#009AAC] mb-3">← Voltar ao mapa</button>
      <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#8A989D]" style={{ borderColor: "#E8E2D6" }}>Internação não encontrada.</div>
    </div>
  );

  const st = estadoStyle(estado);
  const alta = h.status === "DISCHARGED";

  const Ch = ({ children, editar }: { children: React.ReactNode; editar?: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
      <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">{children}</h3>
      {editar && <button onClick={editar} className="text-[13px] text-[#8A989D] hover:text-[#009AAC]">✏️</button>}
    </div>
  );
  const Field = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="mb-2.5 last:mb-0"><div className="text-[10.5px] text-[#8A989D] uppercase tracking-wide mb-0.5">{k}</div><div className="text-[13.5px] text-[#1F2A2E] font-medium">{children}</div></div>
  );
  const GanchoCard = ({ emoji, titulo, desc }: { emoji: string; titulo: string; desc: string }) => (
    <div className="bg-white border rounded-[13px] px-4 py-3.5 flex items-center gap-3 opacity-90" style={{ borderColor: "#E8E2D6" }}>
      <div className="text-xl">{emoji}</div>
      <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-[#014D5E]">{titulo}</div><div className="text-[11.5px] text-[#8A989D]">{desc}</div></div>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#F0EBE0", color: "#8A989D" }}>🔒 próxima fase</span>
    </div>
  );

  return (
    <>
      {/* ===== APP (oculto na impressão) ===== */}
      <div className="p-6 max-w-6xl mx-auto print:hidden">
        {/* breadcrumb + voltar */}
        <div className="flex items-center gap-2 text-[12.5px] text-[#8A989D] mb-2">
          <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[#8A989D] hover:text-[#009AAC]">←</button>
          <Link href="/dashboard/erp/internacoes" className="hover:text-[#009AAC]">Internação</Link>
          <span>/</span><span className="text-[#009AAC] font-medium">{boxCodigo ? `Box ${boxCodigo}` : "Ficha"}</span>
        </div>

        {/* header */}
        <div className="flex items-center gap-3.5 mb-5 flex-wrap">
          <div className="w-13 h-13 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: st.bg, width: 52, height: 52 }}>{especieEmoji(h.pet?.species)}</div>
          <div>
            <h1 className="text-xl font-medium text-[#014D5E] flex items-center gap-2.5 flex-wrap">
              {h.pet?.name || "Pet"}
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>{estado}</span>
              {!alta ? <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "#E8F1F8", color: "#1f5a82" }}>D{diasInternado(h.admissionDate)} de internação</span> : <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>Alta • {fmtData(h.actualDischargeDate)}</span>}
            </h1>
            <div className="text-[12.5px] text-[#8A989D] mt-0.5">
              {[h.pet?.breed, h.pet?.gender, idadeDe(h.pet?.birthDate), h.pet?.weight ? `${h.pet.weight} kg` : null, boxCodigo ? `Box ${boxCodigo}` : null, h.tutor?.name ? `Tutor(a): ${h.tutor.name}` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button onClick={() => openWhatsAppMeta(h.tutor?.phone)} className="text-[12.5px] font-medium text-white bg-[#009AAC] px-3 py-2 rounded-lg">💬 WhatsApp</button>
            {h.pet?.id && <Link href={`/dashboard/erp/pets/${h.pet.id}`} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>📄 Ficha do pet</Link>}
            <button onClick={() => window.print()} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🖨️ Resumo de alta</button>
            {!alta && <button onClick={darAlta} className="text-[12.5px] font-medium text-[#CC3366] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#EAC3C1" }}>🚪 Dar alta</button>}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* ===== COLUNA ESQUERDA ===== */}
          <div className="flex flex-col gap-4">
            {/* risco */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>🚦 Nível de risco</Ch>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-1.5">
                  {ESTADOS.map((e) => {
                    const on = estado === e.v;
                    return <button key={e.v} onClick={() => mudarRisco(e.v)} disabled={alta} className="text-[11.5px] font-medium py-2 px-1 rounded-lg border text-center disabled:opacity-60" style={on ? { background: e.bg, color: e.fg, borderColor: e.fg } : { background: "#FBF9F4", color: "#8A989D", borderColor: "transparent" }}>{e.v}</button>;
                  })}
                </div>
                <div className="text-[10.5px] text-[#8A989D] mt-2.5">Sinaliza a cor no mapa e no painel da TV.</div>
              </div>
            </div>

            {/* admissão */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch editar={alta ? undefined : abrirAdm}>📋 Admissão</Ch>
              <div className="p-4">
                <Field k="Entrada">{fmtDataHora(h.admissionDate)}</Field>
                <Field k="Peso / temp. de entrada">{[adm.pesoEntrada ? `${adm.pesoEntrada} kg` : null, adm.tempEntrada ? `${adm.tempEntrada} °C` : null].filter(Boolean).join(" · ") || "—"}</Field>
                <Field k="Motivo / diagnóstico">{h.diagnosis || h.reason || "—"}</Field>
                <Field k="Prognóstico">{adm.prognostico ? <span className="inline-flex text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FDF4DD", color: "#8a6400" }}>{adm.prognostico}</span> : "—"}</Field>
                <Field k="Predição de alta">{h.estimatedDischargeDate ? fmtData(h.estimatedDischargeDate) : "—"}</Field>
                <Field k="Veterinário responsável">{h.veterinarian?.name || "—"}</Field>
              </div>
            </div>

            {/* tutor */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>👤 Tutor</Ch>
              <div className="p-4">
                <Field k="Nome">{h.tutor?.name || "—"}</Field>
                <Field k="Contato"><span className="text-[#009AAC]">{h.tutor?.phone || "—"}</span></Field>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => openWhatsAppMeta(h.tutor?.phone)} className="flex-1 text-[12px] text-white bg-[#009AAC] py-2 rounded-lg">💬 WhatsApp</button>
                  {h.tutor?.id && <Link href={`/dashboard/erp/tutores/${h.tutor.id}`} className="flex-1 text-center text-[12px] text-[#00798A] bg-[#E6F6F8] py-2 rounded-lg">Ficha</Link>}
                </div>
              </div>
            </div>
          </div>

          {/* ===== COLUNA DIREITA ===== */}
          <div className="flex flex-col gap-4">
            {/* evolução médica (F2) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>📝 Evolução médica</Ch>
              <div className="p-4">
                {!alta && (
                  <div className="flex gap-2 mb-3">
                    <input value={evoTexto} onChange={(e) => setEvoTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") registrarEvolucao(); }} placeholder="Registrar evolução do paciente..." className="flex-1 border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={registrarEvolucao} disabled={evoSaving} className="text-[12.5px] text-white bg-[#009AAC] px-3.5 py-2 rounded-lg disabled:opacity-60">Registrar</button>
                  </div>
                )}
                {evolucoesOrd.length === 0 ? (
                  <div className="text-[12.5px] text-[#8A989D] py-3 text-center">Nenhuma evolução registrada ainda.</div>
                ) : (
                  <div className="space-y-0">
                    {evolucoesOrd.map((e, i) => (
                      <div key={e.id} className="py-3 border-b last:border-b-0 pl-3" style={{ borderColor: "#F0EBE0", borderLeft: i === 0 ? "2px solid #009AAC" : "2px solid #E8E2D6" }}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-[#8A989D]">{fmtDataHora(e.at)}</div>
                          <button onClick={() => excluirEvolucao(e.id)} className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366]">🗑️</button>
                        </div>
                        <div className="text-[13px] text-[#5C6B70] mt-0.5">{e.texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prescrição (F3) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💊 Prescrição ativa</h3>
                {!alta && <button onClick={() => abrirPresc()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Adicionar</button>}
              </div>
              {prescricoes.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Nenhuma medicação prescrita ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Via</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Freq.</th><th className="text-left font-medium px-2 py-2">Horários</th><th className="px-2 py-2"></th>
                    </tr></thead>
                    <tbody>
                      {prescricoes.map((p) => (
                        <tr key={p.id} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-4 py-2 font-medium text-[#014D5E] whitespace-nowrap">{p.medicamento}</td>
                          <td className="px-2 py-2"><span className="text-[11px] text-[#5C6B70] bg-[#FBF9F4] border rounded px-1.5 py-0.5 whitespace-nowrap" style={{ borderColor: "#E8E2D6" }}>{p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{p.dose || "—"}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{p.frequencia || "—"}</td>
                          <td className="px-2 py-2 tabular-nums text-[#5C6B70] whitespace-nowrap">{(p.horarios || []).join(" · ") || "contínuo"}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && <><button onClick={() => abrirPresc(p)} className="text-[12px] px-1">✏️</button><button onClick={() => excluirPresc(p)} className="text-[12px] px-1">🗑️</button></>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Plantão de hoje (F3) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">📋 Plantão de hoje</h3>
                <div className="flex gap-1.5">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FCE9EF", color: "#CC3366" }}>🔴 {contMed.atras}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FDF4DD", color: "#8a6400" }}>🟡 {contMed.pend}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>🟢 {contMed.feito}</span>
                </div>
              </div>
              {plantao.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Sem doses com horário hoje. Adicione medicações com horários na prescrição.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Hora</th><th className="text-left font-medium px-2 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Status</th><th className="text-left font-medium px-2 py-2">Por</th><th className="px-2 py-2 text-center">Feita</th>
                    </tr></thead>
                    <tbody>
                      {plantao.map((s) => { const stt = STATUS_MED[s.status]; const done = s.status === "feito"; return (
                        <tr key={s.p.id + s.hhmm} className="border-t" style={{ borderColor: "#F0EBE0", opacity: done ? 0.6 : 1 }}>
                          <td className="px-4 py-2 tabular-nums font-medium whitespace-nowrap">{s.hhmm}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{s.p.medicamento} <span className="text-[11px] text-[#8A989D]">{s.p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{s.p.dose || "—"}</td>
                          <td className="px-2 py-2"><span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: stt.bg, color: stt.fg }}>{stt.lbl}</span></td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{s.log?.por || "—"}</td>
                          <td className="px-2 py-2 text-center"><button onClick={() => { if (!alta) marcarDose(s); }} disabled={alta} className="w-5 h-5 rounded-md border inline-flex items-center justify-center text-[12px] disabled:cursor-default" style={done ? { background: "#0F6E56", borderColor: "#0F6E56", color: "#fff" } : { background: "#fff", borderColor: "#E8E2D6", color: "transparent" }}>✓</button></td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              )}
              {!alta && <div className="px-4 py-2.5 text-[11px] text-[#8A989D] border-t" style={{ borderColor: "#F0EBE0" }}>Marcar a dose registra quem aplicou ({userName || "você"}) e a hora.</div>}
            </div>

            {/* ganchos F4 */}
            <GanchoCard emoji="🩺" titulo="Sinais vitais" desc="Aferições (FC, FR, temp, PA, dor) e tendência — entra na Fatia 4 (monitoramento)." />
            <GanchoCard emoji="💧" titulo="Fluidos, dejetos & alimentação" desc="Controle por turno — entra na Fatia 4 (monitoramento)." />

            {/* conta (resumo do que já temos, gancho pro financeiro completo) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>🧾 Conta da internação</Ch>
              <div className="p-4">
                <div className="flex items-center justify-between py-1.5 text-[13px]">
                  <span className="text-[#5C6B70]">Diárias ({diasInternado(h.admissionDate)}× · {fmtBRL(h.dailyRate)}/dia)</span>
                  <span className="font-medium text-[#1F2A2E]">{fmtBRL((h.dailyRate || 0) * diasInternado(h.admissionDate))}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-t text-[13px]" style={{ borderColor: "#F0EBE0" }}>
                  <span className="font-medium text-[#014D5E]">Total acumulado</span>
                  <span className="font-medium text-[#014D5E]">{fmtBRL(h.totalCost)}</span>
                </div>
                <div className="text-[10.5px] text-[#8A989D] mt-2">🔒 Lançamento no Caixa, baixa de insumos e caução entram na Fatia 5 (financeiro).</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RESUMO DE ALTA (só na impressão) ===== */}
      <div className="hidden print:block p-8" style={{ fontFamily: "Segoe UI, system-ui, sans-serif", color: "#1F2A2E" }}>
        <h1 style={{ fontSize: 20, color: "#014D5E", marginBottom: 2 }}>Resumo de internação — {h.pet?.name}</h1>
        <div style={{ fontSize: 12, color: "#5C6B70", marginBottom: 16 }}>{[h.pet?.breed, idadeDe(h.pet?.birthDate), h.pet?.weight ? `${h.pet.weight} kg` : null, boxCodigo ? `Box ${boxCodigo}` : null].filter(Boolean).join(" · ")} · Tutor(a): {h.tutor?.name} · {h.tutor?.phone}</div>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {[["Entrada", fmtDataHora(h.admissionDate)], ["Peso / temp. de entrada", [adm.pesoEntrada ? `${adm.pesoEntrada} kg` : null, adm.tempEntrada ? `${adm.tempEntrada} °C` : null].filter(Boolean).join(" · ") || "—"], ["Motivo / diagnóstico", h.diagnosis || h.reason || "—"], ["Prognóstico", adm.prognostico || "—"], ["Veterinário responsável", h.veterinarian?.name || "—"], ["Estado atual", estado], ["Alta prevista", h.estimatedDischargeDate ? fmtData(h.estimatedDischargeDate) : "—"], ["Dias internado", String(diasInternado(h.admissionDate))], ["Total acumulado", fmtBRL(h.totalCost)]].map(([k, v]) => (
              <tr key={k as string}><td style={{ padding: "6px 8px", color: "#8A989D", width: 200, borderBottom: "1px solid #F0EBE0" }}>{k}</td><td style={{ padding: "6px 8px", borderBottom: "1px solid #F0EBE0" }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Evolução médica</h2>
        {evolucoesOrd.length === 0 ? <div style={{ fontSize: 12, color: "#8A989D" }}>Sem registros.</div> : evolucoesOrd.slice().reverse().map((e) => (
          <div key={e.id} style={{ fontSize: 12.5, marginBottom: 6 }}><b style={{ color: "#5C6B70" }}>{fmtDataHora(e.at)}:</b> {e.texto}</div>
        ))}
      </div>

      {/* ===== POPUP EDITAR ADMISSÃO ===== */}
      {admOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setAdmOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">📋 Editar admissão</h3>
              <button onClick={() => setAdmOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Peso de entrada (kg)</label>
                <input type="number" step="0.01" value={admForm.pesoEntrada} onChange={(e) => setAdmForm({ ...admForm, pesoEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Temp. de entrada (°C)</label>
                <input type="number" step="0.1" value={admForm.tempEntrada} onChange={(e) => setAdmForm({ ...admForm, tempEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Diagnóstico / motivo</label>
                <input value={admForm.diagnosis} onChange={(e) => setAdmForm({ ...admForm, diagnosis: e.target.value })} placeholder="Ex.: Pós-op esplenectomia" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Prognóstico</label>
                <select value={admForm.prognostico} onChange={(e) => setAdmForm({ ...admForm, prognostico: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">—</option>{PROGNOSTICOS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Predição de alta</label>
                <input type="date" value={admForm.estimatedDischargeDate} onChange={(e) => setAdmForm({ ...admForm, estimatedDischargeDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setAdmOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-[#f3f1ea] rounded-lg">Cancelar</button>
              <button onClick={salvarAdm} disabled={admSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{admSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP MEDICAÇÃO (prescrição) ===== */}
      {prescOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setPrescOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">💊 {prescForm.id ? "Editar medicação" : "Adicionar medicação"}</h3>
              <button onClick={() => setPrescOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Medicação *</label>
                <input value={prescForm.medicamento} onChange={(e) => setPrescForm({ ...prescForm, medicamento: e.target.value })} placeholder="Ex.: Tramadol" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Via</label>
                <select value={prescForm.via} onChange={(e) => setPrescForm({ ...prescForm, via: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{VIAS.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Dose</label>
                <input value={prescForm.dose} onChange={(e) => setPrescForm({ ...prescForm, dose: e.target.value })} placeholder="3 mg/kg" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Frequência</label>
                <input value={prescForm.frequencia} onChange={(e) => setPrescForm({ ...prescForm, frequencia: e.target.value })} placeholder="8/8h" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Horários (HH:MM)</label>
                <input value={prescForm.horarios} onChange={(e) => setPrescForm({ ...prescForm, horarios: e.target.value })} placeholder="06:00, 14:00, 22:00" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2 -mt-1 text-[10.5px] text-[#8A989D]">Deixe os horários vazios para medicação <b>contínua</b> (não gera doses no plantão).</div>
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Observação</label>
                <input value={prescForm.observacao} onChange={(e) => setPrescForm({ ...prescForm, observacao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setPrescOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-[#f3f1ea] rounded-lg">Cancelar</button>
              <button onClick={salvarPresc} disabled={prescSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{prescSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
