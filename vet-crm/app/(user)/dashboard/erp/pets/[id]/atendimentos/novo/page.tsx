"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Ficha de Atendimento (Fase A)   [EMP-COWORK]
   Tela cheia — mockups: ficha_atendimento_mockup + exames_duas_caixas_mockup
   Estética Base44 (bege/teal). Fase B (financeiro/caixa/terceiros) NÃO entra aqui.
   ───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";
import ConsultationRecorder from "@/components/protected/dashboard/clinical-documents/ConsultationRecorder";

interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  gender?: string | null; birthDate?: string | null; weight?: number | null;
  tutorId: string; tutor?: { id: string; name: string };
  followUpNotes?: string | null; proximoFollowupAt?: string | null;
  insurancePlan?: string | null;
}
interface Prof { id: string; name: string; }
interface ExameCat { id: string; nome: string; codigo?: string | null; categoria?: string | null; fornecedor?: { id: string; nome: string; tipo?: string } | null; }

const PET_EMOJI = (s: string) => { const u = (s || "").toUpperCase(); if (u.includes("FELIN") || u.includes("GAT")) return "🐱"; if (u.includes("CANIN") || u.includes("CACHORR")) return "🐶"; return "🐾"; };
const VIAS = ["Oral (VO)", "Subcutânea (SC)", "Intramuscular (IM)", "Intravenosa (IV)", "Tópica", "Ocular", "Auricular", "Inalatória", "Outra"];
const EX_FASES_DEFAULT = ["Solicitar", "Retirado", "Aguardando", "Resultado", "Entregue"];

async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

