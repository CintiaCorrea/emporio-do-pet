"use client";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { speciesKey, ageFromBirth } from "@/lib/pets/labels";

// Edição/cadastro do pet no inbox. inline = renderiza no painel (sem pop-up). Sem pet.id = cadastra novo (POST).
export default function PetEditModal({ pet, tutorId, onClose, onSaved, inline }: { pet?: any; tutorId?: string; onClose: () => void; onSaved: (patch: any) => void; inline?: boolean }) {
  const p = pet || {};
  const isNew = !p.id;
  const [f, setF] = useState({
    name: p.name === "Sem nome" ? "" : (p.name || ""),
    species: speciesKey(p.species) || "CANINE",
    gender: p.gender || "",
    breed: p.breed || "",
    birthDate: p.birthDate ? String(p.birthDate).slice(0, 10) : "",
    weight: p.weight != null ? String(p.weight) : "",
    sterilization: p.sterilization || "",
    coatColor: p.coatColor || "",
    microchip: p.microchip || "",
    insurancePlan: p.insurancePlan || "",
    observations: p.observations || "",
  });
  const [breeds, setBreeds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const up = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const r = await fetch(`/api/breeds?species=${encodeURIComponent(f.species)}`, { cache: "no-store" });
        if (!r.ok) { if (!cancel) setBreeds([]); return; }
        const d = await r.json();
        const arr: any[] = Array.isArray(d) ? d : (d?.breeds || []);
        const names = Array.from(new Set(arr.map((b: any) => (typeof b === "string" ? b : b?.name)).filter(Boolean)));
        if (!cancel) setBreeds(names as string[]);
      } catch { if (!cancel) setBreeds([]); }
    })();
    return () => { cancel = true; };
  }, [f.species]);

  async function salvar() {
    if (!f.name.trim()) { toast.error("Nome do pet é obrigatório"); return; }
    setSaving(true);
    const patch: any = {
      name: f.name.trim(),
      species: f.species,
      gender: f.gender || null,
      breed: f.breed || null,
      birthDate: f.birthDate ? new Date(f.birthDate).toISOString() : null,
      weight: f.weight.trim() ? Number(f.weight.replace(",", ".")) : null,
      sterilization: f.sterilization || null,
      coatColor: f.coatColor.trim() || null,
      microchip: f.microchip.trim() || null,
      insurancePlan: f.insurancePlan.trim() || null,
      observations: f.observations.trim() || null,
    };
    try {
      const url = isNew ? `/api/pets` : `/api/pets/${p.id}`;
      const method = isNew ? "POST" : "PATCH";
      const body = isNew ? { ...patch, tutorId: tutorId || p.tutorId } : patch;
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        toast.error(err?.message ? (Array.isArray(err.message) ? err.message.join(" ") : err.message) : `Erro ao salvar (${r.status})`);
        setSaving(false); return;
      }
      const saved = await r.json().catch(() => null);
      toast.success(isNew ? "Pet cadastrado" : "Pet atualizado");
      onSaved(isNew ? { ...patch, ...(saved || {}) } : patch);
      onClose();
    } catch { toast.error("Sem conexão — tente de novo"); setSaving(false); }
  }

  const inp = "w-full px-2.5 py-1.5 text-[13px] border rounded-lg outline-none focus:border-[#009AAC]";
  const lbl = "block text-[10.5px] font-semibold text-[#7A8A8F] mb-1";
  const bs = { borderColor: "#D9E6E8", color: "#014D5E" } as any;

  const card = (
      <div className={inline ? "bg-white rounded-2xl w-full border" : "bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"} style={inline ? { borderColor: "#EFEAE0" } : undefined} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b sticky top-0 bg-white" style={{ borderColor: "#EFEAE0" }}>
          <h3 className="text-[15px] font-bold" style={{ color: "#014D5E" }}>🐾 {isNew ? "Novo pet" : "Editar pet"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div><label className={lbl}>Nome</label><input className={inp} style={bs} value={f.name} onChange={(e) => up("name", e.target.value)} placeholder="Nome do pet" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Espécie</label>
              <select className={inp} style={{ ...bs, background: "white" }} value={f.species} onChange={(e) => { up("species", e.target.value); up("breed", ""); }}>
                <option value="CANINE">Cão</option><option value="FELINE">Gato</option><option value="BIRD">Ave</option>
                <option value="RODENT">Roedor</option><option value="REPTILE">Réptil</option><option value="OTHER">Outro</option>
              </select>
            </div>
            <div><label className={lbl}>Sexo</label>
              <select className={inp} style={{ ...bs, background: "white" }} value={f.gender} onChange={(e) => up("gender", e.target.value)}>
                <option value="">—</option><option value="MALE">Macho</option><option value="FEMALE">Fêmea</option><option value="OTHER">Outro</option>
              </select>
            </div>
          </div>
          <div><label className={lbl}>Raça</label>
            <select className={inp} style={{ ...bs, background: "white" }} value={f.breed} onChange={(e) => up("breed", e.target.value)}>
              <option value="">— selecione —</option>
              {f.breed && !breeds.includes(f.breed) && <option value={f.breed}>{f.breed}</option>}
              {breeds.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Nascimento {f.birthDate ? <span className="text-[#9aa7ab] font-normal">· {ageFromBirth(f.birthDate)}</span> : null}</label><input type="date" className={inp} style={bs} value={f.birthDate} onChange={(e) => up("birthDate", e.target.value)} /></div>
            <div><label className={lbl}>Peso (kg)</label><input type="number" step="0.1" className={inp} style={bs} value={f.weight} onChange={(e) => up("weight", e.target.value)} placeholder="kg" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Castração</label>
              <select className={inp} style={{ ...bs, background: "white" }} value={f.sterilization} onChange={(e) => up("sterilization", e.target.value)}>
                <option value="">—</option><option value="STERILIZED">Castrado</option><option value="NOT_STERILIZED">Inteiro</option><option value="SCHEDULED">Agendado</option>
              </select>
            </div>
            <div><label className={lbl}>Pelagem</label><input className={inp} style={bs} value={f.coatColor} onChange={(e) => up("coatColor", e.target.value)} placeholder="cor / pelagem" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Microchip</label><input className={inp} style={bs} value={f.microchip} onChange={(e) => up("microchip", e.target.value)} /></div>
            <div><label className={lbl}>Plano / convênio</label><input className={inp} style={bs} value={f.insurancePlan} onChange={(e) => up("insurancePlan", e.target.value)} /></div>
          </div>
          <div><label className={lbl}>Observações</label><textarea className={inp} style={bs} rows={2} value={f.observations} onChange={(e) => up("observations", e.target.value)} placeholder="Alergias / observações clínicas" /></div>
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
