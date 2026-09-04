"use client";
import { useMemo, useState } from "react";
import { LuPencil, LuTrash2, LuCalendar, LuRotateCcw, LuStethoscope, LuActivity, LuSyringe, LuFileText, LuFlaskConical, LuVideo, LuPrinter } from "react-icons/lu";
import { imprimirDocumento } from "@/lib/print";
import { corDoTipo } from "@/lib/coresProntuario";
import { entraNaLinhaDoTempo } from "@/lib/timelineClinica";

const ATD_LBL = (t?: string) => (({ CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação", EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação", SESSAO_FISIO: "Sessão de fisio", CIRURGIA: "Cirurgia", Receitas: "Receita", Documento: "Documento", Video: "Vídeo", OUTRO: "Outro" } as any)[t || ""] || t || "Atendimento");
const DOC_LBL = (t?: string) => (({ ANAMNESIS: "Anamnese", PRESCRIPTION: "Receita", DIAGNOSIS: "Diagnóstico", TUTOR_REPORT: "Relatório", MEDICAL_CERTIFICATE: "Atestado", EXAM_REQUEST: "Solicitação de exame", SURGICAL_REPORT: "Relatório cirúrgico", DISCHARGE_SUMMARY: "Alta", VACCINATION_CARD: "Carteira de vacina", GENERAL: "Documento" } as any)[t || ""] || "Documento");
// Cor por tipo = FONTE ÚNICA (lib/coresProntuario). MESMA cor no botão que cria e no card — não diverge mais por fonte.
const COLOR = corDoTipo;
const TIPO_HIST = (t?: string) => (({ ATENDIMENTO: "Atendimento", PESO: "Peso", RECEITA: "Receita", OBSERVACAO: "Observação", EXAME: "Exame", VACINA: "Vacina" } as any)[t || ""] || t || "Registro");
const stripHtml = (s?: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
// Texto legível de uma receita (HTML às vezes duplo-escapado, ex.: &amp;nbsp;) — 2 passadas.
const limparReceita = (s?: string) => {
  if (!s) return "";
  let t = String(s);
  for (let i = 0; i < 2; i++) t = t.replace(/&nbsp;/gi, " ").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&");
  t = t.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n").replace(/<li[^>]*>/gi, "• ").replace(/<[^>]+>/g, "");
  return t.replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
};
const textoReceitaDe = (it: any): string => limparReceita(it?.raw?.texto || it?.raw?.prescription || it?.raw?.htmlContent || it?.raw?.content || "");
// HTML da receita (mantém formatação) — decodifica entidades (às vezes duplo-escapadas) sem tirar as tags.
const htmlReceitaDe = (it: any): string => {
  let s = String(it?.raw?.htmlContent || it?.raw?.texto || it?.raw?.prescription || it?.raw?.content || "");
  for (let i = 0; i < 2; i++) s = s.replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&amp;/gi, "&");
  // se não tiver tag nenhuma, preserva quebras de linha
  return /<[a-z][\s\S]*>/i.test(s) ? s : `<pre>${s.replace(/[&<>]/g, (c) => (({ "&": "&amp;", "<": "&lt;", ">": "&gt;" } as any)[c]))}</pre>`;
};
// Imprime a receita no PAPEL TIMBRADO da clínica (cabeçalho + QUADRO do pet/tutor),
// mesmo motor dos documentos do sistema.
function imprimirReceita(it: any, pet?: any, tutor?: any) {
  const dt = new Date(it.date).toLocaleDateString("pt-BR");
  const corpo = `<h3 style="margin-top:14px">Receita</h3><div style="color:#6b7280;font-size:12px;margin:-2px 0 12px">${dt}</div>${htmlReceitaDe(it)}`;
  void imprimirDocumento("Receita", corpo, undefined, { pet, tutor: tutor || pet?.tutor });
}
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

