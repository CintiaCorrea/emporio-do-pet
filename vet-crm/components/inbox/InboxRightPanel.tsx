"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LuSearch, LuUser, LuPhone, LuPlus, LuExternalLink, LuChevronRight, LuCake,
} from "react-icons/lu";
import PetIcon from "@/components/profile/PetIcon";
import { speciesLabel, ageFromBirth } from "@/lib/pets/labels";

interface Contact { id: string; number: string; isPrimary?: boolean; isWhatsApp?: boolean; }
interface Tutor {
  id: string; name: string; email?: string | null; cpf?: string | null;
  contacts?: Contact[];
  pets?: Pet[];
}
interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  birthDate?: string | null; observations?: string | null; avatar?: string | null;
}
interface Atendimento {
  id: string; date: string; type: string; status: string; description?: string | null;
  diagnosis?: string | null; chiefComplaint?: string | null; value?: number;
}

const TYPE_LABEL: Record<string, string> = {
  CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação",
  EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação",
  CIRURGIA: "Cirurgia", SESSAO_FISIO: "Sessão Fisio", OUTRO: "Outro",
};

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function InboxRightPanel() {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Tutor[]>([]);
  const [searching, setSearching] = useState(false);
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);

  // Buscar com debounce
  useEffect(() => {
    if (!search || search.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      const res = await fetch(`/api/tutors?search=${encodeURIComponent(search)}&limit=10`);
      const d = await safeJson<any>(res, {});
      const arr = Array.isArray(d) ? d : (d.tutors || d.data || []);
      setResults(arr);
      setSearching(false);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  async function selectTutor(t: Tutor) {
    setTutor(t);
    setResults([]);
    setSearch(t.name);
    // Buscar pets completos do tutor
    const res = await fetch(`/api/tutors/${t.id}/pets`);
    const d = await safeJson<any>(res, []);
    const list = Array.isArray(d) ? d : (d.pets || []);
    setPets(list);
    // Auto-selecionar primeiro pet
    if (list[0]) selectPet(list[0]);
    else { setSelectedPet(null); setAtendimentos([]); }
  }

  async function selectPet(p: Pet) {
    setSelectedPet(p);
    const res = await fetch(`/api/atendimentos?petId=${p.id}&limit=5`);
    const d = await safeJson<any>(res, {});
    const arr = Array.isArray(d) ? d : (d.appointments || d.atendimentos || []);
    arr.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAtendimentos(arr.slice(0, 5));
  }

  function reset() {
    setSearch(""); setTutor(null); setResults([]); setPets([]); setSelectedPet(null); setAtendimentos([]);
  }

  const tutorPhone = tutor?.contacts?.find(c => c.isWhatsApp)?.number || tutor?.contacts?.find(c => c.isPrimary)?.number || tutor?.contacts?.[0]?.number;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Busca */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">Contexto da conversa</div>
        <div className="relative">
          <LuSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); if (!e.target.value) reset(); }}
            placeholder="Telefone, nome ou email..."
            className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-white"
            style={{ borderColor: "#E8DFC8" }}
          />
          {/* Resultados em dropdown */}
          {results.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 bg-white border rounded-lg shadow-lg z-30 max-h-72 overflow-y-auto"
                 style={{ borderColor: "#E8DFC8" }}>
              {results.map(r => {
                const phone = r.contacts?.find(c => c.isPrimary)?.number || r.contacts?.[0]?.number || "";
                return (
                  <button
                    key={r.id}
                    onClick={() => selectTutor(r)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b last:border-b-0"
                    style={{ borderColor: "#F0EBE0" }}
                  >
                    <div className="text-sm text-[#014D5E] font-medium">{r.name}</div>
                    <div className="text-[11px] text-gray-500 flex items-center gap-2">
                      {phone && <span>📞 {phone}</span>}
                      {r.pets && r.pets.length > 0 && <span>🐾 {r.pets.length}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {searching && <div className="text-[10.5px] text-gray-400 mt-1">Buscando...</div>}
      </div>

      {!tutor && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-4xl mb-2">💬</div>
          <div className="text-sm text-gray-600 font-medium">Selecione um tutor</div>
          <div className="text-xs text-gray-400 mt-1 leading-relaxed">
            Copie o telefone do contato no BotConversa e cole no campo acima — o contexto do cliente e do pet aparece aqui.
          </div>
        </div>
      )}

      {tutor && (
        <div className="flex-1 overflow-y-auto">
          {/* Bloco Tutor */}
          <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase">Tutor</div>
              <Link href={`/dashboard/erp/tutores/${tutor.id}`} target="_blank" className="text-[10.5px] flex items-center gap-1" style={{ color: "#009AAC" }}>
                Ficha <LuExternalLink size={10} />
              </Link>
            </div>
            <div className="flex items-start gap-2.5">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#009AAC] to-[#014D5E] text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                {((tutor.name.split(/\s+/)[0]?.[0] || "") + (tutor.name.split(/\s+/)[1]?.[0] || "")).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#014D5E] truncate">{tutor.name}</div>
                {tutorPhone && <div className="text-[11px] text-gray-500 flex items-center gap-1"><LuPhone size={10} /> {tutorPhone}</div>}
                {tutor.email && <div className="text-[11px] text-gray-500 truncate">{tutor.email}</div>}
              </div>
            </div>
          </section>

          {/* Bloco Pets do Tutor */}
          {pets.length > 0 && (
            <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
              <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase mb-1.5">
                Pets ({pets.length}) · clique pra selecionar
              </div>
              <div className="flex flex-col gap-1.5">
                {pets.map(p => {
                  const active = selectedPet?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => selectPet(p)}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition"
                      style={{
                        background: active ? "#e0f4f6" : "transparent",
                        border: "1px solid",
                        borderColor: active ? "#009AAC" : "#F0EBE0",
                      }}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: active ? "#009AAC" : "#e6f6f8", color: active ? "white" : "#009AAC" }}>
                        <PetIcon species={p.species} size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium" style={{ color: "#014D5E" }}>{p.name}</div>
                        <div className="text-[10.5px] text-gray-500">{speciesLabel(p.species)}{p.breed ? ` · ${p.breed}` : ""}{p.birthDate ? ` · ${ageFromBirth(p.birthDate)}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Bloco Pet selecionado: ações + observações */}
          {selectedPet && (
            <>
              <section className="px-3 py-3 border-b" style={{ borderColor: "#E8DFC8" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase">{selectedPet.name}</div>
                  <Link href={`/dashboard/erp/pets/${selectedPet.id}`} target="_blank" className="text-[10.5px] flex items-center gap-1" style={{ color: "#009AAC" }}>
                    Ficha <LuExternalLink size={10} />
                  </Link>
                </div>
                {selectedPet.observations && (
                  <div className="rounded-md px-2 py-1.5 text-[11px] mb-2" style={{ background: "#fffbeb", color: "#92611a", border: "1px solid #fde68a" }}>
                    💭 {selectedPet.observations}
                  </div>
                )}
                <div className="flex flex-col gap-1.5">
                  <Link
                    href={`/dashboard/erp/pets/${selectedPet.id}/atendimentos/novo`}
                    target="_blank"
                    className="w-full px-3 py-2 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1.5"
                    style={{ background: "#009AAC" }}
                  >
                    <LuPlus size={12} /> Novo Atendimento
                  </Link>
                  <Link
                    href={`/dashboard/erp/pets/${selectedPet.id}`}
                    target="_blank"
                    className="w-full px-3 py-2 rounded-lg text-xs border flex items-center justify-center gap-1.5 text-gray-600"
                    style={{ borderColor: "#E8DFC8" }}
                  >
                    Ver ficha do pet <LuExternalLink size={10} />
                  </Link>
                </div>
              </section>

              {/* Últimos atendimentos */}
              <section className="px-3 py-3">
                <div className="text-[10.5px] font-bold tracking-wide text-gray-500 uppercase mb-2">
                  Últimos atendimentos ({atendimentos.length})
                </div>
                {atendimentos.length === 0 ? (
                  <div className="text-[11px] text-gray-400 text-center py-3">Nenhum atendimento ainda</div>
                ) : (
                  <div className="space-y-1.5">
                    {atendimentos.map(a => (
                      <Link
                        key={a.id}
                        href={`/dashboard/erp/atendimentos/${a.id}`}
                        target="_blank"
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition border"
                        style={{ borderColor: "#F0EBE0" }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-[11px] font-semibold" style={{ color: "#014D5E" }}>
                            {TYPE_LABEL[a.type] || a.type} <span className="text-gray-400 font-normal">· {fmtDate(a.date)}</span>
                          </div>
                          <div className="text-[10.5px] text-gray-500 truncate">
                            {a.description || a.diagnosis || a.chiefComplaint || "—"}
                          </div>
                        </div>
                        <LuChevronRight size={11} className="text-gray-400 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}
    </div>
  );
}
