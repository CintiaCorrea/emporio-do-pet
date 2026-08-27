"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

type Doc = { id: string; userId: string; tipo: string; nome: string; url: string; observacao?: string | null; status: string; createdAt: string; funcionarioNome?: string; funcionarioCargo?: string };
type Perfil = { nome: string; iniciais: string; cargo: string; dataInicio: string | null; email: string; admin: boolean };

const TIPOS = ["Atestado", "Contrato", "Holerite", "Documentos pessoais", "Comprovante", "Outros"];
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
      </div>
    </div>
  );
}
