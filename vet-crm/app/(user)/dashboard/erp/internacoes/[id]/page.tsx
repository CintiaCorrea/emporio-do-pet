"use client";
// [EMP-COWORK] Ficha do paciente internado (Internação F2) — admissão/alta, risco, tutor, evolução médica.
// Internação = appointment (/api/hospitalizations/[id]); extras em vitalSigns (admissao). Evolução em listas intevo_<id>.
// Blocos de F3 (plantão) / F4 (sinais vitais) / F5 (conta) ficam como gancho "próxima fase".

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { carregarMeuCaixa } from "@/lib/caixaAtual";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { imprimirDocumento } from "@/lib/print";
import { useAutoSaveDraft } from "@/hooks/useAutoSaveDraft";
import { usePodeEditar } from "@/lib/permissions/context";
import { carregarCatalogoVendavel, linhaDoItem, itemParaVenda } from "@/lib/catalogoVendavel";

const ESTADOS = [
  { v: "Estável", prio: "LOW", bg: "#E1F5EE", fg: "#0F6E56" },
  { v: "Em observação", prio: "MEDIUM", bg: "#E6F1FB", fg: "#0C447C" },
  { v: "Instável", prio: "HIGH", bg: "#FBEFE0", fg: "#B45309" },
  { v: "Crítico", prio: "CRITICAL", bg: "#FCE9EF", fg: "#CC3366" },
];
const PROGNOSTICOS = ["Bom", "Reservado", "Ruim", "Grave"];
const VIAS = ["IV", "IM", "SC", "VO", "IV (BIC)", "SL", "IN", "Tópico", "Outro"];
// Frequências clássicas: a partir da 1ª aplicação o sistema calcula os horários do dia.
const FREQUENCIAS: Array<{ v: string; h: number }> = [
  { v: "4/4h", h: 4 }, { v: "6/6h", h: 6 }, { v: "8/8h", h: 8 },
  { v: "12/12h", h: 12 }, { v: "24h (1x ao dia)", h: 24 },
];
/** Extrai o intervalo em HORAS do texto da frequência (funciona pra frequências
 *  customizadas em Config › Listas): "8/8h"→8, "24h (1x ao dia)"→24, "10/10h"→10,
 *  "48h"→48. Texto sem horas (ex.: "quando necessário") → 0 (contínua, sem horário fixo). */
