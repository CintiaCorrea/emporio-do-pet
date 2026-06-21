"use client";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";
import PetIcon from "@/components/profile/PetIcon";

const BRL = (n: any) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const STATUS: any = { ALIVE: "Vivo", DECEASED: "Óbito", INACTIVE: "Inativo", TRANSFERRED: "Transferido" };

export default function PetFichaHeaderCard({ pet, tutorWhats, ltv = 0, ultimaVisita, petTags = [], tagTpls = [] }: { pet: any; tutorWhats?: string | null; ltv?: number; ultimaVisita?: string | null; petTags?: any[]; tagTpls?: any[] }) {
  if (!pet) return null;
  const fmt = (d: any) => (d ? new Date(d).toLocaleDateString("pt-BR") : "—");
  const statusL = STATUS[pet.status] || pet.status || "—";
  const linha2 = [pet.breed, pet.gender ? genderLabel(pet.gender) : null, pet.birthDate ? ageFromBirth(pet.birthDate) : null, pet.weight ? `${pet.weight} kg` : null].filter(Boolean).join(" · ");
  return (
    <div className="max-w-7xl mx-auto px-6 pt-4">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_84px] gap-4 bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
        <div>
          <div className="text-sm font-bold" style={{ color: "#0E2244" }}>{pet.tutor?.name || "—"} <span className="text-[11px] font-normal text-gray-400">· tutor</span></div>
          <div className="text-[11px] text-gray-500 mt-1 space-y-0.5">
            {tutorWhats ? <div><b>WhatsApp:</b> {tutorWhats}</div> : null}
            <div><b>LTV:</b> {BRL(ltv)} · <b>Última visita:</b> {fmt(ultimaVisita)}</div>
          </div>
          {petTags && petTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {petTags.slice(0, 4).map((t: any) => { const cor = (tagTpls.find((x: any) => x.texto === t.texto)?.cor) || "#009AAC"; return <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: cor + "22", color: cor }}>{t.texto}</span>; })}
            </div>
          ) : null}
        </div>
        <div>
          <div className="text-base font-bold" style={{ color: "#014D5E" }}>{pet.name}</div>
          <div className="text-[11px] text-gray-500 mt-1">{speciesLabel(pet.species)}{linha2 ? ` · ${linha2}` : ""}</div>
          <div className="text-[11px] text-gray-500 mt-0.5"><b>Nascimento:</b> {fmt(pet.birthDate)}{pet.microchip ? <> · <b>Microchip:</b> {pet.microchip}</> : null}</div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: "#E7F6EF", color: "#0F6E56" }}>{statusL}</span>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          {pet.avatar ? <img src={pet.avatar} alt={pet.name} className="w-16 h-16 rounded-xl object-cover" /> : <div className="w-16 h-16 rounded-xl flex items-center justify-center" style={{ background: "#eef6f7" }}><PetIcon species={pet.species} size={30} /></div>}
        </div>
      </div>
    </div>
  );
}
