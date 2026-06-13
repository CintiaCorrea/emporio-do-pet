"use client";
import { confirmDelete } from "@/lib/ui/confirmDelete";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LuPlus, LuSearch, LuPencil, LuEye, LuTrash, LuX } from "react-icons/lu";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel, speciesKey, statusLabel, ageFromBirth } from "@/lib/pets/labels";

const ETAPA_BADGE = (v?: string | null) => {
  const s = (v || "").toLowerCase();
  if (s.includes("alta")) return { bg: "#E1F5EE", fg: "#0F6E56" };
  if (s.includes("abandon") || s.includes("pausa")) return { bg: "#FCEBEB", fg: "#A32D2D" };
  if (s.includes("aguard") || s.includes("retorno") || s.includes("reaval")) return { bg: "#FAEEDA", fg: "#854F0B" };
  if (s.includes("tratamento") || s.includes("andamento") || s.includes("sess") || s.includes("avalia")) return { bg: "#E6F1FB", fg: "#0C447C" };
  return { bg: "#F1EFE8", fg: "#5F5E5A" };
};

interface Pet {
  id: string;
  name: string;
  species: string;
  pipelineClinicoEtapa?: string | null;
  proximoFollowupAt?: string | null;
  breed?: string | null;
  status: string;
  gender?: string | null;
  birthDate?: string | null;
  avatar?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string; contacts?: { number: string; isPrimary?: boolean }[] };
  createdAt: string;
  updatedAt: string;
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

const SP_FILTERS = [
  { k: "ALL", label: "Todas" },
  { k: "CANINE", label: "Cães" },
  { k: "FELINE", label: "Gatos" },
  { k: "BIRD", label: "Pássaros" },
  { k: "RODENT", label: "Roedores" },
  { k: "REPTILE", label: "Répteis" },
  { k: "FISH", label: "Peixes" },
  { k: "OTHER", label: "Outros" },
];

const STATUS_FILTERS = [
  { k: "ALL", label: "Todos status" },
  { k: "ACTIVE", label: "Ativo" },
  { k: "INACTIVE", label: "Inativo" },
  { k: "DECEASED", label: "Falecido" },
  { k: "TRANSFERRED", label: "Transferido" },
];

function normStatusKey(s?: string | null): string {
  const k = (s || "").toLowerCase();
  if (k === "active" || k === "ativo") return "ACTIVE";
  if (k === "inactive" || k === "inativo") return "INACTIVE";
  if (k === "deceased" || k === "falecido") return "DECEASED";
  if (k === "transferred" || k === "transferido") return "TRANSFERRED";
  return s || "";
}

