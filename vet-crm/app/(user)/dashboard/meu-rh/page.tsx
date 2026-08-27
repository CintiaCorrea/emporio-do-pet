"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Doc = { id: string; userId: string; tipo: string; nome: string; url: string; observacao?: string | null; status: string; createdAt: string; funcionarioNome?: string; funcionarioCargo?: string };
type Perfil = { nome: string; iniciais: string; cargo: string; dataInicio: string | null; email: string; admin: boolean };

const TIPOS = ["Atestado", "Contrato", "Holerite", "Documentos pessoais", "Comprovante", "Outros"];
const SOL_TIPOS = ["Férias", "Adiantamento", "Folga", "Troca de escala", "Outro"];
const SOL_ICO: Record<string, string> = { "Férias": "🏖️", "Adiantamento": "💵", "Folga": "🛋️", "Troca de escala": "🔄", "Outro": "📨" };
const CARGO_LABEL: Record<string, string> = { VETERINARIO: "Veterinário", RECEPCIONISTA: "Recepção", ESTAGIARIO: "Estagiário", GERENTE: "Gerente", ADMIN: "Administração", OUTRO: "Equipe" };
const ICO: Record<string, string> = { Atestado: "🩺", Contrato: "📄", Holerite: "💵", "Documentos pessoais": "🆔", Comprovante: "🧾", Outros: "📎" };
const dt = (s: string) => { try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return ""; } };

function StatusBadge({ s }: { s: string }) {
  const map: Record<string, { t: string; bg: string; c: string }> = {
    ENVIADO: { t: "Enviado", bg: "#FBF3DD", c: "#8a6400" },
    VISTO: { t: "Visto", bg: "#E8F6F7", c: "#00798A" },
    APROVADO: { t: "Aprovado", bg: "#E7F6EF", c: "#0F9D6E" },
  };
  const m = map[s] || map.ENVIADO;
  return <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full uppercase tracking-wide whitespace-nowrap" style={{ background: m.bg, color: m.c }}>{m.t}</span>;
}
function SolBadge({ s }: { s: string }) {
  const map: Record<string, { t: string; bg: string; c: string }> = {
    PENDENTE: { t: "Pendente", bg: "#FBF3DD", c: "#8a6400" },
    APROVADA: { t: "Aprovada", bg: "#E7F6EF", c: "#0F9D6E" },
    NEGADA: { t: "Não aprovada", bg: "#FBE9E7", c: "#C0392B" },
  };
  const m = map[s] || map.PENDENTE;
  return <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full uppercase tracking-wide whitespace-nowrap" style={{ background: m.bg, color: m.c }}>{m.t}</span>;
}

