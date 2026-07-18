"use client";
// [EMP-COWORK] Ficha do paciente internado (Internação F2) — admissão/alta, risco, tutor, evolução médica.
// Internação = appointment (/api/hospitalizations/[id]); extras em vitalSigns (admissao). Evolução em listas intevo_<id>.
// Blocos de F3 (plantão) / F4 (sinais vitais) / F5 (conta) ficam como gancho "próxima fase".

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";

const ESTADOS = [
  { v: "Estável", prio: "LOW", bg: "#E1F5EE", fg: "#0F6E56" },
  { v: "Em observação", prio: "MEDIUM", bg: "#E6F1FB", fg: "#0C447C" },
  { v: "Instável", prio: "HIGH", bg: "#FBEFE0", fg: "#B45309" },
  { v: "Crítico", prio: "CRITICAL", bg: "#FCE9EF", fg: "#CC3366" },
];
const PROGNOSTICOS = ["Bom", "Reservado", "Ruim", "Grave"];
const VIAS = ["IV", "IM", "SC", "VO", "IV (BIC)", "SL", "IN", "Tópico", "Outro"];
const STATUS_MED: Record<string, { lbl: string; bg: string; fg: string }> = {
  atrasado: { lbl: "Atrasada", bg: "#FCE9EF", fg: "#CC3366" },
  pendente: { lbl: "Pendente", bg: "#FDF4DD", fg: "#8a6400" },
  feito: { lbl: "Feita", bg: "#E1F5EE", fg: "#0F6E56" },
};
const hojeISO = () => new Date().toISOString().slice(0, 10);
const MUCOSAS = ["Rósea", "Pálida", "Congesta", "Cianótica", "Ictérica", "Porcelana"];
const TREND_ST: Record<string, { bg: string; fg: string }> = {
  up: { bg: "#FBEFE0", fg: "#B45309" }, down: { bg: "#E1F5EE", fg: "#0F6E56" }, flat: { bg: "#FBF9F4", fg: "#8A989D" },
};
function tendencia(cur: any, prev: any) {
  const c = parseFloat(cur), p = parseFloat(prev);
  if (isNaN(c) || isNaN(p)) return { dir: "flat", ar: "—", txt: "—" };
  const d = c - p;
  if (Math.abs(d) < 1e-9) return { dir: "flat", ar: "—", txt: "estável" };
  return d > 0 ? { dir: "up", ar: "▲", txt: "subindo" } : { dir: "down", ar: "▼", txt: "descendo" };
}
function tempForaFaixa(t: any) { const v = parseFloat(t); return !isNaN(v) && (v > 39.3 || v < 37.2); }
const CAT_FATURAVEL = ["Procedimento", "Medicamento", "Material", "Serviço", "Exame"];
const CAT_CONTA = [...CAT_FATURAVEL, "Insumo"]; // "Insumo" = não-faturável (só baixa estoque)
const prioToEstado: Record<string, string> = { LOW: "Estável", MEDIUM: "Em observação", HIGH: "Instável", CRITICAL: "Crítico" };
function estadoDe(h: any): string { return h?.vitalSigns?.estadoClinico || prioToEstado[h?.priority] || "Estável"; }
function estadoStyle(e: string) { return ESTADOS.find((x) => x.v === e) || ESTADOS[0]; }
function especieEmoji(s?: string) { const k = (s || "").toUpperCase(); if (k.startsWith("CAN") || k.startsWith("DOG")) return "🐶"; if (k.startsWith("FEL") || k.startsWith("CAT") || k.startsWith("GAT")) return "🐱"; return "🐾"; }
const fmtBRL = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
function diasInternado(adm?: string): number { if (!adm) return 1; try { const ms = Date.now() - new Date(adm).getTime(); return Math.max(1, Math.ceil(ms / 86400000)); } catch { return 1; } }
function fmtData(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; } }
function fmtDataHora(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } }
function idadeDe(bd?: string) { if (!bd) return null; try { const anos = Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 86400000)); return anos >= 1 ? `${anos} ano${anos > 1 ? "s" : ""}` : "< 1 ano"; } catch { return null; } }

