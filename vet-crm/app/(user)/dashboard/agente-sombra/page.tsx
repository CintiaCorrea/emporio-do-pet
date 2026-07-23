"use client";
// 👻 Agente Sombra (Fase 1 — treino). Ele lê as conversas do WhatsApp e escreve a
// resposta que daria (com preço/dados REAIS do sistema) — mas NUNCA envia nada.
// Aqui a administração compara com a resposta da equipe e avalia (👍/👎/corrige):
// é esse feedback que treina o futuro agente.
// TRAVAS DE FERRO (no prompt do backend): nunca diagnóstico/tratamento/medicação;
// nunca inventa preço.
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import toast from "react-hot-toast";

type Item = {
  id: string;
  conversationId?: string;
  contato?: string;
  clienteMsg?: string;
  sugestao?: string;
  at?: string;
  feedback?: "boa" | "ruim" | null;
  correcao?: string | null;
  equipeRespondeu?: string | null;
};

export default function AgenteSombraPage() {
  usePageTitle("👻 Agente Sombra", "Treino do futuro atendente — ele sugere, você avalia, nada é enviado");
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [itens, setItens] = useState<Item[]>([]);
  const [cfgAtivo, setCfgAtivo] = useState(false);
  const [cfgId, setCfgId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<"avaliar" | "equipe" | "todas">("avaliar");
  const [corrigindo, setCorrigindo] = useState<string | null>(null);
  const [correcaoTxt, setCorrecaoTxt] = useState("");
  const [mexendo, setMexendo] = useState("");
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [f, c] = await Promise.all([
        fetch("/api/whatsapp/ghost-sombra", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=config_ghost_sombra", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setItens(Array.isArray(f) ? f : []);
      const cArr = Array.isArray(c) ? c : (c.itens || c.data || []);
      if (cArr[0]) { setCfgId(cArr[0].id); try { setCfgAtivo(!!JSON.parse(cArr[0].valor).ativo); } catch {} }
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
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: "config_ghost_sombra", valor }) });
      setCfgAtivo(novo);
      toast.success(novo ? "Modo sombra LIGADO — vai gerar sugestões nas próximas conversas 👻" : "Modo sombra desligado.");
      if (!cfgId) load();
    } catch { toast.error("Erro ao salvar."); }
    finally { setMexendo(""); }
  };

  const salvarFeedback = async (it: Item, feedback: "boa" | "ruim", correcao?: string) => {
    setMexendo(it.id);
    try {
      // Regrava o item SEM o campo derivado equipeRespondeu (vem do feed, não é dado salvo).
      const { id, equipeRespondeu, ...dados } = it;
      const valor = JSON.stringify({ ...dados, feedback, correcao: correcao ?? dados.correcao ?? null, feedbackAt: new Date().toISOString() });
      const r = await fetch(`/api/listas/${it.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      if (!r.ok) throw new Error();
      toast.success(feedback === "boa" ? "Avaliada: 👍" : correcao ? "Correção salva — ele aprende com isso ✏️" : "Avaliada: 👎");
      setCorrigindo(null); setCorrecaoTxt("");
      load();
    } catch { toast.error("Erro ao salvar avaliação."); }
    finally { setMexendo(""); }
  };

  if (role && role !== "ADMIN") {
    return <div className="p-8 text-center text-[13px] text-[#5C6B70]">👻 O Agente Sombra é visível só para administradores.</div>;
  }

  const hojeStr = new Date().toDateString();
  const deHoje = itens.filter((i) => i.at && new Date(i.at).toDateString() === hojeStr);
  const comFeedback = itens.filter((i) => i.feedback);
  const boas = comFeedback.filter((i) => i.feedback === "boa").length;
  const pctAprovadas = comFeedback.length ? Math.round((boas / comFeedback.length) * 100) : null;
  const aAvaliar = itens.filter((i) => !i.feedback);

  const visiveis = itens.filter((i) => {
    if (filtro === "avaliar") return !i.feedback;
    if (filtro === "equipe") return !!i.equipeRespondeu;
    return true;
  });

  const fmtQuando = (at?: string) => {
    if (!at) return "";
    const d = new Date(at);
    const hoje = d.toDateString() === hojeStr;
    return `${hoje ? "hoje" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* topo: interruptor + números */}
      <div className="bg-white border rounded-[13px] px-4 py-3.5 flex items-center justify-between gap-3 flex-wrap mb-4" style={{ borderColor: "#E8E2D6" }}>
        <div className="flex items-center gap-3">
          <button onClick={toggleAtivo} disabled={mexendo === "toggle"} className="w-11 h-6 rounded-full relative transition-colors flex-shrink-0" style={{ background: cfgAtivo ? "#009AAC" : "#D6D0C4" }}>
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all" style={{ left: cfgAtivo ? 22 : 2 }} />
          </button>
          <div>
            <div className="text-[13.5px] font-medium text-[#1F2A2E]">Modo sombra {cfgAtivo ? "ligado" : "desligado"}</div>
            <div className="text-[11px] text-[#5C6B70]">Gera sugestões nas conversas — <b>nunca envia nada</b> ao cliente</div>
          </div>
        </div>
        <div className="flex gap-5 text-[11.5px] text-[#5C6B70]">
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{deHoje.length}</div>sugestões hoje</div>
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{pctAprovadas === null ? "—" : `${pctAprovadas}%`}</div>aprovadas</div>
          <div className="text-center"><div className="text-[16px] font-semibold text-[#014D5E]">{aAvaliar.length}</div>a avaliar</div>
        </div>
      </div>

      {/* filtros */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {([["avaliar", `A avaliar (${aAvaliar.length})`], ["equipe", "Com resposta da equipe"], ["todas", "Todas"]] as const).map(([k, lbl]) => (
          <button key={k} onClick={() => setFiltro(k)} className="text-[12px] px-3 py-1.5 rounded-full border" style={filtro === k ? { background: "#009AAC", color: "#fff", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>{lbl}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-14 text-center text-[13px] text-[#5C6B70]">Carregando…</div>
      ) : visiveis.length === 0 ? (
        <div className="bg-white border rounded-[13px] py-12 text-center text-[13px] text-[#5C6B70]" style={{ borderColor: "#E8E2D6" }}>
          {itens.length === 0
            ? (cfgAtivo ? "👻 Ligado e escutando — as sugestões aparecem aqui conforme os clientes escreverem." : "Ligue o modo sombra ali em cima pra ele começar a treinar. 👆")
            : "Nada neste filtro. ✨"}
        </div>
      ) : (
        visiveis.map((it) => (
          <div key={it.id} className="bg-white border rounded-[13px] p-4 mb-3" style={{ borderColor: "#E8E2D6", opacity: it.feedback ? 0.72 : 1 }}>
            <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#5C6B70] mb-2">
              <span className="font-medium text-[#014D5E]">{it.contato || "Contato"}</span>
              <span>{fmtQuando(it.at)}{it.equipeRespondeu ? " · 👩‍⚕️ equipe respondeu" : ""}</span>
            </div>

            <div className="text-[10px] uppercase tracking-wide text-[#5C6B70] font-semibold mb-0.5">💬 Cliente</div>
            <div className="rounded-[10px] px-3 py-2 text-[13px] mb-2" style={{ background: "#F0EBE0" }}>{it.clienteMsg}</div>

            <div className="text-[10px] uppercase tracking-wide text-[#5C6B70] font-semibold mb-0.5">👻 O sombra responderia</div>
            <div className="rounded-[10px] px-3 py-2 text-[13px] mb-2 whitespace-pre-wrap" style={{ background: "#E0F4F6", borderLeft: "3px solid #009AAC" }}>{it.sugestao}</div>

            {it.equipeRespondeu ? (
              <>
                <div className="text-[10px] uppercase tracking-wide text-[#5C6B70] font-semibold mb-0.5">👩‍⚕️ A equipe respondeu</div>
                <div className="rounded-[10px] px-3 py-2 text-[13px] mb-2 whitespace-pre-wrap" style={{ background: "#E1F5EE", borderLeft: "3px solid #0F6E56" }}>{it.equipeRespondeu}</div>
              </>
            ) : (
              <div className="rounded-[10px] px-3 py-1.5 text-[12px] italic mb-2" style={{ background: "#FDF4DD", color: "#8a6400" }}>⏳ Equipe ainda não respondeu — compare depois</div>
            )}

            {it.feedback ? (
              <div className="text-[12px] font-medium" style={{ color: it.feedback === "boa" ? "#0F6E56" : "#CC3366" }}>
                ✔ Avaliada: {it.feedback === "boa" ? "👍 Boa" : "👎 Ruim"}{it.correcao ? ` · correção salva ✏️` : ""}
              </div>
            ) : corrigindo === it.id ? (
              <div className="mt-1">
                <textarea value={correcaoTxt} onChange={(e) => setCorrecaoTxt(e.target.value)} rows={3} placeholder="Escreva como VOCÊ responderia — ele aprende com isso…" className="w-full border rounded-lg px-3 py-2 text-[13px] resize-y focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => correcaoTxt.trim() && salvarFeedback(it, "ruim", correcaoTxt.trim())} disabled={!correcaoTxt.trim() || mexendo === it.id} className="text-[12px] text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg disabled:opacity-50">Salvar correção</button>
                  <button onClick={() => { setCorrigindo(null); setCorrecaoTxt(""); }} className="text-[12px] text-[#5C6B70] bg-white border px-3.5 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 mt-1">
                <button onClick={() => salvarFeedback(it, "boa")} disabled={mexendo === it.id} className="text-[12px] px-3.5 py-1.5 rounded-lg border disabled:opacity-50" style={{ color: "#0F6E56", borderColor: "#bfe0d2", background: "#fff" }}>👍 Boa</button>
                <button onClick={() => salvarFeedback(it, "ruim")} disabled={mexendo === it.id} className="text-[12px] px-3.5 py-1.5 rounded-lg border disabled:opacity-50" style={{ color: "#CC3366", borderColor: "#f4bacf", background: "#fff" }}>👎 Ruim</button>
                <button onClick={() => { setCorrigindo(it.id); setCorrecaoTxt(""); }} className="text-[12px] px-3.5 py-1.5 rounded-lg border" style={{ color: "#014D5E", borderColor: "#E8E2D6", background: "#fff" }}>✏️ Corrigir a sugestão</button>
              </div>
            )}
          </div>
        ))
      )}

      <div className="text-[11px] text-[#5C6B70] text-center mt-4 mb-2">
        🔒 Travas de ferro: o agente nunca dá diagnóstico, tratamento ou medicação (passa pra equipe) e nunca inventa preço.
      </div>
    </div>
  );
}
