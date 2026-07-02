"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · Boletim de Fisioterapia (POPUP)   [EMP-COWORK]
   Modal Base44 por cima da ficha do pet. Grava em petboletim_${petId} (JSON).
   Fase 2: envio automatico via WhatsApp API/template (opt-in + template Meta)
   ───────────────────────────────────────────────────────────── */
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { ageFromBirth, genderLabel } from "@/lib/pets/labels";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { EQUIPAMENTOS_FISIO, montarTextoBoletim, BoletimData } from "@/lib/pets/boletim";

interface PetLite {
  id: string; name: string; species?: string; breed?: string | null; gender?: string | null; birthDate?: string | null;
  tutorId: string; tutor?: { id: string; name: string; acceptsWhatsApp?: boolean; contacts?: { number: string; isPrimary?: boolean; isWhatsApp?: boolean }[] };
}

async function safeJson<T>(res: Response, fb: T): Promise<T> { try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; } }

export default function BoletimModal({ pet, boletimId, fisioRec, onClose, onSaved }: {
  pet: PetLite;
  boletimId: string | null;
  fisioRec?: any; // dados do petfisio_ (diagnostico/encaminhado/exames) para auto-fill
  onClose: () => void;
  onSaved: () => void;
}) {
  const petId = pet.id;
  const [vets, setVets] = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [acceptsWA, setAcceptsWA] = useState(!!pet.tutor?.acceptsWhatsApp);
  const [ready, setReady] = useState(false);

  const tutorPhone = useMemo(() => {
    const c = pet.tutor?.contacts || [];
    const wa = c.find((x) => x.isWhatsApp) || c.find((x) => x.isPrimary) || c[0];
    return wa?.number || null;
  }, [pet]);

  // Auto-fill do PACIENTE a partir do pet + tutor + petfisio_
  const initialData = useMemo<BoletimData>(() => ({
    animal: pet.name || "",
    raca: pet.breed || "",
    sexo: genderLabel(pet.gender),
    idade: pet.birthDate ? ageFromBirth(pet.birthDate) : "",
    tutor: pet.tutor?.name || "",
    encaminhado: fisioRec?.encaminhadoPor || fisioRec?.encaminhado || "",
    diagnostico: fisioRec?.diagnostico || "",
    cirurgias: "Não",
    examesData: fisioRec?.exames || fisioRec?.ultimosExames || "",
    sessaoData: new Date().toISOString().slice(0, 10),
    entrada: "", saida: "", sessaoNumero: "", mvResponsavel: "",
    equipamentos: {}, obsTutor: "", obsMv: "", paraCasa: "", metas: "", enviadoAt: null,
  }), [pet, fisioRec]);

  const [b, setB] = useState<BoletimData>(initialData);
  const setF = (patch: Partial<BoletimData>) => setB((prev) => ({ ...prev, ...patch }));
  const setEq = (nome: string, val: string) => setB((prev) => ({ ...prev, equipamentos: { ...(prev.equipamentos || {}), [nome]: val } }));

  useEffect(() => {
    (async () => {
      const users = await safeJson<any>(await fetch(`/api/users`), []);
      setVets(Array.isArray(users) ? users : (users.users || users.data || []));
      // nº da sessão auto do pacote de fisio ativo (ex.: "06/06")
      const lpac = await safeJson<any>(await fetch(`/api/listas?lista=petpac_${petId}`, { cache: "no-store" }), []);
      const lpacArr = Array.isArray(lpac) ? lpac : (lpac.itens || lpac.data || []);
      let sessNum = "";
      for (const i of lpacArr) { let d: any = {}; try { d = JSON.parse(i.valor); } catch {} if ((d.total || 0) > 0 && (d.used || 0) < (d.total || 0)) { sessNum = `${String((d.used || 0) + 1).padStart(2, "0")}/${String(d.total).padStart(2, "0")}`; break; } }

      if (boletimId) {
        // edição: carrega o boletim existente por cima do auto-fill
        const r = await safeJson<any>(await fetch(`/api/listas?lista=petboletim_${petId}`, { cache: "no-store" }), []);
        const arr = Array.isArray(r) ? r : (r.itens || r.data || []);
        const row = arr.find((x: any) => x.id === boletimId);
        if (row) { let o: any = {}; try { o = JSON.parse(row.valor); } catch {} setB((prev) => ({ ...prev, ...o, equipamentos: o.equipamentos || {} })); }
      } else {
        // novo: garante o auto-fill + nº da sessão
        setB((prev) => ({ ...prev, ...initialData, sessaoNumero: prev.sessaoNumero || sessNum }));
      }
      setReady(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [petId, boletimId]);

  const textoPreview = useMemo(() => montarTextoBoletim(b), [b]);

  async function persistir(enviado: boolean): Promise<boolean> {
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
    if (ok) { toast.success("Boletim salvo"); onSaved(); }
  }

  async function handleSalvarEnviar() {
    if (!acceptsWA) { toast.error("O tutor ainda não autorizou receber por WhatsApp"); return; }
    setSaving(true);
    const ok = await persistir(true);
    if (!ok) { setSaving(false); return; }
    // Envio automático pela API oficial da Meta (mesmo caminho da pesquisa de avaliação do Google).
    try {
      const r = await fetch(`/api/survey-avaliacao/mensagem-tutor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tutorId: pet.tutorId, texto: textoPreview }),
      });
      const d = await safeJson<any>(r, { success: false });
      setSaving(false);
      if (d?.success) { toast.success("Boletim enviado pelo WhatsApp ✅"); onSaved(); return; }
      // Meta recusou (ex.: fora da janela de 24h) → fallback manual, sem travar
      toast.error("Envio automático não deu certo" + (d?.error ? `: ${d.error}` : "") + ". Abrindo o WhatsApp pra enviar manual.");
    } catch {
      setSaving(false);
      toast.error("Envio automático falhou. Abrindo o WhatsApp pra enviar manual.");
    }
    try { await navigator.clipboard.writeText(textoPreview); } catch {}
    openWhatsAppMeta(tutorPhone || undefined);
    onSaved();
  }

  async function autorizarWhatsApp() {
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
    w.document.write(`<html><head><title>Boletim de fisioterapia</title><style>body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0E2244;padding:40px;max-width:720px;margin:0 auto;font-size:13px;line-height:1.55}h1{color:#014D5E;font-size:19px;margin:0 0 2px}.sub{color:#6B7280;font-size:12px;margin-bottom:16px}pre{white-space:pre-wrap;font-family:inherit;border-top:2px solid #009AAC;padding-top:14px}</style></head><body><h1>🌿 Boletim de Fisioterapia — Empório do Pet</h1><div class="sub">${esc(pet.name || "")} · ${esc(new Date(b.sessaoData || Date.now()).toLocaleDateString("pt-BR"))}</div><pre>${esc(textoPreview)}</pre></body></html>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
  }

  const inp = "w-full mt-0.5 px-3 py-2 border border-[#E8E2D6] rounded-[9px] text-[13px] text-[#1F2A2E] bg-white";
  const lbl = "text-[10px] uppercase tracking-wide text-[#8A989D]";
  const sec = "text-[12px] font-medium uppercase tracking-wide text-[#014D5E] mb-2";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div className="bg-[#FBF9F4] rounded-[16px] w-full my-6" style={{ maxWidth: "900px", border: "1px solid #E8E2D6" }} onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho fixo do modal */}
        <div className="flex items-center justify-between border-b border-[#E8E2D6] sticky top-0 bg-[#FBF9F4] rounded-t-[16px] z-10" style={{ padding: "13px 16px" }}>
          <div className="min-w-0">
            <h2 className="text-[16px] font-medium text-[#014D5E]">🌿 {boletimId ? "Editar boletim" : "Novo boletim"} — {pet.name}</h2>
            <p className="text-[11.5px] text-[#5C6B70] truncate">Tutor(a): {pet.tutor?.name || "—"}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Botão de envio no TOPO também (item 3) */}
            <button onClick={handleSalvarEnviar} disabled={saving || !acceptsWA} title={!acceptsWA ? "Tutor sem consentimento de WhatsApp" : "Salvar e enviar pelo WhatsApp"} className="px-3 py-1.5 rounded-[9px] text-[12.5px] font-medium text-white disabled:opacity-50" style={{ background: "#009AAC" }}>💬 Salvar e enviar</button>
            <button onClick={onClose} title="Fechar" className="w-8 h-8 rounded-[9px] border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC] flex items-center justify-center">✕</button>
          </div>
        </div>

        {/* Corpo rolável */}
        <div className="p-4" style={{ maxHeight: "calc(100vh - 170px)", overflowY: "auto" }}>
          {!acceptsWA && (
            <div className="bg-[#FBF3E3] border border-[#F0DCB0] rounded-[12px] mb-3" style={{ padding: "11px 14px" }}>
              <div className="text-[12.5px] text-[#8a6400] font-medium mb-1">⚠️ Consentimento WhatsApp</div>
              <p className="text-[12px] text-[#7a6330] mb-2">O tutor ainda não autorizou receber por WhatsApp. Não é possível enviar o boletim.</p>
              <button onClick={autorizarWhatsApp} className="text-[12px] px-3 py-1.5 rounded-[9px] text-white" style={{ background: "#009AAC" }}>Marcar consentimento (tutor autorizou)</button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3 items-start">
            {/* Formulário */}
            <div className="flex flex-col gap-3 min-w-0">
              {/* PACIENTE */}
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "12px 14px" }}>
                <div className={sec}>🐾 Paciente</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div><label className={lbl}>Animal</label><input value={b.animal} onChange={(e) => setF({ animal: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Raça</label><input value={b.raca} onChange={(e) => setF({ raca: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Sexo</label><input value={b.sexo} onChange={(e) => setF({ sexo: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Idade</label><input value={b.idade} onChange={(e) => setF({ idade: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Tutor</label><input value={b.tutor} onChange={(e) => setF({ tutor: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Encaminhado</label><input value={b.encaminhado} onChange={(e) => setF({ encaminhado: e.target.value })} className={inp} /></div>
                  <div className="md:col-span-2"><label className={lbl}>Diagnóstico</label><input value={b.diagnostico} onChange={(e) => setF({ diagnostico: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Cirurgias</label><select value={b.cirurgias} onChange={(e) => setF({ cirurgias: e.target.value })} className={inp}><option value="Não">Não</option><option value="Sim">Sim</option></select></div>
                  <div><label className={lbl}>Exames (data/obs)</label><input value={b.examesData} onChange={(e) => setF({ examesData: e.target.value })} className={inp} /></div>
                </div>
              </div>

              {/* SESSÃO */}
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "12px 14px" }}>
                <div className={sec}>📅 Sessão</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                  <div><label className={lbl}>Data</label><input type="date" value={b.sessaoData} onChange={(e) => setF({ sessaoData: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Entrada</label><input type="time" value={b.entrada} onChange={(e) => setF({ entrada: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Saída</label><input type="time" value={b.saida} onChange={(e) => setF({ saida: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Nº da sessão</label><input value={b.sessaoNumero} onChange={(e) => setF({ sessaoNumero: e.target.value })} placeholder="06/06" className={inp} /></div>
                  <div className="md:col-span-2"><label className={lbl}>M.V. responsável</label><select value={b.mvResponsavel} onChange={(e) => setF({ mvResponsavel: e.target.value })} className={inp}><option value="">Selecionar...</option>{vets.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}</select></div>
                </div>
              </div>

              {/* EQUIPAMENTOS */}
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "12px 14px" }}>
                <div className={sec}>⚙️ Equipamentos / recursos</div>
                <p className="text-[11px] text-[#8A989D] mb-2">Preencha só os usados — o texto do boletim mostra apenas os preenchidos.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {EQUIPAMENTOS_FISIO.map((nome) => (
                    <div key={nome} className="flex items-center gap-2">
                      <span className="text-[12px] text-[#5C6B70] w-[120px] shrink-0">{nome}</span>
                      <input value={(b.equipamentos || {})[nome] || ""} onChange={(e) => setEq(nome, e.target.value)} placeholder="parâmetros…" className="flex-1 px-2 py-1.5 border border-[#E8E2D6] rounded-[9px] text-[13px] bg-white" />
                    </div>
                  ))}
                </div>
              </div>

              {/* OBSERVAÇÕES */}
              <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "12px 14px" }}>
                <div className={sec}>📝 Observações</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  <div><label className={lbl}>Observação do tutor</label><textarea rows={3} value={b.obsTutor} onChange={(e) => setF({ obsTutor: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Observação do M.V.</label><textarea rows={3} value={b.obsMv} onChange={(e) => setF({ obsMv: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Para casa</label><textarea rows={3} value={b.paraCasa} onChange={(e) => setF({ paraCasa: e.target.value })} className={inp} /></div>
                  <div><label className={lbl}>Metas para próxima sessão</label><textarea rows={3} value={b.metas} onChange={(e) => setF({ metas: e.target.value })} className={inp} /></div>
                </div>
              </div>
            </div>

            {/* Prévia */}
            <div className="bg-white border border-[#E8E2D6] rounded-[13px]" style={{ padding: "12px 14px" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12px] font-medium uppercase tracking-wide text-[#014D5E]">👁️ Prévia do boletim</div>
                <button onClick={imprimir} className="text-[11px] px-2.5 py-1 rounded-full border border-[#E8E2D6] text-[#5C6B70] hover:border-[#009AAC] hover:text-[#009AAC]">🖨️ Imprimir</button>
              </div>
              <pre className="text-[12px] text-[#1F2A2E] whitespace-pre-wrap bg-[#FBF9F4] border border-[#F0EBE0] rounded-[10px] p-3 max-h-[380px] overflow-auto" style={{ fontFamily: "inherit" }}>{textoPreview}</pre>
            </div>
          </div>
        </div>

        {/* Rodapé fixo */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E8E2D6] flex-wrap" style={{ padding: "12px 16px" }}>
          <button onClick={imprimir} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">🖨️ Imprimir</button>
          <button onClick={onClose} className="px-4 py-2 rounded-[9px] text-[13px] border border-[#E8E2D6] text-[#5C6B70]">Cancelar</button>
          <button onClick={handleSalvar} disabled={saving} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#014D5E" }}>{saving ? "Salvando..." : "Salvar"}</button>
          <button onClick={handleSalvarEnviar} disabled={saving || !acceptsWA} title={!acceptsWA ? "Tutor sem consentimento de WhatsApp" : "Salvar e enviar pelo WhatsApp"} className="px-4 py-2 rounded-[9px] text-[13px] font-medium text-white disabled:opacity-60" style={{ background: "#009AAC" }}>💬 Salvar e enviar (WhatsApp)</button>
        </div>
      </div>
    </div>
  );
}
