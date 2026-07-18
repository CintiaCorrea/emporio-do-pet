"use client";
import { useMemo, useState } from "react";
import { LuPencil, LuTrash2, LuCalendar, LuRotateCcw, LuStethoscope, LuActivity, LuSyringe, LuFileText, LuFlaskConical, LuVideo } from "react-icons/lu";

const ATD_LBL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", Receitas: "Receita", Documento: "Documento", Video: "Vídeo", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");
const DOC_LBL = (t?: string) => (({ ANAMNESIS: "Anamnese", PRESCRIPTION: "Receita", DIAGNOSIS: "Diagnóstico", TUTOR_REPORT: "Relatório", MEDICAL_CERTIFICATE: "Atestado", EXAM_REQUEST: "Solicitação de exame", SURGICAL_REPORT: "Relatório cirúrgico", DISCHARGE_SUMMARY: "Alta", VACCINATION_CARD: "Carteira de vacina", GENERAL: "Documento" } as any)[t || ""] || "Documento");
const COLOR = (k?: string) => (({ CONSULTA: "#2f80c4", RETORNO: "#2f80c4", AVALIACAO: "#2f80c4", EMERGENCIA: "#2f80c4", PROCEDIMENTO: "#2f80c4", SESSAO_FISIO: "#2f80c4", CIRURGIA: "#9b2c3a", Receitas: "#9333ea", PRESCRIPTION: "#9333ea", Documento: "#2e9e5b", GENERAL: "#2e9e5b", MEDICAL_CERTIFICATE: "#2e9e5b", Video: "#0f7a52", VACINACAO: "#e08a1e", VACCINATION_CARD: "#e08a1e", EXAM_REQUEST: "#e0556b", Exame: "#e0556b", ATENDIMENTO: "#017E8C", PESO: "#8A6D3B", RECEITA: "#6A4FB0", OBSERVACAO: "#6B6A63", EXAME: "#B0416B", VACINA: "#9A6E1E" } as any)[k || ""] || "#64748b");
const TIPO_HIST = (t?: string) => (({ ATENDIMENTO: "Atendimento", PESO: "Peso", RECEITA: "Receita", OBSERVACAO: "Observação", EXAME: "Exame", VACINA: "Vacina" } as any)[t || ""] || t || "Registro");
const stripHtml = (s?: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
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

export default function FeedTimeline({ atendimentos = [], clinDocs = [], historico = [], onEditar, onExcluir, onDetalhe }: { atendimentos?: any[]; clinDocs?: any[]; historico?: any[]; onEditar?: (it: any) => void; onExcluir?: (it: any) => void; onDetalhe?: (id: string) => void }) {
  const [pOpen, setPOpen] = useState(false);
  const [pIni, setPIni] = useState("");
  const [pFim, setPFim] = useState("");
  const [cat, setCat] = useState("TODOS");
  const CATS: { k: string; lbl: string }[] = [
    { k: "TODOS", lbl: "Todos" }, { k: "ATENDIMENTO", lbl: "🩺 Atendimentos" }, { k: "VACINA", lbl: "💉 Vacinas" },
    { k: "PESO", lbl: "⚖️ Peso" }, { k: "EXAME", lbl: "🔬 Exames" }, { k: "RECEITA", lbl: "💊 Receitas" },
    { k: "OBSERVACAO", lbl: "💬 Observações" }, { k: "DOCUMENTO", lbl: "📄 Documentos" },
  ];

  const all = useMemo(() => {
    const a = (atendimentos || []).map((x: any) => ({ id: "a" + x.id, src: "atd", raw: x, rawId: x.id, kind: x.type, cat: x.type === "VACINACAO" ? "VACINA" : "ATENDIMENTO", date: x.date, title: ATD_LBL(x.type), prof: x.user?.name, summary: x.chiefComplaint || x.prescription || "", status: x.status }));
    const d = (clinDocs || []).map((x: any) => ({ id: "d" + x.id, src: "doc", raw: x, rawId: x.id, kind: x.type || "GENERAL", cat: x.type === "PRESCRIPTION" ? "RECEITA" : "DOCUMENTO", date: x.createdAt || x.appointment?.date, title: DOC_LBL(x.type), prof: x.user?.name, summary: x.title || "", status: "" }));
    // Histórico importado do SimplesVet (só-leitura)
    const h = (historico || []).map((x: any) => ({ id: "h" + x.id, src: "hist", raw: x, rawId: x.id, kind: x.tipo, cat: x.tipo, date: x.data, title: x.titulo || TIPO_HIST(x.tipo), prof: x.autor, summary: x.resumo || stripHtml(x.texto).slice(0, 140), status: "", imported: x.origem !== "MANUAL", temArquivo: !!x.temArquivo }));
    return [...a, ...d, ...h].filter((i: any) => i.date).sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [atendimentos, clinDocs, historico]);

  const items = useMemo(() => all.filter((it: any) => {
    if (cat !== "TODOS" && it.cat !== cat) return false;
    if (pIni && new Date(it.date) < new Date(pIni + "T00:00:00")) return false;
    if (pFim && new Date(it.date) > new Date(pFim + "T23:59:59")) return false;
    return true;
  }), [all, pIni, pFim, cat]);
  const catCount = (k: string) => k === "TODOS" ? all.length : all.filter((i: any) => i.cat === k).length;

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
      <div className="flex gap-1.5 flex-wrap mb-3">
        {CATS.map((c) => { const n = catCount(c.k); if (c.k !== "TODOS" && n === 0) return null; const on = cat === c.k; return (
          <button key={c.k} onClick={() => setCat(c.k)} className="text-[11px] px-2.5 py-1 rounded-full border transition" style={on ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>{c.lbl} <span style={{ opacity: .65 }}>{n}</span></button>
        ); })}
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
                <div onClick={() => { if (it.src !== "hist") return; if (it.temArquivo) window.open(`/api/pets/historico/${it.rawId}/arquivo`, "_blank"); else if (onDetalhe) onDetalhe(it.rawId); }} className="group flex gap-2.5 py-2 pl-2.5 pr-2 rounded-r-lg" style={{ borderLeft: `3px solid ${cor}`, background: "#f6fdfd", cursor: it.src === "hist" ? "pointer" : undefined }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: cor }}>{FMT(it.date)}</div>
                    <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "#0E2244" }}><span>{it.title}{it.status ? ` · ${it.status}` : ""}</span>{it.imported ? <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#F3ECDD", color: "#8A6D3B" }}>SimplesVet</span> : null}{it.temArquivo ? <span title="Abrir PDF" style={{ fontSize: "12px" }}>📎</span> : null}</div>
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
