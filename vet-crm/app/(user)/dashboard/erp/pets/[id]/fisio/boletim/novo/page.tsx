"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Boletim de Fisioterapia (tela cheia)   [EMP-COWORK]
   Grava em lista genérica petboletim_${petId} (JSON). NÃO mexe no schema.
   Fase 2: envio automatico via WhatsApp API/template (opt-in + template Meta)
   ───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { montarTextoBoletim, BoletimData, EquipVal } from "@/lib/pets/boletim";
import EquipamentosFisioEditor from "@/components/pets/EquipamentosFisioEditor";

interface Pet {
  id: string; name: string; species: string; breed?: string | null; gender?: string | null; birthDate?: string | null;
  tutorId: string; tutor?: { id: string; name: string; acceptsWhatsApp?: boolean; contacts?: { number: string; isPrimary?: boolean; isWhatsApp?: boolean }[] };
}
const PET_EMOJI = (s: string) => { const u = (s || "").toUpperCase(); if (u.includes("FELIN") || u.includes("GAT")) return "🐱"; if (u.includes("CANIN") || u.includes("CACHORR")) return "🐶"; return "🐾"; };
async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

export default function BoletimFisioPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const petId = params?.id as string;
  const boletimId = search?.get("id") || null;

  const [pet, setPet] = useState<Pet | null>(null);
  const [vets, setVets] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acceptsWA, setAcceptsWA] = useState(false);
  const [tutorPhone, setTutorPhone] = useState<string | null>(null);
  const [sessaoDefault, setSessaoDefault] = useState("");

  const [b, setB] = useState<BoletimData>({
    animal: "", raca: "", sexo: "", idade: "", tutor: "", encaminhado: "", diagnostico: "", cirurgias: "Não", examesData: "",
    sessaoData: new Date().toISOString().slice(0, 10), entrada: "", saida: "", sessaoNumero: "", mvResponsavel: "",
    equipamentos: {}, obsTutor: "", obsMv: "", paraCasa: "", metas: "", enviadoAt: null,
  });
  const setF = (patch: Partial<BoletimData>) => setB((prev) => ({ ...prev, ...patch }));
  const setEqObj = (key: string, patch: Partial<EquipVal>) => setB((prev) => { const cur = (prev.equipamentos || {})[key]; const base: EquipVal = (cur && typeof cur === "object") ? (cur as EquipVal) : {}; return { ...prev, equipamentos: { ...(prev.equipamentos || {}), [key]: { ...base, ...patch } } }; });

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const p = await safeJson<Pet | null>(await fetch(`/api/pets/${petId}`), null);
      setPet(p);
      setAcceptsWA(!!p?.tutor?.acceptsWhatsApp);
      const wa = p?.tutor?.contacts?.find((c) => c.isWhatsApp) || p?.tutor?.contacts?.find((c) => c.isPrimary) || p?.tutor?.contacts?.[0];
      setTutorPhone(wa?.number || null);
      const users = await safeJson<any>(await fetch(`/api/users`), []);
      setVets(Array.isArray(users) ? users : (users.users || users.data || []));
      // nº da sessão auto do pacote de fisio (ex.: "06/06")
      const lpac = await safeJson<any>(await fetch(`/api/listas?lista=petpac_${petId}`, { cache: "no-store" }), []);
      const lpacArr = Array.isArray(lpac) ? lpac : (lpac.itens || lpac.data || []);
      let sessNum = "";
      for (const i of lpacArr) { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} if ((d.total || 0) > 0 && (d.used || 0) < (d.total || 0)) { sessNum = `${String((d.used || 0) + 1).padStart(2, "0")}/${String(d.total).padStart(2, "0")}`; break; } }
      setSessaoDefault(sessNum);

      if (boletimId) {
        // edição: carrega o boletim existente
        const r = await safeJson<any>(await fetch(`/api/listas?lista=petboletim_${petId}`, { cache: "no-store" }), []);
        const arr = Array.isArray(r) ? r : (r.itens || r.data || []);
        const row = arr.find((x: any) => x.id === boletimId);
        if (row) { let o: any = {}; try { o = JSON.parse(row.valor); } catch {} setB((prev) => ({ ...prev, ...o, equipamentos: o.equipamentos || {} })); }
      } else if (p) {
        // novo: pré-preenche PACIENTE a partir do pet + tutor + petfisio_
        let fisio: any = {};
        try {
          const rf = await safeJson<any>(await fetch(`/api/listas?lista=petfisio_${petId}`, { cache: "no-store" }), []);
          const rfArr = Array.isArray(rf) ? rf : (rf.itens || rf.data || []);
          if (rfArr[0]) { try { fisio = JSON.parse(rfArr[0].valor); } catch {} }
        } catch {}
        setB((prev) => ({
          ...prev,
          animal: p.name || "", raca: p.breed || "", sexo: genderLabel(p.gender), idade: p.birthDate ? ageFromBirth(p.birthDate) : "",
          tutor: p.tutor?.name || "", sessaoNumero: sessNum,
          diagnostico: fisio.diagnostico || "", encaminhado: fisio.encaminhadoPor || fisio.encaminhado || "", examesData: fisio.ultimosExames || fisio.exames || "",
        }));
      }
    })();
  }, [petId, boletimId]);

  const textoPreview = useMemo(() => montarTextoBoletim(b), [b]);

  async function persistir(enviado: boolean): Promise<boolean> {
    if (!pet) return false;
    const payload: BoletimData = { ...b, enviadoAt: enviado ? new Date().toISOString() : (b.enviadoAt || null), createdAt: b.createdAt || new Date().toISOString() };
    // desconto da sessão: via agenda (quando o tutor chega/entra na sala de espera) — não descontamos aqui.
    try {
      if (boletimId) {
        const r = await fetch(`/api/listas/${boletimId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ valor: JSON.stringify(payload) }) });
        if (!r.ok) throw new Error();
      } else {
        const r = await fetch(`/api/listas`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lista: `petboletim_${petId}`, valor: JSON.stringify(payload) }) });
        if (!r.ok) throw new Error();
      }
      return true;
    } catch { toast.error("Erro ao salvar boletim"); return false; }
  }

  async function handleSalvar() {
    setSaving(true);
    const ok = await persistir(false);
    setSaving(false);
    if (ok) { toast.success("Boletim salvo"); router.push(`/dashboard/erp/pets/${petId}?tab=fisio`); }
  }

  async function handleSalvarEnviar() {
    if (!acceptsWA) { toast.error("O tutor ainda não autorizou receber por WhatsApp"); return; }
    setSaving(true);
    const ok = await persistir(true);
    setSaving(false);
    if (!ok) return;
    try { await navigator.clipboard.writeText(textoPreview); toast.success("Boletim copiado — cole no WhatsApp"); } catch {}
    openWhatsAppMeta(tutorPhone || undefined); // envio manual (1ª versão)
    // Fase 2: envio automatico via WhatsApp API/template (opt-in + template Meta)
    router.push(`/dashboard/erp/pets/${petId}?tab=fisio`);
  }

  async function autorizarWhatsApp() {
    if (!pet) return;
    try {
      const r = await fetch(`/api/tutors/${pet.tutorId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptsWhatsApp: true }) });
      if (!r.ok) throw new Error();
      setAcceptsWA(true); toast.success("Consentimento registrado");
    } catch { toast.error("Erro ao registrar consentimento"); }
  }

  function imprimir() {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
    const esc = (t: any) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    // Converte a marcação do WhatsApp (*negrito* _itálico_) e remove o cabeçalho repetido + a régua ━.
    const paraImpressao = textoPreview
      .replace(/^\*🌿 Boletim de Fisioterapia\*\n_Empório do Pet_\n━+\n/, "")
      .replace(/━+/g, "");
    const rich = esc(paraImpressao).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>");
    w.document.write(`<html><head><title>Boletim de fisioterapia</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E2244;padding:40px;max-width:720px;margin:0 auto;font-size:13px;line-height:1.55}h1{color:#014D5E;font-size:19px;margin:0 0 2px}.sub{color:#6B7280;font-size:12px;margin-bottom:16px}pre{white-space:pre-wrap;font-family:inherit;border-top:2px solid #009AAC;padding-top:14px}</style></head><body><h1>🌿 Boletim de Fisioterapia — Empório do Pet</h1><div class="sub">${esc(pet?.name || "")} · ${esc(new Date(b.sessaoData || Date.now()).toLocaleDateString("pt-BR"))}</div><pre>${rich}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  if (!pet) return <div className="p-10 text-center text-[#374151]">Carregando boletim...</div>;

  const card = "bg-white border border-[#E8E2D6] rounded-[14px]";
  const inp = "w-full mt-0.5 px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] text-[#1F2A2E] bg-white";
  const lbl = "text-[10px] uppercase tracking-wide text-[#374151]";
  const sec = "text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2";

  return (
    <div className="p-4 min-h-screen bg-[#F6F2EA]">
      <div className="text-[12px] text-[#374151] mb-2 px-1">
        <Link href="/dashboard/erp/pets" className="hover:text-[#009AAC]">Pets</Link> / <Link href={`/dashboard/erp/pets/${pet.id}`} className="hover:text-[#009AAC]">{pet.name}</Link> / <b className="text-[#009AAC] font-medium">{boletimId ? "Editar boletim" : "Novo boletim"}</b>
      </div>

      <div className={`${card} mb-3`} style={{ padding: "13px 16px" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} title="Voltar" className="w-9 h-9 rounded-[10px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center justify-center shrink-0">←</button>
          <div className="w-[46px] h-[46px] rounded-[13px] bg-[#EAF3DE] flex items-center justify-center text-[24px] shrink-0">{PET_EMOJI(pet.species)}</div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[18px] leading-tight text-[#014D5E] font-medium">🌿 Boletim de Fisioterapia — {pet.name}</h1>
            <p className="text-[12.5px] text-[#5C6B70]">{[speciesLabel(pet.species), pet.breed, pet.birthDate ? ageFromBirth(pet.birthDate) : null].filter((x) => x && x !== "—").join(" · ")} · Tutor(a): {pet.tutor?.name || "—"}{sessaoDefault ? ` · Sessão ${sessaoDefault}` : ""}</p>
          </div>
          <Link href={`/dashboard/erp/pets/${pet.id}`} title="Fechar" className="w-9 h-9 rounded-[10px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center justify-center shrink-0">✕</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-3 items-start">
        {/* Formulário */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* PACIENTE */}
          <div className={card} style={{ padding: "13px 16px" }}>
            <div className={sec}>🐾 Paciente</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div><label className={lbl}>Animal</label><input value={b.animal} onChange={(e) => setF({ animal: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Raça</label><input value={b.raca} onChange={(e) => setF({ raca: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Sexo</label><input value={b.sexo} onChange={(e) => setF({ sexo: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Idade</label><input value={b.idade} onChange={(e) => setF({ idade: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Tutor</label><input value={b.tutor} onChange={(e) => setF({ tutor: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Encaminhado</label><input value={b.encaminhado} onChange={(e) => setF({ encaminhado: e.target.value })} className={inp} /></div>
              <div className="md:col-span-2"><label className={lbl}>Diagnóstico</label><input value={b.diagnostico} onChange={(e) => setF({ diagnostico: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Cirurgias</label><select value={b.cirurgias} onChange={(e) => setF({ cirurgias: e.target.value })} className={inp}><option value="Não">Não</option><option value="Sim">Sim</option></select></div>
              <div><label className={lbl}>Exames (data)</label><input type="date" value={b.examesData} onChange={(e) => setF({ examesData: e.target.value })} className={inp} /></div>
            </div>
          </div>

          {/* SESSÃO */}
          <div className={card} style={{ padding: "13px 16px" }}>
            <div className={sec}>📅 Sessão</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><label className={lbl}>Data</label><input type="date" value={b.sessaoData} onChange={(e) => setF({ sessaoData: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Entrada</label><input type="time" value={b.entrada} onChange={(e) => setF({ entrada: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Saída</label><input type="time" value={b.saida} onChange={(e) => setF({ saida: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Nº da sessão</label><input value={b.sessaoNumero} onChange={(e) => setF({ sessaoNumero: e.target.value })} placeholder={sessaoDefault || "06/06"} className={inp} /></div>
              <div className="md:col-span-2"><label className={lbl}>M.V. responsável</label><select value={b.mvResponsavel} onChange={(e) => setF({ mvResponsavel: e.target.value })} className={inp}><option value="">Selecionar...</option>{vets.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
            </div>
          </div>

          {/* EQUIPAMENTOS */}
          <div className={card} style={{ padding: "13px 16px" }}>
            <div className={sec}>⚙️ Equipamentos / recursos</div>
            <p className="text-[11px] text-[#374151] mb-2">Preencha só os usados — o texto do boletim mostra apenas os preenchidos.</p>
            <EquipamentosFisioEditor equipamentos={b.equipamentos || {}} onChange={setEqObj} />
          </div>

          {/* OBSERVAÇÕES */}
          <div className={card} style={{ padding: "13px 16px" }}>
            <div className={sec}>📝 Observações</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><label className={lbl}>Observação do tutor</label><textarea rows={3} value={b.obsTutor} onChange={(e) => setF({ obsTutor: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Observação do M.V.</label><textarea rows={3} value={b.obsMv} onChange={(e) => setF({ obsMv: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Para casa</label><textarea rows={3} value={b.paraCasa} onChange={(e) => setF({ paraCasa: e.target.value })} className={inp} /></div>
              <div><label className={lbl}>Metas para próxima sessão</label><textarea rows={3} value={b.metas} onChange={(e) => setF({ metas: e.target.value })} className={inp} /></div>
            </div>
          </div>
        </div>

        {/* Preview + consentimento + ações */}
        <div className="flex flex-col gap-3 min-w-0">
          {!acceptsWA && (
            <div className="bg-[#FBF3E3] border border-[#F0DCB0] rounded-[14px]" style={{ padding: "13px 16px" }}>
              <div className="text-[12.5px] text-[#8a6400] font-medium mb-1">⚠️ Consentimento WhatsApp</div>
              <p className="text-[12px] text-[#7a6330] mb-2">O tutor ainda não autorizou receber por WhatsApp. Não é possível enviar o boletim.</p>
              <button onClick={autorizarWhatsApp} className="text-[12px] px-3 py-1.5 rounded-[9px] text-white" style={{ background: "#009AAC" }}>Marcar consentimento (tutor autorizou)</button>
            </div>
          )}
          <div className={card} style={{ padding: "13px 16px" }}>
            <div className="flex items-center justify-between mb-2">
              <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">👁️ Prévia do boletim</div>
              <button onClick={imprimir} className="text-[11px] px-2.5 py-1 rounded-full border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">🖨️ Imprimir</button>
            </div>
            <pre className="text-[12px] text-[#1F2A2E] whitespace-pre-wrap bg-[#FBF9F4] border border-[#F0EBE0] rounded-[10px] p-3 max-h-[420px] overflow-auto" style={{ fontFamily: "inherit" }}>{textoPreview}</pre>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 pt-3 pb-8 flex-wrap">
        <button onClick={imprimir} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">🖨️ Imprimir</button>
        <Link href={`/dashboard/erp/pets/${pet.id}`} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</Link>
        <button onClick={handleSalvar} disabled={saving} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#014D5E" }}>{saving ? "Salvando..." : "Salvar"}</button>
        <button onClick={handleSalvarEnviar} disabled={saving || !acceptsWA} title={!acceptsWA ? "Tutor sem consentimento de WhatsApp" : "Salvar e abrir o WhatsApp"} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#009AAC" }}>💬 Salvar e enviar</button>
      </div>
    </div>
  );
}
