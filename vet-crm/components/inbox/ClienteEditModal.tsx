"use client";
import { useState } from "react";
import toast from "react-hot-toast";
import { buscarCep } from "@/lib/cep";

function onlyDigits(s: string) { return (s || "").replace(/\D/g, ""); }
function normalizePhone(raw: string): string {
  const d = onlyDigits(raw);
  if (!d) return "";
  if (d.length === 13 && d.startsWith("55")) return d;
  if (d.length === 12 && d.startsWith("55")) return d.slice(0, 4) + "9" + d.slice(4);
  if (d.length === 11) return "55" + d;
  if (d.length === 10) return "55" + d.slice(0, 2) + "9" + d.slice(2);
  return d;
}

// Pop-up de edicao dos dados cadastrais do cliente (item 2). Salva no mesmo endpoint do inbox
// (PATCH /api/tutors/[id]); telefone atualiza o contato primario, igual savePhone().
export default function ClienteEditModal({ tutor, onClose, onSaved, inline }: { tutor: any; onClose: () => void; onSaved: (patch: any) => void; inline?: boolean }) {
  const c0 = (tutor.contacts || [])[0]?.number || "";
  const [f, setF] = useState({
    name: tutor.name || "",
    phone: c0,
    email: tutor.email || "",
    cpf: tutor.cpf || "",
    birthDate: tutor.birthDate ? String(tutor.birthDate).slice(0, 10) : "",
    cep: tutor.cep || "",
    address: tutor.address || "",
    addressNumber: tutor.addressNumber || "",
    complement: tutor.complement || "",
    neighborhood: tutor.neighborhood || "",
    city: tutor.city || "",
    state: tutor.state || "",
  });
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function autoCep(cep: string) {
    if (onlyDigits(cep).length !== 8) return;
    setCepLoading(true);
    const info = await buscarCep(cep);
    setCepLoading(false);
    if (!info) { toast.error("CEP não encontrado"); return; }
    setF((s) => ({
      ...s,
      address: info.logradouro || s.address,
      neighborhood: info.bairro || s.neighborhood,
      city: info.localidade || s.city,
      state: info.uf || s.state,
    }));
  }

  async function salvar() {
    if (!f.name.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!tutor?.id) { toast.error("Este contato ainda não é um cliente cadastrado (é um lead). Converta em cliente antes de editar a ficha."); return; }
    setSaving(true);
    // IMPORTANTE: o update de tutor NÃO aceita `contacts` (é gerenciado pelo módulo /contacts).
    // Enviar contacts aqui dava 400. Então: ficha vai sem contacts; telefone vai à parte.
    const patch: any = {
      name: f.name.trim(),
      email: f.email.trim() || null,
      cpf: onlyDigits(f.cpf) || null,
      birthDate: f.birthDate ? new Date(f.birthDate).toISOString() : null,
      cep: onlyDigits(f.cep) || null,
      address: f.address.trim() || null,
      addressNumber: f.addressNumber.trim() || null,
      complement: f.complement.trim() || null,
      neighborhood: f.neighborhood.trim() || null,
      city: f.city.trim() || null,
      state: f.state.trim() || null,
    };
    try {
      const r = await fetch(`/api/tutors/${tutor.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        const msg = err?.message ? (Array.isArray(err.message) ? err.message.join(" ") : err.message) : `Erro ao salvar (${r.status})`;
        toast.error(msg); setSaving(false); return;
      }
      // Telefone: só se mudou, e pelo endpoint de contatos (PATCH /contacts/:id ou POST /contacts).
      const phone = normalizePhone(f.phone);
      const orig = normalizePhone((tutor.contacts || [])[0]?.number || "");
      if (phone && phone.length >= 10 && phone !== orig) {
        const primary = (tutor.contacts || [])[0];
        try {
          if (primary?.id) {
            await fetch(`/api/contacts/${primary.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number: phone }) });
          } else {
            await fetch(`/api/contacts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tutorId: tutor.id, number: phone, isPrimary: true, isWhatsApp: true }) });
          }
          patch.contacts = (tutor.contacts || []).length
            ? (tutor.contacts as any[]).map((c: any, i: number) => (i === 0 ? { ...c, number: phone } : c))
            : [{ number: phone, isPrimary: true, isWhatsApp: true }];
        } catch { /* não bloqueia o resto do cadastro */ }
      }
      toast.success("Cliente atualizado");
      onSaved(patch);
      onClose();
    } catch { toast.error("Sem conexão — tente de novo"); setSaving(false); }
  }

  const inp = "w-full px-2.5 py-1.5 text-[13px] border rounded-lg outline-none focus:border-[#009AAC]";
  const lbl = "block text-[10.5px] font-semibold text-[#7A8A8F] mb-1";
  const bs = { borderColor: "#D9E6E8", color: "#014D5E" } as any;

  const card = (
      <div className={inline ? "bg-white rounded-2xl w-full border" : "bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"} style={inline ? { borderColor: "#EFEAE0" } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b sticky top-0 bg-white" style={{ borderColor: "#EFEAE0" }}>
          <h3 className="text-[15px] font-bold" style={{ color: "#014D5E" }}>✎ Editar cliente</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Nome</label><input className={inp} style={bs} value={f.name} onChange={(e) => up("name", e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Telefone</label><input className={inp} style={bs} value={f.phone} onChange={(e) => up("phone", e.target.value)} placeholder="(85) 99999-9999" /></div>
            <div><label className={lbl}>CPF</label><input className={inp} style={bs} value={f.cpf} onChange={(e) => up("cpf", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>E-mail</label><input className={inp} style={bs} value={f.email} onChange={(e) => up("email", e.target.value)} /></div>
            <div><label className={lbl}>Aniversário</label><input type="date" className={inp} style={bs} value={f.birthDate} onChange={(e) => up("birthDate", e.target.value)} /></div>
          </div>
          <div className="pt-1 text-[10px] font-bold uppercase text-[#9aa7ab] tracking-wide">Endereço</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lbl}>CEP {cepLoading ? <span className="text-[#009AAC]">buscando…</span> : null}</label><input className={inp} style={bs} value={f.cep} onChange={(e) => { up("cep", e.target.value); if (onlyDigits(e.target.value).length === 8) autoCep(e.target.value); }} onBlur={(e) => autoCep(e.target.value)} placeholder="00000-000" inputMode="numeric" /></div>
            <div className="col-span-2"><label className={lbl}>Cidade</label><input className={inp} style={bs} value={f.city} onChange={(e) => up("city", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-6 gap-3">
            <div className="col-span-4"><label className={lbl}>Rua</label><input className={inp} style={bs} value={f.address} onChange={(e) => up("address", e.target.value)} /></div>
            <div className="col-span-1"><label className={lbl}>Nº</label><input className={inp} style={bs} value={f.addressNumber} onChange={(e) => up("addressNumber", e.target.value)} /></div>
            <div className="col-span-1"><label className={lbl}>UF</label><input className={inp} style={bs} maxLength={2} value={f.state} onChange={(e) => up("state", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Bairro</label><input className={inp} style={bs} value={f.neighborhood} onChange={(e) => up("neighborhood", e.target.value)} /></div>
            <div><label className={lbl}>Complemento</label><input className={inp} style={bs} value={f.complement} onChange={(e) => up("complement", e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-3.5 border-t sticky bottom-0 bg-white" style={{ borderColor: "#EFEAE0" }}>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-[13px] border rounded-lg font-medium" style={bs}>Cancelar</button>
          <button type="button" onClick={salvar} disabled={saving} className="flex-1 py-2 text-[13px] text-white rounded-lg font-semibold disabled:opacity-60" style={{ background: "#009AAC" }}>{saving ? "Salvando…" : "Salvar"}</button>
        </div>
      </div>
  );

  if (inline) return card;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(1,42,50,.45)" }} onClick={onClose}>
      {card}
    </div>
  );
}
