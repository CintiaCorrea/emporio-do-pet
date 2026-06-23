"use client";
import { useMemo, useState } from "react";
import { LuPencil, LuTrash2, LuCalendar, LuRotateCcw, LuStethoscope, LuActivity, LuSyringe, LuFileText, LuFlaskConical, LuVideo } from "react-icons/lu";

const ATD_LBL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", Receitas: "Receita", Documento: "Documento", Video: "Vídeo", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");
const DOC_LBL = (t?: string) => (({ ANAMNESIS: "Anamnese", PRESCRIPTION: "Receita", DIAGNOSIS: "Diagnóstico", TUTOR_REPORT: "Relatório", MEDICAL_CERTIFICATE: "Atestado", EXAM_REQUEST: "Solicitação de exame", SURGICAL_REPORT: "Relatório cirúrgico", DISCHARGE_SUMMARY: "Alta", VACCINATION_CARD: "Carteira de vacina", GENERAL: "Documento" } as any)[t || ""] || "Documento");
const COLOR = (k?: string) => (({ CONSULTA: "#2f80c4", RETORNO: "#2f80c4", AVALIACAO: "#2f80c4", EMERGENCIA: "#2f80c4", PROCEDIMENTO: "#2f80c4", SESSAO_FISIO: "#2f80c4", CIRURGIA: "#9b2c3a", Receitas: "#9333ea", PRESCRIPTION: "#9333ea", Documento: "#2e9e5b", GENERAL: "#2e9e5b", MEDICAL_CERTIFICATE: "#2e9e5b", Video: "#0f7a52", VACINACAO: "#e08a1e", VACCINATION_CARD: "#e08a1e", EXAM_REQUEST: "#e0556b", Exame: "#e0556b" } as any)[k || ""] || "#64748b");
const INITIALS = (n?: string) => ((n || "").split(" ").filter(Boolean).slice(0, 2).map((x: string) => x[0]).join("").toUpperCase() || "—");
const FMT = (d: any) => { const x = new Date(d); const p = (n: number) => String(n).padStart(2, "0"); return `${p(x.getDate())}/${p(x.getMonth() + 1)} às ${p(x.getHours())}:${p(x.getMinutes())}`; };
const LEGENDA: { n: string; c: string; I: any }[] = [
  { n: "Atendimento", c: "#2f80c4", I: LuStethoscope },
  { n: "Peso", c: "#b8860b", I: LuActivity },
  { n: "Vacina", c: "#e08a1e", I: LuSyringe },
  { n: "Receita", c: "#9333ea", I: LuPencil },
  { n: "Documento", c: "#2e9e5b", I: LuFileText },
  { n: "Exame", c: "#e0556b", I: LuFlaskConical },
  { n: "Vídeo", c: "#0f7a52", I: LuVideo },
];

export default function FeedTimeline({ atendimentos = [], clinDocs = [], onEditar, onExcluir }: { atendimentos?: any[]; clinDocs?: any[]; onEditar?: (it: any) => void; onExcluir?: (it: any) => void }) {
  const [pOpen, setPOpen] = useState(false);
  const [pIni, setPIni] = useState("");
  const [pFim, setPFim] = useState("");

  const all = useMemo(() => {
    const a = (atendimentos || []).map((x: any) => ({ id: "a" + x.id, src: "atd", raw: x, rawId: x.id, kind: x.type, date: x.date, title: ATD_LBL(x.type), prof: x.user?.name, summary: x.chiefComplaint || x.prescription || "", status: x.status }));
    const d = (clinDocs || []).map((x: any) => ({ id: "d" + x.id, src: "doc", raw: x, rawId: x.id, kind: x.type || "GENERAL", date: x.createdAt || x.appointment?.date, title: DOC_LBL(x.type), prof: x.user?.name, summary: x.title || "", status: "" }));
    return [...a, ...d].filter((i: any) => i.date).sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [atendimentos, clinDocs]);

  const items = useMemo(() => all.filter((it: any) => {
    if (pIni && new Date(it.date) < new Date(pIni + "T00:00:00")) return false;
    if (pFim && new Date(it.date) > new Date(pFim + "T23:59:59")) return false;
    return true;
  }), [all, pIni, pFim]);

  if (all.length === 0) return <div className="text-sm text-gray-400 py-8 text-center">Sem registros no histórico ainda.</div>;

  let lastYear = "";
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <button onClick={() => setPOpen((v) => !v)} className="text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1" style={{ borderColor: "#E8DFC8", color: (pIni || pFim) ? "#009AAC" : "#475569" }}><LuCalendar size={12} /> Período…</button>
        <button onClick={() => { setPIni(""); setPFim(""); setPOpen(false); }} title="Limpar período" className="w-7 h-7 rounded-lg border flex items-center justify-center text-gray-500 hover:text-[#009AAC]" style={{ borderColor: "#E8DFC8" }}><LuRotateCcw size={13} /></button>
      </div>
      {pOpen ? (
        <div className="flex items-center gap-2 mb-2">
          <input type="date" value={pIni} onChange={(e) => setPIni(e.target.value)} className="text-[11px] border rounded-lg px-2 py-1" style={{ borderColor: "#E8DFC8" }} />
          <span className="text-[11px] text-gray-400">até</span>
          <input type="date" value={pFim} onChange={(e) => setPFim(e.target.value)} className="text-[11px] border rounded-lg px-2 py-1" style={{ borderColor: "#E8DFC8" }} />
        </div>
      ) : null}
      <div className="flex gap-1 flex-wrap mb-3">
        {LEGENDA.map((g) => { const Ic = g.I; return <span key={g.n} title={g.n} className="w-6 h-6 rounded-md flex items-center justify-center text-white" style={{ background: g.c }}><Ic size={12} /></span>; })}
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400 py-6 text-center">Nenhum registro neste período.</div>
      ) : (
        <div className="space-y-1.5">
          {items.map((it: any) => {
            const y = new Date(it.date).getFullYear().toString();
            const showYear = y !== lastYear; lastYear = y;
            const cor = COLOR(it.kind);
            return (
              <div key={it.id}>
                {showYear ? <div className="text-[15px] font-bold mb-1.5 mt-3" style={{ color: "#009AAC" }}>{y}</div> : null}
                <div className="group flex gap-2.5 py-2 pl-2.5 pr-2 rounded-r-lg" style={{ borderLeft: `3px solid ${cor}`, background: "#f6fdfd" }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: cor }}>{FMT(it.date)}</div>
                    <div className="text-[13px] font-semibold" style={{ color: "#0E2244" }}>{it.title}{it.status ? ` · ${it.status}` : ""}</div>
                    {it.summary ? <div className="text-[12px] text-gray-500 truncate">{it.summary}</div> : null}
                  </div>
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition">
                    {onEditar && it.src === "atd" ? <button onClick={() => onEditar(it)} title="Editar" className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#009AAC] hover:bg-white"><LuPencil size={13} /></button> : null}
                    {onExcluir ? <button onClick={() => onExcluir(it)} title="Excluir" className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#E24B4A] hover:bg-white"><LuTrash2 size={13} /></button> : null}
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white border text-[10px] font-bold flex items-center justify-center shrink-0" style={{ color: "#014D5E", borderColor: "#E8DFC8" }} title={it.prof || ""}>{INITIALS(it.prof)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