function horasDaFreq(frequencia: string): number {
  const m = /(\d+)\s*\/?\s*\d*\s*h/i.exec(String(frequencia || ""));
  return m ? parseInt(m[1], 10) : 0;
}
/** "06:00" + 8/8h → "06:00, 14:00, 22:00". Ciclo de 24h a partir da 1ª aplicação. */
function calcularHorarios(primeira: string, frequencia: string): string {
  const h = horasDaFreq(frequencia);
  const m = /^(\d{1,2}):(\d{2})$/.exec((primeira || "").trim());
  if (h <= 0 || !m) return "";
  const ini = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  if (isNaN(ini) || ini < 0 || ini >= 1440) return "";
  const out: string[] = [];
  for (let t = 0; t < 24 * 60; t += h * 60) {
    const min = (ini + t) % 1440;
    out.push(`${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`);
  }
  return out.join(", ");
}
const STATUS_MED: Record<string, { lbl: string; bg: string; fg: string }> = {
  atrasado: { lbl: "Atrasada", bg: "#FCE9EF", fg: "#CC3366" },
  pendente: { lbl: "Pendente", bg: "#FDF4DD", fg: "#8a6400" },
  feito: { lbl: "Feita", bg: "#E1F5EE", fg: "#0F6E56" },
};
// Dia no fuso de Fortaleza (UTC-3). Usar UTC puro jogava as aplicações da noite
// (após 21h Fortaleza = meia-noite UTC) para o "dia seguinte", embaralhando "hoje" x "dias anteriores".
const diaFortaleza = (at?: string | null) => {
  const t = at ? new Date(at).getTime() : Date.now();
  if (isNaN(t)) return "";
  return new Date(t - 3 * 3600 * 1000).toISOString().slice(0, 10);
};
const hojeISO = () => diaFortaleza();
const MUCOSAS = ["Rósea", "Pálida", "Congesta", "Cianótica", "Ictérica", "Porcelana"];
const TREND_ST: Record<string, { bg: string; fg: string }> = {
  up: { bg: "#FBEFE0", fg: "#B45309" }, down: { bg: "#E1F5EE", fg: "#0F6E56" }, flat: { bg: "#FBF9F4", fg: "#374151" },
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
function fmtData(s?: string) {
  if (!s) return "—";
  // Data pura "YYYY-MM-DD" é formatada direto — new Date("YYYY-MM-DD") vira meia-noite UTC
  // e apareceria um dia antes no fuso de Fortaleza.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  try { return new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; }
}
function fmtDataHora(s?: string) { if (!s) return "—"; try { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } }
function idadeDe(bd?: string) { if (!bd) return null; try { const anos = Math.floor((Date.now() - new Date(bd).getTime()) / (365.25 * 86400000)); return anos >= 1 ? `${anos} ano${anos > 1 ? "s" : ""}` : "< 1 ano"; } catch { return null; } }

export default function FichaInternacaoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const userName = session?.user?.name || "";
  usePageTitle("Ficha de internação", "Paciente internado");
  const podeEditar = usePodeEditar(); // perfil VISUALIZA = esconde TODAS as ações de mexer

  const [h, setH] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [boxCodigo, setBoxCodigo] = useState<string | null>(null);
  const [boxIdAtual, setBoxIdAtual] = useState<string | null>(null);
  const [boxesLivres, setBoxesLivres] = useState<any[]>([]);
  const [trocaBoxOpen, setTrocaBoxOpen] = useState(false);
  const [boxBusy, setBoxBusy] = useState(false);

  // Óbito
  const [obitoOpen, setObitoOpen] = useState(false);
  const [obitoForm, setObitoForm] = useState<any>({ data: "", causa: "" });
  const [obitoSaving, setObitoSaving] = useState(false);
  const [evolucoes, setEvolucoes] = useState<any[]>([]);
  const [evoTexto, setEvoTexto] = useState("");
  const [evoSaving, setEvoSaving] = useState(false);

  // Boletins programados (envio automático nos horários)
  const [bolProgId, setBolProgId] = useState<string | null>(null);
  const [bolProg, setBolProg] = useState<Record<string, any>>({});
  const [anexando, setAnexando] = useState("");
  const [bolProgSaving, setBolProgSaving] = useState(false);
  const [boletinsHist, setBoletinsHist] = useState<any[]>([]); // boletins já ENVIADOS (histórico com ✓)
  const [previewBol, setPreviewBol] = useState<{ titulo: string; texto: string; horario?: string } | null>(null); // visualizar antes de enviar / rever enviado
  const [bolEnviando, setBolEnviando] = useState("");
  const [modelosBoletim, setModelosBoletim] = useState<Array<{ id: string; nome: string; texto: string }>>([]);
  const [intBolPronto, setIntBolPronto] = useState(false);  // liga o auto-save só depois do load dos boletins
  const [bolAberto, setBolAberto] = useState<string>("");   // horário aberto na sanfona (um por vez)
  const [addHoraOpen, setAddHoraOpen] = useState(false);    // caixinha "+ horário"
  const [novaHora, setNovaHora] = useState("");

  const [admOpen, setAdmOpen] = useState(false);
  const [admForm, setAdmForm] = useState<any>({ pesoEntrada: "", tempEntrada: "", diagnosis: "", prognostico: "", estimatedDischargeDate: "" });
  const [admSaving, setAdmSaving] = useState(false);

  // Prescrição & plantão (F3)
  const [prescricoes, setPrescricoes] = useState<any[]>([]);
  const [doses, setDoses] = useState<any[]>([]);
  const [prescOpen, setPrescOpen] = useState(false);
  const [prescForm, setPrescForm] = useState<any>({ id: "", medicamento: "", via: "IV", dose: "", primeira: "", frequencia: "", horarios: "", observacao: "", prescritoPor: "", cobrarTipo: "", cobrarId: "", cobrarNome: "", cobrarValor: 0 });
  const [cobrancaBusca, setCobrancaBusca] = useState(""); // busca por digitação no vínculo de cobrança da medicação
  const [prescSaving, setPrescSaving] = useState(false);

  // Sinais vitais & fluidos (F4)
  const [vitais, setVitais] = useState<any[]>([]);
  const [fluidos, setFluidos] = useState<any[]>([]);
  const [vitalOpen, setVitalOpen] = useState(false);
  const [vitalForm, setVitalForm] = useState<any>({ fc: "", fr: "", temp: "", pa: "", sat: "", mucosa: "Rósea", dor: "0", peso: "" });
  const [vitalSaving, setVitalSaving] = useState(false);
  // Agendamento das aferições (mesmo esquema das medicações) — guardado em vitalSigns.aferiCfg
  const [aferiFreq, setAferiFreq] = useState("");
  const [aferiPrim, setAferiPrim] = useState("");
  const [fluidoOpen, setFluidoOpen] = useState(false);
  const [fluidoForm, setFluidoForm] = useState<any>({ entradaFluido: "", agua: "", diurese: "", fezes: "", alimentacao: "", emese: "", observacao: "" });
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
  const [caucaoForm, setCaucaoForm] = useState<any>({ valor: "", descricao: "Caução de internação", forma: "Dinheiro" });
  const [finBusy, setFinBusy] = useState("");

  // Opções de frequência: vêm de Config › Listas (lista `internacao_frequencia`), com as
  // 5 padrão como reserva se a lista estiver vazia. Assim a Cintia edita sem depender de deploy.
  const [freqOpcoes, setFreqOpcoes] = useState<string[]>(FREQUENCIAS.map((f) => f.v));
  useEffect(() => {
    fetch(`/api/listas?lista=internacao_frequencia`).then((r) => r.json()).then((d) => {
      const arr = Array.isArray(d) ? d : (d?.itens || d?.data || []);
      const vals = arr.map((i: any) => i?.valor).filter(Boolean);
      if (vals.length) setFreqOpcoes(vals);
    }).catch(() => {});
  }, []);

  // "Carregando..." só na PRIMEIRA carga. Nas recargas depois de uma ação os dados são
  // trocados por baixo, sem desmontar a tela — é isso que tirava o usuário do lugar
  // (a sensação de "pulo"/página recarregando a cada clique).
  const jaCarregou = useRef(false);

  const load = async () => {
    if (!jaCarregou.current) setLoading(true);
    try {
      const [d, m, ev, pr, ds, vt, fl, co, fe, sv, pd, bp, mb, bh] = await Promise.all([
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
        fetch(`/api/listas?lista=intbolprog_${id}`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=modelo_boletim`).then((r) => r.json()).catch(() => []),
        fetch(`/api/listas?lista=intboletim_hist_${id}`).then((r) => r.json()).catch(() => []),
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
      setBoletinsHist(parse(bh));
      const mbArr = Array.isArray(mb) ? mb : (mb.itens || mb.data || []);
      setModelosBoletim(mbArr.map((x: any) => { try { const v = JSON.parse(x.valor); return { id: x.id, nome: v.nome || "(sem nome)", texto: v.texto || "" }; } catch { return { id: x.id, nome: "(sem nome)", texto: String(x.valor || "") }; } }));
      const bpArr = Array.isArray(bp) ? bp : (bp.itens || bp.data || []);
      const bpItem = bpArr[0] || null;
      setBolProgId(bpItem?.id || null);
      try { setBolProg(bpItem ? JSON.parse(bpItem.valor) : {}); } catch { setBolProg({}); }
      setIntBolPronto(true); // dados dos boletins carregados → liga o auto-save de rascunho
      // FONTE ÚNICA (exames + produtos + serviços): dropdown Serviço = serviços + exames;
      // dropdown Produto = produtos/medicamentos/vacinas. (sv/pd acima ficam ignorados de propósito.)
      const catalogo = await carregarCatalogoVendavel();
      setServicos(catalogo.filter((i) => i.tipo === "SERVICE" || i._exame));
      setProdutos(catalogo.filter((i) => i.tipo && i.tipo !== "SERVICE" && !i._exame).map((i) => ({ id: i.id, name: i.nome, price: i.valorPadrao, valorPadrao: i.valorPadrao })));
      const tutorId = d?.tutor?.id;
      if (tutorId) { try { const cr = await fetch(`/api/credito/tutor/${tutorId}`).then((r) => r.json()); setCaucaoSaldo(Number(cr?.saldo) || 0); } catch { setCaucaoSaldo(0); } }
    } catch {}
    jaCarregou.current = true;
    setLoading(false);
  };
  useEffect(() => {
    if (!id) return;
    // 🛡️ RAIZ do bug 29/07 (boletim do Simba saiu com dados do Alex): ao TROCAR de
    // internação, zera os textos do boletim e DESLIGA o auto-save ANTES de recarregar.
    // Senão o auto-save gravava o texto da internação anterior na chave (intBolRasc) da
    // NOVA internação — vazando o boletim de um paciente pro outro. O load() repovoa certo.
    setIntBolPronto(false);
    setBolProg({});
    load();
    /* eslint-disable-next-line */
  }, [id]);
  // seed do agendamento das aferições quando a internação carrega
  useEffect(() => { const c = (h as any)?.vitalSigns?.aferiCfg; setAferiFreq(c?.frequencia || ""); setAferiPrim(c?.primeira || ""); /* eslint-disable-next-line */ }, [(h as any)?.id]);

  const estado = h ? estadoDe(h) : "Estável";
  const adm = h?.vitalSigns?.admissao || {};

  // ── Edição in-place + rastro invisível de alterações (internação) ──
  const [evoEditId, setEvoEditId] = useState("");
  const [evoEditTexto, setEvoEditTexto] = useState("");
  const [vitalEditId, setVitalEditId] = useState("");
  const [fluidoEditId, setFluidoEditId] = useState("");
  // Rastro INVISÍVEL: guarda quem/quando/antes→depois numa lista escondida (intlog_<id>),
  // que NÃO é carregada nem exibida em lugar nenhum. Só pra contestação/processo.
  const logInterno = async (acao: string, tipo: string, itemId: string, antes: any, depois: any) => {
    try {
      const now = new Date();
      const valor = JSON.stringify({ at: now.toISOString(), por: userName || "", acao, tipo, itemId: itemId || "", antes: antes ?? null, depois: depois ?? null });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intlog_${id}`, valor }) });
    } catch { /* nunca atrapalha a operação principal */ }
  };

  const salvarVital = async (patch: any) => {
    // mescla vitalSigns preservando o que já existe
    const vitalSigns = { ...(h?.vitalSigns || {}), ...patch.vitalSigns };
    const body: any = { ...patch, vitalSigns };
    delete body.vitalSigns_merge;
    const res = await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
    if (res.ok) load();
    return res.ok;
  };

  // Config das aferições + avisos (reaproveitam salvarVital → vitalSigns)
  const salvarAferiCfg = (freq: string, prim: string) => { setAferiFreq(freq); setAferiPrim(prim); salvarVital({ vitalSigns: { aferiCfg: { frequencia: freq, primeira: prim } } }); };
  const avisos = ((h as any)?.vitalSigns?.avisos) || { popup: true, som: true, whatsapp: false, repetir: false };
  const toggleAviso = (k: string) => salvarVital({ vitalSigns: { avisos: { ...avisos, [k]: !avisos[k] } } });
  const horariosAferi = (calcularHorarios(aferiPrim, aferiFreq) || "").split(", ").filter(Boolean);

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
      const texto = evoTexto.trim();
      const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), texto, autor: userName || "" });
      const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intevo_${id}`, valor }) });
      const cd = await r.json().catch(() => null);
      await logInterno("criou", "evolucao", cd?.id || "", null, { texto });
      setEvoTexto(""); load();
    } catch { alert("Erro ao registrar evolução."); }
    finally { setEvoSaving(false); }
  };
  const salvarEvoEdit = async (orig: any) => {
    const texto = evoEditTexto.trim();
    if (!texto) return;
    try {
      const valor = JSON.stringify({ at: orig.at, hora: orig.hora, texto, autor: orig.autor || "" });
      await fetch(`/api/listas/${orig.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      await logInterno("editou", "evolucao", orig.id, { texto: orig.texto }, { texto });
      setEvoEditId(""); setEvoEditTexto(""); load();
    } catch { alert("Erro ao salvar evolução."); }
  };
  const excluirEvolucao = async (evoId: string) => {
    if (!confirm("Excluir esta evolução?")) return;
    const orig = evolucoes.find((x: any) => x.id === evoId);
    try { await fetch(`/api/listas/${evoId}`, { method: "DELETE", credentials: "include" }); await logInterno("excluiu", "evolucao", evoId, orig ? { texto: orig.texto } : null, null); load(); } catch {}
  };

  // ── Prescrição & plantão (F3) ─────────────────────────────────────
  const abrirPresc = (p?: any) => {
    setPrescForm(p
      ? { id: p.id, medicamento: p.medicamento || "", via: p.via || "IV", dose: p.dose || "", primeira: p.primeira || "", frequencia: p.frequencia || "", horarios: (p.horarios || []).join(", "), observacao: p.observacao || "", prescritoPor: p.prescritoPor || "", cobrarTipo: p.cobrarTipo || "", cobrarId: p.cobrarId || "", cobrarNome: p.cobrarNome || "", cobrarValor: Number(p.cobrarValor) || 0 }
      : { id: "", medicamento: "", via: "IV", dose: "", primeira: "", frequencia: "", horarios: "", observacao: "", prescritoPor: "", cobrarTipo: "", cobrarId: "", cobrarNome: "", cobrarValor: 0 });
    setPrescOpen(true);
  };
  const salvarPresc = async () => {
    if (!prescForm.medicamento.trim()) { alert("Informe a medicação."); return; }
    setPrescSaving(true);
    try {
      const horarios = String(prescForm.horarios || "").split(",").map((s: string) => s.trim()).filter(Boolean);
      // Quem prescreveu = usuário logado. Numa edição, preserva o prescritor original
      // (é registro clínico — quem editou depois não vira o autor da prescrição).
      const payload = {
        medicamento: prescForm.medicamento.trim(), via: prescForm.via, dose: prescForm.dose.trim(),
        primeira: prescForm.primeira || "", frequencia: prescForm.frequencia.trim(), horarios,
        observacao: prescForm.observacao.trim(),
        prescritoPor: prescForm.prescritoPor || userName || "",
        // Vínculo p/ cobrança automática na conta a cada aplicação (opcional).
        cobrarTipo: prescForm.cobrarTipo || "", cobrarId: prescForm.cobrarId || "",
        cobrarNome: prescForm.cobrarNome || "", cobrarValor: Number(prescForm.cobrarValor) || 0,
      };
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
        // Desmarcou (foi engano): apaga o log E o lançamento automático dessa aplicação, se houver.
        await fetch(`/api/listas/${slot.log.id}`, { method: "DELETE", credentials: "include" });
        const autoItem = conta.find((c: any) => c.medLogId === slot.log.id);
        if (autoItem?.id) await fetch(`/api/listas/${autoItem.id}`, { method: "DELETE", credentials: "include" }).catch(() => undefined);
      } else {
        const now = new Date();
        const valor = JSON.stringify({ prescId: slot.p.id, med: slot.p.medicamento, via: slot.p.via, dose: slot.p.dose, slot: slot.hhmm, date: hojeISO(), at: now.toISOString(), por: userName });
        const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intmed_${id}`, valor }) });
        const cd = await r.json().catch(() => null);
        const logId = cd?.id;
        // COBRANÇA AUTOMÁTICA: prescrição vinculada ao catálogo → lança 1× na conta, amarrada a este log.
        if (logId && !alta && slot.p?.cobrarId) {
          const itemPayload = {
            descricao: `${slot.p.cobrarNome || slot.p.medicamento} — aplicação ${slot.hhmm}`,
            categoria: "Medicação",
            quantidade: 1,
            valorUnitario: precoAtualCobranca(slot.p),
            servicoId: slot.p.cobrarTipo === "servico" ? slot.p.cobrarId : "",
            productId: slot.p.cobrarTipo === "produto" ? slot.p.cobrarId : "",
            baixado: false,
            medLogId: logId,
            auto: true,
          };
          await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intconta_${id}`, valor: JSON.stringify(itemPayload) }) }).catch(() => undefined);
        }
      }
      load();
    } catch {}
  };

  // ── Sinais vitais & fluidos (F4) ──────────────────────────────────
  const abrirVital = () => { setVitalEditId(""); setVitalForm({ fc: "", fr: "", temp: "", pa: "", sat: "", mucosa: "Rósea", dor: "0", peso: "" }); setVitalOpen(true); };
  const abrirVitalEdit = (v: any) => { setVitalEditId(v.id); setVitalForm({ fc: v.fc ?? "", fr: v.fr ?? "", temp: v.temp ?? "", pa: v.pa ?? "", sat: v.sat ?? "", mucosa: v.mucosa || "Rósea", dor: String(v.dor ?? "0"), peso: v.peso ?? "" }); setVitalOpen(true); };
  const registrarVital = async () => {
    if (![vitalForm.fc, vitalForm.fr, vitalForm.temp, vitalForm.pa, vitalForm.peso, vitalForm.sat].some((x) => String(x).trim())) { alert("Preencha ao menos um sinal vital ou o peso."); return; }
    setVitalSaving(true);
    try {
      const campos = { fc: vitalForm.fc, fr: vitalForm.fr, temp: vitalForm.temp, pa: vitalForm.pa, sat: vitalForm.sat, mucosa: vitalForm.mucosa, dor: vitalForm.dor, peso: vitalForm.peso };
      if (vitalEditId) {
        const orig = vitais.find((x: any) => x.id === vitalEditId) || {};
        const valor = JSON.stringify({ at: orig.at, hora: orig.hora, ...campos, por: orig.por || userName });
        await fetch(`/api/listas/${vitalEditId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
        await logInterno("editou", "vital", vitalEditId, { fc: orig.fc, fr: orig.fr, temp: orig.temp, pa: orig.pa, mucosa: orig.mucosa, dor: orig.dor, peso: orig.peso }, campos);
      } else {
        const now = new Date();
        const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), ...campos, por: userName });
        const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intvital_${id}`, valor }) });
        const cd = await r.json().catch(() => null);
        await logInterno("criou", "vital", cd?.id || "", null, campos);
      }
      setVitalForm({ fc: "", fr: "", temp: "", pa: "", sat: "", mucosa: "Rósea", dor: "0", peso: "" }); setVitalEditId(""); setVitalOpen(false); load();
    } catch { alert("Erro ao registrar aferição."); }
    finally { setVitalSaving(false); }
  };
  const excluirVital = async (vId: string) => { if (!confirm("Excluir esta aferição?")) return; const orig = vitais.find((x: any) => x.id === vId); try { await fetch(`/api/listas/${vId}`, { method: "DELETE", credentials: "include" }); await logInterno("excluiu", "vital", vId, orig || null, null); load(); } catch {} };

  const abrirFluido = () => { setFluidoEditId(""); setFluidoForm({ entradaFluido: "", agua: "", diurese: "", fezes: "", alimentacao: "", emese: "", observacao: "" }); setFluidoOpen(true); };
  const abrirFluidoEdit = (f: any) => { setFluidoEditId(f.id); setFluidoForm({ entradaFluido: f.entradaFluido ?? "", agua: f.agua ?? "", diurese: f.diurese ?? "", fezes: f.fezes ?? "", alimentacao: f.alimentacao ?? "", emese: f.emese ?? "", observacao: f.observacao ?? "" }); setFluidoOpen(true); };
  const registrarFluido = async () => {
    if (![fluidoForm.entradaFluido, fluidoForm.agua, fluidoForm.diurese, fluidoForm.fezes, fluidoForm.alimentacao, fluidoForm.emese, fluidoForm.observacao].some((x) => String(x).trim())) { alert("Preencha ao menos um campo."); return; }
    setFluidoSaving(true);
    try {
      const campos = { entradaFluido: fluidoForm.entradaFluido, agua: fluidoForm.agua, diurese: fluidoForm.diurese, fezes: fluidoForm.fezes, alimentacao: fluidoForm.alimentacao, emese: fluidoForm.emese, observacao: fluidoForm.observacao };
      if (fluidoEditId) {
        const orig = fluidos.find((x: any) => x.id === fluidoEditId) || {};
        const valor = JSON.stringify({ at: orig.at, hora: orig.hora, ...campos, por: orig.por || userName });
        await fetch(`/api/listas/${fluidoEditId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
        await logInterno("editou", "fluido", fluidoEditId, { entradaFluido: orig.entradaFluido, agua: orig.agua, diurese: orig.diurese, fezes: orig.fezes, alimentacao: orig.alimentacao, emese: orig.emese, observacao: orig.observacao }, campos);
      } else {
        const now = new Date();
        const valor = JSON.stringify({ at: now.toISOString(), hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }), ...campos, por: userName });
        const r = await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intfluido_${id}`, valor }) });
        const cd = await r.json().catch(() => null);
        await logInterno("criou", "fluido", cd?.id || "", null, campos);
      }
      setFluidoForm({ entradaFluido: "", agua: "", diurese: "", fezes: "", alimentacao: "", emese: "", observacao: "" }); setFluidoEditId(""); setFluidoOpen(false); load();
    } catch { alert("Erro ao registrar controle."); }
    finally { setFluidoSaving(false); }
  };
  const excluirFluido = async (fId: string) => { if (!confirm("Excluir este registro?")) return; const orig = fluidos.find((x: any) => x.id === fId); try { await fetch(`/api/listas/${fId}`, { method: "DELETE", credentials: "include" }); await logInterno("excluiu", "fluido", fId, orig || null, null); load(); } catch {} };

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
  const abrirItem = (p?: any) => { setItemForm(p ? { id: p.id, descricao: p.descricao || "", categoria: p.categoria || "Procedimento", quantidade: String(p.quantidade || "1"), valorUnitario: String(p.valorUnitario ?? ""), servicoId: p.servicoId || "", productId: p.productId || "", custoUnitario: p.custoUnitario, fornecedorId: p.fornecedorId ?? null, catalogoExameId: p.catalogoExameId, _exame: p._exame } : { id: "", descricao: "", categoria: "Procedimento", quantidade: "1", valorUnitario: "", servicoId: "", productId: "" }); setItemOpen(true); };
  const pickServico = (sid: string) => { const s = servicos.find((x) => x.id === sid); if (!s) return; const l = linhaDoItem(s); setItemForm((f: any) => ({ ...f, servicoId: l.servicoId || "", descricao: l.descricao, valorUnitario: String(l.valorUnitario), custoUnitario: l.custoUnitario, fornecedorId: l.fornecedorId ?? null, catalogoExameId: l.catalogoExameId, _exame: l._exame })); };
  const pickProduto = (pid: string) => { const p = produtos.find((x) => x.id === pid); setItemForm((f: any) => ({ ...f, productId: pid, descricao: p?.name || f.descricao })); };
  // Vínculo da PRESCRIÇÃO com o catálogo (serviço OU produto) p/ cobrança automática ao aplicar.
  // val = "" | "s:<id>" (serviço) | "p:<id>" (produto).
  const pickPrescCobranca = (val: string) => {
    if (!val) { setPrescForm((f: any) => ({ ...f, cobrarTipo: "", cobrarId: "", cobrarNome: "", cobrarValor: 0 })); return; }
    const tipo = val[0] === "s" ? "servico" : "produto";
    const cid = val.slice(2);
    if (tipo === "servico") {
      const s = servicos.find((x) => x.id === cid);
      setPrescForm((f: any) => ({ ...f, cobrarTipo: "servico", cobrarId: cid, cobrarNome: s?.nome || "", cobrarValor: Number(s?.valorPadrao) || 0, medicamento: String(f.medicamento || "").trim() ? f.medicamento : (s?.nome || f.medicamento) }));
    } else {
      const p = produtos.find((x) => x.id === cid);
      setPrescForm((f: any) => ({ ...f, cobrarTipo: "produto", cobrarId: cid, cobrarNome: p?.name || "", cobrarValor: Number(p?.price ?? p?.valorPadrao) || 0, medicamento: String(f.medicamento || "").trim() ? f.medicamento : (p?.name || f.medicamento) }));
    }
  };
  // Preço ATUAL do vínculo (busca no catálogo; cai pro valor salvo se sumiu).
  const precoAtualCobranca = (p: any): number => {
    if (p?.cobrarTipo === "servico") { const s = servicos.find((x) => x.id === p.cobrarId); return Number(s?.valorPadrao ?? p.cobrarValor) || 0; }
    if (p?.cobrarTipo === "produto") { const pr = produtos.find((x) => x.id === p.cobrarId); return Number(pr?.price ?? pr?.valorPadrao ?? p.cobrarValor) || 0; }
    return Number(p?.cobrarValor) || 0;
  };
  const salvarItem = async () => {
    if (!itemForm.descricao.trim()) { alert("Informe a descrição do item."); return; }
    setItemSaving(true);
    try {
      const insumo = itemForm.categoria === "Insumo";
      const payload = { descricao: itemForm.descricao.trim(), categoria: itemForm.categoria, quantidade: Number(itemForm.quantidade) || 1, valorUnitario: insumo ? 0 : (Number(itemForm.valorUnitario) || 0), servicoId: itemForm.servicoId || "", productId: itemForm.productId || "", baixado: false, ...(itemForm.custoUnitario != null ? { custoUnitario: Number(itemForm.custoUnitario) } : {}), ...(itemForm.fornecedorId ? { fornecedorId: itemForm.fornecedorId } : {}), ...(itemForm._exame ? { _exame: true, catalogoExameId: itemForm.catalogoExameId } : {}) };
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
      // Caixa aberto: a caução ENTRA no caixa (vira suprimento, conta na gaveta se dinheiro) — igual à do Caixa.
      let caixaId: string | null = null;
      // A caução entra no caixa de QUEM ESTÁ LOGADA (núcleo lib/caixaAtual), não no caixa da colega.
      caixaId = (await carregarMeuCaixa((session?.user as any)?.id)).meu?.id || null;
      const res = await fetch("/api/credito", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tutorId: h.tutor?.id, appointmentId: id, tipo: "RECARGA", valor, descricao: caucaoForm.descricao || "Caução de internação", forma: caucaoForm.forma || "Dinheiro", ...(caixaId ? { caixaSessaoId: caixaId } : {}) }) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.message || ""); }
      setCaucaoOpen(false); setCaucaoForm({ valor: "", descricao: "Caução de internação", forma: "Dinheiro" });
      alert(caixaId ? "Caução adicionada — entrou no caixa ✅" : "Caução adicionada. ⚠️ Você não tem caixa aberto, então ela NÃO entrou na gaveta — abra o seu caixa e registre lá se precisar conferir.");
      load();
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
        ...itensFat.map((i) => ({ ...itemParaVenda(i), quantidade: Number(i.quantidade) || 1, desconto: 0 })), // núcleo único: leva custo+fornecedor do exame → a-pagar
      ].filter((it: any) => it.quantidade > 0 && (it.valorUnitario > 0 || it.descricao));
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

  // 📅 Comanda do dia: diária(s) não faturada(s) + itens abertos → uma VENDA no "a pagar" do caixa.
  // Não precisa de caixa aberto (é venda a receber). 1 diária por dia é controlada no backend.
  const gerarComandaDia = async () => {
    if (!confirm("Gerar a venda do dia (diária de hoje + itens abertos ainda não faturados) e mandar pro 'a receber' do caixa?")) return;
    setFinBusy("comanda");
    try {
      const res = await fetch(`/api/hospitalizations/${id}/comanda-dia`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: "{}" });
      const dd = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(dd?.message || "Erro ao gerar a venda do dia");
      load();
      // 🧾 Fatia 2 — resumo do dia + saldo (crédito/débito) pro tutor acompanhar, junto com o boletim.
      const saldo = Number(caucaoSaldo) - Number(dd.totalFaturado || 0); // +: crédito a favor · −: a pagar
      const linhas = [
        `🧾 *Conta do dia — ${h?.pet?.name || "seu pet"}* (${new Date().toLocaleDateString("pt-BR")})`,
        ...(dd.itensResumo || []).map((i: any) => `• ${i.descricao}: ${fmtBRL(Number(i.total) || 0)}`),
        `*Total do dia: ${fmtBRL(Number(dd.total) || 0)}*`,
        `━━━━━━━━━━`,
        `Internação até agora: ${fmtBRL(Number(dd.totalFaturado) || 0)}`,
        caucaoSaldo > 0 ? `Caução em conta: ${fmtBRL(caucaoSaldo)}` : null,
        saldo >= 0 ? `✅ Saldo a favor: ${fmtBRL(saldo)}` : `Saldo a pagar: ${fmtBRL(Math.abs(saldo))}`,
      ].filter(Boolean);
      const texto = linhas.join("\n");
      if (confirm(`Venda do dia gerada! ✅${dd.numeroVenda ? ` (venda nº ${dd.numeroVenda})` : ""}\nTotal do dia ${fmtBRL(Number(dd.total) || 0)} — está no “a pagar” do caixa.\n\nEnviar o resumo do dia + saldo pro tutor no WhatsApp (junto com o boletim)?`)) {
        try {
          const r2 = await fetch("/api/survey-avaliacao/mensagem-tutor", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tutorId: h.tutor?.id, texto }) });
          alert(r2.ok ? "Resumo do dia enviado pro tutor ✅" : "Comanda gerada, mas não consegui enviar o resumo (confira a conversa do WhatsApp).");
        } catch { alert("Comanda gerada, mas não consegui enviar o resumo."); }
      }
    } catch (e: any) { alert(e?.message || "Erro ao gerar a comanda do dia."); }
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

  // ── Boletins programados ──────────────────────────────────────────
  // Horários vêm do que foi definido na internação (ex.: "07:00, 14:00, 20:00").
  const horariosBoletim = useMemo(() => {
    return String(h?.vitalSigns?.boletinsHorarios || "")
      .split(",").map((s: string) => s.trim()).filter(Boolean).sort();
  }, [h]);

  // Auto-save de rascunho dos boletins (silencioso; restaura o texto digitado ao voltar).
  const { clear: limparRascBol } = useAutoSaveDraft<Record<string, any>>({
    key: `intBolRasc:${id}`,
    enabled: intBolPronto,
    value: bolProg,
    isVazio: (v) => !Object.values(v || {}).some((x: any) => (typeof x === "string" ? x.trim() : x?.texto?.trim())),
    onRestore: (s) => setBolProg((prev) => ({ ...prev, ...s })),
  });

  // Caixinhas: horários sugeridos + quaisquer já definidos que fujam da lista.
  const HORARIOS_SUGERIDOS = ["07:00", "12:00", "14:00", "19:00", "20:00", "22:00"];
  const chipsHorarios = useMemo(
    () => Array.from(new Set([...HORARIOS_SUGERIDOS, ...horariosBoletim])).sort(),
    [horariosBoletim]
  );
  // Grava a lista de horários ATIVOS (os que enviam) em vitalSigns.boletinsHorarios.
  const persistirHorarios = async (lista: string[]) => {
    const limpos = Array.from(new Set(lista.map((s) => s.trim()).filter(Boolean))).sort();
    await salvarVital({ vitalSigns: { boletinsHorarios: limpos.join(", ") } });
  };
  const toggleHorario = async (hor: string) => {
    const ativo = horariosBoletim.includes(hor);
    if (ativo && bolAberto === hor) setBolAberto("");
    await salvarBoletinsProgramados();  // salva os textos digitados antes do reload de horários
    await persistirHorarios(ativo ? horariosBoletim.filter((x) => x !== hor) : [...horariosBoletim, hor]);
  };
  const adicionarHorario = async () => {
    const v = novaHora.trim();
    if (!/^\d{1,2}:\d{2}$/.test(v)) { alert("Informe o horário no formato HH:MM (ex.: 08:30)."); return; }
    const hh = v.length === 4 ? `0${v}` : v;
    setNovaHora(""); setAddHoraOpen(false); setBolAberto(hh);
    await salvarBoletinsProgramados();  // idem: não perde texto em edição
    await persistirHorarios([...horariosBoletim, hh]);
  };

  const salvarBoletinsProgramados = async () => {
    setBolProgSaving(true);
    try {
      const valor = JSON.stringify(bolProg);
      if (bolProgId) {
        await fetch(`/api/listas/${bolProgId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ valor }) });
      } else {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intbolprog_${id}`, valor }) });
      }
      limparRascBol(); // salvo no banco → descarta o rascunho local
      load();
    } catch { alert("Erro ao salvar os boletins programados."); }
    finally { setBolProgSaving(false); }
  };

  // Cada horário guarda texto puro (formato antigo) ou { texto, midia }. Os helpers
  // abaixo leem os dois e sempre gravam no formato novo.
  const textoDoHorario = (hor: string) => { const v = bolProg[hor]; return typeof v === "string" ? v : (v?.texto || ""); };
  const midiaDoHorario = (hor: string): any => { const v = bolProg[hor]; return typeof v === "string" ? null : (v?.midia || null); };
  const setTextoHorario = (hor: string, texto: string) => setBolProg({ ...bolProg, [hor]: { texto, midia: midiaDoHorario(hor) } });
  const setMidiaHorario = (hor: string, midia: any) => setBolProg({ ...bolProg, [hor]: { texto: textoDoHorario(hor), midia } });

  const anexarMidia = async (hor: string, file: File) => {
    const tipo = file.type.startsWith("video") ? "video" : "image";
    if (file.size > 15 * 1024 * 1024) { alert("Arquivo muito grande (máximo 15 MB)."); return; }
    setAnexando(hor);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/media/upload?pasta=boletins", { method: "POST", body: fd, credentials: "include" });
      const up = await r.json().catch(() => ({}));
      if (!r.ok || !up?.url) throw new Error(up?.message || up?.error || "Falha no upload");
      setMidiaHorario(hor, { url: up.url, tipo, nome: file.name });
    } catch (e: any) { alert(e?.message || "Erro ao anexar o arquivo."); }
    finally { setAnexando(""); }
  };

  // Envia na hora o boletim daquele horário (sem esperar o automático).
  const enviarBoletimAgora = async (horario: string) => {
    const texto = textoDoHorario(horario).trim();
    const midia = midiaDoHorario(horario);
    if (!texto) { alert("Escreva o boletim desse horário antes de enviar."); return; }
    // 🛡️ TRAVA DE SEGURANÇA (bug 29/07): o boletim é do pet DESTA internação. Se o texto
    // NÃO menciona o nome dele, é quase certo que é o boletim de OUTRO paciente (copiado
    // por engano) — bloqueia com aviso forte pra não mandar info clínica pro tutor errado.
    const petNome = (h?.pet?.name || "").trim();
    const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    if (petNome && !norm(texto).includes(norm(petNome))) {
      if (!confirm(`⚠️ ATENÇÃO: este boletim NÃO menciona "${petNome}" (o paciente desta internação). Pode ser o boletim de OUTRO pet, colado por engano — enviar isso mandaria dados clínicos pro tutor errado.\n\nConfira o texto. Enviar mesmo assim para ${h.tutor?.name || "o tutor"}?`)) return;
    } else {
      if (!confirm(`Enviar o boletim das ${horario}?\n🐾 Paciente: ${petNome || "—"}\n👤 Tutor(a): ${h.tutor?.name || "—"}`)) return;
    }
    setBolEnviando(horario);
    try {
      const res = await fetch("/api/whatsapp/boletim-internacao", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ tutorId: h.tutor?.id, texto, petNome: h.pet?.name, midia: midia?.url ? { url: midia.url, tipo: midia.tipo } : undefined }) });
      const d = await res.json().catch(() => ({}));
      if (d?.status === "enviado") alert("Boletim enviado ao tutor. ✅");
      else if (d?.status === "na_fila") alert("A conversa está fechada — mandei o convite com os botões. O boletim vai automaticamente quando o tutor responder. 📨");
      else alert(d?.error || "Erro ao enviar o boletim.");
      // Histórico: registra o boletim enviado (✓) pra rever/imprimir depois.
      if (d?.status === "enviado" || d?.status === "na_fila") {
        await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `intboletim_hist_${id}`, valor: JSON.stringify({ at: new Date().toISOString(), horario, texto, por: userName, status: d.status }) }) }).catch(() => {});
        load();
      }
    } catch { alert("Erro ao enviar o boletim."); }
    finally { setBolEnviando(""); }
  };

  // *negrito* → <b> e quebras de linha — pro preview (👁) e pra impressão (🖨).
  const textoParaHtml = (t: string) => t
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
    .replace(/\n/g, "<br/>");
  const imprimirBoletim = (texto: string) => { imprimirDocumento(`Boletim — ${h?.pet?.name || ""}`, `<div style="font-size:14px;line-height:1.7;max-width:640px">${textoParaHtml(texto)}</div>`, undefined, { pet: h?.pet, tutor: (h as any)?.tutor }); };
  const excluirBoletimHist = async (histId: string) => {
    if (!confirm("Excluir este boletim do histórico?")) return;
    try { await fetch(`/api/listas/${histId}`, { method: "DELETE", credentials: "include" }); load(); } catch {}
  };

  // Gera o texto do boletim (WhatsApp) a partir do que JÁ está preenchido na ficha.
  // Campos sem dado viram [preencher] pro vet completar na hora. Texto pensado pra
  // ficar legível no celular (negrito com *, emojis, blocos curtos).
  const montarBoletimInternacao = (tipo: "resumo" | "completo" | "alta"): string => {
    const pet = h?.pet?.name || "o paciente";
    const agora = new Date();
    const dataStr = agora.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const horaStr = agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const PLC = "[preencher]";
    const evo = (evolucoesOrd?.[0]?.texto || "").trim();
    const v: any = ultVital || {};
    const f: any = ultFluido || {};
    const meds = (prescricoes || []).map((p: any) => `• ${p.medicamento}${p.dose ? ` ${p.dose}` : ""}${p.frequencia ? ` — ${p.frequencia}` : ""}`).join("\n");
    const estadoEmoji = /crítico|instável/i.test(estado) ? "⚠️" : /observação/i.test(estado) ? "🟡" : "💛";
    const vitaisLinha = [v.temp && `${v.temp}°C`, v.fc && `FC ${v.fc}`, v.mucosa && `mucosa ${String(v.mucosa).toLowerCase()}`].filter(Boolean).join(" · ") || PLC;

    if (tipo === "resumo") {
      return [
        `🐾 *Boletim do ${pet}* — ${dataStr}, ${horaStr}`,
        ``,
        `${estadoEmoji} *Estado:* ${estado}.`,
        ``,
        `📋 *Hoje:* ${evo || "[preencher: como o pet está hoje]"}`,
        ``,
        `🌡️ *Sinais vitais:* ${vitaisLinha}.`,
        ``,
        `💊 *Tratamento:* ${meds ? "mantido nos horários." : PLC}`,
        ``,
        `🔜 *Próximo passo:* ${PLC}`,
        ``,
        `Qualquer dúvida, estamos à disposição! 💛`,
        `— Empório do Pet`,
      ].join("\n");
    }

    if (tipo === "alta") {
      const diasAlta = h?.admissionDate ? diasInternado(h.admissionDate) : null;
      return [
        `🏠 *Alta do ${pet}* — Empório do Pet`,
        `🗓️ ${dataStr} · ${horaStr}${diasAlta != null ? ` · após ${diasAlta} dia(s) de internação` : ""}`,
        ``,
        `💛 *Como o ${pet} sai:* ${estado}. ${evo || ""}`.trim(),
        ``,
        `🩺 *Resumo do tratamento na internação:*`,
        `${meds || PLC}`,
        ``,
        `🏡 *Cuidados em casa:* ${PLC}`,
        ``,
        `💊 *Medicações em casa:* [preencher: remédio, dose e horários]`,
        ``,
        `📅 *Retorno:* [preencher: quando voltar pra reavaliação]`,
        ``,
        `⚠️ *Fique de olho:* [preencher: sinais que pedem contato imediato]`,
        ``,
        `Foi um prazer cuidar do ${pet}! Qualquer dúvida, estamos à disposição. 💛`,
        `— Dr(a). ${userName || "______"} · Empório do Pet`,
      ].join("\n");
    }

    const especie = ({ CANINE: "Canino", FELINE: "Felino", CANINO: "Canino", FELINO: "Felino" } as any)[h?.pet?.species] || h?.pet?.species || "";
    const petLinha = [especie, h?.pet?.breed || ""].filter(Boolean).join("/");
    const peso = h?.pet?.weight ? `${h.pet.weight} kg` : "";
    const dias = h?.admissionDate ? diasInternado(h.admissionDate) : null;
    const diaTxt = dias != null ? ` · ${dias}º dia de internação` : "";
    const xixiFezes = [f.diurese, f.fezes].filter(Boolean).join(" / ") || PLC;

    return [
      `🏥 *Boletim do ${pet}* — Empório do Pet`,
      `🗓️ ${dataStr} · ${horaStr}${diaTxt}`,
      ``,
      `🐾 ${[petLinha, peso].filter(Boolean).join(" · ") || PLC}`,
      `👤 Tutor(a): ${h?.tutor?.name || PLC}`,
      ``,
      `${estadoEmoji} *Estado geral:* ${estado}.`,
      ``,
      `*Como o ${pet} está agora:*`,
      `${evo || "[preencher: comportamento, apetite, disposição]"}`,
      ``,
      `*Desde o último boletim:*`,
      `[preencher: evolução, procedimentos e intercorrências]`,
      ``,
      `🌡️ *Sinais vitais:*`,
      `• Temp: ${v.temp ? `${v.temp}°C` : PLC}  • FC: ${v.fc || PLC}  • FR: ${v.fr || PLC}`,
      `• SpO₂: ${v.sat ? `${v.sat}%` : PLC}  • Mucosa: ${v.mucosa || PLC}`,
      `• Alimentação: ${f.alimentacao || PLC}`,
      `• Xixi/Fezes: ${xixiFezes}`,
      ``,
      `💊 *Tratamento em curso:*`,
      `${meds || PLC}`,
      ``,
      `🔜 *Próximos passos:* ${PLC}`,
      ``,
      `⚠️ *Atenção especial:* ${PLC}`,
      ``,
      `💬 *Recado da equipe:* ${PLC}`,
      ``,
      `— Dr(a). ${userName || "______"} · Empório do Pet`,
    ].join("\n");
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

  // Registra o óbito: encerra a internação, libera o box, marca o PET como falecido na
  // ficha dele (PetStatus.DECEASED) e guarda o registro em `petobito_<petId>`.
  // Marcar o pet é o que faz os automáticos (aniversário, vacina, confirmação) calarem.
  const registrarObito = async () => {
    const petId = h?.pet?.id;
    if (!petId) { alert("Não foi possível identificar o pet desta internação."); return; }
    setObitoSaving(true);
    try {
      const quando = obitoForm.data ? new Date(obitoForm.data).toISOString() : new Date().toISOString();
      await fetch(`/api/hospitalizations/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DECEASED" }) });
      await fetch(`/api/pets/${petId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ status: "DECEASED" }) });
      await fetch("/api/listas", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ lista: `petobito_${petId}`, valor: JSON.stringify({ data: quando, causa: (obitoForm.causa || "").trim(), por: userName, appointmentId: id }) }) }).catch(() => {});
      if (boxIdAtual) await fetch(`/api/boxes/${boxIdAtual}/liberar`, { method: "POST", credentials: "include" }).catch(() => {});
      router.push("/dashboard/erp/internacoes");
    } catch { alert("Erro ao registrar o óbito."); setObitoSaving(false); }
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
        const log = doses.find((d) => d.prescId === p.id && d.slot === hhmm && (d.at ? diaFortaleza(d.at) : d.date) === hj);
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
  // O que ainda precisa de ação fica SEMPRE à vista; o que já foi aplicado é recolhido
  // e agrupado por data — numa internação longa a lista cresceria sem fim.
  const plantaoPendentes = useMemo(() => plantao.filter((s) => s.status !== "feito"), [plantao]);
  const plantaoFeitasHoje = useMemo(() => plantao.filter((s) => s.status === "feito"), [plantao]);
  const aplicacoesPorData = useMemo(() => {
    const hj = hojeISO();
    const mapa = new Map<string, any[]>();
    for (const d of doses) {
      const dia = d.at ? diaFortaleza(d.at) : (d.date || "");
      if (!dia || dia === hj) continue; // hoje já aparece no plantão acima
      if (!mapa.has(dia)) mapa.set(dia, []);
      mapa.get(dia)!.push(d);
    }
    return [...mapa.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dia, itens]) => ({ dia, itens: itens.sort((a, b) => String(a.slot || "").localeCompare(String(b.slot || ""))) }));
  }, [doses]);
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

  if (loading) return <div className="p-6 text-center text-sm text-[#374151]">Carregando ficha...</div>;
  if (!h) return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[13px] text-[#009AAC] mb-3">← Voltar ao mapa</button>
      <div className="bg-white border rounded-xl px-6 py-12 text-center text-sm text-[#374151]" style={{ borderColor: "#E8E2D6" }}>Internação não encontrada.</div>
    </div>
  );

  const st = estadoStyle(estado);
  const alta = h.status === "DISCHARGED";
  const ultVital = vitaisOrd[0]; const antVital = vitaisOrd[1]; const ultFluido = fluidosOrd[0];
  // Peso ATUAL pra dosagem: última aferição com peso; se não houver, o peso de entrada.
  const pesoAferido = vitaisOrd.find((v: any) => v?.peso != null && String(v.peso).trim() !== "");
  const pesoAtual = pesoAferido?.peso || adm.pesoEntrada || "";
  const pesoAtualHora = pesoAferido ? (pesoAferido.hora || "") : (adm.pesoEntrada ? "entrada" : "");
  const PesoBadge = () => (pesoAtual ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "#E0F4F6", color: "#007B8A" }} title="Peso atual — base para cálculo de dosagem">
      ⚖️ {pesoAtual} kg{pesoAtualHora ? <span className="font-normal text-[10px] text-[#5C6B70]">· {pesoAtualHora}</span> : null}
    </span>
  ) : null);
  const VITAIS_BIG: [string, string, string][] = [["FC", "bpm", "fc"], ["FR", "mpm", "fr"], ["Temp", "°C", "temp"], ["Dor", "/4", "dor"]];
  const cc = contaCalc();
  const caucAplic = Math.min(caucaoAplicada, cc.totalFaturavel);
  const saldoPagar = Math.max(0, cc.totalFaturavel - caucAplic);
  const CAT_PILL: Record<string, { bg: string; fg: string }> = { Diária: { bg: "#E8F1F8", fg: "#1f5a82" }, Insumo: { bg: "#F0EBE0", fg: "#8A7B63" } };
  const catStyle = (c: string) => CAT_PILL[c] || { bg: "#E0F4F6", fg: "#00707E" };

  const Ch = ({ children, editar }: { children: React.ReactNode; editar?: () => void }) => (
    <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
      <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">{children}</h3>
      {editar && podeEditar && <button onClick={editar} className="text-[13px] text-[#374151] hover:text-[#009AAC]">✏️</button>}
    </div>
  );
  const Field = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="mb-2.5 last:mb-0"><div className="text-[10.5px] text-[#374151] uppercase tracking-wide mb-0.5">{k}</div><div className="text-[13.5px] text-[#1F2A2E] font-medium">{children}</div></div>
  );
  const GanchoCard = ({ emoji, titulo, desc }: { emoji: string; titulo: string; desc: string }) => (
    <div className="bg-white border rounded-[13px] px-4 py-3.5 flex items-center gap-3 opacity-90" style={{ borderColor: "#E8E2D6" }}>
      <div className="text-xl">{emoji}</div>
      <div className="flex-1 min-w-0"><div className="text-[13px] font-medium text-[#014D5E]">{titulo}</div><div className="text-[11.5px] text-[#374151]">{desc}</div></div>
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: "#F0EBE0", color: "#374151" }}>🔒 próxima fase</span>
    </div>
  );

  return (
    <>
      {/* ===== APP (oculto na impressão) ===== */}
      <div className="p-6 max-w-6xl mx-auto print:hidden">
        {/* breadcrumb + voltar */}
        <div className="flex items-center gap-2 text-[12.5px] text-[#374151] mb-2">
          <button onClick={() => router.push("/dashboard/erp/internacoes")} className="text-[#374151] hover:text-[#009AAC]">←</button>
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
            <div className="text-[12.5px] text-[#374151] mt-0.5">
              {[h.pet?.breed, h.pet?.gender, idadeDe(h.pet?.birthDate), h.pet?.weight ? `${h.pet.weight} kg` : null, boxCodigo ? `Box ${boxCodigo}` : null, h.tutor?.name ? `Tutor(a): ${h.tutor.name}` : null].filter(Boolean).join(" · ")}
            </div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            {!podeEditar && <span className="text-[11.5px] font-medium px-3 py-2 rounded-lg bg-[#FBF3E3] text-[#8a6400] border self-center" style={{ borderColor: "#F0DCB0" }}>👁️ Somente leitura</span>}
            <button onClick={() => openWhatsAppMeta(h.tutor?.phone)} className="text-[12.5px] font-medium text-white bg-[#009AAC] px-3 py-2 rounded-lg">💬 WhatsApp</button>
            {h.pet?.id && <Link href={`/dashboard/erp/pets/${h.pet.id}`} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>📄 Ficha do pet</Link>}
            <button onClick={() => window.print()} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🖨️ Resumo de alta</button>
            {!alta && podeEditar && <button onClick={() => setTrocaBoxOpen(true)} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🛏️ Trocar box</button>}
            {!alta && podeEditar && <button onClick={darAlta} className="text-[12.5px] font-medium text-[#CC3366] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#EAC3C1" }}>🚪 Dar alta</button>}
            {!alta && podeEditar && h.status !== "DECEASED" && <button onClick={() => { setObitoForm({ data: new Date().toISOString().slice(0, 10), causa: "" }); setObitoOpen(true); }} className="text-[12.5px] font-medium text-[#5C6B70] bg-white border px-3 py-2 rounded-lg" style={{ borderColor: "#E8E2D6" }}>🕊️ Registrar óbito</button>}
            {podeEditar && <button onClick={excluirInternacao} disabled={boxBusy} className="text-[12.5px] font-medium text-[#374151] bg-white border px-3 py-2 rounded-lg disabled:opacity-50" style={{ borderColor: "#E8E2D6" }} title="Excluir internação">🗑️</button>}
          </div>
        </div>

        {/* ===== REGISTRAR ÓBITO ===== */}
        {obitoOpen && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setObitoOpen(false)}>
            <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
                <h3 className="text-base font-medium text-[#014D5E]">🕊️ Registrar óbito — {h.pet?.name}</h3>
                <button onClick={() => setObitoOpen(false)} className="text-[#374151] text-lg leading-none">✕</button>
              </div>
              <div className="p-5 space-y-3">
                <div className="rounded-lg px-3 py-2.5 text-[12px]" style={{ background: "#FDF4DD", color: "#8a6400" }}>
                  Ao registrar, o pet é marcado como <b>falecido</b> na ficha dele e o sistema <b>para de enviar</b>
                  {" "}mensagens automáticas sobre ele — aniversário, lembrete de vacina e confirmação de agendamento.
                  A internação é encerrada e o box liberado.
                </div>
                <div>
                  <label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Data do óbito</label>
                  <input type="date" value={obitoForm.data} onChange={(e) => setObitoForm({ ...obitoForm, data: e.target.value })} className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                </div>
                <div>
                  <label className="text-[10.5px] text-[#374151] uppercase tracking-wide block mb-1">Causa / observação (opcional)</label>
                  <textarea value={obitoForm.causa} onChange={(e) => setObitoForm({ ...obitoForm, causa: e.target.value })} rows={2} placeholder="Ex.: parada cardiorrespiratória decorrente de..." className="w-full bg-white border rounded-lg px-3 py-2 text-[13px] resize-none focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                </div>
                <div className="text-[11px] text-[#374151]">Registrado por {userName || "—"}.</div>
              </div>
              <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
                <button onClick={() => setObitoOpen(false)} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
                <button onClick={registrarObito} disabled={obitoSaving} className="px-4 py-2 text-[13px] font-medium text-white rounded-lg disabled:opacity-60" style={{ background: "#8A7B8F" }}>{obitoSaving ? "Registrando..." : "🕊️ Confirmar óbito"}</button>
              </div>
            </div>
          </div>
        )}

        {/* ===== TROCAR BOX ===== */}
        {trocaBoxOpen && (
          <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50" onClick={() => setTrocaBoxOpen(false)}>
            <div className="rounded-2xl shadow-xl max-w-sm w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
                <h3 className="text-base font-medium text-[#014D5E]">🛏️ Trocar box</h3>
                <button onClick={() => setTrocaBoxOpen(false)} className="text-[#374151] text-lg leading-none">✕</button>
              </div>
              <div className="p-5">
                <div className="text-[12px] text-[#374151] mb-2">Box atual: <span className="font-medium text-[#1F2A2E]">{boxCodigo ? `Box ${boxCodigo}` : "sem box"}</span></div>
                {boxesLivres.length === 0 ? (
                  <div className="text-[12.5px] text-[#374151] py-2">Nenhum box livre no momento.</div>
                ) : (
                  <div className="space-y-1.5 max-h-[40vh] overflow-y-auto">
                    {boxesLivres.map((b) => (
                      <button key={b.id} onClick={() => trocarBox(b.id)} disabled={boxBusy} className="w-full text-left text-[13px] bg-white border rounded-lg px-3 py-2 hover:border-[#009AAC] disabled:opacity-50" style={{ borderColor: "#E8E2D6" }}>
                        {b.codigo}{b.nome ? <span className="text-[11px] text-[#374151]"> · {b.nome}</span> : null}
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
                    return <button key={e.v} onClick={() => mudarRisco(e.v)} disabled={alta || !podeEditar} className="text-[11.5px] font-medium py-2 px-1 rounded-lg border text-center disabled:opacity-60" style={on ? { background: e.bg, color: e.fg, borderColor: e.fg } : { background: "#FBF9F4", color: "#374151", borderColor: "transparent" }}>{e.v}</button>;
                  })}
                </div>
                <div className="text-[10.5px] text-[#374151] mt-2.5">Sinaliza a cor no mapa e no painel da TV.</div>
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

            {/* boletins programados */}
            {!alta && (
              <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
                <Ch>🔔 Boletins programados</Ch>
                <div className="p-4">
                  {/* Alguns tutores não querem boletim, e animais da própria casa também
                      ficam "internados" sem precisar de aviso periódico. */}
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!h?.vitalSigns?.boletinsDesativados}
                      disabled={!podeEditar}
                      onChange={(e) => salvarVital({ vitalSigns: { boletinsDesativados: e.target.checked } })}
                    />
                    <span className="text-[12px] text-[#5C6B70]">🔕 Não enviar boletins nesta internação</span>
                  </label>
                  {h?.vitalSigns?.boletinsDesativados && (
                    <div className="rounded-lg px-3 py-2 mb-3 text-[11.5px]" style={{ background: "#F0EBE0", color: "#8A7B63" }}>
                      Envio automático <b>desligado</b>. Os textos abaixo ficam salvos, mas nada é enviado ao tutor.
                    </div>
                  )}
                  {/* Caixinhas: marque quais horários enviam boletim (+ adicionar próprio) */}
                  <div className="mb-3">
                    <div className="text-[10px] uppercase tracking-wide text-[#374151] font-semibold mb-1.5">Horários de envio (marque quais)</div>
                    <div className="flex flex-wrap gap-2">
                      {chipsHorarios.map((hor) => {
                        const on = horariosBoletim.includes(hor);
                        return (
                          <button key={hor} type="button" onClick={() => toggleHorario(hor)} disabled={!podeEditar}
                            className={`flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[12.5px] border disabled:cursor-default ${on ? "border-[#009AAC] bg-[#E0F4F6] text-[#014D5E]" : "border-[#E8E2D6] bg-white text-[#5C6B70]"}`}>
                            <span className={`w-4 h-4 rounded-[4px] flex items-center justify-center text-[10px] text-white border ${on ? "bg-[#009AAC] border-[#009AAC]" : "border-[#009AAC] bg-white"}`}>{on ? "✓" : ""}</span>
                            <span className="font-medium">{hor}</span>
                          </button>
                        );
                      })}
                      {!podeEditar ? null : addHoraOpen ? (
                        <span className="flex items-center gap-1">
                          <input value={novaHora} onChange={(e) => setNovaHora(e.target.value)} type="time"
                            className="w-[96px] border rounded-[10px] px-2 py-1.5 text-[12.5px]" style={{ borderColor: "#E8E2D6" }} />
                          <button onClick={adicionarHorario} className="text-[12px] text-white bg-[#009AAC] px-2.5 py-1.5 rounded-[9px]">ok</button>
                          <button onClick={() => { setAddHoraOpen(false); setNovaHora(""); }} className="text-[12px] text-[#5C6B70] px-1" title="Cancelar">✕</button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setAddHoraOpen(true)}
                          className="flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[12.5px] border border-dashed text-[#5C6B70]" style={{ borderColor: "#C9C2B2" }}>
                          ＋ horário
                        </button>
                      )}
                    </div>
                  </div>

                  {horariosBoletim.length === 0 ? (
                    <div className="text-[12px] text-[#374151]">
                      Nenhum horário marcado. Toque numa caixinha acima (ex.: 07:00, 14:00) para programar um boletim.
                    </div>
                  ) : (
                    <>
                      <div className="text-[10px] uppercase tracking-wide text-[#374151] font-semibold mb-1.5">Escreva o boletim de cada horário</div>
                      <div className="space-y-2">
                        {horariosBoletim.map((hor: string) => {
                          const txt = textoDoHorario(hor);
                          const mid = midiaDoHorario(hor);
                          const aberto = bolAberto === hor;
                          return (
                            <div key={hor} className="border rounded-[11px] overflow-hidden" style={{ borderColor: "#E8E2D6" }}>
                              {/* Cabeçalho clicável da sanfona */}
                              <button type="button" onClick={() => setBolAberto(aberto ? "" : hor)}
                                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left ${aberto ? "bg-[#E0F4F6]" : "bg-white"}`}>
                                <span className="text-[13.5px] font-semibold text-[#014D5E] min-w-[46px]">{hor}</span>
                                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={txt.trim() ? { background: "#E1F5EE", color: "#0F6E56" } : { background: "#F0EBE0", color: "#374151" }}>{txt.trim() ? "programado" : "vazio"}</span>
                                {mid?.url && <span className="text-[11px] text-[#5C6B70]" title="Tem anexo">📎</span>}
                                <span className={`ml-auto text-[#5C6B70] text-[12px] transition-transform ${aberto ? "rotate-180" : ""}`}>▾</span>
                              </button>

                              {/* Corpo da sanfona (só o horário aberto) — caixa GRANDE */}
                              {aberto && (
                                <div className="p-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                                  {podeEditar && (modelosBoletim.length === 0 ? (
                                    <div className="text-[11px] mb-2">
                                      <Link href="/dashboard/configuracoes/modelos-boletim" className="text-[#00798A] hover:underline">📋 Cadastrar modelos de boletim</Link>
                                      <span className="text-[#374151]"> — textos prontos, pra não escrever do zero</span>
                                    </div>
                                  ) : (
                                    <select
                                      value=""
                                      onChange={(e) => { const m = modelosBoletim.find((x) => x.id === e.target.value); if (m) setTextoHorario(hor, m.texto.replace(/\[PET\]/g, h.pet?.name || "seu pet")); }}
                                      className="w-full border rounded-lg px-2.5 py-2 text-[12.5px] mb-2 text-[#5C6B70] focus:outline-none focus:border-[#009AAC]"
                                      style={{ borderColor: "#E8E2D6" }}
                                    >
                                      <option value="">📋 Usar um modelo…</option>
                                      {modelosBoletim.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                                    </select>
                                  ))}

                                  {/* Gera o boletim já preenchido dos dados da ficha (o vet completa o que faltar) */}
                                  {podeEditar && (
                                  <div className="flex items-center gap-2 mb-2">
                                    <button onClick={() => setTextoHorario(hor, montarBoletimInternacao("resumo"))} className="text-[11.5px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-md">✨ Gerar resumo</button>
                                    <button onClick={() => setTextoHorario(hor, montarBoletimInternacao("completo"))} className="text-[11.5px] font-medium text-[#014D5E] bg-[#E0F4F6] border border-[#bfe3e8] px-3 py-1.5 rounded-md">✨ Gerar completo</button>
                                  </div>
                                  )}

                                  <textarea
                                    value={txt}
                                    onChange={(e) => setTextoHorario(hor, e.target.value)}
                                    readOnly={!podeEditar}
                                    rows={8}
                                    placeholder={`Boletim das ${hor}...  (espaço grande pra escrever com calma)`}
                                    className="w-full border rounded-lg px-3 py-2.5 text-[13px] leading-relaxed resize-y focus:outline-none focus:border-[#009AAC]"
                                    style={{ borderColor: "#E8E2D6", minHeight: "150px" }}
                                  />
                                  {mid?.url && (
                                    <div className="mt-2 flex items-center gap-2 bg-[#FBF9F4] border rounded-lg px-2 py-1.5" style={{ borderColor: "#E8E2D6" }}>
                                      {mid.tipo === "video"
                                        ? <span className="text-base">🎥</span>
                                        : <img src={mid.url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />}
                                      <span className="text-[11px] text-[#5C6B70] truncate flex-1">{mid.nome || (mid.tipo === "video" ? "vídeo" : "foto")}</span>
                                      {podeEditar && <button onClick={() => setMidiaHorario(hor, null)} className="text-[11px] text-[#CC3366] flex-shrink-0" title="Remover anexo">✕</button>}
                                    </div>
                                  )}
                                  <div className="mt-2 flex items-center gap-4 flex-wrap">
                                    {txt.trim() && (
                                      <button onClick={() => setPreviewBol({ titulo: `Boletim das ${hor}`, texto: txt, horario: hor })} className="text-[12px] text-[#5C6B70] hover:text-[#00798A]">
                                        👁 Visualizar
                                      </button>
                                    )}
                                    {podeEditar && txt.trim() && (
                                      <button onClick={() => enviarBoletimAgora(hor)} disabled={!!bolEnviando} className="text-[12px] text-[#00798A] disabled:opacity-50">
                                        {bolEnviando === hor ? "Enviando..." : "📲 Enviar agora"}
                                      </button>
                                    )}
                                    {podeEditar && !mid?.url && (
                                      <label className="text-[12px] text-[#5C6B70] cursor-pointer hover:text-[#00798A]">
                                        {anexando === hor ? "Enviando arquivo..." : "📎 Anexar foto/vídeo"}
                                        <input type="file" accept="image/*,video/*" className="hidden" disabled={!!anexando}
                                          onChange={(e) => { const f = e.target.files?.[0]; if (f) anexarMidia(hor, f); e.target.value = ""; }} />
                                      </label>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {podeEditar && <button onClick={salvarBoletinsProgramados} disabled={bolProgSaving} className="w-full mt-3 text-[12px] text-white bg-[#009AAC] py-2 rounded-lg disabled:opacity-60">
                        {bolProgSaving ? "Salvando..." : "Salvar boletins"}
                      </button>}
                      <div className="text-[10.5px] text-[#374151] mt-2">
                        No horário, o sistema envia sozinho ao tutor. Horário vazio não envia nada.
                      </div>

                    </>
                  )}

                  {/* Histórico dos boletins JÁ enviados — SEMPRE à mostra (independe de ter horário marcado) */}
                  {boletinsHist.length > 0 && (
                    <details className="mt-2 border-t pt-2" style={{ borderColor: "#F0EBE0" }}>
                      <summary className="text-[12px] cursor-pointer" style={{ color: "#0F6E56" }}>
                        📚 Boletins enviados ({boletinsHist.length})
                      </summary>
                      <div className="mt-1.5">
                        {[...boletinsHist].sort((a, b) => String(b.at || "").localeCompare(String(a.at || ""))).map((bh: any) => (
                          <div key={bh.id} className="flex items-center gap-2 py-1.5 border-b last:border-b-0 text-[12px]" style={{ borderColor: "#F0EBE0" }}>
                            <span title={bh.status === "enviado" ? "Enviado" : "Na fila (envia quando o tutor responder)"}>{bh.status === "enviado" ? "✅" : "📨"}</span>
                            <span className="text-[#374151] tabular-nums whitespace-nowrap">
                              {bh.at ? new Date(bh.at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : ""} {bh.at ? new Date(bh.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                            <span className="text-[#5C6B70] flex-1 truncate">{bh.horario ? `boletim das ${bh.horario}` : "boletim"}{bh.auto ? " · automático" : bh.por ? ` · ${bh.por}` : ""}</span>
                            <button onClick={() => setPreviewBol({ titulo: `Boletim enviado ${bh.horario ? `(${bh.horario})` : ""}`, texto: bh.texto || "" })} title="Ver" className="text-[13px] px-0.5">👁</button>
                            <button onClick={() => imprimirBoletim(bh.texto || "")} title="Imprimir" className="text-[13px] px-0.5">🖨</button>
                            {podeEditar && <button onClick={() => excluirBoletimHist(bh.id)} title="Excluir do histórico" className="text-[13px] px-0.5 text-[#B4BCC0] hover:text-[#CC3366]">🗑</button>}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            )}

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
                {!alta && podeEditar && (
                  <div className="flex gap-2 mb-3">
                    <input value={evoTexto} onChange={(e) => setEvoTexto(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") registrarEvolucao(); }} placeholder="Registrar evolução do paciente..." className="flex-1 border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    <button onClick={registrarEvolucao} disabled={evoSaving} className="text-[12.5px] text-white bg-[#009AAC] px-3.5 py-2 rounded-lg disabled:opacity-60">Registrar</button>
                  </div>
                )}
                {evolucoesOrd.length === 0 ? (
                  <div className="text-[12.5px] text-[#374151] py-3 text-center">Nenhuma evolução registrada ainda.</div>
                ) : (
                  <div className="space-y-0">
                    {evolucoesOrd.map((e, i) => (
                      <div key={e.id} className="py-3 border-b last:border-b-0 pl-3" style={{ borderColor: "#F0EBE0", borderLeft: i === 0 ? "2px solid #009AAC" : "2px solid #E8E2D6" }}>
                        <div className="flex items-center justify-between">
                          <div className="text-[11px] text-[#374151]">{fmtDataHora(e.at)}{e.autor ? ` · ${e.autor}` : ""}</div>
                          {!alta && podeEditar && (
                            <div className="flex gap-1.5">
                              <button onClick={() => { setEvoEditId(e.id); setEvoEditTexto(e.texto || ""); }} className="text-[11px] text-[#B4BCC0] hover:text-[#009AAC]" title="Editar">✏️</button>
                              <button onClick={() => excluirEvolucao(e.id)} className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366]" title="Excluir">🗑️</button>
                            </div>
                          )}
                        </div>
                        {evoEditId === e.id ? (
                          <div className="flex gap-2 mt-1.5">
                            <input value={evoEditTexto} onChange={(ev) => setEvoEditTexto(ev.target.value)} onKeyDown={(ev) => { if (ev.key === "Enter") salvarEvoEdit(e); if (ev.key === "Escape") { setEvoEditId(""); setEvoEditTexto(""); } }} autoFocus className="flex-1 border rounded-lg px-3 py-1.5 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#009AAC" }} />
                            <button onClick={() => salvarEvoEdit(e)} className="text-[12px] text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">Salvar</button>
                            <button onClick={() => { setEvoEditId(""); setEvoEditTexto(""); }} className="text-[12px] text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="text-[13px] text-[#5C6B70] mt-0.5">{e.texto}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prescrição (F3) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <div className="flex items-center gap-2 flex-wrap"><h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💊 Prescrição ativa</h3><PesoBadge /></div>
                {!alta && podeEditar && <button onClick={() => abrirPresc()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Adicionar</button>}
              </div>
              {prescricoes.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#374151]">Nenhuma medicação prescrita ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#374151] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Via</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Freq.</th><th className="text-left font-medium px-2 py-2">Horários</th><th className="text-left font-medium px-2 py-2">Prescrito por</th><th className="px-2 py-2"></th>
                    </tr></thead>
                    <tbody>
                      {prescricoes.map((p) => (
                        <tr key={p.id} className="border-t" style={{ borderColor: "#F0EBE0" }}>
                          <td className="px-4 py-2 font-medium text-[#014D5E] whitespace-nowrap">{p.medicamento}{p.cobrarId ? <span title={`Cobra ${fmtBRL(precoAtualCobranca(p))} na conta a cada aplicação`} className="ml-1.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ background: "#EDE9FA", color: "#5a3b9b" }}>💰 auto</span> : null}</td>
                          <td className="px-2 py-2"><span className="text-[11px] text-[#5C6B70] bg-[#FBF9F4] border rounded px-1.5 py-0.5 whitespace-nowrap" style={{ borderColor: "#E8E2D6" }}>{p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{p.dose || "—"}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{p.frequencia || "—"}</td>
                          <td className="px-2 py-2 tabular-nums text-[#5C6B70] whitespace-nowrap">{(p.horarios || []).join(" · ") || "contínuo"}</td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{p.prescritoPor || "—"}</td>
                          <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && podeEditar && <><button onClick={() => abrirPresc(p)} className="text-[12px] px-1">✏️</button><button onClick={() => excluirPresc(p)} className="text-[12px] px-1">🗑️</button></>}</td>
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
                <div className="px-4 py-6 text-center text-[12.5px] text-[#374151]">Sem doses com horário hoje. Adicione medicações com horários na prescrição.</div>
              ) : plantaoPendentes.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px]" style={{ color: "#0F6E56" }}>✅ Todas as doses de hoje foram aplicadas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead><tr className="text-[10.5px] text-[#374151] uppercase tracking-wide">
                      <th className="text-left font-medium px-4 py-2">Hora</th><th className="text-left font-medium px-2 py-2">Medicação</th><th className="text-left font-medium px-2 py-2">Dose</th><th className="text-left font-medium px-2 py-2">Status</th><th className="text-left font-medium px-2 py-2">Aplicada às</th><th className="text-left font-medium px-2 py-2">Por</th><th className="px-2 py-2 text-center">Feita</th>
                    </tr></thead>
                    <tbody>
                      {plantaoPendentes.map((s) => { const stt = STATUS_MED[s.status]; const done = s.status === "feito"; return (
                        <tr key={s.p.id + s.hhmm} className="border-t" style={{ borderColor: "#F0EBE0", opacity: done ? 0.6 : 1 }}>
                          <td className="px-4 py-2 tabular-nums font-medium whitespace-nowrap">{s.hhmm}</td>
                          <td className="px-2 py-2 whitespace-nowrap">{s.p.medicamento} <span className="text-[11px] text-[#374151]">{s.p.via}</span></td>
                          <td className="px-2 py-2 tabular-nums whitespace-nowrap">{s.p.dose || "—"}</td>
                          <td className="px-2 py-2"><span className="text-[10.5px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: stt.bg, color: stt.fg }}>{stt.lbl}</span></td>
                          {/* Horário REAL do clique (s.log.at), que pode diferir do horário previsto. */}
                          <td className="px-2 py-2 tabular-nums text-[#5C6B70] whitespace-nowrap">
                            {s.log?.at
                              ? (() => { try { return new Date(s.log.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return s.log?.slot || "—"; } })()
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{s.log?.por || "—"}</td>
                          <td className="px-2 py-2 text-center"><button onClick={() => { if (!alta) marcarDose(s); }} disabled={alta} className="w-5 h-5 rounded-md border inline-flex items-center justify-center text-[12px] disabled:cursor-default" style={done ? { background: "#0F6E56", borderColor: "#0F6E56", color: "#fff" } : { background: "#fff", borderColor: "#E8E2D6", color: "transparent" }}>✓</button></td>
                        </tr>
                      ); })}
                    </tbody>
                  </table>
                </div>
              )}
              {/* Aplicadas hoje — recolhido, pra não empurrar o que ainda falta pra baixo. */}
              {plantaoFeitasHoje.length > 0 && (
                <details className="border-t" style={{ borderColor: "#F0EBE0" }}>
                  <summary className="px-4 py-2.5 text-[12px] cursor-pointer" style={{ color: "#0F6E56" }}>
                    ✅ Aplicadas hoje ({plantaoFeitasHoje.length})
                  </summary>
                  <div className="px-4 pb-3">
                    {plantaoFeitasHoje.map((s) => (
                      <div key={s.p.id + s.hhmm} className="flex items-center gap-2 py-1.5 text-[12.5px] border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                        <span className="tabular-nums text-[#374151] w-[42px] flex-shrink-0">{s.hhmm}</span>
                        <span className="flex-1 min-w-0 truncate">{s.p.medicamento} <span className="text-[11px] text-[#374151]">{s.p.via} · {s.p.dose || "—"}</span></span>
                        <span className="text-[11px] text-[#5C6B70] flex-shrink-0">
                          {s.log?.at ? (() => { try { return new Date(s.log.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })() : ""} · {s.log?.por || "—"}
                        </span>
                        <button onClick={() => { if (!alta) marcarDose(s); }} disabled={alta} title="Desmarcar" className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366] flex-shrink-0 disabled:opacity-40">✕</button>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {/* Dias anteriores — um bloco recolhido por data. Internação longa não vira lista sem fim. */}
              {aplicacoesPorData.length > 0 && (
                <details className="border-t" style={{ borderColor: "#F0EBE0" }}>
                  <summary className="px-4 py-2.5 text-[12px] cursor-pointer text-[#5C6B70]">
                    🗓️ Aplicações de dias anteriores ({aplicacoesPorData.length} dia{aplicacoesPorData.length > 1 ? "s" : ""})
                  </summary>
                  <div className="px-4 pb-3">
                    {aplicacoesPorData.map(({ dia, itens }) => (
                      <details key={dia} className="mb-1.5">
                        <summary className="text-[12px] py-1.5 cursor-pointer text-[#014D5E]">
                          {fmtData(dia)} <span className="text-[11px] text-[#374151]">— {itens.length} aplicação(ões)</span>
                        </summary>
                        <div className="pl-3">
                          {itens.map((d: any) => (
                            <div key={d.id} className="flex items-center gap-2 py-1 text-[12px] border-b last:border-b-0" style={{ borderColor: "#F0EBE0" }}>
                              <span className="tabular-nums text-[#374151] w-[42px] flex-shrink-0">{d.slot || "—"}</span>
                              <span className="flex-1 min-w-0 truncate">{d.med} <span className="text-[11px] text-[#374151]">{d.via} · {d.dose || "—"}</span></span>
                              <span className="text-[11px] text-[#5C6B70] flex-shrink-0">
                                {d.at ? (() => { try { return new Date(d.at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } })() : ""} · {d.por || "—"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    ))}
                  </div>
                </details>
              )}

              {!alta && <div className="px-4 py-2.5 text-[11px] text-[#374151] border-t" style={{ borderColor: "#F0EBE0" }}>Marcar a dose registra quem aplicou ({userName || "você"}) e a hora.</div>}
            </div>

            {/* Sinais vitais (F4) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <div className="flex items-center gap-2 flex-wrap"><h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">🩺 Sinais vitais{ultVital?.hora ? <span className="text-[11px] text-[#374151] font-normal">· última {ultVital.hora}</span> : null}</h3><PesoBadge /></div>
                {!alta && podeEditar && <button onClick={abrirVital} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Registrar aferição</button>}
              </div>
              {/* Agendamento das aferições — mesmo esquema das medicações */}
              {!alta && (
                <div className="px-4 py-3 border-b flex flex-wrap items-end gap-x-3 gap-y-2" style={{ borderColor: "#F0EBE0", background: "#F5FCFD" }}>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#014D5E] mb-1">Frequência</label>
                    <select value={aferiFreq} onChange={(e) => salvarAferiCfg(e.target.value, aferiPrim)} disabled={!podeEditar} className="border rounded-lg px-2 py-1.5 text-[13px] bg-white disabled:opacity-60" style={{ borderColor: "#E8DFC8", color: "#014D5E" }}>
                      <option value="">—</option>
                      {freqOpcoes.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold uppercase tracking-wide text-[#014D5E] mb-1">1ª aferição</label>
                    <input type="time" value={aferiPrim} onChange={(e) => salvarAferiCfg(aferiFreq, e.target.value)} disabled={!podeEditar} className="border rounded-lg px-2 py-1.5 text-[13px] bg-white disabled:opacity-60" style={{ borderColor: "#E8DFC8", color: "#014D5E" }} />
                  </div>
                  <span className="text-[#7C8A8E] pb-2">→</span>
                  <div className="flex flex-wrap gap-1.5 items-center pb-1">
                    {horariosAferi.length > 0
                      ? horariosAferi.map((hh) => <span key={hh} className="rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums" style={{ background: "#E0F4F6", color: "#007B8A" }}>{hh}</span>)
                      : <span className="text-[11px] text-[#7C8A8E]">defina a frequência e a 1ª aferição pra gerar os horários</span>}
                  </div>
                </div>
              )}
              {vitaisOrd.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#374151]">Nenhuma aferição registrada ainda.</div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-4 gap-2">
                    {VITAIS_BIG.map(([lbl, un, f]) => {
                      const val = ultVital?.[f]; const tr = tendencia(ultVital?.[f], antVital?.[f]); const trS = TREND_ST[tr.dir]; const al = f === "temp" && tempForaFaixa(val);
                      return (
                        <div key={f} className="rounded-[11px] border px-2 py-3 text-center" style={{ background: "#FBF9F4", borderColor: "#F0EBE0" }}>
                          <div className="text-[22px] leading-none font-medium tabular-nums" style={{ color: al ? "#CC3366" : "#014D5E" }}>{val || "—"}<small className="text-[11px] text-[#374151] font-normal">{un}</small></div>
                          <div className="text-[10px] text-[#374151] uppercase tracking-wide mt-1.5">{lbl}</div>
                          {antVital && <div className="inline-flex items-center gap-1 text-[10px] mt-1 px-2 py-0.5 rounded-full" style={{ background: trS.bg, color: trS.fg }}>{tr.ar} {al && f === "temp" ? "alerta" : tr.txt}</div>}
                        </div>
                      );
                    })}
                  </div>
                  {sparkTemp && (
                    <div className="flex items-center gap-2.5 mt-3.5">
                      <span className="text-[10px] text-[#374151] uppercase tracking-wide">Temp · últimas</span>
                      <svg width={sparkTemp.W} height={sparkTemp.H} viewBox={`0 0 ${sparkTemp.W} ${sparkTemp.H}`} className="max-w-full">
                        <line x1="0" y1={sparkTemp.H - 4} x2={sparkTemp.W} y2={sparkTemp.H - 4} stroke="#F0EBE0" strokeWidth="1" />
                        <polyline points={sparkTemp.poly} fill="none" stroke="#009AAC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx={sparkTemp.last[0]} cy={sparkTemp.last[1]} r="3.5" fill="#009AAC" />
                      </svg>
                      <span className="text-[11px] text-[#374151] tabular-nums">{sparkTemp.min.toFixed(1)} → {sparkTemp.max.toFixed(1)} °C</span>
                    </div>
                  )}
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-[12.5px]">
                      <thead><tr className="text-[10px] text-[#374151] uppercase tracking-wide">
                        <th className="text-left font-medium px-3 py-2">Hora</th><th className="text-left font-medium px-2 py-2">Peso</th><th className="text-left font-medium px-2 py-2">FC</th><th className="text-left font-medium px-2 py-2">FR</th><th className="text-left font-medium px-2 py-2">Temp</th><th className="text-left font-medium px-2 py-2">PA</th><th className="text-left font-medium px-2 py-2">SpO₂</th><th className="text-left font-medium px-2 py-2">Mucosa</th><th className="text-left font-medium px-2 py-2">Dor</th><th className="text-left font-medium px-2 py-2">Por</th><th className="px-2 py-2"></th>
                      </tr></thead>
                      <tbody>
                        {vitaisOrd.map((v) => (
                          <tr key={v.id} className="border-t tabular-nums" style={{ borderColor: "#F0EBE0" }}>
                            <td className="px-3 py-2 whitespace-nowrap">{v.hora || "—"}</td><td className="px-2 py-2 whitespace-nowrap font-medium" style={{ color: "#014D5E" }}>{v.peso ? `${v.peso} kg` : "—"}</td><td className="px-2 py-2">{v.fc || "—"}</td><td className="px-2 py-2">{v.fr || "—"}</td>
                            <td className="px-2 py-2 whitespace-nowrap" style={tempForaFaixa(v.temp) ? { color: "#CC3366", fontWeight: 500 } : {}}>{v.temp ? `${v.temp}°` : "—"}</td>
                            <td className="px-2 py-2 whitespace-nowrap">{v.pa || "—"}</td><td className="px-2 py-2 whitespace-nowrap">{v.sat ? `${v.sat}%` : "—"}</td><td className="px-2 py-2">{v.mucosa || "—"}</td><td className="px-2 py-2">{v.dor ?? "—"}</td>
                            <td className="px-2 py-2 text-[#5C6B70] whitespace-nowrap">{v.por || "—"}</td>
                            <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && podeEditar && <><button onClick={() => abrirVitalEdit(v)} className="text-[12px] px-1" title="Editar">✏️</button><button onClick={() => excluirVital(v.id)} className="text-[12px] px-1" title="Excluir">🗑️</button></>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Avisos (lembretes de medicação e aferição) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">🔔 Avisos</h3>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {([["popup", "Pop-up 15 min antes"], ["som", "Som do alerta"], ["whatsapp", "WhatsApp pro plantonista"], ["repetir", "Repetir se atrasar"]] as [string, string][]).map(([k, lbl]) => (
                  <button key={k} onClick={() => podeEditar && !alta && toggleAviso(k)} disabled={!podeEditar || alta} className="flex items-center gap-2 border rounded-[10px] px-3 py-2 text-[12.5px] disabled:opacity-60" style={{ borderColor: "#E8DFC8", color: "#014D5E", background: "#fff" }}>
                    <span className="relative inline-block flex-shrink-0" style={{ width: 34, height: 19, borderRadius: 20, background: (avisos as any)[k] ? "#009AAC" : "#cdd5d4", transition: "background .15s" }}>
                      <span className="absolute" style={{ top: 2, left: (avisos as any)[k] ? 17 : 2, width: 15, height: 15, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
                    </span>
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="px-4 pb-3 text-[11px] text-[#7C8A8E]">Valem para medicações e aferições. O aviso no celular (WhatsApp) chega ao veterinário de plantão, no horário da escala dele.</div>
            </div>

            {/* Fluidos, dejetos & alimentação (F4) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💧 Fluidos, dejetos &amp; alimentação{ultFluido?.hora ? <span className="text-[11px] text-[#374151] font-normal">· último {ultFluido.hora}</span> : null}</h3>
                {!alta && podeEditar && <button onClick={abrirFluido} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Registrar controle</button>}
              </div>
              {!ultFluido ? (
                <div className="px-4 py-6 text-center text-[12.5px] text-[#374151]">Nenhum controle registrado ainda.</div>
              ) : (
                <div className="p-4">
                  <div className="grid grid-cols-2 rounded-[11px] border overflow-hidden" style={{ borderColor: "#F0EBE0" }}>
                    {[["💧 Entrada (fluido)", ultFluido.entradaFluido ? `${ultFluido.entradaFluido} ml` : "—"], ["🥤 Ingestão de água", ultFluido.agua ? `${ultFluido.agua} ml` : "—"], ["🚻 Diurese", ultFluido.diurese || "—"], ["💩 Fezes", ultFluido.fezes || "—"], ["🍽️ Alimentação", ultFluido.alimentacao || "—"], ["🤢 Êmese", ultFluido.emese || "—"]].map(([lbl, val], i) => (
                      <div key={lbl} className="flex justify-between items-center px-3.5 py-2.5 border-b" style={{ borderColor: "#F0EBE0", borderRight: i % 2 === 0 ? "1px solid #F0EBE0" : undefined }}>
                        <span className="text-[12px] text-[#5C6B70]">{lbl}</span><span className="text-[13px] font-medium text-[#014D5E]">{val}</span>
                      </div>
                    ))}
                  </div>
                  {ultFluido.observacao && (
                    <div className="mt-2 text-[12.5px] text-[#5C6B70] border rounded-[9px] px-3.5 py-2.5" style={{ borderColor: "#F0EBE0", background: "#FBF9F4" }}>
                      <span className="text-[#014D5E] font-medium">📝 Observação:</span> {ultFluido.observacao}
                    </div>
                  )}
                  {fluidosOrd.length > 0 && (
                    <div className="mt-3 space-y-0">
                      {fluidosOrd.map((f) => (
                        <div key={f.id} className="flex items-start gap-2 text-[12px] py-1.5 border-t" style={{ borderColor: "#F0EBE0" }}>
                          <span className="tabular-nums w-[92px] flex-shrink-0">
                            <span className="block whitespace-nowrap text-[#374151]">{f.hora}</span>
                            {f.por ? <span className="block text-[10px] text-[#94a3b8] truncate" title={f.por}>{f.por}</span> : null}
                          </span>
                          <span className="text-[#5C6B70] flex-1 min-w-0 break-words">{[f.entradaFluido && `fluido ${f.entradaFluido} ml`, f.agua && `água ${f.agua} ml`, f.diurese && `diurese ${f.diurese}`, f.fezes && `fezes ${f.fezes}`, f.alimentacao && `alim. ${f.alimentacao}`, f.emese && `êmese ${f.emese}`, f.observacao && `obs: ${f.observacao}`].filter(Boolean).join(" · ") || "—"}</span>
                          {!alta && podeEditar && <div className="flex gap-1.5 flex-shrink-0"><button onClick={() => abrirFluidoEdit(f)} className="text-[11px] text-[#B4BCC0] hover:text-[#009AAC]" title="Editar">✏️</button><button onClick={() => excluirFluido(f.id)} className="text-[11px] text-[#B4BCC0] hover:text-[#CC3366]" title="Excluir">🗑️</button></div>}
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
                {!alta && podeEditar && <button onClick={() => abrirItem()} className="text-[12px] font-medium text-white bg-[#009AAC] px-3 py-1.5 rounded-lg">➕ Adicionar item</button>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead><tr className="text-[10.5px] text-[#374151] uppercase tracking-wide">
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
                        <td className="px-2 py-2 text-right whitespace-nowrap">{!alta && podeEditar && <><button onClick={() => abrirItem(i)} className="text-[12px] px-1">✏️</button><button onClick={() => excluirItem(i)} className="text-[12px] px-1">🗑️</button></>}</td>
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
              <div className="px-4 pb-3 text-[10.5px] text-[#374151]">Diárias entram automáticas (dias × valor/dia). Insumos “só estoque” não somam na conta.</div>
            </div>

            {/* Caução (F5) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}>
                <h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">💳 Caução (crédito do tutor)</h3>
                {!alta && podeEditar && <button onClick={() => setCaucaoOpen(true)} className="text-[12px] font-medium text-[#5C6B70] bg-white border px-3 py-1.5 rounded-lg" style={{ borderColor: "#E8E2D6" }}>➕ Adicionar caução</button>}
              </div>
              <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-[10.5px] text-[#374151] uppercase tracking-wide">Saldo disponível de {h.tutor?.name || "tutor"}</div>
                  <div className="text-[22px] font-medium tabular-nums" style={{ color: "#5a3b9b" }}>{fmtBRL(caucaoSaldo)}</div>
                </div>
                {caucaoSaldo > 0 && cc.totalFaturavel > 0 && !alta && podeEditar && (
                  <button onClick={aplicarCaucao} className="text-[12.5px] font-medium px-3.5 py-2 rounded-lg" style={caucaoAplicada > 0 ? { background: "#EDE9FA", color: "#5a3b9b" } : { background: "#009AAC", color: "#fff" }}>{caucaoAplicada > 0 ? "✓ Caução aplicada — remover" : "Aplicar à conta"}</button>
                )}
              </div>
            </div>

            {/* Fechamento (F5) */}
            <div className="bg-white border rounded-[13px]" style={{ borderColor: "#E8E2D6" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "#F0EBE0" }}><h3 className="text-[13px] font-medium text-[#014D5E] flex items-center gap-2">📤 Fechamento</h3></div>
              <div className="p-4">
                <div className="flex gap-2 flex-wrap">
                  {!alta && <button onClick={gerarComandaDia} disabled={!!finBusy} className="text-[13px] font-medium text-white bg-[#009AAC] px-4 py-2 rounded-lg disabled:opacity-60">{finBusy === "comanda" ? "Gerando..." : "📅 Gerar comanda do dia"}</button>}
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
                <div className="text-[10.5px] text-[#374151] mt-2.5">“Gerar comanda do dia” fatura a diária de hoje + os itens abertos numa venda (a receber) no caixa — 1 diária por dia, sem repetir. A caução do cliente é aplicada quando a recepção recebe a comanda no caixa. “Baixar insumos” dá saída no estoque dos itens vinculados a produto.</div>
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
              <tr key={k as string}><td style={{ padding: "6px 8px", color: "#374151", width: 200, borderBottom: "1px solid #F0EBE0" }}>{k}</td><td style={{ padding: "6px 8px", borderBottom: "1px solid #F0EBE0" }}>{v}</td></tr>
            ))}
          </tbody>
        </table>
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Evolução médica</h2>
        {evolucoesOrd.length === 0 ? <div style={{ fontSize: 12, color: "#374151" }}>Sem registros.</div> : evolucoesOrd.slice().reverse().map((e) => (
          <div key={e.id} style={{ fontSize: 12.5, marginBottom: 6 }}><b style={{ color: "#5C6B70" }}>{fmtDataHora(e.at)}:</b> {e.texto}</div>
        ))}
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Tratamento realizado na internação</h2>
        {prescricoes.length === 0 ? <div style={{ fontSize: 12, color: "#374151" }}>—</div> : prescricoes.map((p) => (
          <div key={p.id} style={{ fontSize: 12.5, marginBottom: 3 }}>• {p.medicamento}{p.dose ? ` ${p.dose}` : ""}{p.via ? ` (${p.via})` : ""}{p.frequencia ? ` — ${p.frequencia}` : ""}</div>
        ))}

        {/* Estrutura da ALTA — campos pro veterinário preencher na hora (linhas p/ escrita) */}
        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Cuidados em casa</h2>
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />

        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Medicações em casa (remédio, dose e horários)</h2>
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />

        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Retorno / reavaliação</h2>
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />

        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Sinais de alerta — procurar a clínica se:</h2>
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />
        <div style={{ borderBottom: "1px solid #C9CFD3", height: 24 }} />

        <h2 style={{ fontSize: 14, color: "#014D5E", margin: "18px 0 6px" }}>Conta</h2>
        <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
          <tbody>
            <tr><td style={{ padding: "5px 8px", borderBottom: "1px solid #F0EBE0" }}>Diária internação ({cc.dias}×)</td><td style={{ padding: "5px 8px", textAlign: "right", borderBottom: "1px solid #F0EBE0" }}>{fmtBRL(cc.diariaTotal)}</td></tr>
            {cc.itensFat.map((i) => (<tr key={i.id}><td style={{ padding: "5px 8px", borderBottom: "1px solid #F0EBE0" }}>{i.descricao} ({i.quantidade}×)</td><td style={{ padding: "5px 8px", textAlign: "right", borderBottom: "1px solid #F0EBE0" }}>{fmtBRL((Number(i.quantidade) || 0) * (Number(i.valorUnitario) || 0))}</td></tr>))}
            <tr><td style={{ padding: "6px 8px", fontWeight: 600 }}>Total faturável</td><td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>{fmtBRL(cc.totalFaturavel)}</td></tr>
            {caucaoSaldo > 0 && (<tr><td style={{ padding: "5px 8px", color: "#5a3b9b" }}>Caução em conta</td><td style={{ padding: "5px 8px", textAlign: "right", color: "#5a3b9b" }}>− {fmtBRL(caucaoSaldo)}</td></tr>)}
          </tbody>
        </table>

        <div style={{ marginTop: 40, display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
          <div style={{ width: "52%", borderTop: "1px solid #1F2A2E", paddingTop: 4, textAlign: "center" }}>Veterinário(a) responsável — CRMV</div>
          <div style={{ width: "26%", borderTop: "1px solid #1F2A2E", paddingTop: 4, textAlign: "center" }}>Data</div>
        </div>
      </div>

      {/* ===== POPUP EDITAR ADMISSÃO ===== */}
      {admOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setAdmOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">📋 Editar admissão</h3>
              <button onClick={() => setAdmOpen(false)} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#374151] block mb-1">Peso de entrada (kg)</label>
                <input type="number" step="0.01" value={admForm.pesoEntrada} onChange={(e) => setAdmForm({ ...admForm, pesoEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Temp. de entrada (°C)</label>
                <input type="number" step="0.1" value={admForm.tempEntrada} onChange={(e) => setAdmForm({ ...admForm, tempEntrada: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Diagnóstico / motivo</label>
                <input value={admForm.diagnosis} onChange={(e) => setAdmForm({ ...admForm, diagnosis: e.target.value })} placeholder="Ex.: Pós-op esplenectomia" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Prognóstico</label>
                <select value={admForm.prognostico} onChange={(e) => setAdmForm({ ...admForm, prognostico: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">—</option>{PROGNOSTICOS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Predição de alta</label>
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
              <button onClick={() => setPrescOpen(false)} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Medicação *</label>
                <input value={prescForm.medicamento} onChange={(e) => setPrescForm({ ...prescForm, medicamento: e.target.value })} placeholder="Ex.: Tramadol" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">💰 Cobrar na conta a cada aplicação <span className="text-[#94a3b8]">(opcional)</span></label>
                {prescForm.cobrarId ? (
                  <div className="flex items-center gap-2 border rounded-lg px-3 py-2 bg-[#F0FBF9]" style={{ borderColor: "#BEE3E8" }}>
                    <span className="text-[13px] text-[#0F6E56] font-medium flex-1 truncate">💊 {prescForm.cobrarNome} · {fmtBRL(precoAtualCobranca(prescForm))}</span>
                    <button type="button" onClick={() => { pickPrescCobranca(""); setCobrancaBusca(""); }} className="text-[#b23b39] text-[12px] shrink-0">trocar/remover</button>
                  </div>
                ) : (
                  <div className="relative">
                    <input value={cobrancaBusca} onChange={(e) => setCobrancaBusca(e.target.value)} placeholder="🔍 Digite as primeiras letras do serviço/produto…" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} />
                    {cobrancaBusca.trim() && (() => {
                      const q = cobrancaBusca.trim().toLowerCase();
                      const svc = servicos.filter((s: any) => (s.nome || "").toLowerCase().includes(q)).slice(0, 10).map((s: any) => ({ val: `s:${s.id}`, nome: s.nome, preco: s.valorPadrao }));
                      const prd = produtos.filter((p: any) => (p.name || "").toLowerCase().includes(q)).slice(0, 10).map((p: any) => ({ val: `p:${p.id}`, nome: p.name, preco: p.price ?? p.valorPadrao }));
                      const ops = [...svc, ...prd].slice(0, 16);
                      return (
                        <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg max-h-44 overflow-auto shadow-lg" style={{ borderColor: "#E8E2D6" }}>
                          {ops.length === 0 ? <div className="px-3 py-2 text-[12px] text-[#94a3b8]">Nada encontrado.</div> :
                            ops.map((o) => (
                              <button key={o.val} type="button" onClick={() => { pickPrescCobranca(o.val); setCobrancaBusca(""); }} className="flex w-full justify-between items-center px-3 py-1.5 text-[12.5px] border-b last:border-b-0 hover:bg-[#F0FBFC] text-left" style={{ borderColor: "#F5F1E8" }}>
                                <span className="truncate pr-2 text-[#1F2A2E]">{o.nome}</span><span className="text-[#0F6E56] font-semibold shrink-0">{o.preco != null ? fmtBRL(o.preco) : ""}</span>
                              </button>
                            ))}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {prescForm.cobrarId ? (
                  <p className="text-[10.5px] text-[#0F6E56] mt-1">✓ Cada ✓ no plantão lança <b>1× {prescForm.cobrarNome}</b> ({fmtBRL(precoAtualCobranca(prescForm))}) na conta. Desmarcar o ✓ remove o lançamento.</p>
                ) : (
                  <p className="text-[10.5px] text-[#94a3b8] mt-1">Vincule a um item do catálogo com preço para lançar automaticamente na conta ao aplicar.</p>
                )}</div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Via</label>
                <select value={prescForm.via} onChange={(e) => setPrescForm({ ...prescForm, via: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{VIAS.map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Dose</label>
                <input value={prescForm.dose} onChange={(e) => setPrescForm({ ...prescForm, dose: e.target.value })} placeholder="3 mg/kg" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">1ª aplicação</label>
                <input type="time" value={prescForm.primeira} onChange={(e) => { const primeira = e.target.value; const calc = calcularHorarios(primeira, prescForm.frequencia); setPrescForm({ ...prescForm, primeira, ...(calc ? { horarios: calc } : {}) }); }} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Frequência</label>
                <select value={prescForm.frequencia} onChange={(e) => { const frequencia = e.target.value; const calc = calcularHorarios(prescForm.primeira, frequencia); setPrescForm({ ...prescForm, frequencia, ...(calc ? { horarios: calc } : {}) }); }} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>
                  <option value="">Contínua / sem frequência fixa</option>
                  {freqOpcoes.map((v) => <option key={v} value={v}>{v}</option>)}
                  {prescForm.frequencia && !FREQUENCIAS.some((f) => f.v === prescForm.frequencia) && <option value={prescForm.frequencia}>{prescForm.frequencia}</option>}
                </select></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Horários (HH:MM)</label>
                <input value={prescForm.horarios} onChange={(e) => setPrescForm({ ...prescForm, horarios: e.target.value })} placeholder="06:00, 14:00, 22:00" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2 -mt-1 text-[10.5px] text-[#374151]">
                Preencha a <b>1ª aplicação</b> e a <b>frequência</b> que os horários são calculados sozinhos — e você pode editar depois.
                Deixe os horários vazios para medicação <b>contínua</b> (não gera doses no plantão).
                {(prescForm.prescritoPor || userName) && <> Prescrição registrada em nome de <b>{prescForm.prescritoPor || userName}</b>.</>}
              </div>
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Observação</label>
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
      {/* ===== POPUP VISUALIZAR BOLETIM (preview estilo WhatsApp) ===== */}
      {previewBol && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setPreviewBol(null)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">👁 {previewBol.titulo}</h3>
              <button onClick={() => setPreviewBol(null)} className="text-[#374151]">✕</button>
            </div>
            <div className="p-4 overflow-y-auto" style={{ background: "#e5ddd5" }}>
              <div className="bg-white rounded-xl px-3.5 py-3 text-[13px] text-[#1F2A2E] shadow-sm" style={{ borderTopLeftRadius: 4 }}
                dangerouslySetInnerHTML={{ __html: textoParaHtml(previewBol.texto) }} />
            </div>
            <div className="px-5 py-3.5 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => imprimirBoletim(previewBol.texto)} className="px-3.5 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>🖨 Imprimir</button>
              {previewBol.horario && (
                <button onClick={() => { const hor = previewBol.horario!; setPreviewBol(null); enviarBoletimAgora(hor); }} disabled={!!bolEnviando} className="px-3.5 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">📲 Enviar agora</button>
              )}
              <button onClick={() => setPreviewBol(null)} className="px-3.5 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}

      {vitalOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setVitalOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">{vitalEditId ? "🩺 Editar aferição" : "🩺 Registrar aferição"}</h3>
              <button onClick={() => { setVitalOpen(false); setVitalEditId(""); }} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#014D5E] font-medium block mb-1">⚖️ Peso (kg) — base pra dosagem</label>
                <input type="number" step="0.01" value={vitalForm.peso} onChange={(e) => setVitalForm({ ...vitalForm, peso: e.target.value })} placeholder="Ex.: 6.2" className="w-full border rounded-lg px-3 py-2 text-[14px] font-medium focus:outline-none" style={{ borderColor: "#009AAC", background: "#F0FBFC", color: "#014D5E" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">FC (bpm)</label>
                <input type="number" value={vitalForm.fc} onChange={(e) => setVitalForm({ ...vitalForm, fc: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">FR (mpm)</label>
                <input type="number" value={vitalForm.fr} onChange={(e) => setVitalForm({ ...vitalForm, fr: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Temp (°C)</label>
                <input type="number" step="0.1" value={vitalForm.temp} onChange={(e) => setVitalForm({ ...vitalForm, temp: e.target.value })} placeholder="38.5" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">PA (mmHg)</label>
                <input value={vitalForm.pa} onChange={(e) => setVitalForm({ ...vitalForm, pa: e.target.value })} placeholder="110/70" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">SpO₂ (%)</label>
                <input type="number" min={0} max={100} value={vitalForm.sat} onChange={(e) => setVitalForm({ ...vitalForm, sat: e.target.value })} placeholder="98" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Mucosa</label>
                <select value={vitalForm.mucosa} onChange={(e) => setVitalForm({ ...vitalForm, mucosa: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{MUCOSAS.map((m) => <option key={m} value={m}>{m}</option>)}</select></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Dor (0–4)</label>
                <select value={vitalForm.dor} onChange={(e) => setVitalForm({ ...vitalForm, dor: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{["0", "1", "2", "3", "4"].map((d) => <option key={d} value={d}>{d}</option>)}</select></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => { setVitalOpen(false); setVitalEditId(""); }} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={registrarVital} disabled={vitalSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{vitalSaving ? "Salvando..." : (vitalEditId ? "Salvar" : "Registrar")}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP CONTROLE (fluidos) ===== */}
      {fluidoOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-4 z-50 print:hidden" onClick={() => setFluidoOpen(false)}>
          <div className="rounded-2xl shadow-xl max-w-md w-full" style={{ background: "#FBF9F4", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "#E8E2D6" }}>
              <h3 className="text-base font-medium text-[#014D5E]">{fluidoEditId ? "💧 Editar controle" : "💧 Registrar controle"}</h3>
              <button onClick={() => { setFluidoOpen(false); setFluidoEditId(""); }} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div><label className="text-[11px] text-[#374151] block mb-1">Entrada fluido (ml)</label>
                <input type="number" value={fluidoForm.entradaFluido} onChange={(e) => setFluidoForm({ ...fluidoForm, entradaFluido: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Ingestão água (ml)</label>
                <input type="number" value={fluidoForm.agua} onChange={(e) => setFluidoForm({ ...fluidoForm, agua: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Diurese</label>
                <input value={fluidoForm.diurese} onChange={(e) => setFluidoForm({ ...fluidoForm, diurese: e.target.value })} placeholder="2× normal" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Fezes</label>
                <input value={fluidoForm.fezes} onChange={(e) => setFluidoForm({ ...fluidoForm, fezes: e.target.value })} placeholder="1× pastosa" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Alimentação</label>
                <input value={fluidoForm.alimentacao} onChange={(e) => setFluidoForm({ ...fluidoForm, alimentacao: e.target.value })} placeholder="Aceitou 40%" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Êmese (vômito)</label>
                <input value={fluidoForm.emese} onChange={(e) => setFluidoForm({ ...fluidoForm, emese: e.target.value })} placeholder="Ausente" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">📝 Observação (outros itens do pet)</label>
                <textarea value={fluidoForm.observacao} onChange={(e) => setFluidoForm({ ...fluidoForm, observacao: e.target.value })} rows={2} placeholder="Ex.: vomitou 1× amarelado às 11h; lambendo a pata direita…" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC] resize-y" style={{ borderColor: "#E8E2D6" }} /></div>
            </div>
            <div className="px-5 py-4 border-t flex justify-end gap-2" style={{ borderColor: "#E8E2D6" }}>
              <button onClick={() => { setFluidoOpen(false); setFluidoEditId(""); }} className="px-4 py-2 text-[13px] text-[#5C6B70] bg-white border rounded-lg" style={{ borderColor: "#E8E2D6" }}>Cancelar</button>
              <button onClick={registrarFluido} disabled={fluidoSaving} className="px-4 py-2 text-[13px] text-white bg-[#009AAC] rounded-lg disabled:opacity-60">{fluidoSaving ? "Salvando..." : (fluidoEditId ? "Salvar" : "Registrar")}</button>
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
              <button onClick={() => setItemOpen(false)} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 grid grid-cols-2 gap-3 text-[13px]">
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Categoria</label>
                <select value={itemForm.categoria} onChange={(e) => setItemForm({ ...itemForm, categoria: e.target.value, servicoId: "", productId: "" })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{CAT_CONTA.map((c) => <option key={c} value={c}>{c === "Insumo" ? "Insumo (só estoque, não cobra)" : c}</option>)}</select></div>
              {itemForm.categoria !== "Insumo" ? (
                <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Serviço do catálogo (opcional)</label>
                  <select value={itemForm.servicoId} onChange={(e) => pickServico(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">— digitar manualmente —</option>{servicos.map((s) => <option key={s.id} value={s.id}>{s.nome}{s.valorPadrao != null ? ` · ${fmtBRL(s.valorPadrao)}` : ""}</option>)}</select></div>
              ) : (
                <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Produto (p/ baixar do estoque)</label>
                  <select value={itemForm.productId} onChange={(e) => pickProduto(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}><option value="">— sem vínculo (não baixa) —</option>{produtos.map((p) => <option key={p.id} value={p.id}>{p.name}{typeof p.stock === "number" ? ` · estoque ${p.stock}` : ""}</option>)}</select></div>
              )}
              <div className="col-span-2"><label className="text-[11px] text-[#374151] block mb-1">Descrição *</label>
                <input value={itemForm.descricao} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Quantidade</label>
                <input type="number" min={1} value={itemForm.quantidade} onChange={(e) => setItemForm({ ...itemForm, quantidade: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              {itemForm.categoria !== "Insumo" && (
                <div><label className="text-[11px] text-[#374151] block mb-1">Valor unitário (R$)</label>
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
              <button onClick={() => setCaucaoOpen(false)} className="text-[#374151]">✕</button>
            </div>
            <div className="p-5 space-y-3 text-[13px]">
              <div className="flex gap-2">
                <div className="flex-1"><label className="text-[11px] text-[#374151] block mb-1">Valor (R$) *</label>
                  <input type="number" min={0} step="0.01" value={caucaoForm.valor} onChange={(e) => setCaucaoForm({ ...caucaoForm, valor: e.target.value })} placeholder="0,00" className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
                <div className="flex-1"><label className="text-[11px] text-[#374151] block mb-1">Forma (entra no caixa)</label>
                  <select value={caucaoForm.forma} onChange={(e) => setCaucaoForm({ ...caucaoForm, forma: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] bg-white focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }}>{["Dinheiro", "Pix", "Cartão crédito", "Cartão débito"].map((fx) => <option key={fx} value={fx}>{fx}</option>)}</select></div>
              </div>
              <div><label className="text-[11px] text-[#374151] block mb-1">Descrição</label>
                <input value={caucaoForm.descricao} onChange={(e) => setCaucaoForm({ ...caucaoForm, descricao: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-[13px] focus:outline-none focus:border-[#009AAC]" style={{ borderColor: "#E8E2D6" }} /></div>
              <div className="text-[10.5px] text-[#374151]">Adiciona crédito ao tutor {h.tutor?.name}. Fica como saldo e pode abater da conta.</div>
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