export default function FeedTimeline({ atendimentos = [], clinDocs = [], historico = [], exames = [], pet, tutor, onEditar, onExcluir, onDetalhe }: { atendimentos?: any[]; clinDocs?: any[]; historico?: any[]; exames?: any[]; pet?: any; tutor?: any; onEditar?: (it: any) => void; onExcluir?: (it: any) => void; onDetalhe?: (id: string) => void }) {
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
    // Receita/Documento viram clinical-document (aba de documentos). Pra não duplicar na timeline,
    // pula o Appointment que já tem um clinical-document ligado a ele.
    const docApptIds = new Set((clinDocs || []).map((x: any) => x.appointmentId).filter(Boolean));
    // A linha do tempo é SÓ clínica: fora VENDA (→ aba Compras) e AGENDAMENTO (→ aba Agenda: agendado/
    // confirmado/remarcado/cancelado/bloqueada/programada/faltou). Ficam só os atendimentos realizados.
    // Quem decide se o atendimento entra e o nucleo lib/timelineClinica. Antes era uma
    // expressao unica aqui, e ela escondia "Compareceu" junto com "Nao compareceu" —
    // foi assim que a avaliacao de fisioterapia sumiu da ficha do Snoopy em 04/09/2026.
    const a = (atendimentos || []).filter((x: any) => !docApptIds.has(x.id) && x.type !== "Resultado de exames" && x.type !== "Venda" && entraNaLinhaDoTempo(x)).map((x: any) => ({ id: "a" + x.id, src: "atd", raw: x, rawId: x.id, kind: x.type, cat: x.type === "VACINACAO" ? "VACINA" : (x.type === "Receitas" ? "RECEITA" : (x.type === "Documento" ? "DOCUMENTO" : "ATENDIMENTO")), date: x.date, title: ATD_LBL(x.type), prof: x.user?.name, summary: x.chiefComplaint || stripHtml(x.prescription || ""), status: x.status }));
    const d = (clinDocs || []).map((x: any) => ({ id: "d" + x.id, src: "doc", raw: x, rawId: x.id, kind: x.type || "GENERAL", cat: x.type === "PRESCRIPTION" ? "RECEITA" : "DOCUMENTO", date: x.createdAt || x.appointment?.date, title: DOC_LBL(x.type), prof: x.user?.name, summary: x.title || "", status: "", arquivoUrl: x.pdfUrl || x.fileUrl || null, temArquivo: !!(x.pdfUrl || x.fileUrl) }));
    // Histórico importado do SimplesVet (só-leitura)
    const h = (historico || []).map((x: any) => ({ id: "h" + x.id, src: "hist", raw: x, rawId: x.id, kind: x.tipo, cat: x.tipo, date: x.data, title: x.titulo || TIPO_HIST(x.tipo), prof: x.autor, summary: x.resumo || stripHtml(x.texto).slice(0, 140), status: "", imported: x.origem !== "MANUAL", temArquivo: !!x.temArquivo }));
    // 🔬 Exames (lista petexa_) — aparecem no histórico ALÉM da aba própria (pra não "sumirem")
    const e = (exames || []).map((x: any) => { const u = x.data?.resultadoUrl || null; return { id: "e" + x.id, src: "exame", raw: x, rawId: x.id, kind: "EXAME", cat: "EXAME", date: x.data?.date || x.createdAt || new Date().toISOString(), title: "Exame · " + (x.data?.nome || "Exame"), prof: x.data?.por, summary: (x.data?.status ? x.data.status : "Solicitado") + (x.data?.externo ? " · externo" : ""), status: x.data?.status || "", arquivoUrl: u, temArquivo: !!u }; });
    return [...a, ...d, ...h, ...e].filter((i: any) => i.date).sort((x: any, y: any) => new Date(y.date).getTime() - new Date(x.date).getTime());
  }, [atendimentos, clinDocs, historico, exames]);

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
                <div onClick={() => {
                  // Importado do SimplesVet (hist) → baixa do storage privado; anexado (doc) → abre a URL do PDF.
                  if (it.src === "hist" && it.temArquivo) return void window.open(`/api/pets/historico/${it.rawId}/arquivo`, "_blank");
                  if ((it.src === "doc" || it.src === "exame") && it.arquivoUrl) return void window.open(`/api/media/ver?u=${encodeURIComponent(it.arquivoUrl)}`, "_blank");
                  if (it.src === "hist" && onDetalhe) return void onDetalhe(it.rawId);
                  // Documento/receita feito no sistema (sem PDF) ou atendimento → abre na CAIXA DE EDIÇÃO
                  if (onEditar && (it.src === "atd" || (it.src === "doc" && !it.temArquivo))) return void onEditar(it);
                }} className="group flex gap-2.5 py-2 pl-2.5 pr-2 rounded-r-lg" style={{ borderLeft: `3px solid ${cor}`, background: "#f6fdfd", cursor: (it.temArquivo || it.src === "hist" || (onEditar && (it.src === "atd" || (it.src === "doc" && !it.temArquivo)))) ? "pointer" : undefined }}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-semibold" style={{ color: cor }}>{FMT(it.date)}</div>
                    <div className="text-[13px] font-semibold flex items-center gap-1.5" style={{ color: "#0E2244" }}><span>{it.title}{it.status ? ` · ${it.status}` : ""}</span>{it.imported ? <span className="text-[8.5px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#F3ECDD", color: "#8A6D3B" }}>SimplesVet</span> : null}{it.temArquivo ? <span title="Abrir PDF" style={{ fontSize: "12px" }}>📎</span> : null}</div>
                    {it.summary ? <div className="text-[12px] text-gray-500 truncate">{it.summary}</div> : null}
                  </div>
                  <div className="flex items-start gap-1 opacity-0 group-hover:opacity-100 transition">
                    {it.cat === "RECEITA" && textoReceitaDe(it) ? <button onClick={(e) => { e.stopPropagation(); imprimirReceita(it, pet, tutor); }} title="Imprimir receita (timbrado)" className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#009AAC] hover:bg-white"><LuPrinter size={13} /></button> : null}
                    {onEditar && (it.src === "atd" || (it.src === "doc" && !it.temArquivo)) ? <button onClick={(e) => { e.stopPropagation(); onEditar(it); }} title="Editar" className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#009AAC] hover:bg-white"><LuPencil size={13} /></button> : null}
                    {onExcluir && it.src !== "hist" ? <button onClick={(e) => { e.stopPropagation(); onExcluir(it); }} title="Excluir" className="w-6 h-6 rounded flex items-center justify-center text-gray-400 hover:text-[#E24B4A] hover:bg-white"><LuTrash2 size={13} /></button> : null}
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
