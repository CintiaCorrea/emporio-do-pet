"use client";
import { useMemo } from "react";
import { LuClock } from "react-icons/lu";

const ATD_LBL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");
const DOC_LBL = (t?: string) => (({ ANAMNESIS: "Anamnese", PRESCRIPTION: "Receita", DIAGNOSIS: "Diagnóstico", TUTOR_REPORT: "Relatório", MEDICAL_CERTIFICATE: "Atestado", EXAM_REQUEST: "Solicitação de exame", SURGICAL_REPORT: "Relatório cirúrgico", DISCHARGE_SUMMARY: "Alta", VACCINATION_CARD: "Carteira de vacina", GENERAL: "Documento" } as any)[t || ""] || "Documento");
const COLOR = (k?: string) => (({ atendimento: "#2f80c4", PRESCRIPTION: "#9333ea", EXAM_REQUEST: "#e0556b", VACCINATION_CARD: "#e08a1e", ANAMNESIS: "#0f7a52", DIAGNOSIS: "#0f7a52", SURGICAL_REPORT: "#9b2c3a", DISCHARGE_SUMMARY: "#0f7a52", MEDICAL_CERTIFICATE: "#2e9e5b" } as any)[k || ""] || "#64748b");
const INITIALS = (n?: string) => ((n || "").split(" ").filter(Boolean).slice(0, 2).map((x: string) => x[0]).join("").toUpperCase() || "—");

export default function FeedTimeline({ atendimentos = [], clinDocs = [] }: { atendimentos?: any[]; clinDocs?: any[] }) {
  const items = useMemo(() => {
    const a = (atendimentos || []).map((x: any) => ({ id: "a" + x.id, kind: "atendimento", date: x.date, title: ATD_LBL(x.type), prof: x.user?.name, summary: x.chiefComplaint || "", status: x.status }));
    const d = (clinDocs || []).map((x: any) => ({ id: "d" + x.id, kind: x.type || "GENERAL", date: x.createdAt || x.appointment?.date, title: DOC_LBL(x.type), prof: x.user?.name, summary: x.title || "", status: "" }));
    return [...a, ...d].filter((i: any) => i.date).sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [atendimentos, clinDocs]);

  if (items.length === 0) return <div className="text-sm text-gray-400 py-6 text-center">Sem registros no histórico ainda.</div>;
  let lastYear = "";
  return (
    <div className="space-y-1">
      {items.map((it: any) => {
        const y = new Date(it.date).getFullYear().toString();
        const showYear = y !== lastYear; lastYear = y;
        return (
          <div key={it.id}>
            {showYear && <div className="text-[13px] font-bold mb-1 mt-2" style={{ color: "#009AAC" }}>{y}</div>}
            <div className="flex gap-3 py-2 border-b" style={{ borderColor: "#F0EAD8" }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0" style={{ background: COLOR(it.kind) }}><LuClock size={15} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold" style={{ color: "#0E2244" }}>{it.title}{it.status ? ` · ${it.status}` : ""}</span>
                  <span className="text-[11px] text-gray-400 shrink-0">{new Date(it.date).toLocaleDateString("pt-BR")}</span>
                </div>
                {it.summary ? <div className="text-[12px] text-gray-500 truncate">{it.summary}</div> : null}
              </div>
              <div className="w-6 h-6 rounded-full bg-gray-100 text-[10px] font-bold flex items-center justify-center shrink-0" style={{ color: "#014D5E" }} title={it.prof || ""}>{INITIALS(it.prof)}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
