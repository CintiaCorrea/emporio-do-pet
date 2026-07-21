"use client";
// [EMP-COWORK] Internações Base44 — Mapa de boxes (F1) + Ativas/Histórico + boletins — Cintia 07/02
// Mapa lê /api/boxes/mapa (boxes + ocupação + internação) cruzado com /api/hospitalizations (custo/estado/boletins).
// Internação = appointment c/ metadata em notes. Box = recurso físico (CRUD em /api/boxes). Boletins via Listas intbol_<id>.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import BuscaClientePet from "@/components/common/BuscaClientePet";

const ESTADOS = [
  { v: "Estável", prio: "LOW", bg: "#E1F5EE", fg: "#0F6E56" },
  { v: "Em observação", prio: "MEDIUM", bg: "#E6F1FB", fg: "#0C447C" },
  { v: "Instável", prio: "HIGH", bg: "#FBEFE0", fg: "#B45309" },
  { v: "Crítico", prio: "CRITICAL", bg: "#FCE9EF", fg: "#CC3366" },
];
const CANAIS = ["WhatsApp", "Telefone", "Presencial", "E-mail"];
const TIPOS = ["CANINO", "FELINO", "ISOLAMENTO", "UTI"];
const TIPO_EMOJI: Record<string, string> = { CANINO: "🐶", FELINO: "🐱", ISOLAMENTO: "⚠️", UTI: "🚨" };
const prioToEstado: Record<string, string> = { LOW: "Estável", MEDIUM: "Em observação", HIGH: "Instável", CRITICAL: "Crítico" };
function estadoDe(h: any): string { return h?.vitalSigns?.estadoClinico || prioToEstado[h?.priority] || "Estável"; }
function estadoStyle(e: string) { return ESTADOS.find((x) => x.v === e) || ESTADOS[0]; }
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
function ini(n?: string) { return ((n || "?").trim().slice(0, 2)).toUpperCase(); }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function diasInternado(adm: string): number { try { const d = new Date(adm); const ms = Date.now() - d.getTime(); return Math.max(1, Math.ceil(ms / 86400000)); } catch { return 1; } }
function fmtData(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return "—"; } }
function ehHoje(s?: string) { if (!s) return false; try { return new Date(s).toDateString() === new Date().toDateString(); } catch { return false; } }

