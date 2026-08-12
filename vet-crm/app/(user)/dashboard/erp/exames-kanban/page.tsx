"use client";
// [EMP-COWORK] Kanban de exames. Colunas = fases de Configurações › Exames (exame_fases).
// A ÚLTIMA fase (ex.: "Entregue") = saída do quadro (o card some). Cor do card = laboratório.

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { podeAvisarLab } from "@/lib/exameFases";

const NAVY = "#014D5E", LINE = "#E8E2D6", MUT = "#5C6B70", INK = "#1F2A2E", TEAL = "#009AAC";
const PALETTE = ["#0C447C", "#6D3B8A", "#B45309", "#0E7490", "#9D174D", "#4D7C0F", "#7C2D12", "#1E4E8C"];
function labColor(nome?: string | null): string {
  if (!nome) return "#94a3a0";
  if (/veter/i.test(nome)) return "#0F6E56"; // Veter = verde (padrão)
  let h = 0; for (let i = 0; i < nome.length; i++) h = (h * 31 + nome.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
const dt = (s?: string | null) => (s ? new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "");
const norm = (s?: string) => String(s || "").toLowerCase().trim();

export default function ExamesKanbanPage() {
  usePageTitle("Exames — Kanban", "Acompanhe o fluxo dos exames");
  const [fila, setFila] = useState<any[]>([]);
  const [fases, setFases] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [avisando, setAvisando] = useState<string | null>(null);
  const [rodandoLote, setRodandoLote] = useState(false);
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [f, fs] = await Promise.all([
        fetch("/api/exames/fila", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
        fetch("/api/listas?lista=exame_fases", { cache: "no-store" }).then((r) => r.json()).catch(() => []),
      ]);
      setFila(Array.isArray(f) ? f : (f.data || []));
      const arr = Array.isArray(fs) ? fs : (fs.itens || fs.data || []);
      const nomes = arr.map((x: any) => { try { return JSON.parse(x.valor).nome || x.valor; } catch { return x.valor; } }).filter(Boolean);
      setFases(nomes.length ? nomes : ["Solicitar", "Retirado", "Aguardando", "Resultado", "Entregue"]);
    } catch {}
    jaCarregou.current = true; setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const lastFase = fases.length ? fases[fases.length - 1] : "Entregue";
  const colunas = fases.length > 1 ? fases.slice(0, -1) : fases;

  const colDe = (status?: string) => {
    const st = norm(status);
    let idx = colunas.findIndex((c) => norm(c) === st);
    if (idx < 0) idx = colunas.findIndex((c) => st.includes(norm(c)) || norm(c).includes(st));
    return idx < 0 ? 0 : idx;
  };
  const porColuna = useMemo(() => {
    const m: any[][] = colunas.map(() => []);
    for (const e of fila) m[colDe(e.status)]?.push(e);
    return m;
  }, [fila, colunas]);

  const mover = async (itemId: string, novaFase: string) => {
    setFila((prev) => (norm(novaFase) === norm(lastFase) ? prev.filter((e) => e.itemId !== itemId) : prev.map((e) => (e.itemId === itemId ? { ...e, status: novaFase } : e))));
    try { await fetch(`/api/exames/${itemId}/fase`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: novaFase }) }); }
    catch { load(); }
  };

  // Solicitar coleta ao laboratório AGORA (urgência). O lote automático 11:30/17:00 cuida do resto.
  const avisarLab = async (e: any) => {
    if (!window.confirm(`📲 Solicitar coleta ao ${e.fornecedorNome || "laboratório"}?\n\n${e.petNome ? e.petNome + " — " : ""}${e.nome}`)) return;
    setAvisando(e.itemId);
    try {
      const r = await fetch(`/api/exames/avisar-lab/${e.itemId}`, { method: "POST", credentials: "include" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.ok) { toast.success("Solicitação enviada ao laboratório"); setFila((prev) => prev.map((x) => (x.itemId === e.itemId ? { ...x, labAvisadoAt: new Date().toISOString() } : x))); }
      else toast.error(d?.erro || "Não consegui solicitar. Confira o laboratório/WhatsApp.");
    } catch { toast.error("Falha de conexão ao solicitar."); }
    setAvisando(null);
  };

  // Roda o LOTE agora (mesmo que 11:30/17:00): 1 mensagem genérica por laboratório.
  const rodarLote = async () => {
    if (!window.confirm("📲 Enviar agora a solicitação de coleta aos laboratórios com exames pendentes?")) return;
    setRodandoLote(true);
    try {
      const r = await fetch("/api/exames/avisar-lab-rodar-agora", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d?.desligado) toast("Lote ainda desligado (aguardando o template ser aprovado na Meta).", { icon: "⏸️" });
      else if (r.ok) { toast.success(`Lote: ${d?.labs || 0} laboratório(s), ${d?.enviados || 0} exame(s) solicitado(s).`); load(); }
      else toast.error("Não consegui rodar o lote.");
    } catch { toast.error("Falha de conexão ao rodar o lote."); }
    setRodandoLote(false);
  };

  const total = fila.length;

  const Card = ({ e, ultima }: { e: any; ultima: boolean }) => {
    const cor = labColor(e.fornecedorNome);
    return (
      <div
        draggable
        onDragStart={() => setDragId(e.itemId)}
        onDragEnd={() => { setDragId(null); setOver(null); }}
        className="bg-white rounded-xl p-2.5 cursor-grab active:cursor-grabbing"
        style={{ border: `1px solid ${LINE}`, borderLeft: `4px solid ${cor}`, boxShadow: "0 1px 2px rgba(1,77,94,.05)" }}
      >
        <div className="text-[13px] font-bold" style={{ color: NAVY }}>{e.nome}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: MUT }}>{e.petNome}{e.tutorNome ? ` · ${e.tutorNome}` : ""}</div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          {e.fornecedorNome ? <span className="text-[10px] font-bold rounded px-1.5 py-0.5" style={{ background: cor + "1A", color: cor }}>{e.fornecedorNome}</span> : <span className="text-[10px] rounded px-1.5 py-0.5" style={{ background: "#F1EEE6", color: MUT }}>sem lab</span>}
          {e.date ? <span className="text-[10.5px]" style={{ color: MUT }}>{dt(e.date)}</span> : null}
          {e.labAvisadoAt ? <span className="text-[10px] font-bold" style={{ color: "#0F6E56" }}>🔔 avisado</span> : null}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Link href={`/dashboard/erp/pets/${e.petId}`} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: LINE, color: MUT }}>Abrir ficha</Link>
          {podeAvisarLab({ status: e.status, fornecedorId: e.fornecedorId || e.fornecedorNome, labAvisadoAt: e.labAvisadoAt }) ? (
            <button onClick={() => avisarLab(e)} disabled={avisando === e.itemId} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#6A4FB0", color: "#6A4FB0", background: "#F3EFFB" }}>{avisando === e.itemId ? "enviando…" : "📲 Solicitar ao lab"}</button>
          ) : null}
          {ultima ? <button onClick={() => mover(e.itemId, lastFase)} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-md border" style={{ borderColor: "#0F6E56", color: "#0F6E56" }}>✓ {lastFase}</button> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 w-full">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="text-[13px]" style={{ color: MUT }}><b style={{ color: NAVY }}>{total}</b> exame(s) em andamento</div>
        <span className="text-[11.5px]" style={{ color: MUT }}>· arraste o card entre as fases · <b>{lastFase}</b> tira do quadro</span>
        <button onClick={rodarLote} disabled={rodandoLote} className="ml-auto text-[11.5px] font-semibold px-2.5 py-1 rounded-md border" style={{ borderColor: "#6A4FB0", color: "#6A4FB0", background: "#F3EFFB" }}>{rodandoLote ? "enviando…" : "📲 Enviar lote agora"}</button>
        <Link href="/dashboard/configuracoes/exames" className="text-[11.5px] font-semibold" style={{ color: TEAL }}>⚙️ Configurar fases</Link>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm" style={{ color: MUT }}>Carregando…</div>
      ) : (
        <div className="grid gap-3 pb-3" style={{ minHeight: "60vh", gridTemplateColumns: `repeat(${Math.max(1, colunas.length)}, minmax(0, 1fr))` }}>
          {colunas.map((col, ci) => {
            const ativa = over === col;
            return (
              <div
                key={col}
                onDragOver={(ev) => { ev.preventDefault(); if (over !== col) setOver(col); }}
                onDragLeave={() => setOver((o) => (o === col ? null : o))}
                onDrop={() => { if (dragId) mover(dragId, col); setDragId(null); setOver(null); }}
                className="flex flex-col rounded-2xl min-w-0"
                style={{ background: ativa ? "#E6F4F5" : "#EFEADF", border: `1px solid ${ativa ? TEAL : LINE}` }}
              >
                <div className="px-3 py-2.5 text-[12px] font-bold flex items-center gap-2" style={{ color: NAVY, borderBottom: `1px solid ${LINE}` }}>
                  <span className="truncate">{col}</span>
                  <span className="ml-auto text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white" style={{ color: MUT, border: `1px solid ${LINE}` }}>{porColuna[ci]?.length || 0}</span>
                </div>
                <div className="p-2 flex flex-col gap-2 flex-1">
                  {(porColuna[ci] || []).map((e: any) => <Card key={e.itemId} e={e} ultima={ci === colunas.length - 1} />)}
                  {(porColuna[ci] || []).length === 0 ? <div className="text-[11px] text-center py-6" style={{ color: "#B7AE99" }}>—</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