export default function FichaInternacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "";
  usePageTitle("Ficha de internação", "Paciente internado");

  const [h, setH] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [boxCodigo, setBoxCodigo] = useState<string | null>(null);
  const [boxIdAtual, setBoxIdAtual] = useState<string | null>(null);
  const [boxesLivres, setBoxesLivres] = useState<any[]>([]);
  const [trocaBoxOpen, setTrocaBoxOpen] = useState(false);
  const [boxBusy, setBoxBusy] = useState(false);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [evoTexto, setEvoTexto] = useState("");
  const [evoSaving, setEvoSaving] = useState(false);

  const [admOpen, setAdmOpen] = useState(false);
  const [admForm, setAdmForm] = useState<any>({ pesoEntrada: "", tempEntrada: "", diagnosis: "", prognostico: "", estimatedDischargeDate: "" });
  const [admSaving, setAdmSaving] = useState(false);

  // Prescrição & plantão (F3)
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [doses, setDoses] = useState<any[]>([]);
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescForm, setPrescForm] = useState<any>({ id: "", medicamento: "", via: "IV", dose: "", frequencia: "", horarios: "", observacao: "" });
  const [prescSaving, setPrescSaving] = useState(false);

  // Sinais vitais & fluidos (F4)
  const [vitais, setVitais] = useState<any[]>([]);
  const [fluidos, setFluidos] = useState<any[]>([]);
  const [vitalOpen, setVitalOpen] = useState(false);
  const [vitalForm, setVitalForm] = useState<any>({ fc: "", fr: "", temp: "", pa: "", mucosa: "Rósea", dor: "0" });
  const [vitalSaving, setVitalSaving] = useState(false);
  const [fluidoOpen, setFluidoOpen] = useState(false);
  const [fluidoForm, setFluidoForm] = useState<any>({ entradaFluido: "", agua: "", diurese: "", fezes: "", alimentacao: "", emese: "" });
  const [fluidoSaving, setFluidoSaving] = useState(false);

  // Financeiro (F5)
  const [conta, setConta] = useState<any[]>([]);
  const [fechamentos, setFechamentos] = useState<any[]>([]);
  const [servicos, setServicos] = useState<any[]>([]);
  const [produtos, setProdutos] = useState<any[]>([]);
  const [caucaoSaldo, setCaucaoSaldo] = useState(0);
  const [caucaoAplicada, setCaucaoAplicada] = useState(0);
  const [itemOpen, setItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState<any>({ id: "", descricao: "", categoria: "Procedimento", quantidade: "1", valorUnitario: "", servicoId: "", productId: "" });
  const [itemSaving, setItemSaving] = useState(false);
  const [caucaoOpen, setCaucaoOpen] = useState(false);
  const [caucaoForm, setCaucaoForm] = useState<any>({ valor: "", descricao: "Caução de internação" });
  const [finBusy, setFinBusy] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [d, m, ev, pr, ds, vt, fl, co, fe, sv, pd] = await Promise.all([
        fetch(`/api/hospitalizations/${id}`).then((r) => r.json()).catch(() => null),
        fetch(`/api/boxes/mapa`).then((r) => r.json()).catch(() => ({})),
        fetch(`/api/listas?lista=intevo_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intpresc_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intmed_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intvital_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intfluido_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intconta_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intfechamento_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/servicos/itens`).then((r) => r.json()).catch(() => []),
        fetch(`/api/products?excludeService=1&limit=1000`).then((r) => r.json()).catch(() => []),
      ]);
      setH(d && d.id ? d : null);
      const card = Array.isArray(m?.boxes) ? m.boxes.find((c: any) => c.internacao?.id === id) : null;
      setBoxCodigo(card?.box?.codigo || null);
      setBoxIdAtual(card?.box?.id || null);
      setBoxesLivres(Array.isArray(m?.boxes) ? m.boxes.filter((c: any) => !c.ocupado).map((c: any) => c.box) : []);
      const parse = (raw: any) => { const a = Array.isArray(raw) ? raw : (raw.itens || raw.data || []); return a.map((x: any) => { try { return { id: x.id, ...JSON.parse(x.valor) }; } catch { return { id: x.id }; } }); };
      setEvolucoes(parse(ev));
      setPrescricoes(parse(pr));
      setDoses(parse(ds));
      setVitais(parse(vt));
      setFluidos(parse(fl));
      setConta(parse(co));
      setFechamentos(parse(fe));
      setServicos(Array.isArray(sv) ? sv : (sv.itens || sv.data || []));
      setProdutos(Array.isArray(pd) ? pd : (pd.products || pd.data || []));
      const tutorId = d?.tutor?.id;
      if (tutorId) { try { const cr = await fetch(`/api/credito/tutor/${tutorId}`).then((r) => r.json()); setCaucaoSaldo(Number(cr?.saldo) || 0); } catch { setCaucaoSaldo(0); } }
    } catch {}
    setLoading(false);
  };
  useEffect(() => { if (id) load(); /* eslint-disable-next-line */ }, [id]);

  const estado = h ? estadoDe(h) : "Estável";
  const adm = h?.vitalSigns?.admissao || {};

  const salvarVital = async (patch: any) => {
    // mescla vitalSigns preservando o que já existe
    const vitalSigns = { ...(h?.vitalSigns || {}), ...patch.vitalSigns };
    const body: any = { ...patch, vitalSigns };
    delete body.vitalSigns_merge;
    const res = await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    if (res.ok) load();
    return res.ok;
  };

  const mudarRisco = async (e: string) => {
    const st = estadoStyle(e);
    await salvarVital({ priority: st.prio, vitalSigns: { estadoClinico: e } });
  };

  const abrirAdm = () => {
    setAdmForm({ pesoEntrada: adm.pesoEntrada || "", tempEntrada: adm.tempEntrada || "", diagnosis: h?.diagnosis || "", prognostico: adm.prognostico || "", estimatedDischargeDate: h?.estimatedDischargeDate ? String(h.estimatedDischargeDate).slice(0, 10) : "" });
    setAdmOpen(true);
  };
  const salvarAdm = async () => {
    setAdmSaving(true);
    try {
      await salvarVital({
        diagnosis: admForm.diagnosis || undefined,
        estimatedDischargeDate: admForm.estimatedDischargeDate || undefined,
        vitalSigns: { admissao: { pesoEntrada: admForm.pesoEntrada, tempEntrada: admForm.tempEntrada, prognostico: admForm.prognostico } },
      });
      setAdmOpen(false);
    } finally { setAdmSaving(false); }
  };

  const registrarEvolucao = async () => {
    if (!evoTexto.trim()) return;
    setEvoSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), texto: evoTexto.trim() });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intevo_${id}`, valor }) });
      setEvoTexto(""); load();
    } catch { alert("Erro ao registrar evolução."); }
    finally { setEvoSaving(false); }
  };
  const excluirEvolucao = async (evoId: string) => {
    if (!confirm("Excluir esta evolução?")) return;
    try { await fetch(`/api/listas/${evoId}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };

  // ── Prescrição & plantão (F3) ─────────────────────────────────────
  const abrirPresc = (p?: any) => {
    setPrescForm(p ? { id: p.id, medicamento: p.medicamento || "", via: p.via || "IV", dose: p.dose || "", frequencia: p.frequencia || "", horarios: (p.horarios || []).join(", "), observacao: p.observacao || "" } : { id: "", medicamento: "", via: "IV", dose: "", frequencia: "", horarios: "", observacao: "" });
    setPrescOpen(true);
  };
  const salvarPresc = async () => {
    if (!prescForm.medicamento.trim()) { alert("Informe a medicação."); return; }
    setPrescSaving(true);
    try {
      const horarios = String(prescForm.horarios || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      const payload = { medicamento: prescForm.medicamento.trim(), via: prescForm.via, dose: prescForm.dose.trim(), frequencia: prescForm.frequencia.trim(), horarios, observacao: prescForm.observacao.trim() };
      if (prescForm.id) {
        await fetch(`/api/listas/${prescForm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      } else {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intpresc_${id}`, valor: JSON.stringify(payload) }) });
      }
      setPrescOpen(false); load();
    } catch { alert("Erro ao salvar medicação."); }
    finally { setPrescSaving(false); }
  };
  const excluirPresc = async (p: any) => {
    if (!confirm(`Remover ${p.medicamento} da prescrição?`)) return;
    try { await fetch(`/api/listas/${p.id}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };
  const marcarDose = async (slot: any) => {
    try {
      if (slot.log) {
        await fetch(`/api/listas/${slot.log.id}`, { method: "DELETE", credentials: "include" });
      } else {
        const now = new Date();
        const valor = JSON.stringify({ prescId: slot.p.id, med: slot.p.medicamento, via: slot.p.via, dose: slot.p.dose, slot: slot.hhmm, date: hojeISO(), at: now.toISOString(), por: userName });
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intmed_${id}`, valor }) });
      }
      load();
    } catch {}
  };

  // ── Sinais vitais & fluidos (F4) ──────────────────────────────────
  const registrarVital = async () => {
    if (![vitalForm.fc, vitalForm.fr, vitalForm.temp, vitalForm.pa].some((x) => String(x).trim())) { alert("Preencha ao menos um sinal vital."); return; }
    setVitalSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), fc: vitalForm.fc, fr: vitalForm.fr, temp: vitalForm.temp, pa: vitalForm.pa, mucosa: vitalForm.mucosa, dor: vitalForm.dor, por: userName });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intvital_${id}`, valor }) });
      setVitalForm({ fc: "", fr: "", temp: "", pa: "", mucosa: "Rósea", dor: "0" }); setVitalOpen(false); load();
    } catch { alert("Erro ao registrar aferição."); }
    finally { setVitalSaving(false); }
  };
  const excluirVital = async (vId: string) => { if (!confirm("Excluir esta aferição?")) return; try { await fetch(`/api/listas/${vId}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  const registrarFluido = async () => {
    if (![fluidoForm.entradaFluido, fluidoForm.agua, fluidoForm.diurese, fluidoForm.fezes, fluidoForm.alimentacao, fluidoForm.emese].some((x) => String(x).trim())) { alert("Preencha ao menos um campo."); return; }
    setFluidoSaving(true);
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), entradaFluido: fluidoForm.entradaFluido, agua: fluidoForm.agua, diurese: fluidoForm.diurese, fezes: fluidoForm.fezes, alimentacao: fluidoForm.alimentacao, emese: fluidoForm.emese, por: userName });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intfluido_${id}`, valor }) });
      setFluidoForm({ entradaFluido: "", agua: "", diurese: "", fezes: "", alimentacao: "", emese: "" }); setFluidoOpen(false); load();
    } catch { alert("Erro ao registrar controle."); }
    finally { setFluidoSaving(false); }
  };
  const excluirFluido = async (fId: string) => { if (!confirm("Excluir este registro?")) return; try { await fetch(`/api/listas/${fId}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  // ── Financeiro (F5) ───────────────────────────────────────────────
  const contaCalc = () => {
    const dias = diasInternado(h?.admissionDate);
    const diariaVU = Number(h?.dailyRate) || 0;
    const diariaTotal = dias * diariaVU;
    const itensFat = conta.filter((i) => i.categoria !== "Insumo");
    const itensInsumo = conta.filter((i) => i.categoria === "Insumo");
    const totalItensFat = itensFat.reduce((s, i) => s + (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0), 0);
    const totalFaturavel = diariaTotal + totalItensFat;
    return { dias, diariaVU, diariaTotal, itensFat, itensInsumo, totalFaturavel };
  };
  const abrirItem = (p?: any) => { setItemForm(p ? { id: p.id, descricao: p.descricao || "", categoria: p.categoria || "Procedimento", quantidade: String(p.quantidade || "1"), valorUnitario: String(p.valorUnitario ?? ""), servicoId: p.servicoId || "", productId: p.productId || "" } : { id: "", descricao: "", categoria: "Procedimento", quantidade: "1", valorUnitario: "", servicoId: "", productId: "" }); setItemOpen(true); };
  const pickServico = (sid: string) => { const s = servicos.find((x) => x.id === sid); setItemForm((f: any) => ({ ...f, servicoId: sid, descricao: s?.nome || f.descricao, valorUnitario: s?.valorPadrao != null ? String(s.valorPadrao) : f.valorUnitario })); };
  const pickProduto = (pid: string) => { const p = produtos.find((x) => x.id === pid); setItemForm((f: any) => ({ ...f, productId: pid, descricao: p?.name || f.descricao })); };
  const salvarItem = async () => {
    if (!itemForm.descricao.trim()) { alert("Informe a descrição do item."); return; }
    setItemSaving(true);
    try {
      const insumo = itemForm.categoria === "Insumo";
      const payload = { descricao: itemForm.descricao.trim(), categoria: itemForm.categoria, quantidade: Number(itemForm.quantidade) || 1, valorUnitario: insumo ? 0 : (Number(itemForm.valorUnitario) || 0), servicoId: itemForm.servicoId || "", productId: itemForm.productId || "", baixado: false };
      if (itemForm.id) await fetch(`/api/listas/${itemForm.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
      else await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intconta_${id}`, valor: JSON.stringify(payload) }) });
      setItemOpen(false); load();
    } catch { alert("Erro ao salvar item."); }
    finally { setItemSaving(false); }
  };
  const excluirItem = async (i: any) => { if (!confirm(`Remover ${i.descricao} da conta?`)) return; try { await fetch(`/api/listas/${i.id}`, { method: "DELETE", credentials: "include" }); load(); } catch {} };

  const adicionarCaucao = async () => {
    const valor = Number(caucaoForm.valor);
    if (!valor || valor <= 0) { alert("Informe o valor da caução."); return; }
    setFinBusy("caucao");
    try {
      const res = await fetch("/api/credito", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tutorId: h.tutor?.id, appointmentId: id, tipo: "RECARGA", valor, descricao: caucaoForm.descricao || "Caução de internação" }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || ""); }
      setCaucaoOpen(false); setCaucaoForm({ valor: "", descricao: "Caução de internação" }); load();
    } catch (e: any) { alert(e?.message || "Erro ao adicionar caução."); }
    finally { setFinBusy(""); }
  };
  const aplicarCaucao = () => { const { totalFaturavel } = contaCalc(); setCaucaoAplicada(caucaoAplicada > 0 ? 0 : Math.min(caucaoSaldo, totalFaturavel)); };

  const enviarCaixa = async () => {
    const { dias, diariaVU, itensFat, totalFaturavel } = contaCalc();
    if (totalFaturavel <= 0) { alert("Não há itens faturáveis para enviar."); return; }
    const cauc = Math.min(caucaoAplicada, totalFaturavel);
    if (!confirm(`Enviar pro Caixa a venda de ${fmtBRL(totalFaturavel)}${cauc > 0 ? ` (caução ${fmtBRL(cauc)} aplicada · saldo a receber ${fmtBRL(totalFaturavel - cauc)})` : ""}?`)) return;
    setFinBusy("caixa");
    try {
      const itens = [
        { descricao: `Diária internação (${dias}×)`, quantidade: dias, valorUnitario: diariaVU, desconto: 0 },
        ...itensFat.map((i) => ({ servicoId: i.servicoId || undefined, descricao: i.descricao, quantidade: Number(i.quantidade) || 1, valorUnitario: Number(i.valorUnitario) || 0, desconto: 0 })),
      ].filter((it) => it.quantidade > 0 && (it.valorUnitario > 0 || it.descricao));
      const body = {
        tutorId: h.tutor?.id, petId: h.pet?.id, userId: (session as any)?.user?.id || h.veterinarian?.id || undefined, date: new Date().toISOString(),
        itens, tipo: "VENDA", observacao: `Internação${boxCodigo ? ` · Box ${boxCodigo}` : ""} · ${h.pet?.name}`,
        formas: cauc > 0 ? [{ forma: "Crédito", valor: Number(cauc.toFixed(2)) }] : [],
      };
      const res = await fetch("/api/caixa/pdv", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
      const dd = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dd?.message || "Erro ao enviar pro Caixa");
      const now = new Date();
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intfechamento_${id}`, valor: JSON.stringify({ at: now.toISOString(), tipo: "caixa", total: totalFaturavel, caucao: cauc, por: userName }) }) });
      alert("Venda enviada pro Caixa! ✅");
      setCaucaoAplicada(0); load();
    } catch (e: any) { alert((e?.message || "Erro ao enviar pro Caixa.") + "\nConfira se há um caixa aberto."); }
    finally { setFinBusy(""); }
  };

  const baixarInsumos = async () => {
    const insumos = conta.filter((i) => i.categoria === "Insumo" && i.productId && !i.baixado);
    if (insumos.length === 0) { alert("Nenhum insumo vinculado a produto para baixar (ou já baixados)."); return; }
    if (!confirm(`Baixar do estoque ${insumos.length} insumo(s)?`)) return;
    setFinBusy("estoque");
    try {
      for (const i of insumos) {
        const r = await fetch("/api/stock/movements", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ productId: i.productId, type: "OUT", quantity: Number(i.quantidade) || 1, reason: `Internação ${h.pet?.name}${boxCodigo ? ` · Box ${boxCodigo}` : ""}` }) });
        if (r.ok) {
          const payload = { descricao: i.descricao, categoria: i.categoria, quantidade: Number(i.quantidade) || 1, valorUnitario: 0, servicoId: "", productId: i.productId, baixado: true };
          await fetch(`/api/listas/${i.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor: JSON.stringify(payload) }) });
        }
      }
      alert("Insumos baixados do estoque. 📦");
      load();
    } catch { alert("Erro ao baixar estoque."); }
    finally { setFinBusy(""); }
  };

  const boletimFinanceiro = async () => {
    const { dias, diariaTotal, itensFat, totalFaturavel } = contaCalc();
    const linhas = [
      `*Boletim financeiro — ${h.pet?.name}*`,
      boxCodigo ? `Box ${boxCodigo} · ${dias}º dia de internação` : `${dias}º dia de internação`,
      ``,
      `Diárias (${dias}×): ${fmtBRL(diariaTotal)}`,
      ...itensFat.map((i) => `${i.descricao}: ${fmtBRL((Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0))}`),
      ``,
      `*Total: ${fmtBRL(totalFaturavel)}*`,
      caucaoSaldo > 0 ? `Caução em conta: ${fmtBRL(caucaoSaldo)}` : null,
      `Saldo estimado: ${fmtBRL(Math.max(0, totalFaturavel - caucaoSaldo))}`,
    ].filter((x) => x != null);
    const texto = linhas.join("\n");
    setFinBusy("boletim");
    try {
      const res = await fetch("/api/survey-avaliacao/mensagem-tutor", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tutorId: h.tutor?.id, texto }) });
      if (!res.ok) throw new Error();
      alert("Boletim financeiro enviado pelo WhatsApp. ✅");
    } catch { openWhatsAppMeta(h.tutor?.phone); }
    finally { setFinBusy(""); }
  };

  // Troca/atribui o box desta internação. "" = remover do box (liberar).
  const trocarBox = async (novoBoxId: string) => {
    setBoxBusy(true);
    try {
      if (novoBoxId) {
        // ocupar o novo box já encerra a ocupação anterior desta internação
        await fetch(`/api/boxes/${novoBoxId}/ocupar`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ appointmentId: id }) });
      } else if (boxIdAtual) {
        await fetch(`/api/boxes/${boxIdAtual}/liberar`, { method: "POST", credentials: "include" });
      }
      setTrocaBoxOpen(false); load();
    } catch { alert("Erro ao trocar o box."); }
    finally { setBoxBusy(false); }
  };

  const excluirInternacao = async () => {
    if (!confirm(`Excluir a internação de ${h.pet?.name || "este paciente"}? Essa ação não pode ser desfeita. O box será liberado e todos os registros (evoluções, boletins, conta) serão perdidos.`)) return;
    setBoxBusy(true);
    try {
      if (boxIdAtual) await fetch(`/api/boxes/${boxIdAtual}/liberar`, { method: "POST", credentials: "include" }).catch(() => {});
      const res = await fetch(`/api/hospitalizations/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error();
      router.push("/dashboard/erp/internacoes");
    } catch { alert("Erro ao excluir a internação."); setBoxBusy(false); }
  };

  const darAlta = async () => {
    if (!confirm("Confirmar alta deste paciente? O box será liberado.")) return;
    try {
      await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DISCHARGED" }) });
      const m = await fetch(`/api/boxes/mapa`).then((r) => r.json()).catch(() => ({}));
      const card = Array.isArray(m?.boxes) ? m.boxes.find((c: any) => c.internacao?.id === id) : null;
      if (card?.box?.id) await fetch(`/api/boxes/${card.box.id}/liberar`, { method: "POST", credentials: "include" }).catch(() => {});
      router.push("/dashboard/erp/internacoes");
    } catch { alert("Erro ao dar alta."); }
  };

  const evolucoesOrd = useMemo(() => [...evolucoes].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()), [evolucoes]);
  const plantao = useMemo(() => {
    const now = new Date(); const hj = hojeISO(); const arr: any[] = [];
    for (const p of prescricoes) {
      for (const hhmm of (p.horarios || [])) {
        const log = doses.find((d) => d.prescId === p.id && d.slot === hhmm && d.date === hj);
        let status: "feito" | "atrasado" | "pendente";
        if (log) status = "feito";
        else { const [hh, mm] = String(hhmm).split(":").map(Number); const dt = new Date(); dt.setHours(hh || 0, mm || 0, 0, 0); status = dt < now ? "atrasado" : "pendente"; }
        arr.push({ p, hhmm, status, log });
      }
    }
    arr.sort((a, b) => { const da = a.status === "feito" ? 1 : 0, db = b.status === "feito" ? 1 : 0; if (da !== db) return da - db; return String(a.hhmm).localeCompare(String(b.hhmm)); });
    return arr;
  }, [prescricoes, doses]);
  const contMed = useMemo(() => ({ atras: plantao.filter((s) => s.status === "atrasado").length, pend: plantao.filter((s) => s.status === "pendente").length, feito: plantao.filter((s) => s.status === "feito").length }), [plantao]);
  const vitaisOrd = useMemo(() => [...vitais].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()), [vitais]);
  const fluidosOrd = useMemo(() => [...fluidos].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()), [fluidos]);
  const sparkTemp = useMemo(() => {
    const pts = [...vitais].sort((a, b) => new Date(a.at || 0).getTime() - new Date(b.at || 0).getTime()).map((v) => parseFloat(v.temp)).filter((n) => !isNaN(n)).slice(-8);
    if (pts.length < 2) return null;
    const min = Math.min(...pts), max = Math.max(...pts), range = max - min || 1, W = 240, H = 40, pad = 6;
    const step = (W - pad * 2) / (pts.length - 1);
    const coords = pts.map((t, i) => { const x = pad + i * step; const y = H - pad - ((t - min) / range) * (H - pad * 2); return `${x.toFixed(0)},${y.toFixed(0)}`; });
    return { poly: coords.join(" "), last: coords[coords.length - 1].split(","), min, max, W, H };
  }, [vitais]);

  if (loading) return <div className="p-6 text-center text-sm text-[#8A989D]">Carregando ficha...</div>;
  if (!h) return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[13px] text-[#009AAC] mb-3">← Voltar ao mapa</button>
      <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#8A989D]" style={{ borderColor: "#E8E2D6" }}>Internação não encontrada.</div>
    </div>
  );

  const st = estadoStyle(estado);
  const alta = h.status === "DISCHARGED";
  const ultVital = vitaisOrd[0]; const antVital = vitaisOrd[1]; const ultFluido = fluidosOrd[0];
  const VITAIS_BIG: [string, string, string][] = [["FC", "bpm", "fc"], ["FR", "mpm", "fr"], ["Temp", "°C", "temp"], ["Dor", "/4", "dor"]];
  const cc = contaCalc();
  const caucAplic = Math.min(caucaoAplicada, cc.totalFaturavel);
  const saldoPagar = Math.max(0, cc.totalFaturavel - caucAplic);
  const CAT_PILL: Record<string, { bg: string; fg: string }> = { Diária: { bg: "#E8F1F8", fg: "#1f5a82" }, Insumo: { bg: "#F0EBE0", fg: "#8A7B63" } };
  const catStyle = (c: string) => CAT_PILL[c] || { bg: "#E0F4F6", fg: "#00707E" };

  const Ch = ({ children, editar }: { children: React.ReactNode; editar?: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
      <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">{children}</h3>
      {editar && <button onClick={editar} className="text-[13px] text-[#8A989D] hover:text-[#009AAC]">✏️</button>}
    </div>
  );
  const Field = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="mb-2.5 last:mb-0"><div className="text-[10.5px] text-[#8A989D] uppercase tracking-wide mb-0.5">{k}</div><div className="text-[13.5px] text-[#1F2A2E] font-medium">{children}</div></div>
  );
  const GanchoCard = ({ emoji, titulo, desc }: { emoji: string; titulo: string; desc: string }) => (
    <div className="bg-white border rounded-[13px] px-4 py-3.5 flex items-center gap-3 opacity-90" style={{ borderColor: "#E8E2D6" }}>
      <div className="text-xl">{emoji}</div>
      <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-[#014D5E]">{titulo}</div><div className="text-[11.5px] text-[#8A989D]">{desc}</div></div>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#F0EBE0", color: "#8A989D" }}>🔒 próxima fase</span>
    </div>
  );

  return (
    <>
      {/* ===== APP (oculto na impressão) ===== */}
      <div className="p-6 max-w-6xl mx-auto print:hidden">
        {/* breadcrumb + voltar */}
        <div className="flex items-center gap-2 text-[12.5px] text-[#8A989D] mb-2">
          <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[#8A989D] hover:text-[#009AAC]">←</button>
          <Link href="/dashboard/erp/internacoes" className="hover:text-[#009AAC]">Internação</Link>
          <span>/</span><span className="text-[#009AAC] font-medium">{boxCodigo ? `Box ${boxCodigo}` : "Ficha"}</span>
        </div>

        {/* header */}
        <div className="flex items-center gap-3.5 mb-5 flex-wrap">
          <div className="w-13 h-13 rounded-xl flex items-center justify-center text-3xl flex-shrink-0" style={{ background: st.bg, width: 52, height: 52 }}>{especieEmoji(h.pet?.species)}</div>
          <div>
            <h1 className="text-xl font-medium text-[#014D5E] flex items-center gap-2.5 flex-wrap">
              {h.pet?.name || "Pet"}
              <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: st.bg, color: st.fg }}>{estado}</span>
              {!alta ? <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "#E8F1F8", color: "#1f5a82" }}>D{diasInternado(h.admissionDate)} de internação</span> : <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>Alta • {fmtData(h.actualDischargeDate)}</span>}
            </h1>
            <div className="text-[12.5px] text-[#8A989D] mt-0.5">
              {[h.pet?.breed, h.pet?.gender, idadeDe(h.pet?.birthDate), h.pet?.weight ? `${h.pet.weight} kg` : null, boxCodigo ? `Box ${boxCodigo}` : null, h.tutor?.name ? `Tutor(a): ${h.tutor.name}` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            <button onClick={() => openWhatsAppMeta(h.tutor?.phone)} className="text-[12.5px] font-medium text-white bg-[#009AAC] px-3 py-2 rounded-lg">💬 WhatsApp</button>
            {h.pet?.id && <Link href={`/dashboard/erp/pets/${h.pet.id}`} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>📄 Ficha do pet</Link>}
            <button onClick={() => window.print()} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🖨️ Resumo de alta</button>
            {!alta && <button onClick={() => setTrocaBoxOpen(true)} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🛏️ Trocar box</button>}
            {!alta && <button onClick={darAlta} className="text-[12.5px] font-medium text-[#CC3366] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#EAC3C1" }}>🚪 Dar alta</button>}
            <button onClick={excluirInternacao} disabled={boxBusy} className="text-[12.5px] font-medium text-[#8A989D] bg-white border px-3 py-2 rounded-lg disabled:opacity-50" style={{ borderColor: "#E8E2D6" }} title="Excluir internação">🗑️</button>
          </div>
        </div>

        {/* ===== TROCAR BOX ===== */}
        {trocaBoxOpen && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setTrocaBoxOpen(false)}>
            <div className="rounded-2xl shadow-xl max-w-sm w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
                <h3 className="text-base font-medium text-[#014D5E]">🛏️ Trocar box</h3>
                <button onClick={() => setTrocaBoxOpen(false)} className="text-[#8A989D] text-lg leading-none">✕</button>
              </div>
              <div className="p-5">
                <div className="text-[12px] text-[#8A989D] mb-2">Box atual: <span className="font-medium text-[#1F2A2E]">{boxCodigo ? `Box ${boxCodigo}` : "sem box"}</span></div>
                {boxesLivres.length === 0 ? (
                  <div className="text-[12.5px] text-[#8A989D] py-2">Nenhum box livre no momento.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {boxesLivres.map((b) => (
                      <button key={b.id} onClick={() => trocarBox(b.id)} disabled={boxBusy} className="w-full text-left text-[13px] bg-white border rounded-lg px-3 py-2 hover:border-[#009AAC] disabled:opacity-50" style={{ borderColor: "#E8E2D6" }}>
                        {b.codigo}{b.nome ? <span className="text-[11px] text-[#8A989D]"> · {b.nome}</span> : null}
                      </button>
                    ))}
                  </div>
                )}
                {boxIdAtual && (
                  <button onClick={() => trocarBox("")} disabled={boxBusy} className="w-full mt-3 text-[12.5px] text-[#CC3366] bg-white border py-2 rounded-lg disabled:opacity-50" style={{ borderColor: "#EAC3C1" }}>Remover do box (deixar sem box)</button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* ===== COLUNA ESQUERDA ===== */}
          <div className="flex flex-col gap-4">
            {/* risco */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>🚦 Nível de risco</Ch>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-1.5">
                  {ESTADOS.map((e) => {
                    const on = estado === e.v;
                    return <button key={e.v} onClick={() => mudarRisco(e.v)} disabled={alta} className="text-[11.5px] font-medium py-2 px-1 rounded-lg border text-center disabled:opacity-60" style={on ? { background: e.bg, color: e.fg, borderColor: e.fg } : { background: "#FBF9F4", color: "#8A989D", borderColor: "transparent" }}>{e.v}</button>;
                  })}
                </div>
                <div className="text-[10.5px] text-[#8A989D] mt-2.5">Sinaliza a cor no mapa e no painel da TV.</div>
              </div>
            </div>

            {/* admissão */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch editar={alta ? undefined : abrirAdm}>📋 Admissão</Ch>
              <div className="p-4">
                <Field k="Entrada">{fmtDataHora(h.admissionDate)}</Field>
                <Field k="Peso / temp. de entrada">{[adm.pesoEntrada ? `${adm.pesoEntrada} kg` : null, adm.tempEntrada ? `${adm.tempEntrada} °C` : null].filter(Boolean).join(" · ") || "—"}</Field>
                <Field k="Motivo / diagnóstico">{h.diagnosis || h.reason || "—"}</Field>
                <Field k="Prognóstico">{adm.prognostico ? <span className="inline-flex text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FDF4DD", color: "#8a6400" }}>{adm.prognostico}</span> : "—"}</Field>
                <Field k="Predição de alta">{h.estimatedDischargeDate ? fmtData(h.estimatedDischargeDate) : "—"}</Field>
                <Field k="Veterinário responsável">{h.veterinarian?.name || "—"}</Field>
              </div>
            </div>

            {/* tutor */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>👤 Tutor</Ch>
              <div className="p-4">
                <Field k="Nome">{h.tutor?.name || "—"}</Field>
                <Field k="Contato"><span className="text-[#009AAC]">{h.tutor?.phone || "—"}</span></Field>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => openWhatsAppMeta(h.tutor?.phone)} className="flex-1 text-[12px] text-white bg-[#009AAC] py-2 rounded-lg">💬 WhatsApp</button>
                  {h.tutor?.id && <Link href={`/dashboard/erp/tutores/${h.tutor.id}`} className="flex-1 text-center text-[12px] text-[#00798A] bg-[#E6F6F8] py-2 rounded-lg">Ficha</Link>}
                </div>
              </div>
            </div>
          </div>

          {/* ===== COLUNA DIREITA ===== */}
          <div className="flex flex-col gap-4">
            {/* evolução médica (F2) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <Ch>📝 Evolução médica</Ch>
              <div className="p-4">
                {!alta && (
                  <div className="flex gap-2 mb-3">
                    <input value={evoTexto} onChange={(e) => setEvoTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") registrarEvolucao(); }} placeholder="Registrar evolução do paciente..." className="flex-1 border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={registrarEvolucao} disabled={evoSaving} className="text-[12.5px] text-white bg-[#009AAC] px-3.5 py-2 rounded-lg disabled:opacity-60">Registrar</button>
                  </div>
                )}
                {evolucoesOrd.length === 0 ? (
                  <div className="text-[12.5px] text-[#8A989D] py-3 text-center">Nenhuma evolução registrada ainda.</div>
                ) : (
                  <div className="space-y-0">
                    {evolucoesOrd.map((e, i) => (
                      <div key={e.id} className="py-3 border-b last:border-b-0 pl-3" style={{ borderColor: "#F0EBE0", borderLeft: i === 0 ? "2px solid #009AAC" : "2px solid #E8E2D6" }}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-[#8A989D]">{fmtDataHora(e.at)}</div>
                          <button onClick={() => excluirEvolucao(e.id)} className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366]">🗑️</button>
                        </div>
                        <div className="text-[13px] text-[#5C6B70] mt-0.5">{e.texto}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prescrição (F3) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💊 Prescrição ativa</h3>
                {!alta && <button onClick={() => abrirPresc()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Adicionar</button>}
              </div>
              {prescricoes.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Nenhuma medicação prescrita ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Via</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Freq.</th><th className="text-left font-medium px-2 py-2">Horários</th><th className="px-2 py-2"></th>
                    </tr></thead>
                    <tbody>
                      {prescricoes.map((p) => (
                        <tr key={p.id} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-4 py-2 font-medium text-[#014D5E] whitespace-nowrap">{p.medicamento}</td>
                          <td className="px-2 py-2"><span className="text-[11px] text-[#5C6B70] bg-[#FBF9F4] border rounded px-1.5 py-0.5 whitespace-nowrap" style={{ borderColor: "#E8E2D6" }}>{p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{p.dose || "—"}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{p.frequencia || "—"}</td>
                          <td className="px-2 py-2 tabular-nums text-[#5C6B70] whitespace-nowrap">{(p.horarios || []).join(" · ") || "contínuo"}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && <><button onClick={() => abrirPresc(p)} className="text-[12px] px-1">✏️</button><button onClick={() => excluirPresc(p)} className="text-[12px] px-1">🗑️</button></>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Plantão de hoje (F3) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">📋 Plantão de hoje</h3>
                <div className="flex gap-1.5">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FCE9EF", color: "#CC3366" }}>🔴 {contMed.atras}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#FDF4DD", color: "#8a6400" }}>🟡 {contMed.pend}</span>
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E1F5EE", color: "#0F6E56" }}>🟢 {contMed.feito}</span>
                </div>
              </div>
              {plantao.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Sem doses com horário hoje. Adicione medicações com horários na prescrição.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Hora</th><th className="text-left font-medium px-2 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Status</th><th className="text-left font-medium px-2 py-2">Por</th><th className="px-2 py-2 text-center">Feita</th>
                    </tr></thead>
                    <tbody>
                      {plantao.map((s) => { const stt = STATUS_MED[s.status]; const done = s.status === "feito"; return (
                        <tr key={s.p.id + s.hhmm} className="border-t" style={{ borderColor: "#F0EBE0", opacity: done ? 0.6 : 1 }}>
                          <td className="px-4 py-2 tabular-nums font-medium whitespace-nowrap">{s.hhmm}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{s.p.medicamento} <span className="text-[11px] text-[#8A989D]">{s.p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{s.p.dose || "—"}</td>
                          <td className="px-2 py-2"><span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: stt.bg, color: stt.fg }}>{stt.lbl}</span></td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{s.log?.por || "—"}</td>
                          <td className="px-2 py-2 text-center"><button onClick={() => { if (!alta) marcarDose(s); }} disabled={alta} className="w-5 h-5 rounded-md border inline-flex items-center justify-center text-[12px] disabled:cursor-default" style={done ? { background: "#0F6E56", borderColor: "#0F6E56", color: "#fff" } : { background: "#fff", borderColor: "#E8E2D6", color: "transparent" }}>✓</button></td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              )}
              {!alta && <div className="px-4 py-2.5 text-[11px] text-[#8A989D] border-t" style={{ borderColor: "#F0EBE0" }}>Marcar a dose registra quem aplicou ({userName || "você"}) e a hora.</div>}
            </div>

            {/* Sinais vitais (F4) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">🩺 Sinais vitais{ultVital?.hora ? <span className="text-[11px] text-[#8A989D] font-normal">· última {ultVital.hora}</span> : null}</h3>
                {!alta && <button onClick={() => setVitalOpen(true)} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Registrar aferição</button>}
              </div>
              {vitaisOrd.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Nenhuma aferição registrada ainda.</div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {VITAIS_BIG.map(([lbl, un, f]) => {
                      const val = ultVital?.[f]; const tr = tendencia(ultVital?.[f], antVital?.[f]); const trS = TREND_ST[tr.dir]; const al = f === "temp" && tempForaFaixa(val);
                      return (
                        <div key={f} className="rounded-[11px] border px-2 py-3 text-center" style={{ background: "#FBF9F4", borderColor: "#F0EBE0" }}>
                          <div className="text-[22px] leading-none font-medium tabular-nums" style={{ color: al ? "#CC3366" : "#014D5E" }}>{val || "—"}<small className="text-[11px] text-[#8A989D] font-normal">{un}</small></div>
                          <div className="text-[10px] text-[#8A989D] uppercase tracking-wide mt-1.5">{lbl}</div>
                          {antVital && <div className="inline-flex items-center gap-1 text-[10px] mt-1 px-2 py-0.5 rounded-full" style={{ background: trS.bg, color: trS.fg }}>{tr.ar} {al && f === "temp" ? "alerta" : tr.txt}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {sparkTemp && (
                    <div className="flex items-center gap-2.5 mt-3.5">
                      <span className="text-[10px] text-[#8A989D] uppercase tracking-wide">Temp · últimas</span>
                      <svg width={sparkTemp.W} height={sparkTemp.H} viewBox={`0 0 ${sparkTemp.W} ${sparkTemp.H}`} className="max-w-full">
                        <line x1="0" y1={sparkTemp.H - 4} x2={sparkTemp.W} y2={sparkTemp.H - 4} stroke="#F0EBE0" strokeWidth="1" />
                        <polyline points={sparkTemp.poly} fill="none" stroke="#009AAC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={sparkTemp.last[0]} cy={sparkTemp.last[1]} r="3.5" fill="#009AAC" />
                      </svg>
                      <span className="text-[11px] text-[#8A989D] tabular-nums">{sparkTemp.min.toFixed(1)} → {sparkTemp.max.toFixed(1)} °C</span>
                    </div>
                  )}
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-[12.5px]">
                      <thead><tr className="text-[10px] text-[#8A989D] uppercase tracking-wide">
                        <th className="text-left font-medium px-3 py-2">Hora</th><th className="text-left font-medium px-2 py-2">FC</th><th className="text-left font-medium px-2 py-2">FR</th><th className="text-left font-medium px-2 py-2">Temp</th><th className="text-left font-medium px-2 py-2">PA</th><th className="text-left font-medium px-2 py-2">Mucosa</th><th className="text-left font-medium px-2 py-2">Dor</th><th className="text-left font-medium px-2 py-2">Por</th><th className="px-2 py-2"></th>
                      </tr></thead>
                      <tbody>
                        {vitaisOrd.map((v) => (
                          <tr key={v.id} className="border-t tabular-nums" style={{ borderColor: "#F0EBE0" }}>
                            <td className="px-3 py-2 whitespace-nowrap">{v.hora || "—"}</td><td className="px-2 py-2">{v.fc || "—"}</td><td className="px-2 py-2">{v.fr || "—"}</td>
                            <td className="px-2 py-2 whitespace-nowrap" style={tempForaFaixa(v.temp) ? { color: "#CC3366", fontWeight: 500 } : {}}>{v.temp ? `${v.temp}°` : "—"}</td>
                            <td className="px-2 py-2 whitespace-nowrap">{v.pa || "—"}</td><td className="px-2 py-2">{v.mucosa || "—"}</td><td className="px-2 py-2">{v.dor ?? "—"}</td>
                            <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{v.por || "—"}</td>
                            <td className="px-2 py-2 text-right">{!alta && <button onClick={() => excluirVital(v.id)} className="text-[12px]">🗑️</button>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Fluidos, dejetos & alimentação (F4) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💧 Fluidos, dejetos &amp; alimentação{ultFluido?.hora ? <span className="text-[11px] text-[#8A989D] font-normal">· último {ultFluido.hora}</span> : null}</h3>
                {!alta && <button onClick={() => setFluidoOpen(true)} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Registrar controle</button>}
              </div>
              {!ultFluido ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#8A989D]">Nenhum controle registrado ainda.</div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-2 rounded-[11px] border overflow-hidden" style={{ borderColor: "#F0EBE0" }}>
                    {[["💧 Entrada (fluido)", ultFluido.entradaFluido ? `${ultFluido.entradaFluido} ml` : "—"], ["🥤 Ingestão de água", ultFluido.agua ? `${ultFluido.agua} ml` : "—"], ["🚻 Diurese", ultFluido.diurese || "—"], ["💩 Fezes", ultFluido.fezes || "—"], ["🍽️ Alimentação", ultFluido.alimentacao || "—"], ["🤢 Êmese", ultFluido.emese || "—"]].map(([lbl, val], i) => (
                      <div key={lbl} className="flex justify-between items-center px-3.5 py-2.5 border-b" style={{ borderColor: "#F0EBE0", borderRight: i % 2 === 0 ? "1px solid #F0EBE0" : undefined }}>
                        <span className="text-[12px] text-[#5C6B70]">{lbl}</span><span className="text-[13px] font-medium text-[#014D5E]">{val}</span>
                      </div>
                    ))}
                  </div>
                  {fluidosOrd.length > 0 && (
                    <div className="mt-3 space-y-0">
                      {fluidosOrd.map((f) => (
                        <div key={f.id} className="flex items-start gap-2 text-[12px] py-1.5 border-t" style={{ borderColor: "#F0EBE0" }}>
                          <span className="text-[#8A989D] tabular-nums whitespace-nowrap w-[92px] flex-shrink-0">{f.hora}{f.por ? ` · ${f.por}` : ""}</span>
                          <span className="text-[#5C6B70] flex-1">{[f.entradaFluido && `fluido ${f.entradaFluido} ml`, f.agua && `água ${f.agua} ml`, f.diurese && `diurese ${f.diurese}`, f.fezes && `fezes ${f.fezes}`, f.alimentacao && `alim. ${f.alimentacao}`, f.emese && `êmese ${f.emese}`].filter(Boolean).join(" · ") || "—"}</span>
                          {!alta && <button onClick={() => excluirFluido(f.id)} className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366]">🗑️</button>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Conta da internação (F5) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">🧾 Conta da internação</h3>
                {!alta && <button onClick={() => abrirItem()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Adicionar item</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">
                    <th className="text-left font-medium px-4 py-2">Item</th><th className="text-left font-medium px-2 py-2">Categoria</th><th className="text-right font-medium px-2 py-2">Qtd</th><th className="text-right font-medium px-2 py-2">Valor</th><th className="text-right font-medium px-2 py-2">Total</th><th className="px-2 py-2"></th>
                  </tr></thead>
                  <tbody>
                    <tr className="border-t" style={{ borderColor: "#F0EBE0" }}>
                      <td className="px-4 py-2 whitespace-nowrap">Diária internação</td>
                      <td className="px-2 py-2"><span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E8F1F8", color: "#1f5a82" }}>Diária · auto</span></td>
                      <td className="px-2 py-2 text-right tabular-nums">{cc.dias}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtBRL(cc.diariaVU)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{fmtBRL(cc.diariaTotal)}</td>
                      <td></td>
                    </tr>
                    {conta.map((i) => { const insumo = i.categoria === "Insumo"; const cs = catStyle(i.categoria); const tot = insumo ? 0 : (Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0); return (
                      <tr key={i.id} className="border-t" style={{ borderColor: "#F0EBE0", opacity: insumo ? 0.75 : 1 }}>
                        <td className="px-4 py-2 whitespace-nowrap">{i.descricao}{insumo && i.baixado ? <span className="text-[10px] text-[#0F6E56] ml-1">✓ baixado</span> : null}</td>
                        <td className="px-2 py-2"><span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: cs.bg, color: cs.fg }}>{insumo ? "Insumo · só estoque" : i.categoria}</span></td>
                        <td className="px-2 py-2 text-right tabular-nums">{i.quantidade}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{insumo ? "—" : fmtBRL(Number(i.valorUnitario) || 0)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{insumo ? "—" : fmtBRL(tot)}</td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && <><button onClick={() => abrirItem(i)} className="text-[12px] px-1">✏️</button><button onClick={() => excluirItem(i)} className="text-[12px] px-1">🗑️</button></>}</td>
                      </tr>
                    ); })}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t flex flex-col gap-1.5" style={{ borderColor: "#F0EBE0" }}>
                <div className="flex justify-between text-[13px] text-[#5C6B70]"><span>Total faturável</span><span className="tabular-nums font-medium text-[#1F2A2E]">{fmtBRL(cc.totalFaturavel)}</span></div>
                {caucAplic > 0 && <div className="flex justify-between text-[13px] text-[#5a3b9b]"><span>Caução aplicada</span><span className="tabular-nums font-medium">− {fmtBRL(caucAplic)}</span></div>}
                <div className="flex justify-between text-[15px] text-[#014D5E] border-t pt-2 mt-0.5" style={{ borderColor: "#F0EBE0" }}><span className="font-medium">Saldo a pagar</span><span className="tabular-nums font-medium">{fmtBRL(saldoPagar)}</span></div>
              </div>
              <div className="px-4 pb-3 text-[10.5px] text-[#8A989D]">Diárias entram automáticas (dias × valor/dia). Insumos “só estoque” não somam na conta.</div>
            </div>

            {/* Caução (F5) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💳 Caução (crédito do tutor)</h3>
                {!alta && <button onClick={() => setCaucaoOpen(true)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>➕ Adicionar caução</button>}
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10.5px] text-[#8A989D] uppercase tracking-wide">Saldo disponível de {h.tutor?.name || "tutor"}</div>
                  <div className="text-[22px] font-medium tabular-nums" style={{ color: "#5a3b9b" }}>{fmtBRL(caucaoSaldo)}</div>
                </div>
                {caucaoSaldo > 0 && cc.totalFaturavel > 0 && !alta && (
                  <button onClick={aplicarCaucao} className="text-[12.5px] font-medium px-3.5 py-2 rounded-lg" style={caucaoAplicada > 0 ? { background: "#EDE9FA", color: "#5a3b9b" } : { background: "#009AAC", color: "#fff" }}>{caucaoAplicada > 0 ? "✓ Caução aplicada — remover" : "Aplicar à conta"}</button>
                )}
              </div>
            </div>

            {/* Fechamento (F5) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}><h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">📤 Fechamento</h3></div>
              <div className="p-4">
                <div className="flex gap-2 flex-wrap">
                  {!alta && <button onClick={enviarCaixa} disabled={!!finBusy} className="text-[13px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg disabled:opacity-60">{finBusy === "caixa" ? "Enviando..." : "📤 Enviar pro Caixa"}</button>}
                  {!alta && <button onClick={baixarInsumos} disabled={!!finBusy} className="text-[13px] font-medium text-[#5C6B70] bg-white border px-4 py-2 rounded-lg disabled:opacity-60" style={{ borderColor: "#E8E2D6" }}>{finBusy === "estoque" ? "Baixando..." : "📦 Baixar insumos"}</button>}
                  <button onClick={boletimFinanceiro} disabled={!!finBusy} className="text-[13px] font-medium text-[#5C6B70] bg-white border px-4 py-2 rounded-lg disabled:opacity-60" style={{ borderColor: "#E8E2D6" }}>{finBusy === "boletim" ? "Enviando..." : "🧾 Boletim financeiro"}</button>
                  <button onClick={() => window.print()} className="text-[13px] font-medium text-[#5C6B70] bg-white border px-4 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🖨️ Imprimir</button>
                </div>
                {fechamentos.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {[...fechamentos].sort((a, b) => new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime()).map((f) => (
                      <div key={f.id} className="text-[11.5px] text-[#5C6B70] flex items-center gap-2"><span className="text-[#0F6E56]">✅</span> Enviado pro Caixa em {fmtDataHora(f.at)} · {fmtBRL(f.total)}{f.caucao > 0 ? ` (caução ${fmtBRL(f.caucao)})` : ""}{f.por ? ` · ${f.por}` : ""}</div>
                    ))}
                  </div>
                )}
                <div className="text-[10.5px] text-[#8A989D] mt-2.5">“Enviar pro Caixa” cria a venda (a receber) com os itens faturáveis e aplica a caução como pagamento. “Baixar insumos” dá saída no estoque dos itens vinculados a produto.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== RESUMO DE ALTA (só na impressão) ===== */}
      <div className="hidden print:block p-8" style={{ fontFamily: "Segoe UI, system-ui, sans-serif", color: "#1F2A2E" }}>
        <h1 style={{ fontSize: 20, color: "#014D5E", marginBottom: 2 }}>Resumo de internação — {h.pet?.name}</h1>
        <div style={{ fontSize: 12, color: "#5C6B70", marginBottom: 16 }}>{[h.pet?.breed, idadeDe(h.pet?.birthDate), h.pet?.weight ? `${h.pet.weight} kg` : null, boxCodigo ? `Box ${boxCodigo}` : null].filter(Boolean).join(" · ")} · Tutor(a): {h.tutor?.name} · {h.tutor?.phone}</div>
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <tbody>
            {[["Entrada", fmtDataHora(h.admissionDate)], ["Peso / temp. de entrada", [adm.pesoEntrada ? `${adm.pesoEntrada} kg` : null, adm.tempEntrada ? `${adm.tempEntrada} °C` : null].filter(Boolean).join(" · ") || "—"], ["Motivo / diagnóstico", h.diagnosis || h.reason || "—"], ["Prognóstico", adm.prognostico || "—"], ["Veterinário responsável", h.veterinarian?.name || "—"], ["Estado atual", estado], ["Alta prevista", h.estimatedDischargeDate ? fmtData(h.estimatedDischargeDate) : "—"], ["Dias internado", String(diasInternado(h.admissionDate))], ["Total acumulado", fmtBRL(h.totalCost)]].map(([k, v]) => (
              <tr key={k as string}><td style={{ padding: "6px 8px", color: "#8A989D", width: 200, borderBottom: "1px solid #F0EBE0" }}>{k}</td><td style={{ padding: "6px 8px", borderBottom: "1px solid #F0EBE0" }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Evolução médica</h2>
        {evolucoesOrd.length === 0 ? <div style={{ fontSize: 12, color: "#8A989D" }}>Sem registros.</div> : evolucoesOrd.slice().reverse().map((e) => (
          <div key={e.id} style={{ fontSize: 12.5, marginBottom: 6 }}><b style={{ color: "#5C6B70" }}>{fmtDataHora(e.at)}:</b> {e.texto}</div>
        ))}
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Conta</h2>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "5px 8px", borderBottom: "1px solid #F0EBE0" }}>Diária internação ({cc.dias}×)</td><td style={{ padding: "5px 8px", textAlign: "right", borderBottom: "1px solid #F0EBE0" }}>{fmtBRL(cc.diariaTotal)}</td></tr>
            {cc.itensFat.map((i) => (<tr key={i.id}><td style={{ padding: "5px 8px", borderBottom: "1px solid #F0EBE0" }}>{i.descricao} ({i.quantidade}×)</td><td style={{ padding: "5px 8px", textAlign: "right", borderBottom: "1px solid #F0EBE0" }}>{fmtBRL((Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0))}</td></tr>))}
            <tr><td style={{ padding: "6px 8px", fontWeight: 600 }}>Total faturável</td><td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmtBRL(cc.totalFaturavel)}</td></tr>
            {caucaoSaldo > 0 && (<tr><td style={{ padding: "5px 8px", color: "#5a3b9b" }}>Caução em conta</td><td style={{ padding: "5px 8px", textAlign: "right", color: "#5a3b9b" }}>− {fmtBRL(caucaoSaldo)}</td></tr>)}
          </tbody>
        </table>
      </div>

      {/* ===== POPUP EDITAR ADMISSÃO ===== */}
      {admOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setAdmOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">📋 Editar admissão</h3>
              <button onClick={() => setAdmOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Peso de entrada (kg)</label>
                <input type="number" step="0.01" value={admForm.pesoEntrada} onChange={(e) => setAdmForm({ ...admForm, pesoEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Temp. de entrada (°C)</label>
                <input type="number" step="0.1" value={admForm.tempEntrada} onChange={(e) => setAdmForm({ ...admForm, tempEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Diagnóstico / motivo</label>
                <input value={admForm.diagnosis} onChange={(e) => setAdmForm({ ...admForm, diagnosis: e.target.value })} placeholder="Ex.: Pós-op esplenectomia" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Prognóstico</label>
                <select value={admForm.prognostico} onChange={(e) => setAdmForm({ ...admForm, prognostico: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">—</option>{PROGNOSTICOS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Predição de alta</label>
                <input type="date" value={admForm.estimatedDischargeDate} onChange={(e) => setAdmForm({ ...admForm, estimatedDischargeDate: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setAdmOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={salvarAdm} disabled={admSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{admSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP MEDICAÇÃO (prescrição) ===== */}
      {prescOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setPrescOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">💊 {prescForm.id ? "Editar medicação" : "Adicionar medicação"}</h3>
              <button onClick={() => setPrescOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Medicação *</label>
                <input value={prescForm.medicamento} onChange={(e) => setPrescForm({ ...prescForm, medicamento: e.target.value })} placeholder="Ex.: Tramadol" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Via</label>
                <select value={prescForm.via} onChange={(e) => setPrescForm({ ...prescForm, via: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{VIAS.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Dose</label>
                <input value={prescForm.dose} onChange={(e) => setPrescForm({ ...prescForm, dose: e.target.value })} placeholder="3 mg/kg" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Frequência</label>
                <input value={prescForm.frequencia} onChange={(e) => setPrescForm({ ...prescForm, frequencia: e.target.value })} placeholder="8/8h" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Horários (HH:MM)</label>
                <input value={prescForm.horarios} onChange={(e) => setPrescForm({ ...prescForm, horarios: e.target.value })} placeholder="06:00, 14:00, 22:00" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2 -mt-1 text-[10.5px] text-[#8A989D]">Deixe os horários vazios para medicação <b>contínua</b> (não gera doses no plantão).</div>
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Observação</label>
                <input value={prescForm.observacao} onChange={(e) => setPrescForm({ ...prescForm, observacao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setPrescOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={salvarPresc} disabled={prescSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{prescSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP AFERIÇÃO (sinais vitais) ===== */}
      {vitalOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setVitalOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">🩺 Registrar aferição</h3>
              <button onClick={() => setVitalOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#8A989D] block mb-1">FC (bpm)</label>
                <input type="number" value={vitalForm.fc} onChange={(e) => setVitalForm({ ...vitalForm, fc: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">FR (mpm)</label>
                <input type="number" value={vitalForm.fr} onChange={(e) => setVitalForm({ ...vitalForm, fr: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Temp (°C)</label>
                <input type="number" step="0.1" value={vitalForm.temp} onChange={(e) => setVitalForm({ ...vitalForm, temp: e.target.value })} placeholder="38.5" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">PA (mmHg)</label>
                <input value={vitalForm.pa} onChange={(e) => setVitalForm({ ...vitalForm, pa: e.target.value })} placeholder="110/70" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Mucosa</label>
                <select value={vitalForm.mucosa} onChange={(e) => setVitalForm({ ...vitalForm, mucosa: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{MUCOSAS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Dor (0–4)</label>
                <select value={vitalForm.dor} onChange={(e) => setVitalForm({ ...vitalForm, dor: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{["0", "1", "2", "3", "4"].map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setVitalOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={registrarVital} disabled={vitalSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{vitalSaving ? "Salvando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP CONTROLE (fluidos) ===== */}
      {fluidoOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setFluidoOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">💧 Registrar controle</h3>
              <button onClick={() => setFluidoOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Entrada fluido (ml)</label>
                <input type="number" value={fluidoForm.entradaFluido} onChange={(e) => setFluidoForm({ ...fluidoForm, entradaFluido: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Ingestão água (ml)</label>
                <input type="number" value={fluidoForm.agua} onChange={(e) => setFluidoForm({ ...fluidoForm, agua: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Diurese</label>
                <input value={fluidoForm.diurese} onChange={(e) => setFluidoForm({ ...fluidoForm, diurese: e.target.value })} placeholder="2× normal" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Fezes</label>
                <input value={fluidoForm.fezes} onChange={(e) => setFluidoForm({ ...fluidoForm, fezes: e.target.value })} placeholder="1× pastosa" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Alimentação</label>
                <input value={fluidoForm.alimentacao} onChange={(e) => setFluidoForm({ ...fluidoForm, alimentacao: e.target.value })} placeholder="Aceitou 40%" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Êmese (vômito)</label>
                <input value={fluidoForm.emese} onChange={(e) => setFluidoForm({ ...fluidoForm, emese: e.target.value })} placeholder="Ausente" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setFluidoOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={registrarFluido} disabled={fluidoSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{fluidoSaving ? "Salvando..." : "Registrar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP ITEM DA CONTA ===== */}
      {itemOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setItemOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">🧾 {itemForm.id ? "Editar item" : "Adicionar item"}</h3>
              <button onClick={() => setItemOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Categoria</label>
                <select value={itemForm.categoria} onChange={(e) => setItemForm({ ...itemForm, categoria: e.target.value, servicoId: "", productId: "" })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{CAT_CONTA.map((c) => <option key={c} value={c}>{c === "Insumo" ? "Insumo (só estoque, não cobra)" : c}</option>)}</select></div>
              {itemForm.categoria !== "Insumo" ? (
                <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Serviço do catálogo (opcional)</label>
                  <select value={itemForm.servicoId} onChange={(e) => pickServico(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">— digitar manualmente —</option>{servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}{s.valorPadrao != null ? ` · ${fmtBRL(s.valorPadrao)}` : ""}</option>)}</select></div>
              ) : (
                <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Produto (p/ baixar do estoque)</label>
                  <select value={itemForm.productId} onChange={(e) => pickProduto(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">— sem vínculo (não baixa) —</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.name}{typeof p.stock === "number" ? ` · estoque ${p.stock}` : ""}</option>)}</select></div>
              )}
              <div className="col-span-2"><label className="text-[11px] text-[#8A989D] block mb-1">Descrição *</label>
                <input value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Quantidade</label>
                <input type="number" min={1} value={itemForm.quantidade} onChange={(e) => setItemForm({ ...itemForm, quantidade: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              {itemForm.categoria !== "Insumo" && (
                <div><label className="text-[11px] text-[#8A989D] block mb-1">Valor unitário (R$)</label>
                  <input type="number" min={0} step="0.01" value={itemForm.valorUnitario} onChange={(e) => setItemForm({ ...itemForm, valorUnitario: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              )}
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setItemOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={salvarItem} disabled={itemSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{itemSaving ? "Salvando..." : "Salvar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP CAUÇÃO ===== */}
      {caucaoOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setCaucaoOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-sm w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">💳 Adicionar caução</h3>
              <button onClick={() => setCaucaoOpen(false)} className="text-[#8A989D]">✕</button>
            </div>
            <div className="p-5 space-y-3 text-[13px]">
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Valor (R$) *</label>
                <input type="number" min={0} step="0.01" value={caucaoForm.valor} onChange={(e) => setCaucaoForm({ ...caucaoForm, valor: e.target.value })} placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#8A989D] block mb-1">Descrição</label>
                <input value={caucaoForm.descricao} onChange={(e) => setCaucaoForm({ ...caucaoForm, descricao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="text-[10.5px] text-[#8A989D]">Adiciona crédito ao tutor {h.tutor?.name}. Fica como saldo e pode abater da conta.</div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => setCaucaoOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={adicionarCaucao} disabled={finBusy === "caucao"} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{finBusy === "caucao" ? "Salvando..." : "Adicionar"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
