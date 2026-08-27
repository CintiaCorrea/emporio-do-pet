"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { imprimirDocumento } from "@/lib/print";

type Doc = { id: string; userId: string; tipo: string; nome: string; url: string; observacao?: string | null; status: string; createdAt: string; funcionarioNome?: string; funcionarioCargo?: string };
type Perfil = { nome: string; iniciais: string; cargo: string; dataInicio: string | null; email: string; admin: boolean };
type PontoHoje = { dia: string; status: string; minutos: number; horas: string; proximoTipo: string; batidas: { id: string; tipo: string; hora: string; ajuste: boolean }[]; desde: string | null };
type EspDia = { dia: string; entrada: string | null; saidaAlmoco: string | null; voltaAlmoco: string | null; saida: string | null; horas: string; emCurso: boolean; temAjuste: boolean };
type Espelho = { userId: string; funcionarioNome: string; funcionarioCargo: string; mes: string; dias: EspDia[]; totalHoras: string };

const TIPOS = ["Atestado", "Contrato", "Holerite", "Documentos pessoais", "Comprovante", "Outros"];
// Ponto (Fatia 4)
const PONTO_TIPOS = ["ENTRADA", "SAIDA_ALMOCO", "VOLTA_ALMOCO", "SAIDA"];
const PONTO_LABEL: Record<string, string> = { ENTRADA: "Entrada", SAIDA_ALMOCO: "Saída almoço", VOLTA_ALMOCO: "Volta", SAIDA: "Saída" };
const PONTO_BTN: Record<string, string> = { ENTRADA: "▶️ Registrar entrada", SAIDA_ALMOCO: "🍽️ Saída para almoço", VOLTA_ALMOCO: "↩️ Voltar do almoço", SAIDA: "⏹️ Registrar saída" };
const PONTO_STATUS: Record<string, { t: string; bg: string; c: string }> = {
  TRABALHANDO: { t: "● em serviço", bg: "#E7F6EF", c: "#0F9D6E" },
  INTERVALO: { t: "☕ em intervalo", bg: "#FBF3DD", c: "#8a6400" },
  ENCERRADO: { t: "✔ encerrou", bg: "#EEF1F4", c: "#5C7180" },
  FORA: { t: "— fora", bg: "#EEF1F4", c: "#5C7180" },
  NAO_BATEU: { t: "— não bateu", bg: "#EEF1F4", c: "#9aa7b2" },
};
const diaBR = (s: string) => { try { const [y, m, d] = s.split("-"); return `${d}/${m}`; } catch { return s; } };
const diaSemana = (s: string) => { try { return new Date(`${s}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""); } catch { return ""; } };
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
  // Ponto (Fatia 4)
  const [ponto, setPonto] = useState<PontoHoje | null>(null);
  const [batendo, setBatendo] = useState(false);
  const [relogio, setRelogio] = useState("");
  const [espUser, setEspUser] = useState("");
  const [espMes, setEspMes] = useState(() => new Date().toISOString().slice(0, 7));
  const [espelho, setEspelho] = useState<Espelho | null>(null);
  const [carregandoEsp, setCarregandoEsp] = useState(false);
  const [equipeHoje, setEquipeHoje] = useState<any[]>([]);
  const [ajUser, setAjUser] = useState("");
  const [ajData, setAjData] = useState(() => new Date().toISOString().slice(0, 10));
  const [ajTipo, setAjTipo] = useState("ENTRADA");
  const [ajHora, setAjHora] = useState("08:00");
  const [ajJust, setAjJust] = useState("");
  const [ajSalvando, setAjSalvando] = useState(false);

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

  // ---- Ponto (Fatia 4) ----
  async function loadPonto() { try { const r = await fetch("/api/rh/ponto/hoje", { cache: "no-store" }); if (r.ok) setPonto(await r.json()); } catch {} }
  async function loadEquipeHoje() { try { const r = await fetch("/api/rh/ponto/equipe-hoje", { cache: "no-store" }); const d = await r.json(); setEquipeHoje(Array.isArray(d) ? d : []); } catch {} }
  useEffect(() => { loadPonto(); /* eslint-disable-next-line */ }, [meId]);
  useEffect(() => { if (perfil?.admin) loadEquipeHoje(); /* eslint-disable-next-line */ }, [perfil?.admin]);
  // relógio ao vivo (só HH:MM)
  useEffect(() => { const tick = () => setRelogio(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })); tick(); const id = setInterval(tick, 20000); return () => clearInterval(id); }, []);
  async function baterPonto() {
    setBatendo(true);
    try {
      const r = await fetch("/api/rh/ponto/bater", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Falha ao bater ponto");
      const tp = d?.batida?.tipo; toast.success(`${PONTO_LABEL[tp] || "Ponto"} registrada ✅`);
      if (d?.hoje) setPonto(d.hoje); else await loadPonto();
      if (perfil?.admin) loadEquipeHoje();
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); }
    finally { setBatendo(false); }
  }
  async function carregarEspelho(userId: string, mes: string) {
    setCarregandoEsp(true);
    try {
      const qs = new URLSearchParams(); if (userId) qs.set("userId", userId); if (mes) qs.set("mes", mes);
      const r = await fetch(`/api/rh/ponto/espelho?${qs.toString()}`, { cache: "no-store" });
      const d = await r.json(); setEspelho(d && d.dias ? d : null);
    } catch { toast.error("Não consegui carregar o espelho."); }
    finally { setCarregandoEsp(false); }
  }
  // funcionário: carrega o próprio espelho ao abrir e ao trocar o mês
  useEffect(() => { if (perfil && !perfil.admin) carregarEspelho("", espMes); /* eslint-disable-next-line */ }, [perfil?.admin, espMes]);
  function espelhoHtml(e: Espelho): string {
    const linhas = e.dias.map((d) => `<tr>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb">${diaBR(d.dia)} <span style="color:#8a97a3">${diaSemana(d.dia)}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${d.entrada || "—"}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${d.saidaAlmoco || "—"}${d.voltaAlmoco ? `–${d.voltaAlmoco}` : ""}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:center">${d.emCurso ? "<i>em curso</i>" : (d.saida || "—")}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700">${d.horas}${d.temAjuste ? " *" : ""}</td>
    </tr>`).join("");
    return `<h2 style="margin:0 0 2px">Folha de ponto — ${e.funcionarioNome}</h2>
      <div style="color:#5C7180;font-size:12px;margin-bottom:10px">${e.funcionarioCargo ? (CARGO_LABEL[e.funcionarioCargo] || e.funcionarioCargo) + " · " : ""}Competência ${e.mes.split("-").reverse().join("/")}</div>
      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:#f1f5f7">
          <th style="padding:7px 8px;text-align:left">Dia</th><th style="padding:7px 8px">Entrada</th>
          <th style="padding:7px 8px">Almoço</th><th style="padding:7px 8px">Saída</th><th style="padding:7px 8px;text-align:right">Horas</th>
        </tr></thead>
        <tbody>${linhas || `<tr><td colspan="5" style="padding:14px;text-align:center;color:#8a97a3">Sem batidas neste mês.</td></tr>`}</tbody>
        <tfoot><tr><td colspan="4" style="padding:8px;text-align:right;font-weight:800">Total do mês</td><td style="padding:8px;text-align:right;font-weight:800">${e.totalHoras}</td></tr></tfoot>
      </table>
      <div style="margin-top:8px;color:#8a97a3;font-size:11px">* dia com ajuste lançado pela administração.</div>
      <div style="margin-top:34px;display:flex;gap:40px">
        <div style="flex:1;border-top:1px solid #14253a;padding-top:4px;text-align:center;font-size:12px">Assinatura do funcionário</div>
        <div style="flex:1;border-top:1px solid #14253a;padding-top:4px;text-align:center;font-size:12px">Assinatura da empresa</div>
      </div>`;
  }
  async function imprimirEspelho() { if (!espelho) return; await imprimirDocumento(`Folha de ponto — ${espelho.funcionarioNome} — ${espelho.mes}`, espelhoHtml(espelho)); }
  function exportarCsv() {
    if (!espelho) return;
    const linhas = [["Dia", "Entrada", "Saída almoço", "Volta", "Saída", "Horas"].join(";")];
    for (const d of espelho.dias) linhas.push([diaBR(d.dia), d.entrada || "", d.saidaAlmoco || "", d.voltaAlmoco || "", d.saida || "", d.horas].join(";"));
    linhas.push(["", "", "", "", "Total", espelho.totalHoras].join(";"));
    const blob = new Blob(["﻿" + linhas.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `folha-ponto-${espelho.funcionarioNome.replace(/\s+/g, "-")}-${espelho.mes}.csv`; a.click(); URL.revokeObjectURL(url);
  }
  async function lancarAjuste() {
    if (!ajUser) { toast.error("Escolha o funcionário."); return; }
    if (!ajJust.trim()) { toast.error("A justificativa é obrigatória."); return; }
    setAjSalvando(true);
    try {
      const r = await fetch("/api/rh/ponto/ajuste", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId: ajUser, data: ajData, tipo: ajTipo, hora: ajHora, justificativa: ajJust.trim() }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || "Falha no ajuste");
      toast.success("Ajuste lançado ✅");
      setAjJust(""); loadEquipeHoje();
      if (espelho && espelho.userId === ajUser) carregarEspelho(ajUser, espMes);
    } catch (e: any) { toast.error(String(e?.message || "Erro").slice(0, 120)); }
    finally { setAjSalvando(false); }
  }

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

        {/* Ponto de hoje (funcionário) */}
        {perfil && !perfil.admin && ponto && (
          <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#E3EEF0" }}>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180]">Ponto de hoje</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[19px] font-bold text-[#0D2048]">{ponto.status === "TRABALHANDO" ? "Trabalhando" : ponto.status === "INTERVALO" ? "Em intervalo" : ponto.status === "ENCERRADO" ? "Dia encerrado" : "Fora"}</span>
                  <span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full" style={{ background: PONTO_STATUS[ponto.status]?.bg, color: PONTO_STATUS[ponto.status]?.c }}>{PONTO_STATUS[ponto.status]?.t}</span>
                </div>
                <div className="text-[12px] text-[#5C7180] mt-0.5">{ponto.desde ? `desde ${ponto.desde} · ` : ""}somou {ponto.horas} hoje</div>
              </div>
              <div className="text-[34px] font-bold tabular-nums text-[#0D2048] leading-none">{relogio}</div>
            </div>
            <button onClick={baterPonto} disabled={batendo} className="w-full mt-4 text-white rounded-xl py-3.5 font-bold text-[16px] disabled:opacity-50" style={{ background: "#009AAC" }}>{batendo ? "Registrando…" : (PONTO_BTN[ponto.proximoTipo] || "Bater ponto")}</button>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {PONTO_TIPOS.map((tp) => { const b = ponto.batidas.find((x) => x.tipo === tp); return (
                <div key={tp} className="rounded-xl border px-2 py-2 text-center" style={{ borderColor: b ? "#E3EEF0" : "#EEF3F5", borderStyle: b ? "solid" : "dashed", background: b ? "#F8FCFC" : "#fff" }}>
                  <div className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#8a97a3]">{PONTO_LABEL[tp]}</div>
                  <div className="text-[16px] font-bold tabular-nums mt-0.5" style={{ color: b ? "#0D2048" : "#c3ccd3" }}>{b ? b.hora : "— —"}{b?.ajuste ? " *" : ""}</div>
                </div>
              ); })}
            </div>
            <div className="text-[11px] text-[#5C7180] mt-3 rounded-lg px-3 py-2" style={{ background: "#F1F7F8" }}>🔒 A batida não pode ser apagada nem editada — é o que faz o ponto valer. Se errar, avise a administração pra lançar um ajuste.</div>
          </div>
        )}

        {/* Meu espelho (funcionário) */}
        {perfil && !perfil.admin && (
          <div className="bg-white rounded-2xl border p-5 mb-5" style={{ borderColor: "#E3EEF0" }}>
            <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
              <h2 className="text-[15px] font-bold" style={{ color: "#0D2048" }}>🗓️ Meu espelho de ponto</h2>
              <input type="month" value={espMes} onChange={(e) => setEspMes(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-[13px]" style={{ borderColor: "#E3EEF0" }} />
            </div>
            {carregandoEsp ? <div className="text-center text-[13px] text-gray-400 py-6">Carregando…</div> : !espelho || espelho.dias.length === 0 ? <div className="text-center text-[13px] text-gray-400 py-6">Sem batidas neste mês.</div> : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                    <thead><tr className="text-[10px] uppercase tracking-wide text-[#8a97a3]">
                      <th className="text-left font-extrabold py-1.5">Dia</th><th className="font-extrabold py-1.5">Entrada</th><th className="font-extrabold py-1.5">Almoço</th><th className="font-extrabold py-1.5">Saída</th><th className="text-right font-extrabold py-1.5">Horas</th>
                    </tr></thead>
                    <tbody>
                      {espelho.dias.map((d) => (
                        <tr key={d.dia} className="border-t" style={{ borderColor: "#EEF3F5" }}>
                          <td className="py-2">{diaBR(d.dia)} <span className="text-[#9aa7b2]">{diaSemana(d.dia)}</span></td>
                          <td className="text-center tabular-nums">{d.entrada || "—"}</td>
                          <td className="text-center tabular-nums text-[12px]">{d.saidaAlmoco || "—"}{d.voltaAlmoco ? `–${d.voltaAlmoco}` : ""}</td>
                          <td className="text-center tabular-nums">{d.emCurso ? <span className="text-[#0F9D6E] font-bold">em curso</span> : (d.saida || "—")}</td>
                          <td className="text-right font-bold tabular-nums">{d.horas}{d.temAjuste ? " *" : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button onClick={imprimirEspelho} className="text-[12.5px] font-bold border rounded-lg px-3 py-1.5 text-[#00798A]" style={{ borderColor: "#E3EEF0" }}>🖨️ Imprimir / salvar PDF</button>
                    <button onClick={exportarCsv} className="text-[12.5px] font-bold border rounded-lg px-3 py-1.5 text-[#5C7180]" style={{ borderColor: "#E3EEF0" }}>⬇️ CSV</button>
                  </div>
                  <div className="text-[14px]"><span className="text-[#5C7180] text-[12px]">Total do mês</span> <b className="text-[#0D2048]">{espelho.totalHoras}</b></div>
                </div>
              </>
            )}
          </div>
        )}

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

        {/* Admin: ponto da equipe hoje */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border overflow-hidden mt-5" style={{ borderColor: "#E3EEF0" }}>
            <div className="px-5 py-4 border-b flex items-center gap-2 flex-wrap" style={{ borderColor: "#E3EEF0" }}>
              <h2 className="text-[16px] font-bold" style={{ color: "#0D2048" }}>🕐 Ponto da equipe — hoje</h2>
              <button onClick={loadEquipeHoje} className="ml-auto text-[11.5px] font-bold rounded-full px-3 py-1 border" style={{ color: "#5C7180", borderColor: "#E3EEF0" }}>↻ Atualizar</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                <thead><tr className="text-[10px] uppercase tracking-wide text-[#8a97a3]" style={{ background: "#F8FBFC" }}>
                  <th className="text-left font-extrabold px-5 py-2">Funcionário</th><th className="font-extrabold py-2">Status</th><th className="font-extrabold py-2">Entrada</th><th className="font-extrabold py-2">Almoço</th><th className="font-extrabold py-2">Saída</th><th className="text-right font-extrabold px-5 py-2">Horas</th>
                </tr></thead>
                <tbody>
                  {equipeHoje.length === 0 ? <tr><td colSpan={6} className="text-center text-gray-400 py-6 text-[13px]">Ninguém bateu ponto ainda hoje.</td></tr> :
                    equipeHoje.map((f) => (
                      <tr key={f.userId} className="border-t" style={{ borderColor: "#EEF3F5" }}>
                        <td className="px-5 py-2.5"><div className="flex items-center gap-2"><div className="w-7 h-7 rounded-full grid place-items-center text-white font-extrabold text-[11px] flex-shrink-0" style={{ background: "#0C93A6" }}>{(f.nome || "?").split(/\s+/).map((x: string) => x[0]).join("").slice(0, 2).toUpperCase()}</div><div className="min-w-0"><div className="font-bold text-[13px] text-[#1B2A3A] truncate">{f.nome}</div><div className="text-[10.5px] text-[#8a97a3]">{CARGO_LABEL[f.cargo] || f.cargo}</div></div></div></td>
                        <td className="text-center"><span className="text-[10px] font-extrabold px-2 py-[3px] rounded-full whitespace-nowrap" style={{ background: PONTO_STATUS[f.status]?.bg, color: PONTO_STATUS[f.status]?.c }}>{PONTO_STATUS[f.status]?.t}</span></td>
                        <td className="text-center tabular-nums">{f.entrada || "—"}</td>
                        <td className="text-center tabular-nums text-[12px]">{f.saidaAlmoco || "—"}{f.voltaAlmoco ? `–${f.voltaAlmoco}` : ""}</td>
                        <td className="text-center tabular-nums">{f.saida || "—"}</td>
                        <td className="text-right px-5 font-bold tabular-nums">{f.horas}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Admin: espelho mensal + exportar/imprimir */}
        {perfil?.admin && (
          <div className="bg-white rounded-2xl border p-5 mt-5" style={{ borderColor: "#E3EEF0" }}>
            <h2 className="text-[16px] font-bold mb-3" style={{ color: "#0D2048" }}>📄 Folha de ponto (espelho mensal)</h2>
            <div className="flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[160px]">
                <label className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180] block mb-1">Funcionário</label>
                <select value={espUser} onChange={(e) => setEspUser(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                  <option value="">Escolha…</option>
                  {funcionarios.map((f) => <option key={f.userId} value={f.userId}>{f.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#5C7180] block mb-1">Mês</label>
                <input type="month" value={espMes} onChange={(e) => setEspMes(e.target.value)} className="border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }} />
              </div>
              <button onClick={() => espUser ? carregarEspelho(espUser, espMes) : toast.error("Escolha o funcionário.")} className="text-white rounded-xl px-4 py-2 font-bold text-[13.5px]" style={{ background: "#009AAC" }}>Abrir espelho</button>
            </div>

            {carregandoEsp ? <div className="text-center text-[13px] text-gray-400 py-6">Carregando…</div> : espelho && espUser === espelho.userId && (
              <div className="mt-4">
                <div className="font-bold text-[14px] text-[#0D2048] mb-1">{espelho.funcionarioNome} <span className="text-[12px] font-semibold text-[#5C7180]">· {espelho.mes.split("-").reverse().join("/")}</span></div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]" style={{ borderCollapse: "collapse" }}>
                    <thead><tr className="text-[10px] uppercase tracking-wide text-[#8a97a3]"><th className="text-left font-extrabold py-1.5">Dia</th><th className="font-extrabold py-1.5">Entrada</th><th className="font-extrabold py-1.5">Almoço</th><th className="font-extrabold py-1.5">Saída</th><th className="text-right font-extrabold py-1.5">Horas</th></tr></thead>
                    <tbody>
                      {espelho.dias.length === 0 ? <tr><td colSpan={5} className="text-center text-gray-400 py-5">Sem batidas neste mês.</td></tr> :
                        espelho.dias.map((d) => (
                          <tr key={d.dia} className="border-t" style={{ borderColor: "#EEF3F5" }}>
                            <td className="py-2">{diaBR(d.dia)} <span className="text-[#9aa7b2]">{diaSemana(d.dia)}</span></td>
                            <td className="text-center tabular-nums">{d.entrada || "—"}</td>
                            <td className="text-center tabular-nums text-[12px]">{d.saidaAlmoco || "—"}{d.voltaAlmoco ? `–${d.voltaAlmoco}` : ""}</td>
                            <td className="text-center tabular-nums">{d.emCurso ? <span className="text-[#0F9D6E] font-bold">em curso</span> : (d.saida || "—")}</td>
                            <td className="text-right font-bold tabular-nums">{d.horas}{d.temAjuste ? " *" : ""}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <div className="flex gap-2">
                    <button onClick={imprimirEspelho} className="text-[12.5px] font-bold border rounded-lg px-3 py-1.5 text-[#00798A]" style={{ borderColor: "#E3EEF0" }}>🖨️ Imprimir / salvar PDF</button>
                    <button onClick={exportarCsv} className="text-[12.5px] font-bold border rounded-lg px-3 py-1.5 text-[#5C7180]" style={{ borderColor: "#E3EEF0" }}>⬇️ CSV</button>
                  </div>
                  <div className="text-[14px]"><span className="text-[#5C7180] text-[12px]">Total do mês</span> <b className="text-[#0D2048]">{espelho.totalHoras}</b></div>
                </div>
              </div>
            )}

            {/* Lançar ajuste */}
            <div className="mt-5 pt-4 border-t" style={{ borderColor: "#EEF3F5" }}>
              <div className="text-[13px] font-bold text-[#0D2048] mb-2">⏱️ Lançar ajuste (correção)</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <select value={ajUser} onChange={(e) => setAjUser(e.target.value)} className="border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                  <option value="">Funcionário…</option>
                  {funcionarios.map((f) => <option key={f.userId} value={f.userId}>{f.nome}</option>)}
                </select>
                <div className="flex gap-2">
                  <input type="date" value={ajData} onChange={(e) => setAjData(e.target.value)} className="border rounded-xl px-3 py-2 text-[14px] flex-1" style={{ borderColor: "#E3EEF0" }} />
                  <input type="time" value={ajHora} onChange={(e) => setAjHora(e.target.value)} className="border rounded-xl px-3 py-2 text-[14px] w-28" style={{ borderColor: "#E3EEF0" }} />
                </div>
                <select value={ajTipo} onChange={(e) => setAjTipo(e.target.value)} className="border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }}>
                  {PONTO_TIPOS.map((t) => <option key={t} value={t}>{PONTO_LABEL[t]}</option>)}
                </select>
                <input value={ajJust} onChange={(e) => setAjJust(e.target.value)} placeholder="Justificativa (obrigatória)" className="border rounded-xl px-3 py-2 text-[14px]" style={{ borderColor: "#E3EEF0" }} />
              </div>
              <button onClick={lancarAjuste} disabled={ajSalvando} className="mt-2 text-white rounded-xl px-4 py-2 font-bold text-[13.5px] disabled:opacity-50" style={{ background: "#014D5E" }}>{ajSalvando ? "Salvando…" : "Salvar ajuste"}</button>
              <div className="text-[11px] text-[#8a97a3] mt-2">O ajuste guarda quem lançou e quando — o registro segue auditável (fica marcado com *).</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
