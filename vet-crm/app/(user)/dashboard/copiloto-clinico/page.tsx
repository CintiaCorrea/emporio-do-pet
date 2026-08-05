"use client";
// 🩺 Copiloto Clínico (Fase 1 — modo sombra). Depois que a consulta é gravada, transcrita e
// analisada, a IA gera sugestões AO VETERINÁRIO (diferenciais, o que faltou perguntar,
// red-flags) e o rascunho de prontuário — mas NUNCA age, NUNCA fala com o tutor, NUNCA
// prescreve. Aqui a gestão (Cintia + Vivian) avalia 👍/👎/✏️ — é esse feedback que, na
// Fatia 3, vira o "repertório" da clínica. Espelho do 👻 Agente Sombra do WhatsApp.
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

type Item = {
  id: string;
  recordingId?: string;
  appointmentId?: string;
  petNome?: string | null;
  petInfo?: string | null;
  tutorNome?: string | null;
  vetNome?: string | null;
  prontuarioSugerido?: string | null;
  diagnostico?: string | null;
  diferenciais?: string[];
  perguntasFaltaram?: string[];
  redFlags?: string[];
  refsUsados?: number;
  at?: string;
  feedback?: "boa" | "ruim" | null;
  correcao?: string | null;
};

export default function CopilotoClinicoPage() {
  usePageTitle("🩺 Copiloto Clínico", "Ele sugere ao veterinário e aprende — nunca fala com o tutor, nunca prescreve");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [itens, setItens] = useState<Item[]>([]);
  const [cfgAtivo, setCfgAtivo] = useState(false);
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"avaliar" | "aprovadas" | "todas">("avaliar");
  const [corrigindo, setCorrigindo] = useState<string | null>(null);
  const [correcaoTxt, setCorrecaoTxt] = useState("");
  const [mexendo, setMexendo] = useState("");
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  const [rep, setRep] = useState<{ simplesvet: number; aprovados: number; total: number } | null>(null);
  const jaCarregou = useRef(false);

  const parseItens = (arr: any[]): Item[] =>
    arr
      .map((it) => {
        try { return { id: it.id, ...JSON.parse(it.valor) } as Item; } catch { return null; }
      })
      .filter(Boolean) as Item[];

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [f, c] = await Promise.all([
        fetch("/api/listas?lista=ghost_clinico", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=config_ghost_clinico", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      const fArr = Array.isArray(f) ? f : (f.itens || f.data || []);
      const lista = parseItens(fArr).sort((a, b) => (b.at || "").localeCompare(a.at || ""));
      setItens(lista);
      const cArr = Array.isArray(c) ? c : (c.itens || c.data || []);
      if (cArr[0]) { setCfgId(cArr[0].id); try { setCfgAtivo(!!JSON.parse(cArr[0].valor).ativo); } catch {} }
      fetch("/api/consultation-recordings/repertorio/stats", { cache: "no-store" })
        .then((r) => r.json()).then((s) => { if (s && typeof s.total === "number") setRep(s); }).catch(() => {});
    } catch {}
    jaCarregou.current = true;
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleAtivo = async () => {
    const novo = !cfgAtivo;
    setMexendo("toggle");
    try {
      const valor = JSON.stringify({ ativo: novo });
      if (cfgId) await fetch(`/api/listas/${cfgId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "config_ghost_clinico", valor }) });
      setCfgAtivo(novo);
      toast.success(novo ? "Copiloto LIGADO — vai analisar as próximas consultas em silêncio 🩺" : "Copiloto desligado.");
      if (!cfgId) load();
    } catch { toast.error("Erro ao salvar."); }
    finally { setMexendo(""); }
  };

  const salvarFeedback = async (it: Item, feedback: "boa" | "ruim", correcao?: string) => {
    setMexendo(it.id);
    try {
      const { id, ...dados } = it;
      const valor = JSON.stringify({ ...dados, feedback, correcao: correcao ?? dados.correcao ?? null, feedbackAt: new Date().toISOString() });
      const r = await fetch(`/api/listas/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      if (!r.ok) throw new Error();
      toast.success(feedback === "boa" ? "Aprovada 👍 — vira referência no repertório" : correcao ? "Correção salva — ele aprende com isso ✏️" : "Descartada 👎");
      setCorrigindo(null); setCorrecaoTxt("");
      load();
    } catch { toast.error("Erro ao salvar avaliação."); }
    finally { setMexendo(""); }
  };

  if (role && role !== "ADMIN") {
    return <div className="p-8 text-center text-[13px] text-[#5C6B70]">🩺 O Copiloto Clínico é visível só para a gestão.</div>;
  }

  const hojeStr = new Date().toDateString();
  const deHoje = itens.filter((i) => i.at && new Date(i.at).toDateString() === hojeStr);
  const comFeedback = itens.filter((i) => i.feedback);
  const boas = comFeedback.filter((i) => i.feedback === "boa").length;
  const pctAprovadas = comFeedback.length ? Math.round((boas / comFeedback.length) * 100) : null;
  const aAvaliar = itens.filter((i) => !i.feedback);

  const visiveis = itens.filter((i) => {
    if (filtro === "avaliar") return !i.feedback;
    if (filtro === "aprovadas") return i.feedback === "boa";
    return true;
  });

  const fmtQuando = (at?: string) => {
    if (!at) return "";
    const d = new Date(at);
    const hoje = d.toDateString() === hojeStr;
    return `${hoje ? "hoje" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const especie = (info?: string | null) => {
    const s = (info || "").toLowerCase();
    if (s.includes("felin") || s.includes("gat")) return "🐱";
    if (s.includes("can") || s.includes("cã") || s.includes("cachorr") || s.includes("dog")) return "🐶";
    return "🐾";
  };

  const Lista = ({ titulo, cor, itens: arr }: { titulo: string; cor: string; itens?: string[] }) =>
    arr && arr.length > 0 ? (
      <div className="mb-2">
        <div className="text-[11px] font-semibold mb-0.5" style={{ color: cor }}>{titulo}</div>
        <ul className="list-disc list-inside text-[12.5px] text-[#1F2A2E] space-y-0.5">
          {arr.map((x, i) => <li key={i}>{x}</li>)}
        </ul>
      </div>
    ) : null;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* topo: interruptor + números */}
      <div className="bg-white border rounded-[13px] px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap mb-4" style={{ borderColor: "#E8E2D6" }}>
        <div className="flex items-center gap-3">
          <button onClick={toggleAtivo} disabled={mexendo === "toggle"} className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0" style={{ background: cfgAtivo ? "#009AAC" : "#D6D0C4" }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: cfgAtivo ? 22 : 2 }} />
          </button>
          <div>
            <div className="text-[13.5px] font-medium text-[#1F2A2E]">Copiloto {cfgAtivo ? "ligado" : "desligado"}</div>
            <div className="text-[11px] text-[#5C6B70]">Analisa consultas e sugere ao veterinário — <b>nunca fala com o tutor</b></div>
          </div>
        </div>
        <div className="flex gap-5 text-[11.5px] text-[#5C6B70]">
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{deHoje.length}</div>hoje</div>
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{pctAprovadas === null ? "—" : `${pctAprovadas}%`}</div>aprovadas</div>
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{aAvaliar.length}</div>a avaliar</div>
        </div>
      </div>

      {/* faixa do repertório da clínica */}
      {rep && rep.total > 0 && (
        <div className="rounded-[13px] px-4 py-3 mb-4 flex items-start gap-3" style={{ background: "linear-gradient(90deg,#E0F4F6,#F6F3EC)", border: "1px solid #E8E2D6", borderLeft: "4px solid #009AAC" }}>
          <span className="text-[20px] leading-none">🧠</span>
          <div>
            <div className="text-[13px] text-[#1F2A2E]">
              Repertório da clínica: <b className="text-[#014D5E]">{rep.total.toLocaleString("pt-BR")} casos de referência</b>
              <span className="text-[11.5px] text-[#5C6B70]"> — {rep.simplesvet.toLocaleString("pt-BR")} do histórico (SimplesVet) + {rep.aprovados.toLocaleString("pt-BR")} aprovados por vocês</span>
            </div>
            <div className="text-[11.5px] text-[#5C6B70]">O copiloto consulta esses casos (mesma espécie e tema) pra sugerir com a cara do Empório. Cada 👍 deixa ele mais afiado.</div>
          </div>
        </div>
      )}

      {/* filtros */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {([["avaliar", `A avaliar (${aAvaliar.length})`], ["aprovadas", `Aprovadas (${boas})`], ["todas", "Todas"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setFiltro(k)} className="text-[12px] px-3 py-1.5 rounded-full border" style={filtro === k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>{lbl}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-14 text-center text-[13px] text-[#5C6B70]">Carregando…</div>
      ) : visiveis.length === 0 ? (
        <div className="bg-white border rounded-[13px] py-12 text-center text-[13px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>
          {itens.length === 0
            ? (cfgAtivo ? "🩺 Ligado. As sugestões aparecem aqui depois que você gravar e analisar uma consulta." : "Ligue o copiloto ali em cima pra ele começar a treinar. 👆")
            : "Nada neste filtro. ✨"}
        </div>
      ) : (
        visiveis.map((it) => {
          const temCopiloto = (it.diferenciais?.length || it.perguntasFaltaram?.length || it.redFlags?.length);
          const prOpen = aberto[it.id];
          return (
            <div key={it.id} className="bg-white border rounded-[13px] p-4 mb-3" style={{ borderColor: "#E8E2D6", opacity: it.feedback ? 0.75 : 1 }}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="flex items-center gap-2 text-[13.5px] font-medium text-[#014D5E]">
                  <span>{especie(it.petInfo)}</span>
                  {it.petNome || "Paciente"}
                  {it.petInfo ? <span className="text-[11.5px] font-normal text-[#5C6B70]">· {it.petInfo}</span> : null}
                </span>
                <span className="text-[11px] text-[#5C6B70]">{fmtQuando(it.at)}</span>
              </div>
              <div className="text-[11.5px] text-[#5C6B70] mb-2">
                {it.tutorNome ? `Tutor: ${it.tutorNome}` : ""}{it.tutorNome && it.vetNome ? " · " : ""}{it.vetNome ? `Vet: ${it.vetNome}` : ""}
              </div>

              {/* 🖊️ rascunho de prontuário (recolhível) */}
              {it.prontuarioSugerido && (
                <div className="mb-2">
                  <button onClick={() => setAberto((a) => ({ ...a, [it.id]: !a[it.id] }))} className="text-[11px] uppercase tracking-wide font-semibold text-[#014D5E] flex items-center gap-1">
                    🖊️ Rascunho de prontuário <span className="text-[#5C6B70]">{prOpen ? "▲ ocultar" : "▼ ver"}</span>
                  </button>
                  {prOpen && (
                    <div className="rounded-[10px] px-3 py-2 text-[12.5px] mt-1 whitespace-pre-wrap max-h-72 overflow-y-auto" style={{ background: "#F6F3EC" }}>{it.prontuarioSugerido}</div>
                  )}
                </div>
              )}

              {/* 🧠 copiloto sugere */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] uppercase tracking-wide text-[#5C6B70] font-semibold">🧠 Copiloto sugere ao veterinário</div>
                {it.refsUsados && it.refsUsados > 0 ? (
                  <span className="text-[10.5px] px-2 py-0.5 rounded-full" style={{ background: "#E0F4F6", color: "#00707E" }}>↩ baseado em {it.refsUsados} caso{it.refsUsados > 1 ? "s" : ""} da clínica</span>
                ) : null}
              </div>
              <div className="rounded-[10px] px-3 py-2.5 mb-2" style={{ background: "#E0F4F6", borderLeft: "3px solid #009AAC" }}>
                {temCopiloto ? (
                  <>
                    <Lista titulo="Diferenciais a considerar" cor="#014D5E" itens={it.diferenciais} />
                    <Lista titulo="Talvez tenha faltado registrar" cor="#8a6400" itens={it.perguntasFaltaram} />
                    {it.redFlags && it.redFlags.length > 0 && (
                      <div>
                        <div className="text-[11px] font-semibold mb-0.5" style={{ color: "#B91C1C" }}>⚠️ Red-flags</div>
                        <ul className="list-disc list-inside text-[12.5px] space-y-0.5" style={{ color: "#B91C1C" }}>
                          {it.redFlags.map((x, i) => <li key={i}>{x}</li>)}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-[12.5px] italic text-[#5C6B70]">Sem apontamentos — a consulta parece completa. 👌</div>
                )}
              </div>

              {/* avaliação */}
              {it.feedback ? (
                <div className="text-[12px] font-medium" style={{ color: it.feedback === "boa" ? "#0F6E56" : "#CC3366" }}>
                  ✔ {it.feedback === "boa" ? "👍 Aprovada (no repertório)" : "👎 Descartada"}{it.correcao ? ` · correção salva ✏️` : ""}
                </div>
              ) : corrigindo === it.id ? (
                <div className="mt-1">
                  <textarea value={correcaoTxt} onChange={(e) => setCorrecaoTxt(e.target.value)} rows={3} placeholder="Escreva o ajuste/observação — ele aprende com isso…" className="w-full border rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                  <div className="flex gap-2 mt-1.5">
                    <button onClick={() => correcaoTxt.trim() && salvarFeedback(it, "ruim", correcaoTxt.trim())} disabled={!correcaoTxt.trim() || mexendo === it.id} className="text-[12px] text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg disabled:opacity-50">Salvar correção</button>
                    <button onClick={() => { setCorrigindo(null); setCorrecaoTxt(""); }} className="text-[12px] text-[#5C6B70] bg-white border px-3.5 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-1 flex-wrap">
                  <button onClick={() => salvarFeedback(it, "boa")} disabled={mexendo === it.id} className="text-[12px] px-3.5 py-1.5 rounded-lg border disabled:opacity-50" style={{ color: "#0F6E56", borderColor: "#bfe0d2", background: "#fff" }}>👍 Aprovar (vira referência)</button>
                  <button onClick={() => salvarFeedback(it, "ruim")} disabled={mexendo === it.id} className="text-[12px] px-3.5 py-1.5 rounded-lg border disabled:opacity-50" style={{ color: "#CC3366", borderColor: "#f4bacf", background: "#fff" }}>👎 Descartar</button>
                  <button onClick={() => { setCorrigindo(it.id); setCorrecaoTxt(""); }} className="text-[12px] px-3.5 py-1.5 rounded-lg border" style={{ color: "#014D5E", borderColor: "#E8E2D6", background: "#fff" }}>✏️ Corrigir</button>
                </div>
              )}
            </div>
          );
        })
      )}

      <div className="text-[11px] text-[#5C6B70] text-center mt-4 mb-2">
        🔒 Travas de ferro: o copiloto nunca fala com o tutor, nunca prescreve nem indica dose por conta própria, e toda sugestão é revisada por um veterinário. Ele é apoio à decisão — quem decide e assina é sempre o profissional.
      </div>
    </div>
  );
}