export default function PetsListPage() {
  usePageTitle("Pets", "Pacientes cadastrados");
  const [pets, setPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSpecies, setFilterSpecies] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();
  const [novoOpen, setNovoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoSpecies, setNovoSpecies] = useState("CANINE");
  const [novoTutorId, setNovoTutorId] = useState("");
  const [savingNovo, setSavingNovo] = useState(false);
  const [tutorsList, setTutorsList] = useState<any[]>([]);

  const handleCriarPet = async () => {
    if (!novoNome.trim()) { window.alert("Informe o nome do pet"); return; }
    if (!novoTutorId) { window.alert("Selecione o cliente (tutor)"); return; }
    setSavingNovo(true);
    try {
      const res = await fetch("/api/pets", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({ name: novoNome.trim(), species: novoSpecies, tutorId: novoTutorId }) });
      if (!res.ok) throw new Error(await res.text());
      const novo = await res.json();
      if (novo?.id) router.push(`/dashboard/erp/pets/${novo.id}`); else window.location.reload();
    } catch { window.alert("Não foi possível criar o pet. Tente novamente."); } finally { setSavingNovo(false); }
  };

  const handleDeletePet = async (pet: Pet) => {
    if (deletingId) return;
    const label = pet.name || "este pet";
    if (!(await confirmDelete({ entityLabel: "pet", itemName: label }))) return;
    setDeletingId(pet.id);
    try {
      const res = await fetch(`/api/pets/${pet.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setPets((prev) => prev.filter((x) => x.id !== pet.id));
    } catch (e) {
      console.error(e);
      window.alert("Nao foi possivel excluir o pet. Tente novamente.");
    } finally {
      setDeletingId(null);
    }
  };

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "500" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/pets?${params}`);
      const d = await safeJson<any>(res, { pets: [] });
      setPets(Array.isArray(d) ? d : (d.pets || []));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [search]);
  useEffect(() => { fetch(`/api/tutors?limit=500`).then(r => r.json()).then(d => setTutorsList(Array.isArray(d) ? d : (d.tutors || d.data || []))).catch(() => {}); }, []);

  const filtered = useMemo(() => {
    let arr = pets;
    if (filterSpecies !== "ALL") arr = arr.filter(p => speciesKey(p.species) === filterSpecies);
    if (filterStatus !== "ALL") arr = arr.filter(p => normStatusKey(p.status) === filterStatus);
    return arr;
  }, [pets, filterSpecies, filterStatus]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: pets.length };
    for (const p of pets) {
      const k = speciesKey(p.species);
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [pets]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-[#5b6470] mt-0.5">
            {counts.ALL || 0} pets · <span className="font-medium text-[#4d72a0]">{counts.CANINE || 0} cães</span> · <span className="font-medium text-[#0F6E56]">{counts.FELINE || 0} gatos</span> · <span className="font-medium text-[#5b6470]">{(counts.ALL || 0) - (counts.CANINE || 0) - (counts.FELINE || 0)} outros</span>
          </p>
        </div>
        <button onClick={() => { setNovoNome(""); setNovoSpecies("CANINE"); setNovoTutorId(""); setNovoOpen(true); }} className="bg-[#009AAC] text-white px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
          <LuPlus className="w-3.5 h-3.5" />Novo Pet
        </button>
      </header>

      <div className="flex gap-2 mb-3 flex-wrap">
        {SP_FILTERS.map(f => (
          <button key={f.k} onClick={() => setFilterSpecies(f.k)} className={`px-3.5 py-1.5 rounded-full text-xs font-medium ${filterSpecies === f.k ? "bg-[#009AAC] text-white" : "bg-white text-[#4d5a66] border border-[#cfd8e0]"}`}>
            {f.label}{f.k !== "ALL" && <span className={filterSpecies === f.k ? " opacity-90" : " text-gray-400"}> ({counts[f.k] || 0})</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-[200px]">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, raça, tutor..." className="w-full bg-white border border-[#d8d0bc] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#009AAC]" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-white border border-[#d8d0bc] rounded-lg px-3 py-2 text-sm text-[#4d5a66] focus:outline-none focus:border-[#009AAC]">
          {STATUS_FILTERS.map(s => <option key={s.k} value={s.k}>{s.label}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-[#d8d0bc] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F8F3E4] border-b border-[#d8d0bc] text-[11px] text-[#5b6470] font-medium">
              <th className="text-left py-2.5 px-3 w-8"></th>
              <th className="text-left py-2.5 px-3">Pet</th>
              <th className="text-left py-2.5 px-3 hidden md:table-cell">Tutor</th>
              <th className="text-left py-2.5 px-3 hidden md:table-cell">Espécie / Raça</th>
              <th className="text-left py-2.5 px-3 hidden lg:table-cell">Idade</th>
              <th className="text-left py-2.5 px-3 hidden lg:table-cell">Etapa (clínico)</th>
              <th className="text-right py-2.5 px-3 w-24">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-8 text-gray-400">Carregando...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Nenhum pet encontrado.</td></tr>
            )}
            {filtered.map(p => {
              const st = statusLabel(p.status);
              const etB = ETAPA_BADGE(p.pipelineClinicoEtapa);
              return (
                <tr key={p.id} className="border-b hover:bg-[#fdfaee] transition" style={{ borderColor: "#f0e8d4" }}>
                  <td className="px-3 py-2.5">
                    <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: st.dot }} title={st.label} />
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "#e6f6f8", color: "#009AAC" }}>
                        <PetIcon species={p.species} size={18} />
                      </div>
                      <div>
                        <Link href={`/dashboard/erp/pets/${p.id}`} className="font-medium hover:underline" style={{ color: "#0E2244" }}>
                          {p.name}
                        </Link>
                        {p.proximoFollowupAt && <div className="text-[10px] text-[#BA7517]">FU: {new Date(p.proximoFollowupAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell">
                    {p.tutor ? (
                      <Link href={`/dashboard/erp/tutores/${p.tutorId}`} className="text-gray-700 hover:underline">
                        {p.tutor.name}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2.5 hidden md:table-cell text-gray-700">
                    {speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}
                  </td>
                  <td className="px-3 py-2.5 hidden lg:table-cell text-gray-500">{ageFromBirth(p.birthDate)}</td>
                  <td className="px-3 py-2.5 hidden lg:table-cell">
                    {p.pipelineClinicoEtapa ? <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: etB.bg, color: etB.fg }}>{p.pipelineClinicoEtapa}</span> : <span className="text-xs text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link href={`/dashboard/erp/pets/${p.id}`} className="p-1 hover:bg-gray-200 rounded inline-block text-gray-600">
                      <LuEye size={14} />
                    </Link>
                    <Link href={`/dashboard/erp/pets/${p.id}`} className="p-1 hover:bg-gray-200 rounded inline-block ml-1 text-gray-600" title="Abrir ficha (edição inline)">
                      <LuPencil size={14} />
                    </Link>
                    <button type="button" onClick={() => handleDeletePet(p)} disabled={deletingId === p.id} title="Excluir pet" className="p-1 hover:bg-gray-200 rounded inline-block ml-1 text-gray-600 disabled:opacity-40">
                      <LuTrash size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {novoOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center pt-24" onClick={() => setNovoOpen(false)}>
          <div className="bg-white rounded-2xl p-5 w-[420px] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-medium" style={{ color: "#0E2244" }}>Novo Pet</h2>
              <button onClick={() => setNovoOpen(false)} className="text-gray-400 hover:text-gray-600"><LuX size={16} /></button>
            </div>
            <label className="text-[11px] text-gray-500">Nome *</label>
            <input autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do pet" className="w-full h-9 mt-0.5 mb-3 px-3 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8" }} />
            <label className="text-[11px] text-gray-500">Espécie *</label>
            <select value={novoSpecies} onChange={(e) => setNovoSpecies(e.target.value)} className="w-full h-9 mt-0.5 mb-3 px-3 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }}>
              {["CANINE", "FELINE", "BIRD", "RODENT", "REPTILE", "OTHER"].map(sp => <option key={sp} value={sp}>{speciesLabel(sp)}</option>)}
            </select>
            <label className="text-[11px] text-gray-500">Cliente (tutor) *</label>
            <select value={novoTutorId} onChange={(e) => setNovoTutorId(e.target.value)} className="w-full h-9 mt-0.5 px-3 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }}>
              <option value="">— selecionar —</option>
              {tutorsList.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setNovoOpen(false)} className="px-4 py-2 border rounded-lg text-sm" style={{ borderColor: "#E8DFC8", color: "#5b6470" }}>Cancelar</button>
              <button onClick={handleCriarPet} disabled={savingNovo} className="px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50" style={{ background: "#009AAC" }}>{savingNovo ? "Criando..." : "Criar e abrir ficha"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