export default function MeuRhPage() {
  usePageTitle("Meu RH", "Documentos, atestados e comunicação com a empresa");
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id || "";
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [meus, setMeus] = useState<Doc[]>([]);
  const [equipe, setEquipe] = useState<Doc[]>([]);
  const [tipo, setTipo] = useState("Atestado");
  const [obs, setObs] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [filtro, setFiltro] = useState<string>("TODOS");
  const fileRef = useRef<HTMLInputElement>(null);
  // Solicitações (Fatia 2)
  const [solic, setSolic] = useState<Doc[] & any[]>([] as any);
  const [solTipo, setSolTipo] = useState("Férias");
  const [solTexto, setSolTexto] = useState("");
  const [enviandoSolic, setEnviandoSolic] = useState(false);
  const [respDraft, setRespDraft] = useState<Record<string, string>>({});
  // Comunicados (Fatia 3)
  const [comunicados, setComunicados] = useState<any[]>([]);
  const [comTitulo, setComTitulo] = useState("");
  const [comTexto, setComTexto] = useState("");
  const [comTarget, setComTarget] = useState("");
  const [publicando, setPublicando] = useState(false);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [envUser, setEnvUser] = useState("");
  const [envTipo, setEnvTipo] = useState("Holerite");
  const [envFile, setEnvFile] = useState<File | null>(null);
  const [envObs, setEnvObs] = useState("");
  const [envEnviando, setEnvEnviando] = useState(false);
  const envRef = useRef<HTMLInputElement>(null);

  async function loadPerfil() { try { const r = await fetch("/api/rh/perfil", { cache: "no-store" }); if (r.ok) setPerfil(await r.json()); } catch {} }
  async function loadMeus() { if (!meId) return; try { const r = await fetch(`/api/rh/documentos?userId=${meId}`, { cache: "no-store" }); const d = await r.json(); setMeus(Array.isArray(d) ? d : []); } catch {} }
  async function loadEquipe() { try { const r = await fetch("/api/rh/documentos", { cache: "no-store" }); const d = await r.json(); setEquipe(Array.isArray(d) ? d : []); } catch {} }

  useEffect(() => { loadPerfil(); /* eslint-disable-next-line */ }, []);
  useEffect(() => { if (meId) loadMeus(); /* eslint-disable-next-line */ }, [meId]);
  useEffect(() => { if (perfil?.admin) loadEquipe(); /* eslint-disable-next-line */ }, [perfil?.admin]);

  async function enviar() {
    if (!arquivo) { toast.error("Escolha o arquivo do documento."); return; }
    setEnviando(true);
    try {
      const fd = new FormData(); fd.append("file", arquivo);
      const ru = await fetch("/api/media/upload?pasta=rh&origem=funcionario", { method: "POST", body: fd });
      const up = await ru.json().catch(() => ({}));
      if (!ru.ok || !up?.url) throw new Error(up?.message || up?.error || "Falha ao subir o arquivo");
      const nome = up.filename || arquivo.name;
      const r = await fetch("/api/rh/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo, nome, url: up.url, observacao: obs.trim() || undefined }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Falha ao enviar"); }
      toast.success("Documento enviado ao RH ✅");
      setArquivo(null); setObs(""); if (fileRef.current) fileRef.current.value = "";
      await loadMeus(); if (perfil?.admin) await loadEquipe();
    } catch (e: any) { toast.error(String(e?.message || "Erro ao enviar").slice(0, 120)); }
    finally { setEnviando(false); }
  }
  async function marcar(id: string, status: string) {
    try { const r = await fetch(`/api/rh/documentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) }); if (!r.ok) throw new Error(); await loadEquipe(); await loadMeus(); } catch { toast.error("Não consegui atualizar."); }
  }
  async function remover(id: string) {
    if (!confirm("Remover este documento?")) return;
    try { const r = await fetch(`/api/rh/documentos/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); toast.success("Removido"); await loadMeus(); await loadEquipe(); } catch { toast.error("Não consegui remover."); }
  }

  // ---- Solicitações ----
  async function loadSolic() { try { const r = await fetch("/api/rh/solicitacoes", { cache: "no-store" }); const d = await r.json(); setSolic(Array.isArray(d) ? d : []); } catch {} }
  useEffect(() => { loadSolic(); /* eslint-disable-next-line */ }, [perfil?.admin]);
  async function enviarSolic() {
    if (!solTexto.trim()) { toast.error("Descreva a sua solicitação."); return; }
    setEnviandoSolic(true);
    try {
      const r = await fetch("/api/rh/solicitacoes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: solTipo, texto: solTexto.trim() }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e?.message || "Falha ao enviar"); }
      toast.success("Solicitação enviada ✅ — a empresa foi avisada");
      setSolTexto(""); await loadSolic();
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); }
    finally { setEnviandoSolic(false); }
  }
  async function responderSolic(id: string, status: string) {
    try { const r = await fetch(`/api/rh/solicitacoes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status, resposta: respDraft[id]?.trim() || undefined }) }); if (!r.ok) throw new Error(); toast.success(status === "APROVADA" ? "Aprovada ✅" : "Respondida"); setRespDraft((m) => { const n = { ...m }; delete n[id]; return n; }); await loadSolic(); } catch { toast.error("Não consegui responder."); }
  }
  async function cancelarSolic(id: string) {
    if (!confirm("Cancelar esta solicitação?")) return;
    try { const r = await fetch(`/api/rh/solicitacoes/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await loadSolic(); } catch { toast.error("Não consegui cancelar."); }
  }
  const minhasSolic = useMemo(() => (perfil?.admin ? (solic as any[]).filter((s) => s.userId === meId) : (solic as any[])), [solic, perfil?.admin, meId]);

  // ---- Comunicados ----
  async function loadComunicados() { try { const r = await fetch("/api/rh/comunicados", { cache: "no-store" }); const d = await r.json(); setComunicados(Array.isArray(d) ? d : []); } catch {} }
  useEffect(() => { loadComunicados(); if (perfil?.admin) fetch("/api/rh/funcionarios", { cache: "no-store" }).then(r => r.json()).then(d => setFuncionarios(Array.isArray(d) ? d : [])).catch(() => {}); /* eslint-disable-next-line */ }, [perfil?.admin]);
  async function publicarComunicado() {
    if (!comTitulo.trim() || !comTexto.trim()) { toast.error("Preencha título e texto."); return; }
    setPublicando(true);
    try { const r = await fetch("/api/rh/comunicados", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ titulo: comTitulo.trim(), texto: comTexto.trim(), targetUserId: comTarget || undefined }) }); if (!r.ok) throw new Error(); toast.success("Comunicado publicado ✅"); setComTitulo(""); setComTexto(""); setComTarget(""); await loadComunicados(); } catch { toast.error("Erro ao publicar."); } finally { setPublicando(false); }
  }
  async function confirmarLido(id: string) { try { const r = await fetch(`/api/rh/comunicados/${id}/lido`, { method: "POST" }); if (!r.ok) throw new Error(); await loadComunicados(); } catch { toast.error("Erro."); } }
  async function removerComunicado(id: string) { if (!confirm("Remover este comunicado?")) return; try { const r = await fetch(`/api/rh/comunicados/${id}`, { method: "DELETE" }); if (!r.ok) throw new Error(); await loadComunicados(); } catch {} }
  async function enviarDocParaFunc() {
    if (!envUser) { toast.error("Escolha o funcionário."); return; }
    if (!envFile) { toast.error("Escolha o arquivo."); return; }
    setEnvEnviando(true);
    try {
      const fd = new FormData(); fd.append("file", envFile);
      const ru = await fetch("/api/media/upload?pasta=rh&origem=holerite", { method: "POST", body: fd });
      const up = await ru.json().catch(() => ({}));
      if (!ru.ok || !up?.url) throw new Error("Falha ao subir o arquivo");
      const r = await fetch("/api/rh/documentos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: envTipo, nome: up.filename || envFile.name, url: up.url, observacao: envObs.trim() || undefined, userId: envUser }) });
      if (!r.ok) throw new Error("Falha ao enviar");
      toast.success("Documento enviado ao funcionário ✅");
      setEnvFile(null); setEnvObs(""); if (envRef.current) envRef.current.value = "";
      await loadEquipe();
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); }
    finally { setEnvEnviando(false); }
  }
  const comNaoLidos = useMemo(() => (perfil?.admin ? 0 : (comunicados as any[]).filter((c) => !c.lido).length), [comunicados, perfil?.admin]);

  const equipeFiltrada = useMemo(() => filtro === "TODOS" ? equipe : filtro === "NOVOS" ? equipe.filter(d => d.status === "ENVIADO") : equipe.filter(d => d.tipo === filtro), [equipe, filtro]);

  return (
    <div className="min-h-screen" style={{ background: "#EEF3F5" }}>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header perfil */}
        <div className="rounded-2xl p-5 text-white mb-5" style={{ background: "linear-gradient(160deg,#123063,#0D2048)" }}>
          <div className="text-[10.5px] font-extrabold tracking-widest uppercase" style={{ color: "#7FE3EE" }}>Empório do Pet</div>
          <h1 className="text-[24px] font-bold" style={{ fontFamily: "inherit" }}>Meu RH 🧑‍💼</h1>
          {perfil && (
            <div className="flex items-center gap-3 mt-3">
              <div className="w-11 h-11 rounded-full grid place-items-center font-extrabold" style={{ background: "#0C93A6" }}>{perfil.iniciais}</div>
              <div>
                <div className="font-bold text-[15px]">{perfil.nome}</div>
                <div className="text-[11.5px]" style={{ color: "#9FB6D6" }}>{CARGO_LABEL[perfil.cargo] || perfil.cargo}{perfil.dataInicio ? ` · desde ${new Date(perfil.dataInicio).toLocaleDateString("pt-BR")}` : ""}</div>
              </div>
            </div>
          )}
        </div>

        {/* Comunicados (funcionário lê e confirma) */}
        {perfil && !perfil.admin && comunicados.length > 0 && (
          <div className="mb-5">
            <h2 className="text-[15px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#0D2048" }}>📢 Comunicados {comNaoLidos > 0 && <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full" style={{ background: "#FBF3DD", color: "#8a6400" }}>{comNaoLidos} novo{comNaoLidos > 1 ? "s" : ""}</span>}</h2>
            {comunicados.map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl border px-4 py-3 mb-2" style={{ borderColor: c.lido ? "#E3EEF0" : "#F0C86B" }}>
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0"><div className="font-bold text-[14px] text-[#0D2048]">{c.titulo}</div><div className="text-[11px] text-[#5C7180]">{dt(c.createdAt)}</div></div>
                  {c.lido ? <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full" style={{ background: "#E7F6EF", color: "#0F9D6E" }}>✓ Ciente</span> : <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full" style={{ background: "#FBF3DD", color: "#8a6400" }}>Novo</span>}
                </div>
                <div className="text-[13px] text-[#374151] mt-1.5 whitespace-pre-wrap">{c.texto}</div>
                {!c.lido && <button onClick={() => confirmarLido(c.id)} className="mt-2 text-[12px] font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#0F9D6E" }}>✓ Li e estou ciente</button>}
              </div>
            ))}
          </div>
        )}

        {/* Enviar documento */}
        <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#E3EEF0" }}>
          <h2 className="text-[15px] font-bold mb-3" style={{ color: "#0D2048" }}>📎 Enviar documento</h2>
          <div className="grid gap-3">
            <div>
              <label className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180] block mb-1">Tipo</label>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <label className="border-2 border-dashed rounded-xl px-4 py-5 text-center cursor-pointer block" style={{ borderColor: "#8fd6df", background: "#E8F6F7", color: "#00798A" }}>
              <div className="text-[13.5px] font-bold">📄 {arquivo ? arquivo.name : "Toque para escolher o arquivo"}</div>
              <div className="text-[11px] text-[#5C7180] mt-0.5">PDF, foto ou documento — até 20&nbsp;MB</div>
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.doc,.docx" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
            </label>
            <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Observação (opcional)" className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }} />
            <button onClick={enviar} disabled={enviando} className="text-white rounded-xl py-2.5 font-bold text-[14.5px] disabled:opacity-50" style={{ background: "#009AAC" }}>{enviando ? "Enviando…" : "Enviar para o RH"}</button>
          </div>
        </div>

        {/* Meus documentos */}
        <div className="mb-6">
          <h2 className="text-[15px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#0D2048" }}>🗂️ Meus documentos</h2>
          {meus.length === 0 ? <div className="text-center text-[13px] text-gray-400 py-6 bg-white rounded-2xl border" style={{ borderColor: "#E3EEF0" }}>Nenhum documento enviado ainda.</div> :
            meus.map(d => (
              <div key={d.id} className="flex items-center gap-3 bg-white rounded-xl border px-3 py-2.5 mb-2" style={{ borderColor: "#E3EEF0" }}>
                <div className="w-9 h-9 rounded-lg grid place-items-center text-[16px] flex-shrink-0" style={{ background: "#EAF7F8" }}>{ICO[d.tipo] || "📎"}</div>
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0">
                  <div className="font-bold text-[13px] text-[#1B2A3A] truncate">{d.nome}</div>
                  <div className="text-[11px] text-[#5C7180]">{d.tipo} · {dt(d.createdAt)}{d.observacao ? ` · ${d.observacao}` : ""}</div>
                </a>
                <StatusBadge s={d.status} />
                {d.status === "ENVIADO" && <button onClick={() => remover(d.id)} className="text-[#b23b39] text-[13px]" title="Remover">🗑️</button>}
              </div>
            ))}
        </div>

        {/* Fazer uma solicitação */}
        <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#E3EEF0" }}>
          <h2 className="text-[15px] font-bold mb-3" style={{ color: "#0D2048" }}>📨 Fazer uma solicitação</h2>
          <div className="grid gap-3">
            <div>
              <label className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180] block mb-1">Tipo</label>
              <select value={solTipo} onChange={(e) => setSolTipo(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                {SOL_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea value={solTexto} onChange={(e) => setSolTexto(e.target.value)} rows={3} placeholder="Conte os detalhes (datas, motivo…) — ex.: Gostaria de tirar férias de 10 a 20/09" className="w-full border rounded-xl px-3 py-2 text-[14px] resize-none" style={{ borderColor: "#E3EEF0" }} />
            <button onClick={enviarSolic} disabled={enviandoSolic} className="text-white rounded-xl py-2.5 font-bold text-[14.5px] disabled:opacity-50" style={{ background: "#009AAC" }}>{enviandoSolic ? "Enviando…" : "Enviar solicitação"}</button>
          </div>
        </div>

        {/* Minhas solicitações */}
        <div className="mb-6">
          <h2 className="text-[15px] font-bold mb-2 flex items-center gap-1.5" style={{ color: "#0D2048" }}>📋 Minhas solicitações</h2>
          {minhasSolic.length === 0 ? <div className="text-center text-[13px] text-gray-400 py-6 bg-white rounded-2xl border" style={{ borderColor: "#E3EEF0" }}>Nenhuma solicitação ainda.</div> :
            minhasSolic.map((s: any) => (
              <div key={s.id} className="bg-white rounded-xl border px-3 py-2.5 mb-2" style={{ borderColor: "#E3EEF0" }}>
                <div className="flex items-center gap-2">
                  <span className="text-[16px]">{SOL_ICO[s.tipo] || "📨"}</span>
                  <div className="flex-1 min-w-0"><div className="font-bold text-[13.5px] text-[#1B2A3A]">{s.tipo}</div><div className="text-[11px] text-[#5C7180]">{dt(s.createdAt)}</div></div>
                  <SolBadge s={s.status} />
                  {s.status === "PENDENTE" && <button onClick={() => cancelarSolic(s.id)} className="text-[#b23b39] text-[13px]" title="Cancelar">🗑️</button>}
                </div>
                <div className="text-[12.5px] text-[#374151] mt-1.5">{s.texto}</div>
                {s.resposta && <div className="text-[12px] mt-1.5 rounded-lg px-2.5 py-1.5" style={{ background: "#EAF7F8", color: "#00798A" }}>💬 <b>Resposta:</b> {s.resposta}</div>}
              </div>
            ))}
        </div>

        {/* Admin: documentos da equipe */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: "#E3EEF0" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "#E3EEF0" }}>
              <h2 className="text-[16px] font-bold" style={{ color: "#0D2048" }}>🏢 RH · Documentos da equipe</h2>
              {equipe.filter(d => d.status === "ENVIADO").length > 0 && <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: "#FBF3DD", color: "#8a6400" }}>{equipe.filter(d => d.status === "ENVIADO").length} novos</span>}
              <div className="ml-auto flex gap-1.5 flex-wrap">
                {["TODOS", "NOVOS", "Atestado", "Holerite"].map(f => (
                  <button key={f} onClick={() => setFiltro(f)} className="text-[11.5px] font-bold rounded-full px-3 py-1 border" style={{ background: filtro === f ? "#009AAC" : "#fff", color: filtro === f ? "#fff" : "#5C7180", borderColor: filtro === f ? "#009AAC" : "#E3EEF0" }}>{f === "TODOS" ? "Todos" : f === "NOVOS" ? "Novos" : f}</button>
                ))}
              </div>
            </div>
            {equipeFiltrada.length === 0 ? <div className="text-center text-[13px] text-gray-400 py-8">Nenhum documento.</div> :
              equipeFiltrada.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: "#EEF3F5" }}>
                  <div className="w-9 h-9 rounded-full grid place-items-center text-white font-extrabold text-[13px] flex-shrink-0" style={{ background: "#0C93A6" }}>{(d.funcionarioNome || "?").split(/\s+/).map(x => x[0]).join("").slice(0, 2).toUpperCase()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-[14px] text-[#1B2A3A] truncate">{d.funcionarioNome} <span className="font-semibold text-[#5C7180] text-[12px]">· {CARGO_LABEL[d.funcionarioCargo || ""] || d.funcionarioCargo}</span></div>
                    <div className="text-[11.5px] text-[#5C7180] truncate">{ICO[d.tipo] || "📎"} <b>{d.nome}</b> · {d.tipo} · {dt(d.createdAt)}{d.observacao ? ` · ${d.observacao}` : ""}</div>
                  </div>
                  <StatusBadge s={d.status} />
                  <div className="flex gap-1.5 flex-shrink-0">
                    <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-[12px] font-bold border rounded-lg px-2.5 py-1.5 text-[#00798A]" style={{ borderColor: "#E3EEF0" }}>Abrir</a>
                    {d.status !== "APROVADO" && <button onClick={() => marcar(d.id, "VISTO")} className="text-[12px] font-bold rounded-lg px-2.5 py-1.5 text-white" style={{ background: "#0F9D6E" }}>✓ Visto</button>}
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Admin: solicitações da equipe */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border overflow-hidden mt-5" style={{ borderColor: "#E3EEF0" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "#E3EEF0" }}>
              <h2 className="text-[16px] font-bold" style={{ color: "#0D2048" }}>📨 RH · Solicitações da equipe</h2>
              {(solic as any[]).filter((s) => s.status === "PENDENTE").length > 0 && <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ background: "#FBF3DD", color: "#8a6400" }}>{(solic as any[]).filter((s) => s.status === "PENDENTE").length} pendentes</span>}
            </div>
            {(solic as any[]).length === 0 ? <div className="text-center text-[13px] text-gray-400 py-8">Nenhuma solicitação.</div> :
              (solic as any[]).map((s: any) => (
                <div key={s.id} className="px-5 py-3 border-b" style={{ borderColor: "#EEF3F5" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center text-white font-extrabold text-[13px] flex-shrink-0" style={{ background: "#0C93A6" }}>{(s.funcionarioNome || "?").split(/\s+/).map((x: string) => x[0]).join("").slice(0, 2).toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[14px] text-[#1B2A3A] truncate">{s.funcionarioNome} <span className="font-semibold text-[#5C7180] text-[12px]">· {SOL_ICO[s.tipo] || "📨"} {s.tipo}</span></div>
                      <div className="text-[12px] text-[#5C7180]">{dt(s.createdAt)}</div>
                    </div>
                    <SolBadge s={s.status} />
                  </div>
                  <div className="text-[12.5px] text-[#374151] mt-1.5 ml-12">{s.texto}</div>
                  {s.resposta && <div className="text-[12px] mt-1.5 ml-12 rounded-lg px-2.5 py-1.5" style={{ background: "#EAF7F8", color: "#00798A" }}>💬 {s.resposta}</div>}
                  {s.status === "PENDENTE" && (
                    <div className="ml-12 mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <input value={respDraft[s.id] || ""} onChange={(e) => setRespDraft((m) => ({ ...m, [s.id]: e.target.value }))} placeholder="Resposta (opcional)" className="flex-1 border rounded-lg px-2.5 py-1.5 text-[12.5px]" style={{ borderColor: "#E3EEF0" }} />
                      <div className="flex gap-1.5">
                        <button onClick={() => responderSolic(s.id, "APROVADA")} className="text-[12px] font-bold rounded-lg px-3 py-1.5 text-white" style={{ background: "#0F9D6E" }}>✅ Aprovar</button>
                        <button onClick={() => responderSolic(s.id, "NEGADA")} className="text-[12px] font-bold rounded-lg px-3 py-1.5 border" style={{ borderColor: "#E7C3C3", color: "#C0392B" }}>Negar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* Admin: publicar comunicado */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border p-5 mt-5" style={{ borderColor: "#E3EEF0" }}>
            <h2 className="text-[16px] font-bold mb-3" style={{ color: "#0D2048" }}>📢 Publicar comunicado</h2>
            <div className="grid gap-3">
              <input value={comTitulo} onChange={(e) => setComTitulo(e.target.value)} placeholder="Título" className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }} />
              <textarea value={comTexto} onChange={(e) => setComTexto(e.target.value)} rows={3} placeholder="Mensagem para a equipe…" className="w-full border rounded-xl px-3 py-2 text-[14px] resize-none" style={{ borderColor: "#E3EEF0" }} />
              <div>
                <label className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180] block mb-1">Para quem</label>
                <select value={comTarget} onChange={(e) => setComTarget(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                  <option value="">📣 Toda a equipe</option>
                  {funcionarios.map((f) => <option key={f.userId} value={f.userId}>{f.nome}</option>)}
                </select>
              </div>
              <button onClick={publicarComunicado} disabled={publicando} className="text-white rounded-xl py-2.5 font-bold text-[14.5px] disabled:opacity-50" style={{ background: "#009AAC" }}>{publicando ? "Publicando…" : "Publicar"}</button>
            </div>
            {comunicados.length > 0 && (
              <div className="mt-4">
                <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#5C7180] mb-1.5">Publicados</div>
                {comunicados.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 border-b py-2" style={{ borderColor: "#EEF3F5" }}>
                    <div className="flex-1 min-w-0"><div className="font-bold text-[13px] text-[#0D2048] truncate">{c.titulo}</div><div className="text-[11px] text-[#5C7180]">{c.targetNome ? `Para ${c.targetNome}` : "Toda a equipe"} · {dt(c.createdAt)} · 👁️ {c.totalLeituras || 0}</div></div>
                    <button onClick={() => removerComunicado(c.id)} className="text-[#b23b39] text-[13px]" title="Remover">🗑️</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin: enviar documento a um funcionário (holerite/contrato) */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border p-5 mt-5 mb-4" style={{ borderColor: "#E3EEF0" }}>
            <h2 className="text-[16px] font-bold mb-1" style={{ color: "#0D2048" }}>📤 Enviar documento a um funcionário</h2>
            <p className="text-[12px] text-[#5C7180] mb-3">Ex.: holerite, contrato — aparece em "Meus documentos" do funcionário.</p>
            <div className="grid gap-3">
              <select value={envUser} onChange={(e) => setEnvUser(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                <option value="">Escolha o funcionário…</option>
                {funcionarios.map((f) => <option key={f.userId} value={f.userId}>{f.nome}{f.cargo ? ` · ${CARGO_LABEL[f.cargo] || f.cargo}` : ""}</option>)}
              </select>
              <select value={envTipo} onChange={(e) => setEnvTipo(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                {["Holerite", "Contrato", "Comprovante", "Outros"].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <label className="border-2 border-dashed rounded-xl px-4 py-4 text-center cursor-pointer block" style={{ borderColor: "#8fd6df", background: "#E8F6F7", color: "#00798A" }}>
                <div className="text-[13px] font-bold">📄 {envFile ? envFile.name : "Escolher arquivo"}</div>
                <input ref={envRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx" onChange={(e) => setEnvFile(e.target.files?.[0] || null)} />
              </label>
              <input value={envObs} onChange={(e) => setEnvObs(e.target.value)} placeholder="Observação (opcional)" className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }} />
              <button onClick={enviarDocParaFunc} disabled={envEnviando} className="text-white rounded-xl py-2.5 font-bold text-[14.5px] disabled:opacity-50" style={{ background: "#014D5E" }}>{envEnviando ? "Enviando…" : "Enviar ao funcionário"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
