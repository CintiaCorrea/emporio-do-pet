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

interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  gender?: string | null; birthDate?: string | null; weight?: number | null;
  tutorId: string; tutor?: { id: string; name: string };
  followUpNotes?: string | null; proximoFollowupAt?: string | null;
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
    })();
  }, [petId, session]);

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

  async function handleSave() {
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
      const res = await fetch(`/api/atendimentos`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) { const err = await res.json().catch(() => null); toast.error(`Erro: ${err?.message || res.status}`); setSaving(false); return; }

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
      router.push(`/dashboard/erp/pets/${pet.id}`);
    } catch (e) { toast.error("Erro ao salvar"); setSaving(false); }
  }

  if (!pet) return <div className="p-10 text-center text-[#8A989D]">Carregando ficha de atendimento...</div>;

  const card = "bg-white border border-[#E8E2D6] rounded-[14px]";
  const inp = "w-full mt-0.5 px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] text-[#1F2A2E] bg-white";
  const lbl = "text-[10px] uppercase tracking-wide text-[#8A989D]";

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      {/* Breadcrumb */}
      <div className="text-[12px] text-[#8A989D] mb-2 px-1">
        <Link href="/dashboard/erp/pets" className="hover:text-[#009AAC]">Pets</Link> / <Link href={`/dashboard/erp/pets/${pet.id}`} className="hover:text-[#009AAC]">{pet.name}</Link> / <b className="text-[#009AAC] font-medium">Novo atendimento</b>
      </div>

      {/* Cabeçalho */}
      <div className={`${card} mb-3`} style={{ padding: "13px 16px" }}>
        <div className="flex items-center gap-3">
          <div className="w-[46px] h-[46px] rounded-[13px] bg-[#FBF3E3] flex items-center justify-center text-[24px] shrink-0">{PET_EMOJI(pet.species)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] leading-tight text-[#014D5E] font-medium">🩺 Atendimento — {pet.name}</h1>
            <p className="text-[12.5px] text-[#5C6B70]">{[speciesLabel(pet.species), pet.breed, genderLabel(pet.gender), pet.birthDate ? ageFromBirth(pet.birthDate) : null].filter((x) => x && x !== "—").join(" · ")} · Tutor(a): {pet.tutor?.name || "—"}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 max-w-[980px]">
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

        {/* Rodapé */}
        <div className="flex items-center justify-end gap-2 pb-8">
          <Link href={`/dashboard/erp/pets/${pet.id}`} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</Link>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando..." : "Salvar atendimento"}</button>
        </div>
        {/* Fase B (não incluída agora): faturamento/venda dos serviços e do exame externo fica na aba Compras / módulo Caixa. */}
      </div>
    </div>
  );
}