export default function InternacoesPage() {
  usePageTitle("Internações", "Mapa de boxes, pacientes internados e boletins");
  const router = useRouter();
  const [tab, setTab] = useState<"mapa" | "ativas" | "historico">("mapa");
  const [loading, setLoading] = useState(true);
  const [hosps, setHosps] = useState<any[]>([]);
  const [listas, setListas] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Mapa / boxes
  const [mapa, setMapa] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [filtroTipo, setFiltroTipo] = useState<"Todas" | "CANINO" | "FELINO" | "ISOLAMENTO">("Todas");
  const [busca, setBusca] = useState("");
  const [tv, setTv] = useState(false);

  const [novoOpen, setNovoOpen] = useState(false);
  const [form, setForm] = useState<any>({ tutorId: "", petId: "", userId: "", reason: "", estado: "Estável", canal: "WhatsApp", estimatedDischargeDate: "", dailyRate: "", boletinsDia: 3, boletinsHorarios: "07:00, 14:00, 20:00", notes: "", boxId: "" });
  const [salvando, setSalvando] = useState(false);
  const [selCliente, setSelCliente] = useState<{ id: string; name: string } | null>(null);
  const [selPet, setSelPet] = useState<{ id: string; name: string } | null>(null);

  const [detId, setDetId] = useState<string | null>(null);
  const [boletins, setBoletins] = useState<any[]>([]);
  const [bolEstado, setBolEstado] = useState("Estável");
  const [bolTexto, setBolTexto] = useState("");
  const [bolSaving, setBolSaving] = useState(false);

  // Gerenciar boxes
  const [gerOpen, setGerOpen] = useState(false);
  const [boxForm, setBoxForm] = useState<any>({ id: "", codigo: "", nome: "", tipo: "CANINO", ativa: true, ordem: 0, observacao: "" });
  const [boxSaving, setBoxSaving] = useState(false);

  // "Carregando..." só na PRIMEIRA carga — depois os dados são trocados por baixo,
  // sem desmontar a tela (evita o "pulo" a cada ação).
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [h, l, m, b] = await Promise.all([
        fetch("/api/hospitalizations?limit=1000").then((r) => r.json()).catch(() => ({})),
        fetch("/api/listas").then((r) => r.json()).catch(() => []),
        fetch("/api/boxes/mapa").then((r) => r.json()).catch(() => ({})),
        fetch("/api/boxes").then((r) => r.json()).catch(() => []),
      ]);
      setHosps(Array.isArray(h) ? h : (h.hospitalizations || h.data || []));
      setListas(Array.isArray(l) ? l : (l.itens || l.data || []));
      setMapa(Array.isArray(m?.boxes) ? m.boxes : []);
      setBoxes(Array.isArray(b) ? b : (b.data || []));
    } catch {}
    jaCarregou.current = true;
    setLoading(false);
  };
  useEffect(() => { load(); }, []);
  // A lista de profissionais é a única que o modal ainda pré-carrega — cliente e pet
  // agora vêm da busca padrão (BuscaClientePet), que consulta o servidor conforme se digita.
  useEffect(() => { if (!novoOpen) return; (async () => {
    const u = await fetch("/api/users").then((r) => r.json()).catch(() => []);
    setUsers(Array.isArray(u) ? u : (u.users || u.data || []));
  })(); }, [novoOpen]);

  const hospById = useMemo(() => { const mp = new Map<string, any>(); hosps.forEach((h) => mp.set(h.id, h)); return mp; }, [hosps]);

  const boletinsDe = (id: string) => listas.filter((x) => (x.lista || "") === `intbol_${id}`).map((x) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } });
  const boletinsHojeCount = (id: string) => { const hoje = new Date().toDateString(); return boletinsDe(id).filter((b: any) => { try { return new Date(b.at).toDateString() === hoje; } catch { return false; } }).length; };
  const proximoBoletim = (h: any) => {
    const hor = String(h?.vitalSigns?.boletinsHorarios || "").split(",").map((s: string) => s.trim()).filter(Boolean).sort();
    if (!hor.length) return null;
    const done = boletinsHojeCount(h.id);
    if (done >= hor.length) return { txt: "Boletins do dia concluídos", atrasado: false, done, total: hor.length };
    const nextH = hor[done];
    const now = new Date(); const [hh, mm] = nextH.split(":").map(Number);
    const nd = new Date(); nd.setHours(hh || 0, mm || 0, 0, 0);
    return { txt: nextH, atrasado: nd < now, done, total: hor.length };
  };

  const ativas = useMemo(() => hosps.filter((h) => !["DISCHARGED", "DECEASED"].includes(h.status)), [hosps]);
  const historico = useMemo(() => hosps.filter((h) => ["DISCHARGED", "DECEASED"].includes(h.status)), [hosps]);
  const lista = tab === "ativas" ? ativas : historico;

  // ── Mapa: cards filtrados + KPIs ──────────────────────────────────
  const estadoCard = (c: any) => { const h = c?.internacao ? hospById.get(c.internacao.id) : null; return h ? estadoDe(h) : (c?.internacao?.estadoClinico || prioToEstado[c?.internacao?.priority] || "Estável"); };
  const cardsFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return mapa.filter((c) => {
      if (filtroTipo !== "Todas" && (c.box?.tipo || "CANINO") !== filtroTipo) return false;
      if (!q) return true;
      const i = c.internacao;
      return [c.box?.codigo, c.box?.nome, i?.pet?.name, i?.tutor?.name].filter(Boolean).some((s: string) => String(s).toLowerCase().includes(q));
    });
  }, [mapa, filtroTipo, busca]);
  const kpis = useMemo(() => {
    const ocup = mapa.filter((c) => c.ocupado);
    const emRisco = ocup.filter((c) => ["Instável", "Crítico"].includes(estadoCard(c))).length;
    const altasHoje = ocup.filter((c) => ehHoje(c.internacao?.estimatedDischargeDate)).length;
    const emAberto = ocup.reduce((acc, c) => acc + (hospById.get(c.internacao?.id)?.totalCost || 0), 0);
    return { total: mapa.length, ocupados: ocup.length, livres: mapa.length - ocup.length, emRisco, altasHoje, emAberto };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, hospById]);

  const criar = async () => {
    if (!form.tutorId || !form.petId || !form.userId || !form.reason.trim()) { alert("Preencha cliente, pet, profissional e motivo."); return; }
    if (!form.boxId) { alert("Escolha um box para a internação — sem box o paciente não aparece no Mapa. Se não houver box livre, cadastre um em '⚙️ Gerenciar boxes'."); return; }
    setSalvando(true);
    try {
      const est = estadoStyle(form.estado);
      const body = {
        tutorId: form.tutorId, petId: form.petId, userId: form.userId, reason: form.reason.trim(),
        dailyRate: Number(form.dailyRate) || 0, priority: est.prio,
        estimatedDischargeDate: form.estimatedDischargeDate || undefined, notes: form.notes || undefined,
        vitalSigns: { estadoClinico: form.estado, canalTutor: form.canal, boletinsDia: Number(form.boletinsDia) || 0, boletinsHorarios: form.boletinsHorarios },
      };
      const res = await fetch("/api/hospitalizations", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      const created = await res.json().catch(() => null);
      // Se veio de um box (ou box escolhido), interna nele
      if (form.boxId && created?.id) {
        await fetch(`/api/boxes/${form.boxId}/ocupar`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ appointmentId: created.id }) }).catch(() => {});
      }
      setNovoOpen(false);
      setSelCliente(null); setSelPet(null);
      setForm({ tutorId: "", petId: "", userId: "", reason: "", estado: "Estável", canal: "WhatsApp", estimatedDischargeDate: "", dailyRate: "", boletinsDia: 3, boletinsHorarios: "07:00, 14:00, 20:00", notes: "", boxId: "" });
      load();
    } catch { alert("Erro ao criar internação."); }
    finally { setSalvando(false); }
  };

  const internarNoBox = (boxId: string) => { setForm((f: any) => ({ ...f, boxId })); setNovoOpen(true); };

  const abrirDetalhes = async (id: string) => {
    setDetId(id); setBolTexto("");
    const h = hosps.find((x) => x.id === id); setBolEstado(estadoDe(h));
    try { const d = await fetch(`/api/listas?lista=intbol_${id}`).then((r) => r.json()); const arr = Array.isArray(d) ? d : (d.itens || d.data || []); setBoletins(arr.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } })); } catch { setBoletins([]); }
  };
  const registrarBoletim = async () => {
    if (!detId || !bolTexto.trim()) { alert("Escreva o boletim."); return; }
    setBolSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), estado: bolEstado, texto: bolTexto.trim() });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intbol_${detId}`, valor }) });
      setBolTexto(""); await abrirDetalhes(detId); load();
    } catch { alert("Erro ao registrar boletim."); }
    finally { setBolSaving(false); }
  };
  const darAlta = async (id: string) => {
    if (!confirm("Confirmar alta deste paciente? O box será liberado.")) return;
    try {
      await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DISCHARGED" }) });
      // libera o box que estava ocupado por esta internação
      const card = mapa.find((c) => c.internacao?.id === id);
      if (card?.box?.id) await fetch(`/api/boxes/${card.box.id}/liberar`, { method: "POST", credentials: "include" }).catch(() => {});
      setDetId(null); load();
    } catch { alert("Erro ao dar alta."); }
  };

  // ── Gerenciar boxes (CRUD) ────────────────────────────────────────
  const novoBox = () => setBoxForm({ id: "", codigo: "", nome: "", tipo: "CANINO", ativa: true, ordem: (boxes.reduce((m, b) => Math.max(m, b.ordem || 0), 0) + 1), observacao: "" });
  const editarBox = (b: any) => setBoxForm({ id: b.id, codigo: b.codigo || "", nome: b.nome || "", tipo: b.tipo || "CANINO", ativa: b.ativa !== false, ordem: b.ordem || 0, observacao: b.observacao || "" });
  const salvarBox = async () => {
    if (!boxForm.codigo.trim()) { alert("Informe o código do box (ex.: B-01)."); return; }
    setBoxSaving(true);
    try {
      const body = { codigo: boxForm.codigo.trim(), nome: boxForm.nome.trim() || undefined, tipo: boxForm.tipo, ativa: boxForm.ativa, ordem: Number(boxForm.ordem) || 0, observacao: boxForm.observacao.trim() || undefined };
      const url = boxForm.id ? `/api/boxes/${boxForm.id}` : "/api/boxes";
      const res = await fetch(url, { method: boxForm.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || ""); }
      novoBox(); load();
    } catch (e: any) { alert(e?.message || "Erro ao salvar box. O código já pode existir."); }
    finally { setBoxSaving(false); }
  };
  const excluirBox = async (b: any) => {
    if (!confirm(`Excluir o box ${b.codigo}? Essa ação não pode ser desfeita.`)) return;
    try { const res = await fetch(`/api/boxes/${b.id}`, { method: "DELETE", credentials: "include" }); if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || ""); } load(); }
    catch (e: any) { alert(e?.message || "Não foi possível excluir (box pode estar ocupado)."); }
  };
  const moverBox = async (b: any, dir: -1 | 1) => {
    const ordenados = [...boxes].sort((a, c) => (a.ordem || 0) - (c.ordem || 0) || String(a.codigo).localeCompare(String(c.codigo)));
    const i = ordenados.findIndex((x) => x.id === b.id); const j = i + dir;
    if (j < 0 || j >= ordenados.length) return;
    const outro = ordenados[j];
    try {
      await Promise.all([
        fetch(`/api/boxes/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ordem: outro.ordem || 0 }) }),
        fetch(`/api/boxes/${outro.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ ordem: b.ordem || 0 }) }),
      ]);
      load();
    } catch {}
  };

  const det = detId ? hosps.find((h) => h.id === detId) : null;
  const boxesOrdenados = useMemo(() => [...boxes].sort((a, c) => (a.ordem || 0) - (c.ordem || 0) || String(a.codigo).localeCompare(String(c.codigo))), [boxes]);
  const boxesLivres = useMemo(() => mapa.filter((c) => !c.ocupado).map((c) => c.box), [mapa]);

  // ── Card de box (usado no Mapa e no Modo painel) ──────────────────
  const BoxCard = ({ c, big }: { c: any; big?: boolean }) => {
    const b = c.box;
    if (!c.ocupado) {
      return (
        <div className="rounded-[13px] border border-dashed flex flex-col items-center justify-center text-center px-3 py-6" style={{ borderColor: "#E8E2D6", background: "#FBF9F4" }}>
          <div className={big ? "text-3xl mb-1" : "text-2xl mb-1"}>🛏️</div>
          <div className="text-[12px] text-[#374151] font-medium">{TIPO_EMOJI[b.tipo] || "🛏️"} {b.codigo} — Livre</div>
          <button onClick={() => internarNoBox(b.id)} className="mt-2 text-[12px] font-medium text-[#009AAC]">+ Internar paciente</button>
        </div>
      );
    }
    const i = c.internacao; const est = estadoStyle(estadoCard(c)); const h = hospById.get(i?.id);
    const pb = h ? proximoBoletim(h) : null;
    return (
      <div className="rounded-[13px] border bg-white overflow-hidden cursor-pointer hover:border-[#009AAC] transition-colors" style={{ borderColor: "#E8E2D6" }} onClick={() => router.push(`/dashboard/erp/internacoes/${i.id}`)}>
        <div style={{ height: 4, background: est.fg }} />
        <div className={big ? "p-4" : "p-3"}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-medium text-[#374151] tracking-wide">{TIPO_EMOJI[b.tipo] || "📍"} {b.codigo}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: est.bg, color: est.fg }}>{estadoCard(c)}</span>
          </div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className={(big ? "w-9 h-9 text-lg " : "w-8 h-8 text-base ") + "rounded-lg flex items-center justify-center flex-shrink-0"} style={{ background: est.bg }}>{especieEmoji(i?.pet?.species)}</div>
            <div className="min-w-0">
              <div className="text-[14px] font-medium text-[#1F2A2E] leading-tight truncate">{i?.pet?.name || "Pet"}</div>
              <div className="text-[11px] text-[#374151] truncate">{i?.pet?.breed || i?.pet?.species || "—"}{i?.pet?.weight ? ` · ${i.pet.weight} kg` : ""}</div>
            </div>
          </div>
          <div className="text-[11.5px] text-[#5C6B70] flex flex-col gap-0.5 mb-2">
            <span className="truncate">👤 {i?.tutor?.name || "—"}</span>
            <span className="truncate">🩺 {i?.vet?.name || "Sem responsável"} · Dia {diasInternado(i?.date || h?.admissionDate)}</span>
            <span className="truncate">📋 {i?.motivo || "—"}</span>
          </div>
          {pb ? (
            <div className="rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]" style={pb.atrasado ? { background: "#fdf3f6", color: "#CC3366" } : { background: "#f4fbfc", color: "#00798A" }}>
              <span className="truncate">🔔 {pb.atrasado ? `Boletim atrasado ${pb.txt}` : (pb.total ? `Próximo ${pb.txt}` : "")}</span>
              <span className="text-[#5C6B70] flex-shrink-0 ml-1">{pb.done}/{pb.total}</span>
            </div>
          ) : (
            <div className="text-[10.5px] text-[#B4BCC0] italic">🩺 sinais vitais · próxima fase</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="text-[13px] text-[#374151]">{kpis.ocupados}/{kpis.total} box(es) ocupado(s) · {ativas.length} internado(s)</div>
        <div className="flex items-center gap-2">
          <button onClick={() => { novoBox(); setGerOpen(true); }} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>⚙️ Gerenciar boxes</button>
          <button onClick={() => { setForm((f: any) => ({ ...f, boxId: "" })); setNovoOpen(true); }} className="text-[12px] font-medium text-white bg-[#009AAC] px-3.5 py-1.5 rounded-lg">➕ Nova internação</button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4 border-b" style={{ borderColor: "#E8E2D6" }}>
        {([["mapa", `🗺️ Mapa`], ["ativas", `Ativas (${ativas.length})`], ["historico", `Histórico (${historico.length})`]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as any)} className="text-[12.5px] px-3.5 py-2 -mb-px border-b-2" style={tab === k ? { color: "#014D5E", borderColor: "#009AAC", fontWeight: 500 } : { color: "#5C6B70", borderColor: "transparent" }}>{label}</button>
        ))}
      </div>

      {/* ===== MAPA ===== */}
      {tab === "mapa" && (
        loading ? (
          <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
              {[
                { l: "Ocupação", v: `${kpis.ocupados}/${kpis.total}`, c: "#014D5E", e: "🛏️" },
                { l: "Livres", v: kpis.livres, c: "#0F6E56", e: "🟢" },
                { l: "Em risco", v: kpis.emRisco, c: "#CC3366", e: "⚠️" },
                { l: "Altas hoje", v: kpis.altasHoje, c: "#014D5E", e: "🏷️" },
                { l: "Em aberto (diárias)", v: fmtBRL(kpis.emAberto), c: "#014D5E", e: "💰" },
              ].map((k) => (
                <div key={k.l} className="bg-white border rounded-xl px-3.5 py-2.5" style={{ borderColor: "#E8E2D6" }}>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide">{k.e} {k.l}</div>
                  <div className="mt-1 font-medium" style={{ color: k.c, fontSize: String(k.v).length > 6 ? 16 : 22 }}>{k.v}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="🔎 Buscar pet, tutor ou box..." className="text-[13px] border rounded-lg px-3 py-2 min-w-[240px] flex-1 focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
              <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
                {(["Todas", "CANINO", "FELINO", "ISOLAMENTO"] as const).map((t) => (
                  <button key={t} onClick={() => setFiltroTipo(t)} className="text-[12px] px-3 py-2" style={filtroTipo === t ? { background: "#009AAC", color: "#fff" } : { background: "#fff", color: "#5C6B70" }}>{t === "Todas" ? "Todas" : t === "CANINO" ? "🐶 Caninos" : t === "FELINO" ? "🐱 Felinos" : "⚠️ Isolamento"}</button>
                ))}
              </div>
              {mapa.length > 0 && <button onClick={() => setTv(true)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>📺 Modo painel</button>}
            </div>

            {mapa.length === 0 ? (
              <div className="bg-white border rounded-xl px-6 py-12 text-center" style={{ borderColor: "#E8E2D6" }}>
                <div className="text-3xl mb-2">🛏️</div>
                <div className="text-sm text-[#5C6B70] mb-1">Nenhum box cadastrado ainda.</div>
                <div className="text-[12px] text-[#374151] mb-3">Cadastre as baias/boxes da clínica para montar o mapa.</div>
                <button onClick={() => { novoBox(); setGerOpen(true); }} className="text-[12px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg">⚙️ Cadastrar boxes</button>
              </div>
            ) : cardsFiltrados.length === 0 ? (
              <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#374151]" style={{ borderColor: "#E8E2D6" }}>Nenhum box com esse filtro/busca.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {cardsFiltrados.map((c) => <BoxCard key={c.box.id} c={c} />)}
              </div>
            )}
          </>
        )
      )}

      {/* ===== ATIVAS / HISTÓRICO ===== */}
      {tab !== "mapa" && (
        loading ? (
          <div className="px-6 py-16 text-center text-sm text-[#374151]">Carregando...</div>
        ) : lista.length === 0 ? (
          <div className="bg-white border rounded-[14px] px-6 py-12 text-center text-sm text-[#374151]" style={{ borderColor: "#E8E2D6" }}>{tab === "ativas" ? "Nenhum paciente internado no momento." : "Nenhuma internação no histórico."}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {lista.map((h) => {
              const est = estadoStyle(estadoDe(h)); const pb = tab === "ativas" ? proximoBoletim(h) : null;
              return (
                <div key={h.id} className="bg-white border rounded-[14px] p-4" style={{ borderColor: "#E8E2D6" }}>
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base flex-shrink-0" style={{ background: est.bg }}>{especieEmoji(h.pet?.species)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-medium text-[#014D5E] truncate">{h.pet?.name || "Pet"} <span className="text-[11px] text-[#374151] font-normal">· {h.tutor?.name}</span></div>
                      <div className="text-[11px] text-[#374151]">{h.pet?.species}{h.pet?.breed ? ` · ${h.pet.breed}` : ""}</div>
                    </div>
                    <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: est.bg, color: est.fg }}>{estadoDe(h)}</span>
                  </div>
                  <div className="text-[12px] text-[#5C6B70] mb-2">📋 {h.reason || "—"} <span className="text-[#374151]">· {h.veterinarian?.name || "Sem responsável"}</span></div>
                  <div className="flex gap-4 text-[11.5px] text-[#5C6B70] mb-2.5 flex-wrap">
                    <span>📅 Dia {diasInternado(h.admissionDate)} · desde {fmtData(h.admissionDate)}</span>
                    <span>💰 {fmtBRL(h.totalCost)} <span className="text-[#374151]">({fmtBRL(h.dailyRate)}/dia)</span></span>
                  </div>
                  {pb && (
                    <div className="rounded-lg px-3 py-2 mb-2.5 flex items-center justify-between" style={pb.atrasado ? { background: "#FCE9EF", border: "1px solid #F3D2DE" } : { background: "#E0F4F6", border: "1px solid #CFE9ED" }}>
                      <span className="text-[11.5px]" style={{ color: pb.atrasado ? "#CC3366" : "#00798A" }}>🔔 {pb.atrasado ? `Boletim atrasado ${pb.txt}` : (pb.total ? `Próximo boletim ${pb.txt}` : "")}</span>
                      <span className="text-[11px] text-[#5C6B70]">Hoje {pb.done}/{pb.total}</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    {tab === "ativas" && <button onClick={() => abrirDetalhes(h.id)} className="flex-1 text-[11.5px] text-white bg-[#009AAC] py-1.5 rounded-lg">+ Boletim</button>}
                    <button onClick={() => router.push(`/dashboard/erp/internacoes/${h.id}`)} className="flex-1 text-[11.5px] text-[#00798A] bg-[#E0F4F6] py-1.5 rounded-lg">Ficha</button>
                    {tab === "ativas" && <button onClick={() => darAlta(h.id)} className="flex-1 text-[11.5px] text-[#0F6E56] bg-[#E1F5EE] py-1.5 rounded-lg">Dar alta</button>}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ===== MODO PAINEL (TV) ===== */}
      {tv && (
        <div className="fixed inset-0 z-[60] bg-[#F6F2EA] overflow-y-auto">
          <div className="sticky top-0 bg-[#F6F2EA] px-6 py-3 flex items-center justify-between border-b" style={{ borderColor: "#E8E2D6" }}>
            <div className="text-[16px] font-medium text-[#014D5E]">🗺️ Mapa de Internação — Modo painel · {kpis.ocupados}/{kpis.total} ocupados</div>
            <button onClick={() => setTv(false)} className="text-[13px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>✕ Sair</button>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {cardsFiltrados.map((c) => <BoxCard key={c.box.id} c={c} big />)}
          </div>
        </div>
      )}

      {/* ===== GERENCIAR BOXES ===== */}
      {gerOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setGerOpen(false)}>
          <div className="bg-[#FBF9F4] rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()} style={{ border: "1px solid #E8E2D6" }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">⚙️ Gerenciar boxes</h3>
              <button onClick={() => setGerOpen(false)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            {/* form add/edit */}
            <div className="p-5 border-b" style={{ borderColor: "#F0EBE0" }}>
              <div className="text-[12px] font-medium text-[#014D5E] mb-2">{boxForm.id ? "Editar box" : "Novo box"}</div>
              <div className="grid grid-cols-2 gap-3 text-[13px]">
                <div><label className="text-[11px] text-[#374151] block mb-1">Código *</label>
                  <input value={boxForm.codigo} onChange={(e) => setBoxForm({ ...boxForm, codigo: e.target.value })} placeholder="B-01" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                <div><label className="text-[11px] text-[#374151] block mb-1">Tipo</label>
                  <select value={boxForm.tipo} onChange={(e) => setBoxForm({ ...boxForm, tipo: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{TIPOS.map((t) => <option key={t} value={t}>{TIPO_EMOJI[t]} {t}</option>)}</select></div>
                <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Nome (opcional)</label>
                  <input value={boxForm.nome} onChange={(e) => setBoxForm({ ...boxForm, nome: e.target.value })} placeholder="Ex.: Box grande porte" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                <div><label className="text-[11px] text-[#374151] block mb-1">Ordem</label>
                  <input type="number" value={boxForm.ordem} onChange={(e) => setBoxForm({ ...boxForm, ordem: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                <div className="flex items-end"><label className="flex items-center gap-2 text-[12px] text-[#5C6B70] cursor-pointer"><input type="checkbox" checked={boxForm.ativa} onChange={(e) => setBoxForm({ ...boxForm, ativa: e.target.checked })} /> Box ativo (aparece no mapa)</label></div>
                <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Observação</label>
                  <input value={boxForm.observacao} onChange={(e) => setBoxForm({ ...boxForm, observacao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={salvarBox} disabled={boxSaving} className="text-[12px] text-white bg-[#009AAC] px-4 py-2 rounded-lg disabled:opacity-60">{boxSaving ? "Salvando..." : boxForm.id ? "Salvar alterações" : "+ Adicionar box"}</button>
                {boxForm.id && <button onClick={novoBox} className="text-[12px] text-[#5C6B70] bg-white border px-4 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar edição</button>}
              </div>
            </div>
            {/* lista */}
            <div className="p-5">
              <div className="text-[12px] font-medium text-[#014D5E] mb-2">Boxes cadastrados ({boxes.length})</div>
              {boxesOrdenados.length === 0 ? (
                <div className="text-[12px] text-[#374151] py-4 text-center">Nenhum box ainda. Adicione o primeiro acima.</div>
              ) : (
                <div className="space-y-1.5">
                  {boxesOrdenados.map((b, idx) => (
                    <div key={b.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2" style={{ borderColor: "#E8E2D6" }}>
                      <div className="flex flex-col">
                        <button onClick={() => moverBox(b, -1)} disabled={idx === 0} className="text-[10px] text-[#374151] disabled:opacity-30 leading-none">▲</button>
                        <button onClick={() => moverBox(b, 1)} disabled={idx === boxesOrdenados.length - 1} className="text-[10px] text-[#374151] disabled:opacity-30 leading-none">▼</button>
                      </div>
                      <span className="text-base">{TIPO_EMOJI[b.tipo] || "🛏️"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-[#1F2A2E] truncate">{b.codigo} {b.nome ? <span className="text-[11px] text-[#374151] font-normal">· {b.nome}</span> : null}</div>
                        <div className="text-[11px] text-[#374151]">{b.tipo}{b.ativa === false ? " · inativo" : ""}{b.observacao ? ` · ${b.observacao}` : ""}</div>
                      </div>
                      <button onClick={() => editarBox(b)} className="text-[12px] text-[#00798A] px-2 py-1">✏️</button>
                      <button onClick={() => excluirBox(b)} className="text-[12px] px-2 py-1">🗑️</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== NOVA INTERNAÇÃO ===== */}
      {novoOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setNovoOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ borderColor: "#E8E2D6", background: "#FBF9F4" }}>
              <div>
                <h3 className="text-base font-medium text-[#014D5E]">🏥 Nova internação{form.boxId ? <span className="text-[12px] text-[#009AAC] font-normal"> · Box {boxes.find((b) => b.id === form.boxId)?.codigo || ""}</span> : null}</h3>
                <p className="text-[11.5px] text-[#374151] mt-0.5">Interne o paciente e acompanhe por boletins.</p>
              </div>
              <button onClick={() => setNovoOpen(false)} className="text-[#374151] hover:text-[#5C6B70] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Paciente */}
              <div>
                <div className="text-[11px] font-medium text-[#014D5E] mb-2 flex items-center gap-1.5">👤 Paciente</div>
                <div className="space-y-3">
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Cliente e pet *</label>
                    <BuscaClientePet
                      exigirPet
                      tutorSelecionado={selCliente}
                      petSelecionado={selPet}
                      onSelecionar={({ tutor, pet }) => { setSelCliente({ id: tutor.id, name: tutor.name }); setSelPet(pet ? { id: pet.id, name: pet.name } : null); setForm((f: any) => ({ ...f, tutorId: tutor.id, petId: pet?.id || "" })); }}
                      onLimpar={() => { setSelCliente(null); setSelPet(null); setForm((f: any) => ({ ...f, tutorId: "", petId: "" })); }}
                    /></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Box *</label>
                    <select value={form.boxId} onChange={(e) => setForm({ ...form, boxId: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }}><option value="">{boxesLivres.length ? "Selecione um box..." : "Nenhum box livre — cadastre em ⚙️ Gerenciar boxes"}</option>{form.boxId && !boxesLivres.find((b) => b.id === form.boxId) && (() => { const b = boxes.find((x) => x.id === form.boxId); return b ? <option value={b.id}>{TIPO_EMOJI[b.tipo] || ""} {b.codigo} (selecionado)</option> : null; })()}{boxesLivres.map((b) => <option key={b.id} value={b.id}>{TIPO_EMOJI[b.tipo] || ""} {b.codigo}{b.nome ? ` · ${b.nome}` : ""}</option>)}</select></div>
                </div>
              </div>

              {/* Internação */}
              <div className="pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-[11px] font-medium text-[#014D5E] mb-2 flex items-center gap-1.5">🩺 Internação</div>
                <div className="space-y-3">
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Profissional responsável</label>
                    <select value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }}><option value="">Selecionar...</option>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Motivo da internação *</label>
                    <input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Ex.: Pós-operatório, crise convulsiva..." className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }} /></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1.5">Estado clínico inicial</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {ESTADOS.map((e) => { const on = form.estado === e.v; return (
                        <button type="button" key={e.v} onClick={() => setForm({ ...form, estado: e.v })} className="text-[11px] font-medium py-2 px-1 rounded-lg border text-center transition-colors" style={on ? { background: e.bg, color: e.fg, borderColor: e.fg } : { background: "#fff", color: "#374151", borderColor: "#E8E2D6" }}>{e.v}</button>
                      ); })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Acompanhamento */}
              <div className="pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-[11px] font-medium text-[#014D5E] mb-2 flex items-center gap-1.5">🔔 Acompanhamento</div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Canal com tutor</label>
                    <select value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }}>{CANAIS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Boletins/dia</label>
                    <input type="number" min={0} value={form.boletinsDia} onChange={(e) => setForm({ ...form, boletinsDia: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }} /></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Valor diária (R$)</label>
                    <input type="number" min={0} step="0.01" value={form.dailyRate} onChange={(e) => setForm({ ...form, dailyRate: e.target.value })} placeholder="0,00" className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }} /></div>
                  <div><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Alta prevista</label>
                    <input type="date" value={form.estimatedDischargeDate} onChange={(e) => setForm({ ...form, estimatedDischargeDate: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }} /></div>
                  <div className="col-span-2"><label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Horários dos boletins (HH:MM, separados por vírgula)</label>
                    <input value={form.boletinsHorarios} onChange={(e) => setForm({ ...form, boletinsHorarios: e.target.value })} placeholder="07:00, 14:00, 20:00" className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6]" style={{ borderColor: "#E8E2D6" }} /></div>
                </div>
              </div>

              {/* Observações */}
              <div className="pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Observações gerais</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="Anotações da recepção/veterinário..." className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] text-[#1F2A2E] focus:outline-none focus:border-[#009AAC] focus:ring-2 focus:ring-[#E0F4F6] resize-none" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2 sticky bottom-0" style={{ borderColor: "#E8E2D6", background: "#FBF9F4" }}>
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={criar} disabled={salvando} className="px-5 py-2 text-[13px] font-medium text-white rounded-lg disabled:opacity-60" style={{ background: "#009AAC" }}>{salvando ? "Salvando..." : "🏥 Internar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== DETALHES ===== */}
      {det && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setDetId(null)}>
          <div className="rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <div><h3 className="text-base font-medium text-[#014D5E]">{especieEmoji(det.pet?.species)} {det.pet?.name} <span className="text-[12px] text-[#374151] font-normal">· {det.tutor?.name}</span></h3></div>
              <button onClick={() => setDetId(null)} className="text-[#374151] text-lg leading-none">✕</button>
            </div>
            <div className="p-5 space-y-3 text-[13px]">
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Estado</div><span className="inline-flex text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5" style={{ background: estadoStyle(estadoDe(det)).bg, color: estadoStyle(estadoDe(det)).fg }}>{estadoDe(det)}</span></div>
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Responsável</div><div className="text-[#1F2A2E]">{det.veterinarian?.name || "—"}</div></div>
                <div className="col-span-2"><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Motivo</div><div className="text-[#1F2A2E]">{det.reason || "—"}</div></div>
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Início</div><div className="text-[#1F2A2E]">{fmtData(det.admissionDate)} (dia {diasInternado(det.admissionDate)})</div></div>
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Alta prevista</div><div className="text-[#1F2A2E]">{fmtData(det.estimatedDischargeDate)}</div></div>
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Diária / acumulado</div><div className="text-[#1F2A2E]">{fmtBRL(det.dailyRate)} · {fmtBRL(det.totalCost)}</div></div>
                <div><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Canal</div><div className="text-[#1F2A2E]">{det.vitalSigns?.canalTutor || "—"}</div></div>
                {det.notes && <div className="col-span-2"><div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Observações</div><div className="text-[#5C6B70]">{typeof det.notes === "string" ? det.notes : ""}</div></div>}
              </div>

              {det.status !== "DISCHARGED" && (
                <div className="border-t pt-3" style={{ borderColor: "#F0EBE0" }}>
                  <div className="text-[12px] font-medium text-[#014D5E] mb-2">Registrar boletim</div>
                  <div className="flex gap-2 mb-2">
                    <select value={bolEstado} onChange={(e) => setBolEstado(e.target.value)} className="border rounded-lg px-2 py-1.5 text-[12px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{ESTADOS.map((x) => <option key={x.v} value={x.v}>{x.v}</option>)}</select>
                    <input value={bolTexto} onChange={(e) => setBolTexto(e.target.value)} placeholder="Como o paciente está..." className="flex-1 border rounded-lg px-3 py-1.5 text-[12px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={registrarBoletim} disabled={bolSaving} className="text-[12px] text-white bg-[#009AAC] px-3 py-1.5 rounded-lg disabled:opacity-60">Registrar</button>
                  </div>
                </div>
              )}

              <div className="border-t pt-3" style={{ borderColor: "#F0EBE0" }}>
                <div className="text-[12px] font-medium text-[#014D5E] mb-2">Boletins ({boletins.length})</div>
                {boletins.length === 0 ? (
                  <div className="text-[12px] text-[#374151]">Nenhum boletim ainda.</div>
                ) : (
                  <div className="space-y-2">
                    {boletins.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).map((b) => { const es = estadoStyle(b.estado || ""); return (
                      <div key={b.id} className="bg-white border rounded-lg p-2.5" style={{ borderColor: "#F0EBE0" }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] text-[#5C6B70]">{fmtData(b.at)} {b.hora || ""}</span>
                          {b.estado && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: es.bg, color: es.fg }}>{b.estado}</span>}
                        </div>
                        <div className="text-[12.5px] text-[#1F2A2E]">{b.texto}</div>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            </div>
            <div className="px-5 py-4 border-t flex justify-between gap-2" style={{ borderColor: "#E8E2D6" }}>
              {det.status !== "DISCHARGED" ? <button onClick={() => darAlta(det.id)} className="px-4 py-2 text-[13px] text-[#0F6E56] bg-[#E1F5EE] rounded-lg">Dar alta</button> : <span className="text-[12px] text-[#374151] py-2">Paciente já recebeu alta</span>}
              <button onClick={() => setDetId(null)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
