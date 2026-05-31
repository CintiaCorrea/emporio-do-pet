"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LuPlus, LuSearch, LuPencil, LuTrash, LuEye, LuUpload } from "react-icons/lu";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  status: "ACTIVE" | "DECEASED" | "TRANSFERRED" | "INACTIVE";
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string; phone?: string };
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, { label: string; dot: string }> = {
  ACTIVE: { label: "Ativo", dot: "#22C55E" },
  INACTIVE: { label: "Inativo", dot: "#94A3B8" },
  DECEASED: { label: "Falecido", dot: "#6B7280" },
  TRANSFERRED: { label: "Transferido", dot: "#F59E0B" },
};

const SPECIES_LABEL: Record<string, string> = {
  CANINE: "Cão",
  FELINE: "Gato",
  BIRD: "Pássaro",
  RODENT: "Roedor",
  REPTILE: "Réptil",
  FISH: "Peixe",
  OTHER: "Outro",
};

function ageFromBirth(b?: string | null): string {
  if (!b) return "—";
  const d = new Date(b);
  const now = new Date();
  let anos = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) anos--;
  if (anos < 1) {
    const meses = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
    return `${Math.max(0, meses)} mes${meses !== 1 ? "es" : ""}`;
  }
  return `${anos} ano${anos !== 1 ? "s" : ""}`;
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

export default function PetsListPage() {
  usePageTitle("Pets", "Pacientes cadastrados");
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSpecies, setFilterSpecies] = useState<"ALL" | string>("ALL");
  const [filterStatus, setFilterStatus] = useState<"ALL" | string>("ACTIVE");

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "200" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/pets?${params}`);
      const d = await safeJson<any>(res, { pets: [] });
      setPets(Array.isArray(d) ? d : (d.pets || []));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);

  const filtered = useMemo(() => {
    let arr = pets;
    if (filterSpecies !== "ALL") arr = arr.filter(p => p.species === filterSpecies);
    if (filterStatus !== "ALL") arr = arr.filter(p => p.status === filterStatus);
    return arr;
  }, [pets, filterSpecies, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: pets.length };
    for (const p of pets) c[p.species] = (c[p.species] || 0) + 1;
    return c;
  }, [pets]);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 pt-4 flex items-center justify-between gap-3">
        <div className="text-xs text-gray-500">{filtered.length} de {pets.length} pets</div>
        <div className="relative flex-1 max-w-md mx-3">
          <LuSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, raça, tutor..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: "#E8DFC8" }}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: "#E8DFC8" }}
          >
            <option value="ALL">Todos status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Link
            href="/dashboard/erp/pets/novo"
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 text-white"
            style={{ background: "#009AAC" }}
          >
            <LuPlus size={14} /> Novo Pet
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
          <table className="w-full text-sm">
            <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 w-8"></th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500">Pet</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Tutor</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden md:table-cell">Espécie / Raça</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden lg:table-cell">Idade</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 hidden lg:table-cell">Status</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-500 w-24">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum pet encontrado.</td></tr>
              )}
              {filtered.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50/60 transition" style={{ borderColor: "#F0EBE0" }}>
                  <td className="px-4 py-2.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: STATUS_LABEL[p.status]?.dot || "#94A3B8" }}
                      title={STATUS_LABEL[p.status]?.label}
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#e6f6f8", color: "#009AAC" }}>
                        <PetIcon species={p.species} size={18} />
                      </div>
                      <Link href={`/dashboard/erp/pets/${p.id}`} className="font-medium hover:underline" style={{ color: "#0E2244" }}>
                        {p.name}
                      </Link>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell">
                    {p.tutor ? (
                      <Link href={`/dashboard/erp/tutores/${p.tutorId}`} className="text-gray-700 hover:underline">
                        {p.tutor.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-700">
                    {SPECIES_LABEL[p.species] || p.species}{p.breed ? ` · ${p.breed}` : ""}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500">{ageFromBirth(p.birthDate)}</td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className="text-xs">{STATUS_LABEL[p.status]?.label || p.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <Link href={`/dashboard/erp/pets/${p.id}`} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600">
                      <LuEye size={14} />
                    </Link>
                    <Link href={`/dashboard/erp/pets/${p.id}/editar`} className="p-1 hover:bg-gray-200 rounded inline-block ml-1 text-gray-600">
                      <LuPencil size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">ESPÉCIES</div>
          <div className="flex items-center gap-2 flex-wrap">
            {(["ALL", "CANINE", "FELINE", "BIRD", "RODENT", "REPTILE", "FISH", "OTHER"] as const).map(k => (
              <button
                key={k}
                onClick={() => setFilterSpecies(k)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border"
                style={{
                  borderColor: filterSpecies === k ? "#009AAC" : "#E8DFC8",
                  background: filterSpecies === k ? "#E0F4F6" : "white",
                  color: filterSpecies === k ? "#009AAC" : "#4B5563",
                }}
              >
                {k === "ALL" ? "Todas" : SPECIES_LABEL[k]} <span className="text-gray-400">({counts[k] || 0})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