export default function NovoAtendimentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [vets, setVets] = useState<Prof[]>([]);
  const [saving, setSaving] = useState(false);
  // Modo edição (Fase 1): quando ?edit=<atendimentoId> na URL, a ficha carrega e SALVA POR CIMA do mesmo atendimento.
  const [editId, setEditId] = useState<string | null>(null);
  const [prescEdit, setPrescEdit] = useState("");   // prescrição existente (texto editável) no modo edição
  const [examesEdit, setExamesEdit] = useState(""); // exames solicitados existentes (texto editável) no modo edição
  const [itensOriginais, setItensOriginais] = useState<string>("[]"); // snapshot p/ detectar alteração de itens
  const [iaPreenchido, setIaPreenchido] = useState(false); // banner "preenchido pela IA — revise"
  const [iaLoading, setIaLoading] = useState(false);
  const [showRec, setShowRec] = useState(false);   // painel do microfone aberto
  const [criandoRasc, setCriandoRasc] = useState(false); // criando o rascunho pra poder gravar
  const [pesos, setPesos] = useState<{ id?: string; data: string; kg: number }[]>([]);
  const [exCat, setExCat] = useState<ExameCat[]>([]);
  const [recModelos, setRecModelos] = useState<{ nome: string; corpo: string }[]>([]);
  const [tipos, setTipos] = useState<{ v: string; l: string }[]>([{ v: "CONSULTA", l: "Consulta" }, { v: "RETORNO", l: "Retorno" }, { v: "AVALIACAO", l: "Avaliação" }, { v: "EMERGENCIA", l: "Emergência" }, { v: "VACINACAO", l: "Vacinação" }, { v: "PROCEDIMENTO", l: "Procedimento" }, { v: "SESSAO_FISIO", l: "Sessão de fisioterapia" }, { v: "CIRURGIA", l: "Cirurgia" }, { v: "OUTRO", l: "Outro" }]);
  const [exFases, setExFases] = useState<string[]>(EX_FASES_DEFAULT);

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 16), type: "CONSULTA", userId: "", status: "Realizado",
    peso: "", chiefComplaint: "", anamnesis: "", physicalExam: "", diagnosis: "", conduct: "",
    recModelo: "", followUpNotes: "", followUpDate: "",
  });
  const set = (k: keyof typeof form, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // Prescrição estruturada
  const [meds, setMeds] = useState<{ nome: string; posologia: string; via: string }[]>([]);
  // Exames escolhidos (duas caixas)
  const [exClinica, setExClinica] = useState<{ nome: string; status: string; codigo?: string }[]>([]);
  const [exExterno, setExExterno] = useState<{ nome: string; codigo?: string }[]>([]);
  const [pickClinica, setPickClinica] = useState(false);
  const [pickExterno, setPickExterno] = useState(false);
  const [buscaC, setBuscaC] = useState("");
  const [buscaE, setBuscaE] = useState("");

  // ── Coluna direita: painel de lançamento da VENDA (itens deste atendimento) ──
  const [servicos, setServicos] = useState<any[]>([]);
  const [itens, setItens] = useState<any[]>([]); // { servicoId, descricao, quantidade, valorUnitario, custoUnitario, executorUserId, comissaoValor }
  const [subVenda, setSubVenda] = useState<"VENDA" | "ORC">("VENDA");
  const [orcs, setOrcs] = useState<any[]>([]);
  const [pacotes, setPacotes] = useState<{ id: string; data: any }[]>([]);
  const [fisioSrv, setFisioSrv] = useState<any[]>([]);
  const [pacForm, setPacForm] = useState<{ open: boolean; serviceId: string; nome: string; total: string; jaFeitas: string }>({ open: false, serviceId: "", nome: "", total: "4", jaFeitas: "0" });
  const [savingPac, setSavingPac] = useState(false);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const p = await safeJson<Pet | null>(await fetch(`/api/pets/${petId}`), null);
      setPet(p);
      if (p) setForm((f) => ({ ...f, peso: p.weight ? String(p.weight) : "", followUpNotes: p.followUpNotes || "", followUpDate: p.proximoFollowupAt ? String(p.proximoFollowupAt).slice(0, 10) : "" }));
      const users = await safeJson<any>(await fetch(`/api/users`), []);
      const list = Array.isArray(users) ? users : (users.users || users.data || []);
      setVets(list);
      if ((session as any)?.user?.id) setForm((f) => ({ ...f, userId: (session as any).user.id }));
      else if (list[0]?.id) setForm((f) => ({ ...f, userId: list[0].id }));
      // catálogo de exames (planilha config)
      const exm = await safeJson<any>(await fetch(`/api/fornecedores/exames/lista`), []);
      setExCat(Array.isArray(exm) ? exm : (exm.exames || exm.data || []));
      // pesos já registrados
      const lp = await safeJson<any>(await fetch(`/api/listas?lista=petpeso_${petId}`, { cache: "no-store" }), []);
      const lpArr = Array.isArray(lp) ? lp : (lp.itens || lp.data || []);
      const parsedP = lpArr.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch {} return { id: i.id, data: o.data, kg: Number(o.kg) }; }).filter((x: any) => x.kg > 0).sort((a: any, b: any) => new Date(a.data).getTime() - new Date(b.data).getTime());
      // semente: se não há histórico mas o pet tem peso atual, mostra o ponto atual
      if (parsedP.length === 0 && p?.weight) parsedP.push({ data: new Date().toISOString(), kg: Number(p.weight) });
      setPesos(parsedP);
      // modelos de receita
      const rm = await safeJson<any>(await fetch(`/api/listas?lista=receita_modelo`, { cache: "no-store" }), []);
      const rmArr = Array.isArray(rm) ? rm : (rm.itens || rm.data || []);
      setRecModelos(rmArr.map((i: any) => { let o: any = {}; try { o = JSON.parse(i.valor); } catch { o = { nome: i.valor, corpo: "" }; } return { nome: o.nome || i.valor, corpo: o.corpo || "" }; }));
      // fases de exame (config) — se houver
      const ef = await safeJson<any>(await fetch(`/api/listas?lista=exame_fases`, { cache: "no-store" }), []);
      const efArr = (Array.isArray(ef) ? ef : (ef.itens || ef.data || [])).map((i: any) => i.valor).filter(Boolean);
      if (efArr.length) setExFases(efArr);
      // tipos de atendimento (config)
      const rt = await safeJson<any>(await fetch(`/api/listas?lista=atendimento_tipo`, { cache: "no-store" }), []);
      const rtArr = (Array.isArray(rt) ? rt : (rt.itens || rt.data || [])).map((i: any) => { try { const o = JSON.parse(i.valor); return { v: o.v, l: o.l }; } catch { return { v: i.valor, l: i.valor }; } }).filter((x: any) => x.v);
      if (rtArr.length) setTipos(rtArr);
      // catálogo de serviços (coluna direita — venda)
      const sv = await safeJson<any>(await fetch(`/api/servicos/itens?limit=1000`, { cache: "no-store" }), []);
      const svArr = Array.isArray(sv) ? sv : (sv.servicos || sv.itens || sv.data || []);
      setServicos(svArr);
      setFisioSrv(svArr.filter((s: any) => JSON.stringify(s).toLowerCase().includes("fisio")));
      // orçamentos do pet (aba Orçamentos — leitura)
      const oc = await safeJson<any>(await fetch(`/api/orcamentos?petId=${petId}`, { cache: "no-store" }), []);
      setOrcs(Array.isArray(oc) ? oc : (oc.orcamentos || oc.data || []));
      // pacotes do pet (petpac_)
      const lpac = await safeJson<any>(await fetch(`/api/listas?lista=petpac_${petId}`, { cache: "no-store" }), []);
      const lpacArr = Array.isArray(lpac) ? lpac : (lpac.itens || lpac.data || []);
      setPacotes(lpacArr.map((i: any) => { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} return { id: i.id, data: d }; }));
    })();
  }, [petId, session]);

  // Modo edição: lê ?edit=<id> e carrega o atendimento existente na ficha.
  useEffect(() => {
    if (!petId) return;
    const sp = new URLSearchParams(window.location.search);
    const eid = sp.get("edit");
    if (!eid) return;
    setEditId(eid);
    (async () => {
      const a = await safeJson<any>(await fetch(`/api/atendimentos/${eid}`, { cache: "no-store" }), null);
      if (!a) { toast.error("Atendimento não encontrado"); return; }
      const d = new Date(a.date); const z = (n: number) => String(n).padStart(2, "0");
      setForm((f) => ({
        ...f,
        date: `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`,
        type: a.type || f.type, userId: a.userId || a.user?.id || f.userId, status: a.status || f.status,
        peso: a.petWeight != null ? String(a.petWeight) : "",
        chiefComplaint: a.chiefComplaint || "", anamnesis: a.anamnesis || "",
        physicalExam: a.physicalExam || "", diagnosis: a.diagnosis || "", conduct: a.conduct || "",
        followUpNotes: a.followUpNotes || "",
      }));
      setPrescEdit(a.prescription || "");
      setExamesEdit(a.examsRequested || "");
      const its = (a.items || a.appointmentItems || a.itens || []);
      const mapped = its.map((it: any) => ({ servicoId: it.servicoId || it.productId || "", descricao: it.descricao || it.nome || "", quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, custoUnitario: Number(it.custoUnitario) || 0, executorUserId: it.executorUserId || "", comissaoValor: it.comissaoValor || 0 }));
      setItens(mapped);
      setItensOriginais(JSON.stringify(mapped));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId]);

  // ── Itens da venda (coluna direita) ──
  function addItem() { setItens((p) => [...p, { servicoId: "", descricao: "", quantidade: 1, valorUnitario: 0, custoUnitario: 0, executorUserId: form.userId || "", comissaoValor: 0 }]); }
  function updItem(i: number, patch: any) { setItens((p) => p.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function rmItem(i: number) { setItens((p) => p.filter((_, idx) => idx !== i)); }
  function pickServico(i: number, servicoId: string) { const s = servicos.find((x: any) => x.id === servicoId); updItem(i, { servicoId, descricao: s?.nome || "", valorUnitario: s?.valorPadrao ?? 0, custoUnitario: s?.custoPadrao ?? 0 }); }
  const totalVenda = itens.reduce((sm, it) => sm + (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0), 0);

  async function addPacote() {
    const srv = fisioSrv.find((s: any) => String(s.id) === pacForm.serviceId);
    const nome = srv ? (srv.nome || srv.titulo || srv.descricao) : pacForm.nome.trim();
    if (!nome) { toast.error("Escolha um serviço ou informe o nome do pacote"); return; }
    const total = Number(pacForm.total) || 0; if (total <= 0) { toast.error("Informe o total de sessões"); return; }
    setSavingPac(true);
    try {
      const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `petpac_${petId}`, valor: JSON.stringify({ serviceId: srv?.id || null, nome, total, used: Math.min(Math.max(Number(pacForm.jaFeitas) || 0, 0), total), createdAt: new Date().toISOString() }) }) });
      if (!r.ok) throw new Error();
      toast.success("Pacote lançado");
      setPacForm({ open: false, serviceId: "", nome: "", total: "4", jaFeitas: "0" });
      const lpac = await safeJson<any>(await fetch(`/api/listas?lista=petpac_${petId}`, { cache: "no-store" }), []);
      const lpacArr = Array.isArray(lpac) ? lpac : (lpac.itens || lpac.data || []);
      setPacotes(lpacArr.map((i: any) => { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} return { id: i.id, data: d }; }));
    } catch { toast.error("Erro ao lançar pacote"); } finally { setSavingPac(false); }
  }

  // "Fazemos na clínica" = fornecedor PROFISSIONAL (in-house); externo = laboratório/parceiro.
  // Fallback: se não houver PROFISSIONAL cadastrado, o catálogo inteiro fica disponível nas duas caixas.
  const temProfissional = useMemo(() => exCat.some((e) => (e.fornecedor?.tipo || "") === "PROFISSIONAL"), [exCat]);
  const catClinica = useMemo(() => temProfissional ? exCat.filter((e) => (e.fornecedor?.tipo || "") === "PROFISSIONAL") : exCat, [exCat, temProfissional]);
  const catExterno = useMemo(() => temProfissional ? exCat.filter((e) => (e.fornecedor?.tipo || "") !== "PROFISSIONAL") : exCat, [exCat, temProfissional]);

  // Mini-gráfico de peso (polyline SVG)
  const grafPeso = useMemo(() => {
    const pts = pesos.slice(-12);
    if (pts.length === 0) return null;
    const W = 260, H = 70, pad = 8;
    const kgs = pts.map((p) => p.kg);
    const min = Math.min(...kgs), max = Math.max(...kgs);
    const range = max - min || 1;
    const stepX = pts.length > 1 ? (W - pad * 2) / (pts.length - 1) : 0;
    const coords = pts.map((p, i) => {
      const x = pad + i * stepX;
      const y = H - pad - ((p.kg - min) / range) * (H - pad * 2);
      return { x, y, kg: p.kg, data: p.data };
    });
    return { W, H, coords, poly: coords.map((c) => `${c.x},${c.y}`).join(" ") };
  }, [pesos]);

  function addMed() { setMeds((m) => [...m, { nome: "", posologia: "", via: "Oral (VO)" }]); }
  function updMed(i: number, patch: any) { setMeds((m) => m.map((x, idx) => idx === i ? { ...x, ...patch } : x)); }
  function rmMed(i: number) { setMeds((m) => m.filter((_, idx) => idx !== i)); }
  function aplicarModeloReceita(nome: string) {
    set("recModelo", nome);
    const m = recModelos.find((x) => x.nome === nome);
    if (m && m.corpo) {
      // insere o corpo do modelo como um "medicamento" de texto livre (posologia = corpo), sem quebrar a estrutura
      setMeds((prev) => [...prev, { nome: m.nome, posologia: m.corpo, via: "" }]);
    }
  }
  // Texto compatível salvo em Appointment.prescription (retrocompatível com a timeline existente)
  function prescricaoTexto() {
    if (meds.length === 0) return "";
    return meds.map((md) => {
      const via = md.via ? ` — ${md.via}` : "";
      return `• ${md.nome || "(medicamento)"}: ${md.posologia || ""}${via}`.trim();
    }).join("\n");
  }

  function pickExameClinica(ex: ExameCat) {
    if (exClinica.some((x) => x.nome === ex.nome)) return;
    setExClinica((a) => [...a, { nome: ex.nome, codigo: ex.codigo || undefined, status: exFases[0] || "Solicitar" }]);
    setPickClinica(false); setBuscaC("");
  }
  function pickExameExterno(ex: ExameCat) {
    if (exExterno.some((x) => x.nome === ex.nome)) return;
    setExExterno((a) => [...a, { nome: ex.nome, codigo: ex.codigo || undefined }]);
    setPickExterno(false); setBuscaE("");
  }

  function imprimirFolha(titulo: string, corpo: string) {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
    const esc = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const dt = new Date().toLocaleDateString("pt-BR");
    const vetNome = vets.find((u) => u.id === form.userId)?.name || "";
    w.document.write('<html><head><title>' + esc(titulo) + '</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E2244;padding:40px;max-width:720px;margin:0 auto}h1{color:#014D5E;font-size:20px;margin:0 0 4px}.sub{color:#6B7280;font-size:12px;margin-bottom:18px}.who{font-size:13px;color:#475569;margin-bottom:14px}.box{white-space:pre-wrap;font-size:14px;line-height:1.6;border-top:2px solid #009AAC;padding-top:16px}.ft{margin-top:48px;font-size:12px;color:#6B7280;border-top:1px solid #ddd;padding-top:10px}</style></head><body><h1>Empório do Pet</h1><div class="sub">' + esc(titulo) + ' — ' + esc(dt) + '</div><div class="who">Pet: <b>' + esc(pet?.name || "") + '</b>' + (pet?.tutor?.name ? ' · Tutor: ' + esc(pet.tutor.name) : '') + (vetNome ? ' · Profissional: ' + esc(vetNome) : '') + '</div><div class="box">' + esc(corpo) + '</div><div class="ft">Documento gerado pelo sistema Empório do Pet</div></body></html>');
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }
  function imprimirReceita() { const t = prescricaoTexto(); if (!t) { toast.error("Adicione ao menos um medicamento"); return; } imprimirFolha("Receita", t); }
  function imprimirSolicitacao() {
    const linhas = [...exClinica.map((e) => `• ${e.nome} (fazemos na clínica)`), ...exExterno.map((e) => `• ${e.nome} (externo)`)];
    if (linhas.length === 0) { toast.error("Escolha ao menos um exame"); return; }
    imprimirFolha("Solicitação de exames", "Solicito os seguintes exames:\n\n" + linhas.join("\n"));
  }

  async function listasAdd(lista: string, valor: string) { try { await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista, valor }) }); } catch {} }

  function receberNoCaixa() {
    if (!itens.some((i) => i.descricao || i.servicoId)) { toast.error("Adicione ao menos um serviço/produto para receber."); return; }
    handleSave(true); // salva e vai pro Caixa com essa venda aberta
  }
  async function handleSave(irCaixa: boolean = false) {
    if (!pet) return;
    if (!form.userId) { toast.error("Selecione o profissional responsável"); return; }
    if (!form.date) { toast.error("Informe data e hora"); return; }
    setSaving(true);
    try {
      const prescricao = prescricaoTexto();
      const examsReq = [...exClinica.map((e) => e.nome), ...exExterno.map((e) => `${e.nome} (externo)`)].join(", ");
      const payload: any = {
        tutorId: pet.tutorId, petId: pet.id, userId: form.userId,
        date: new Date(form.date).toISOString(), type: form.type, status: form.status,
        chiefComplaint: form.chiefComplaint || null, anamnesis: form.anamnesis || null,
        physicalExam: form.physicalExam || null, diagnosis: form.diagnosis || null, conduct: form.conduct || null,
        prescription: prescricao || null, examsRequested: examsReq || null,
        followUpNotes: form.followUpNotes || null,
        petWeight: form.peso ? Number(String(form.peso).replace(",", ".")) : null,
      };
      // COERÊNCIA: os itens da coluna direita são os itens DESTE atendimento/venda — um único Appointment.
      const itensValidos = itens.filter((it) => it.descricao || it.servicoId);
      if (itensValidos.length) {
        payload.items = itensValidos.map((it) => ({
          ...(it.servicoId ? { servicoId: it.servicoId, productId: it.servicoId } : {}),
          ...(it.descricao ? { descricao: it.descricao } : {}),
          ...(it.executorUserId ? { executorUserId: it.executorUserId } : {}),
          quantidade: Number(it.quantidade) || 1,
          valorUnitario: Number(it.valorUnitario) || 0,
          custoUnitario: Number(it.custoUnitario) || 0,
          valorTotal: (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0),
          ...(it.comissaoValor ? { comissaoTipo: "PERCENTUAL", comissaoValor: Number(it.comissaoValor) } : {}),
        }));
        payload.value = payload.items.reduce((sm: number, it: any) => sm + (it.valorTotal || 0), 0);
      }
      // ── MODO EDIÇÃO: salva por cima do mesmo atendimento (sem recriar histórico/peso/exames) ──
      if (editId) {
        const editPayload: any = {
          userId: form.userId, date: new Date(form.date).toISOString(), type: form.type, status: form.status,
          chiefComplaint: form.chiefComplaint || null, anamnesis: form.anamnesis || null,
          physicalExam: form.physicalExam || null, diagnosis: form.diagnosis || null, conduct: form.conduct || null,
          // prescrição: se a vet montou medicamentos estruturados, usa; senão mantém/edita o texto existente
          prescription: (meds.length ? prescricao : (prescEdit || null)),
          // exames: se escolheu no seletor, usa; senão mantém/edita o texto existente
          examsRequested: ((exClinica.length || exExterno.length) ? examsReq : (examesEdit || null)),
          followUpNotes: form.followUpNotes || null,
          petWeight: form.peso ? Number(String(form.peso).replace(",", ".")) : null,
        };
        // Itens: só envia se MUDARAM (evita disparar a trava "venda com recebimento só ADM" em edição só de clínico)
        const mudouItens = JSON.stringify(itensValidos.map((it) => ({ servicoId: it.servicoId || "", descricao: it.descricao || "", quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, custoUnitario: Number(it.custoUnitario) || 0, executorUserId: it.executorUserId || "", comissaoValor: it.comissaoValor || 0 }))) !== itensOriginais;
        if (mudouItens) {
          editPayload.items = itensValidos.map((it) => ({
            ...(it.servicoId ? { servicoId: it.servicoId, productId: it.servicoId } : {}),
            ...(it.descricao ? { descricao: it.descricao } : {}),
            ...(it.executorUserId ? { executorUserId: it.executorUserId } : {}),
            quantidade: Number(it.quantidade) || 1, valorUnitario: Number(it.valorUnitario) || 0, custoUnitario: Number(it.custoUnitario) || 0,
            valorTotal: (Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0),
            ...(it.comissaoValor ? { comissaoTipo: "PERCENTUAL", comissaoValor: Number(it.comissaoValor) } : {}),
          }));
          editPayload.value = editPayload.items.reduce((sm: number, it: any) => sm + (it.valorTotal || 0), 0);
        }
        const resE = await fetch(`/api/appointments/${editId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editPayload) });
        if (!resE.ok) { const err = await resE.json().catch(() => null); toast.error(err?.message ? (Array.isArray(err.message) ? err.message.join(" ") : err.message) : `Erro ao salvar (${resE.status})`); setSaving(false); return; }
        toast.success("Atendimento atualizado");
        router.push(irCaixa ? `/dashboard/erp/ponto-de-venda?venda=${editId}` : `/dashboard/erp/pets/${pet.id}`);
        return;
      }

      const res = await fetch(`/api/atendimentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); toast.error(`Erro: ${err?.message || res.status}`); setSaving(false); return; }
      const criado = await res.json().catch(() => null);
      const novoAtdId = criado?.id || criado?.appointment?.id || null;

      // Peso: grava no pet + histórico petpeso_
      const kg = form.peso ? Number(String(form.peso).replace(",", ".")) : 0;
      if (kg > 0 && kg !== pet.weight) {
        try { await fetch(`/api/pets/${pet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ weight: kg }) }); } catch {}
      }
      if (kg > 0) await listasAdd(`petpeso_${pet.id}`, JSON.stringify({ data: new Date(form.date).toISOString(), kg }));

      // Exames: clínica (acompanhamos → status, aparece no Hoje) + externos (só solicitação)
      for (const e of exClinica) await listasAdd(`petexa_${pet.id}`, JSON.stringify({ nome: e.nome, status: e.status || exFases[0] || "Solicitar", date: new Date().toISOString(), acompanha: true, externo: false }));
      for (const e of exExterno) await listasAdd(`petexa_${pet.id}`, JSON.stringify({ nome: e.nome, status: "Solicitado (externo)", date: new Date().toISOString(), acompanha: false, externo: true }));

      // Pós-atendimento → integra ao Follow-up do pet (mesmo FU da Visão geral)
      const fuBody: any = {};
      if (form.followUpNotes !== (pet.followUpNotes || "")) fuBody.followUpNotes = form.followUpNotes || null;
      if (form.followUpDate) fuBody.proximoFollowupAt = new Date(form.followUpDate + "T12:00:00").toISOString();
      if (Object.keys(fuBody).length) { try { await fetch(`/api/pets/${pet.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fuBody) }); } catch {} }

      toast.success("Atendimento registrado");
      router.push(irCaixa && novoAtdId ? `/dashboard/erp/ponto-de-venda?venda=${novoAtdId}` : `/dashboard/erp/pets/${pet.id}`);
    } catch (e) { toast.error("Erro ao salvar"); setSaving(false); }
  }

  // Abre o microfone AQUI na tela. A gravação precisa que o atendimento exista, então,
  // se ainda não foi salvo, cria um rascunho (com o profissional/data já preenchidos) e
  // entra em modo edição — o vet grava no começo e preenche/salva por cima ao final.
  async function abrirGravador() {
    if (editId) { setShowRec(true); return; }
    if (!pet) return;
    if (!form.userId) { toast.error("Selecione o profissional responsável antes de gravar."); return; }
    if (!form.date) { toast.error("Informe data e hora antes de gravar."); return; }
    setCriandoRasc(true);
    try {
      const payload = { tutorId: pet.tutorId, petId: pet.id, userId: form.userId, date: new Date(form.date).toISOString(), type: form.type, status: form.status };
      const res = await fetch(`/api/atendimentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); toast.error(`Não consegui iniciar a gravação: ${err?.message || res.status}`); return; }
      const criado = await res.json().catch(() => null);
      const nid = criado?.id || criado?.appointment?.id || null;
      if (!nid) { toast.error("Não consegui iniciar a gravação (sem identificador)."); return; }
      setEditId(nid);
      // reflete o modo edição na URL, sem recarregar a página (não perde o formulário)
      try { window.history.replaceState(null, "", `?edit=${nid}`); } catch {}
      setShowRec(true);
      toast.success("Pronto para gravar. O atendimento foi iniciado — preencha e salve ao final.");
    } catch { toast.error("Erro ao iniciar a gravação."); }
    finally { setCriandoRasc(false); }
  }

  // Fase 3: puxa a análise da IA (da gravação deste atendimento) e PREENCHE os campos — a vet revisa antes de salvar.
  async function preencherComIA() {
    if (!editId) { toast.error("Salve o atendimento e grave a consulta primeiro."); return; }
    setIaLoading(true);
    try {
      const arr = await safeJson<any[]>(await fetch(`/api/consultation-recordings/appointment/${editId}`, { cache: "no-store" }), []);
      const rec = Array.isArray(arr) ? arr[0] : null;
      if (!rec) { toast.error("Nenhuma gravação encontrada. Use 🎤 Gravar consulta primeiro."); return; }
      if (!rec.aiAnalysis) { toast.error("A gravação ainda não foi analisada pela IA (passo 2 do Gravar)."); return; }
      let a: any; try { a = typeof rec.aiAnalysis === "string" ? JSON.parse(rec.aiAnalysis) : rec.aiAnalysis; } catch { a = null; }
      if (!a || typeof a !== "object") { toast.error("Não consegui ler a análise da IA."); return; }

      const meds = (a.tratamento?.medicamentos || []).map((m: any) => {
        const via = m.viaAdministracao ? ` — ${m.viaAdministracao}` : "";
        const dose = [m.dosagem, m.frequencia, m.duracao].filter(Boolean).join(", ");
        return `• ${m.nome || "(medicamento)"}${dose ? `: ${dose}` : ""}${via}`.trim();
      });
      const conduta = [
        ...(a.tratamento?.procedimentos || []),
        ...(a.tratamento?.orientacoes || []),
      ].filter(Boolean).map((x: string) => `• ${x}`).join("\n");
      const diag = [a.diagnostico, ...(a.diagnosticosDiferenciais || []).map((d: string) => `DD: ${d}`)].filter(Boolean).join("\n");
      const exames = (a.examesSolicitados || []).filter(Boolean).join(", ");

      // Preenche só campos vazios (não sobrescreve o que a vet já digitou).
      let n = 0;
      setForm((f) => {
        const nf = { ...f };
        const put = (k: keyof typeof f, v: string) => { if (v && !String((f as any)[k] || "").trim()) { (nf as any)[k] = v; n++; } };
        put("chiefComplaint", a.queixaPrincipal || "");
        put("anamnesis", a.historico || "");
        put("physicalExam", a.exameClinico || "");
        put("diagnosis", diag);
        put("conduct", conduta);
        put("followUpNotes", a.retorno || "");
        return nf;
      });
      setPrescEdit((cur) => { if (meds.length && !cur.trim()) { n++; return meds.join("\n"); } return cur; });
      setExamesEdit((cur) => { if (exames && !cur.trim()) { n++; return exames; } return cur; });
      setIaPreenchido(true);
      toast.success(n ? `Ficha preenchida pela IA (${n} campo${n > 1 ? "s" : ""}). Revise antes de salvar.` : "Nada novo pra preencher — os campos já tinham conteúdo.");
    } catch { toast.error("Erro ao preencher com a IA."); } finally { setIaLoading(false); }
  }

  if (!pet) return <div className="p-10 text-center text-[#8A989D]">Carregando ficha de atendimento...</div>;

  const card = "bg-white border border-[#E8E2D6] rounded-[14px]";
  const inp = "w-full mt-0.5 px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] text-[#1F2A2E] bg-white";
  const lbl = "text-[10px] uppercase tracking-wide text-[#8A989D]";

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      {/* Breadcrumb */}
      <div className="text-[12px] text-[#8A989D] mb-2 px-1">
        <Link href="/dashboard/erp/pets" className="hover:text-[#009AAC]">Pets</Link> / <Link href={`/dashboard/erp/pets/${pet.id}`} className="hover:text-[#009AAC]">{pet.name}</Link> / <b className="text-[#009AAC] font-medium">{editId ? "Editar atendimento" : "Novo atendimento"}</b>
      </div>

      {/* Cabeçalho */}
      <div className={`${card} mb-3`} style={{ padding: "13px 16px" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} title="Voltar" className="w-9 h-9 rounded-[10px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center justify-center shrink-0">←</button>
          <div className="w-[46px] h-[46px] rounded-[13px] bg-[#FBF3E3] flex items-center justify-center text-[24px] shrink-0">{PET_EMOJI(pet.species)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] leading-tight text-[#014D5E] font-medium">{editId ? "✏️" : "🩺"} Atendimento — {pet.name}{/petlife/i.test(pet.insurancePlan || "") ? <span className="ml-2 align-middle text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ background: "#E6F0FF", color: "#0C447C" }}>🩺 Petlife</span> : null}{editId ? <span className="ml-2 align-middle text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FBF3E3", color: "#8a6400" }}>editando</span> : null}</h1>
            <p className="text-[12.5px] text-[#5C6B70]">{[speciesLabel(pet.species), pet.breed, genderLabel(pet.gender), pet.birthDate ? ageFromBirth(pet.birthDate) : null].filter((x) => x && x !== "—").join(" · ")} · Tutor(a): {pet.tutor?.name || "—"}</p>
          </div>
          {editId && <button onClick={preencherComIA} disabled={iaLoading} title="Preencher a ficha com a análise da IA" className="px-3 h-9 rounded-[10px] text-white hover:opacity-90 flex items-center gap-1.5 shrink-0 text-[13px] font-medium disabled:opacity-60" style={{ background: "#014D5E" }}>🧠 {iaLoading ? "Preenchendo…" : "Preencher com a IA"}</button>}
          <button onClick={abrirGravador} disabled={criandoRasc || showRec} title="Gravar a consulta pelo microfone" className="px-3 h-9 rounded-[10px] border border-[#009AAC] text-[#009AAC] hover:bg-[#EAF6F7] flex items-center gap-1.5 shrink-0 text-[13px] font-medium disabled:opacity-60">🎤 {criandoRasc ? "Preparando…" : showRec ? "Gravando" : "Gravar consulta"}</button>
          <Link href={`/dashboard/erp/pets/${pet.id}`} title="Fechar" className="w-9 h-9 rounded-[10px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center justify-center shrink-0">✕</Link>
        </div>
      </div>

      {iaPreenchido && (
        <div className="mb-3 rounded-[12px] px-4 py-2.5 text-[12.5px] flex items-center gap-2" style={{ background: "#FBF3E3", border: "1px solid #E8D9A8", color: "#8a6400" }}>
          🧠 <span><b>Campos preenchidos pela IA</b> a partir da gravação. Revise tudo antes de salvar — a responsabilidade clínica é sua.</span>
        </div>
      )}

      {/* Microfone embutido: grava a consulta aqui mesmo. Ao terminar de analisar, os
          campos são preenchidos pela IA automaticamente (o vet revisa antes de salvar). */}
      {showRec && editId && (
        <div className={`${card} mb-3`} style={{ padding: "14px 16px" }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[13px] font-medium text-[#014D5E]">🎤 Gravar consulta</div>
            <button onClick={() => setShowRec(false)} className="text-[12px] text-[#5C6B70] hover:text-[#014D5E]">Recolher ✕</button>
          </div>
          <div className="text-[11.5px] text-[#8A989D] mb-3">Fale naturalmente durante a consulta. Por LGPD, o áudio não é guardado — só a transcrição. Ao analisar, a ficha é preenchida sozinha e você revisa.</div>
          <ConsultationRecorder
            appointmentId={editId}
            onAnalysisComplete={() => { preencherComIA(); }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr] gap-3 items-start">
      {/* ══════════ COLUNA ESQUERDA (~60%): clínico ══════════ */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* DADOS BÁSICOS — uma linha */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">Dados básicos</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><label className={lbl}>📅 Data e hora</label><input type="datetime-local" value={form.date} onChange={(e) => set("date", e.target.value)} className={inp} /></div>
            <div><label className={lbl}>🏷️ Tipo</label><select value={form.type} onChange={(e) => set("type", e.target.value)} className={inp}>{tipos.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
            <div><label className={lbl}>🧑‍⚕️ Profissional</label><select value={form.userId} onChange={(e) => set("userId", e.target.value)} className={inp}><option value="">Selecionar...</option>{vets.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
          </div>
        </div>

        {/* PESO + gráfico */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="md:w-[200px]">
              <label className={lbl}>⚖️ Peso (kg)</label>
              <input type="number" step="0.01" value={form.peso} onChange={(e) => set("peso", e.target.value)} placeholder="Ex.: 6.25" className={inp} />
              <p className="text-[11px] text-[#8A989D] mt-1">Grava no peso do pet e no histórico de pesagens.</p>
            </div>
            <div className="flex-1">
              <div className="text-[11px] text-[#8A989D] mb-1">📈 Evolução do peso</div>
              {grafPeso ? (
                <svg viewBox={`0 0 ${grafPeso.W} ${grafPeso.H}`} className="w-full" style={{ maxHeight: 80 }}>
                  <polyline fill="none" stroke="#009AAC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={grafPeso.poly} />
                  {grafPeso.coords.map((c, i) => (
                    <g key={i}><circle cx={c.x} cy={c.y} r="2.5" fill="#014D5E" /><title>{`${c.kg} kg · ${new Date(c.data).toLocaleDateString("pt-BR")}`}</title></g>
                  ))}
                </svg>
              ) : <div className="text-[12px] text-[#8A989D] py-4">Sem pesagens registradas ainda. A primeira pesagem começa o gráfico.</div>}
            </div>
          </div>
        </div>

        {/* CLÍNICO */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">📋 Clínico</div>
          <div className="flex flex-col gap-2.5">
            <div><label className={lbl}>Queixa / motivo</label><input value={form.chiefComplaint} onChange={(e) => set("chiefComplaint", e.target.value)} className={inp} placeholder="O que motivou a consulta" /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className={lbl}>Anamnese</label><textarea rows={3} value={form.anamnesis} onChange={(e) => set("anamnesis", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Exame físico</label><textarea rows={3} value={form.physicalExam} onChange={(e) => set("physicalExam", e.target.value)} className={inp} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className={lbl}>Diagnóstico</label><textarea rows={2} value={form.diagnosis} onChange={(e) => set("diagnosis", e.target.value)} className={inp} /></div>
              <div><label className={lbl}>Conduta</label><textarea rows={2} value={form.conduct} onChange={(e) => set("conduct", e.target.value)} className={inp} /></div>
            </div>
          </div>
        </div>

        {/* PRESCRIÇÃO estruturada */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">💊 Prescrição</div>
            <div className="flex items-center gap-2">
              <select value={form.recModelo} onChange={(e) => aplicarModeloReceita(e.target.value)} className="border border-[#E8E2D6] rounded-[9px] px-2 py-1.5 text-[12px] text-[#5C6B70] bg-white">
                <option value="">Modelo (Normal/Especial)…</option>
                {recModelos.map((m) => <option key={m.nome} value={m.nome}>{m.nome}</option>)}
              </select>
              <button onClick={imprimirReceita} className="text-[12px] px-3 py-1.5 rounded-[9px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">🖨️ Imprimir receita</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {editId && (
              <div>
                <label className={lbl}>Prescrição atual (editável)</label>
                <textarea rows={3} value={prescEdit} onChange={(e) => setPrescEdit(e.target.value)} className={inp} placeholder="Prescrição registrada neste atendimento" />
                <p className="text-[11px] text-[#8A989D] mt-0.5">Edite o texto acima ou adicione medicamentos abaixo (os medicamentos, se houver, substituem o texto ao salvar).</p>
              </div>
            )}
            {meds.length === 0 && <p className="text-[12px] text-[#8A989D]">Nenhum medicamento. Use "＋ adicionar medicamento" ou escolha um modelo.</p>}
            {meds.map((md, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_150px_auto] gap-2 items-center">
                <input value={md.nome} onChange={(e) => updMed(i, { nome: e.target.value })} placeholder="Medicamento" className="px-2 py-1.5 border border-[#E8E2D6] rounded-[9px] text-[13px]" />
                <input value={md.posologia} onChange={(e) => updMed(i, { posologia: e.target.value })} placeholder="Posologia" className="px-2 py-1.5 border border-[#E8E2D6] rounded-[9px] text-[13px]" />
                <select value={md.via} onChange={(e) => updMed(i, { via: e.target.value })} className="px-2 py-1.5 border border-[#E8E2D6] rounded-[9px] text-[13px] text-[#5C6B70]">
                  <option value="">Via…</option>
                  {VIAS.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                <button onClick={() => rmMed(i)} title="Remover" className="text-[#b23b39] px-2 py-1.5 text-[14px]">✕</button>
              </div>
            ))}
            <button onClick={addMed} className="self-start text-[12px] px-3 py-1.5 rounded-full border border-dashed border-[#E8E2D6] text-[#009AAC] hover:border-[#009AAC]">＋ adicionar medicamento</button>
          </div>
        </div>

        {/* EXAMES — duas caixas */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
            <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">🔬 Exames</div>
            <button onClick={imprimirSolicitacao} className="text-[12px] px-3 py-1.5 rounded-[9px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">🖨️ Imprimir solicitação</button>
          </div>
          {editId && (
            <div className="mb-3">
              <label className={lbl}>Exames solicitados (editável)</label>
              <textarea rows={2} value={examesEdit} onChange={(e) => setExamesEdit(e.target.value)} className={inp} placeholder="Exames registrados neste atendimento" />
              <p className="text-[11px] text-[#8A989D] mt-0.5">Edite o texto acima ou escolha exames nas caixas abaixo (a escolha, se houver, substitui o texto ao salvar).</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
            {/* Fazemos na clínica */}
            <div className="border border-[#E8E2D6] rounded-[12px]" style={{ padding: "11px 13px" }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12.5px] text-[#014D5E] font-medium">🏥 Fazemos na clínica</h4>
                <button onClick={() => setPickClinica((v) => !v)} className="text-[11px] px-2 py-0.5 rounded-full border border-[#E8E2D6] text-[#009AAC]">＋ escolher ▾</button>
              </div>
              <p className="text-[10.5px] text-[#8A989D] mb-2">Acompanhamos o resultado (entra no "Exames a entregar" do Hoje).</p>
              {pickClinica && (
                <div className="mb-2 border border-[#F0EBE0] rounded-[9px] p-2 bg-[#FBF9F4]">
                  <input value={buscaC} onChange={(e) => setBuscaC(e.target.value)} placeholder="Buscar exame…" className="w-full mb-1 px-2 py-1 border border-[#E8E2D6] rounded text-[12px]" />
                  <div className="max-h-40 overflow-auto flex flex-col gap-0.5">
                    {catClinica.filter((e) => !buscaC || e.nome.toLowerCase().includes(buscaC.toLowerCase())).slice(0, 60).map((e) => (
                      <button key={e.id} onClick={() => pickExameClinica(e)} className="text-left text-[12px] px-2 py-1 rounded hover:bg-white text-[#1F2A2E]">{e.nome}{e.fornecedor?.nome ? <span className="text-[#8A989D]"> · {e.fornecedor.nome}</span> : null}</button>
                    ))}
                    {catClinica.length === 0 && <span className="text-[11px] text-[#8A989D] px-2 py-1">Nada no catálogo. Cadastre em Configurações → Exames.</span>}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {exClinica.length === 0 && <span className="text-[11.5px] text-[#8A989D]">Nenhum exame da clínica.</span>}
                {exClinica.map((e, i) => (
                  <div key={i} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[9px] px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#1F2A2E] truncate">{e.nome}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <select value={e.status} onChange={(ev) => setExClinica((a) => a.map((x, idx) => idx === i ? { ...x, status: ev.target.value } : x))} className="text-[10.5px] px-1.5 py-0.5 border border-[#E8E2D6] rounded-full text-[#5C6B70] bg-white">
                        {exFases.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                      <button onClick={() => setExClinica((a) => a.filter((_, idx) => idx !== i))} className="text-[#b23b39] text-[12px]">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Solicitar externo */}
            <div className="border border-[#E8E2D6] rounded-[12px]" style={{ padding: "11px 13px" }}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[12.5px] text-[#014D5E] font-medium">🔗 Solicitar (externo)</h4>
                <button onClick={() => setPickExterno((v) => !v)} className="text-[11px] px-2 py-0.5 rounded-full border border-[#E8E2D6] text-[#009AAC]">＋ escolher ▾</button>
              </div>
              <p className="text-[10.5px] text-[#8A989D] mb-2">Não acompanhamos — só entra na solicitação. {/* Fase B: exame externo → venda/caixa/terceiros entra depois */}</p>
              {pickExterno && (
                <div className="mb-2 border border-[#F0EBE0] rounded-[9px] p-2 bg-[#FBF9F4]">
                  <input value={buscaE} onChange={(e) => setBuscaE(e.target.value)} placeholder="Buscar exame…" className="w-full mb-1 px-2 py-1 border border-[#E8E2D6] rounded text-[12px]" />
                  <div className="max-h-40 overflow-auto flex flex-col gap-0.5">
                    {catExterno.filter((e) => !buscaE || e.nome.toLowerCase().includes(buscaE.toLowerCase())).slice(0, 60).map((e) => (
                      <button key={e.id} onClick={() => pickExameExterno(e)} className="text-left text-[12px] px-2 py-1 rounded hover:bg-white text-[#1F2A2E]">{e.nome}{e.fornecedor?.nome ? <span className="text-[#8A989D]"> · {e.fornecedor.nome}</span> : null}</button>
                    ))}
                    {catExterno.length === 0 && <span className="text-[11px] text-[#8A989D] px-2 py-1">Nada no catálogo. Cadastre em Configurações → Exames.</span>}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                {exExterno.length === 0 && <span className="text-[11.5px] text-[#8A989D]">Nenhum exame externo.</span>}
                {exExterno.map((e, i) => (
                  <div key={i} className="bg-[#FBF9F4] border border-[#F0EBE0] rounded-[9px] px-2.5 py-1.5 flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#1F2A2E] truncate">{e.nome}</span>
                    <button onClick={() => setExExterno((a) => a.filter((_, idx) => idx !== i))} className="text-[#b23b39] text-[12px]">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* PÓS-ATENDIMENTO → Follow-up */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2">🔔 Pós-atendimento (follow-up)</div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
            <div><label className={lbl}>O que acompanhar</label><input value={form.followUpNotes} onChange={(e) => set("followUpNotes", e.target.value)} placeholder="Ex.: verificar se a coceira melhorou, se está tomando o remédio…" className={inp} /></div>
            <div><label className={lbl}>Data do follow-up</label><input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} className={inp} /></div>
          </div>
          <p className="text-[11px] text-[#8A989D] mt-1.5">Grava no follow-up do pet (aparece na Visão geral e no Hoje).</p>
        </div>
      </div>

      {/* ══════════ COLUNA DIREITA (~40%): lançamento da venda ══════════ */}
      <div className="flex flex-col gap-3 min-w-0">
        {/* Venda / Orçamentos */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex items-center gap-1.5 mb-3">
            <button onClick={() => setSubVenda("VENDA")} className="text-[12px] px-3 py-1 rounded-full border" style={subVenda === "VENDA" ? { background: "#E0F4F6", color: "#014D5E", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>🧾 Venda</button>
            <button onClick={() => setSubVenda("ORC")} className="text-[12px] px-3 py-1 rounded-full border" style={subVenda === "ORC" ? { background: "#E0F4F6", color: "#014D5E", borderColor: "#009AAC" } : { background: "#fff", color: "#5C6B70", borderColor: "#E8E2D6" }}>📄 Orçamentos ({orcs.length})</button>
          </div>

          {subVenda === "VENDA" ? (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[#8A989D] mb-1">Itens deste atendimento</div>
              <div className="flex flex-col gap-1.5">
                {itens.length === 0 && <p className="text-[12px] text-[#8A989D] py-1">Nenhum item lançado.</p>}
                {itens.map((it, i) => (
                  <div key={i} className="border border-[#F0EBE0] rounded-[10px] p-2 bg-[#FBF9F4]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <input list="srvcat-venda" value={it.descricao} onChange={(e) => { const nome = e.target.value; const sv = servicos.find((x: any) => x.nome === nome); if (sv) pickServico(i, sv.id); else updItem(i, { descricao: nome, servicoId: "" }); }} placeholder="Serviço / descrição…" className="flex-1 min-w-0 px-2 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" />
                      <button onClick={() => rmItem(i)} title="Remover" className="text-[#b23b39] text-[13px] shrink-0">✕</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <div><label className="text-[9px] uppercase text-[#8A989D]">Qtd</label><input type="number" min="1" value={it.quantidade} onChange={(e) => updItem(i, { quantidade: e.target.value })} className="w-full px-1.5 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" /></div>
                      <div><label className="text-[9px] uppercase text-[#8A989D]">Valor</label><input type="number" step="0.01" value={it.valorUnitario} onChange={(e) => updItem(i, { valorUnitario: e.target.value })} className="w-full px-1.5 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" /></div>
                      <div><label className="text-[9px] uppercase text-[#8A989D]">Total</label><div className="px-1.5 py-1 text-[12px] text-[#014D5E] font-medium tabular-nums">{((Number(it.quantidade) || 0) * (Number(it.valorUnitario) || 0)).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div></div>
                    </div>
                  </div>
                ))}
                <datalist id="srvcat-venda">{servicos.slice(0, 1000).map((sv: any) => <option key={sv.id} value={sv.nome} />)}</datalist>
                <button onClick={addItem} className="w-full mt-0.5 px-3 py-1.5 rounded-full border border-dashed text-[12px]" style={{ borderColor: "#009AAC", color: "#009AAC" }}>＋ adicionar serviço</button>
              </div>
              {itens.length > 0 && (
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-[#F0EBE0]">
                  <span className="text-[12px] text-[#5C6B70]">Total da venda</span>
                  <span className="text-[16px] text-[#014D5E] font-medium">{totalVenda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </div>
              )}
              {itens.some((i) => i.descricao || i.servicoId) && (
                <button onClick={receberNoCaixa} disabled={saving} className="w-full mt-2.5 px-3 py-2 rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-60 flex items-center justify-center gap-1.5" style={{ background: "#0F6E56" }}>💰 Receber no Caixa</button>
              )}
              <p className="text-[10.5px] text-[#8A989D] mt-2">Salva o atendimento e abre esta venda no Caixa pra registrar o pagamento (Dinheiro / Pix / Cartão).</p>
            </>
          ) : (
            <>
              <div className="text-[10px] uppercase tracking-wide text-[#8A989D] mb-1">Orçamentos do pet</div>
              {orcs.length === 0 ? (
                <p className="text-[12px] text-[#8A989D] py-1">Nenhum orçamento. Orçamentos ficam na ficha do pet; aqui você lança a venda direta.</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {orcs.map((o: any) => (
                    <div key={o.id} className="border border-[#F0EBE0] rounded-[10px] px-2.5 py-1.5 bg-[#FBF9F4] flex items-center justify-between">
                      <span className="text-[12px] text-[#1F2A2E] truncate">{o.descricao || o.titulo || "Orçamento"}</span>
                      <span className="text-[12px] text-[#014D5E] font-medium">{Number(o.total || o.valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 💰 Crédito do pet */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex items-center justify-between">
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">💳 Crédito do pet</h3>
            <span className="bg-[#FBF3E3] text-[#8a6400] text-[10px] px-2 py-0.5 rounded-full">Em construção</span>
          </div>
          <div className="text-[18px] text-[#014D5E] font-medium mt-1">R$ 0,00</div>
          <p className="text-[11px] text-[#8A989D] mt-1">Saldo a favor deste pet — transferível entre pets do mesmo tutor. Chega com o módulo Caixa (Fase B).</p>
        </div>

        {/* 📦 Pacotes em andamento */}
        <div className={card} style={{ padding: "13px 16px" }}>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-[13px] text-[#014D5E] font-medium flex items-center gap-1.5">📦 Pacotes em andamento</h3>
            <button onClick={() => setPacForm((f) => ({ ...f, open: !f.open }))} className="text-[11px] px-2 py-0.5 rounded-full border border-[#E8E2D6] text-[#009AAC]">＋ lançar</button>
          </div>
          {pacForm.open && (
            <div className="border border-[#F0EBE0] rounded-[10px] p-2.5 mb-2 bg-[#FBF9F4] flex flex-col gap-1.5">
              <select value={pacForm.serviceId} onChange={(e) => setPacForm((f) => ({ ...f, serviceId: e.target.value }))} className="px-2 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white">
                <option value="">— usar nome livre —</option>
                {fisioSrv.map((s: any) => <option key={s.id} value={s.id}>{s.nome || s.titulo || s.descricao}</option>)}
              </select>
              {!pacForm.serviceId && <input value={pacForm.nome} onChange={(e) => setPacForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Nome do pacote" className="px-2 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" />}
              <div className="grid grid-cols-2 gap-1.5">
                <div><label className="text-[9px] uppercase text-[#8A989D]">Total sessões</label><input type="number" min="1" value={pacForm.total} onChange={(e) => setPacForm((f) => ({ ...f, total: e.target.value }))} className="w-full px-2 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" /></div>
                <div><label className="text-[9px] uppercase text-[#8A989D]">Já feitas</label><input type="number" min="0" value={pacForm.jaFeitas} onChange={(e) => setPacForm((f) => ({ ...f, jaFeitas: e.target.value }))} className="w-full px-2 py-1 border border-[#E8E2D6] rounded text-[12px] bg-white" /></div>
              </div>
              <button onClick={addPacote} disabled={savingPac} className="self-end px-3 py-1 rounded text-[12px] text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingPac ? "..." : "Lançar"}</button>
            </div>
          )}
          {pacotes.length === 0 ? (
            <p className="text-[12px] text-[#8A989D]">Nenhum pacote em andamento.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {pacotes.map((p) => { const used = p.data.used || 0, total = p.data.total || 0; return (
                <div key={p.id} className="border border-[#F0EBE0] rounded-[10px] px-2.5 py-1.5 bg-[#FBF9F4]">
                  <div className="flex items-center justify-between"><span className="text-[12px] text-[#1F2A2E] truncate">🐾 {p.data.nome}</span><span className="text-[11px] text-[#014D5E] font-medium">{used}/{total}</span></div>
                  <div className="h-1.5 rounded-full bg-[#F0EBE0] overflow-hidden mt-1"><div className="h-full" style={{ width: `${total ? Math.min(100, (used / total) * 100) : 0}%`, background: "#009AAC" }} /></div>
                </div>
              ); })}
            </div>
          )}
          <p className="text-[10.5px] text-[#8A989D] mt-2">O progresso (patinhas) aparece na Visão geral do pet.</p>
        </div>
      </div>
      </div>

      {/* Rodapé — largura total */}
      <div className="flex items-center justify-end gap-2 pt-3 pb-8">
        <Link href={`/dashboard/erp/pets/${pet.id}`} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</Link>
        <button onClick={() => handleSave()} disabled={saving} className="px-5 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : (editId ? "💾 Salvar alterações" : "Salvar atendimento")}</button>
      </div>
      {/* Fase B (não incluída agora): pagamento/fechamento da venda e do exame externo fica no módulo Caixa. */}
    </div>
  );
}
