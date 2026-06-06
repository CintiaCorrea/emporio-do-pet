"use client";
/* ─────────────────────────────────────────────────────────────
   EMPÓRIO DO PET · versão Cintia + Claude (Cowork)   [EMP-COWORK]
   Tela........: Ficha do Pet  (pets/[id])
   Atualizado..: 06/06/2026 — Cintia + Claude
   ✔ Salvar SEMPRE no main (é a versão que publica).
   ✔ Backup periódico ativo (GitHub Action diária).
   ⚠ NÃO sobrescrever por "Add files via upload".
     Toda mudança = commit pequeno e direto. Em dúvida, perguntar.
   ───────────────────────────────────────────────────────────── */

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft, LuPencil, LuTrash, LuPlus, LuFlaskConical,
  LuPackage, LuMessageSquare, LuShare2, LuTag, LuClock,
} from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import PetProfilePanel from "@/components/profile/PetProfilePanel";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel, ageFromBirth, genderLabel } from "@/lib/pets/labels";

interface Pet {
  id: string;
  name: string;
  species: string;
  breed?: string | null;
  status: string;
  gender?: string | null;
  sterilization?: string | null;
  birthDate?: string | null;
  coat?: string | null;
  coatColor?: string | null;
  weight?: number | null;
  microchip?: string | null;
  avatar?: string | null;
  observations?: string | null;
  allergies?: string[];
  medicalNotes?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string; contacts?: { number: string; isPrimary?: boolean; isWhatsApp?: boolean }[] };
  createdAt: string;
  _count?: { appointments: number; treatments: number };
}

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"CLINICA" | "PACOTES" | "EXAMES">("CLINICA");
  const [delOpen, setDelOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);

  usePageTitle(pet ? pet.name : "Pet", pet?.tutor ? `Tutor: ${pet.tutor.name}` : undefined);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/pets/${petId}`);
    const d = await safeJson<Pet | null>(res, null);
    setPet(d);
    setLoading(false);
  }
  useEffect(() => { if (petId) load(); /* eslint-disable-next-line */ }, [petId]);

  async function handleDelete() {
    const res = await fetch(`/api/pets/${petId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Pet removido");
      router.push("/dashboard/erp/pets");
    } else {
      toast.error("Erro ao remover");
    }
    setDelOpen(false);
  }

  async function handleEncaminhar() {
    const destino = window.prompt("Encaminhar este pet para quem? (vet, recepção, admin)");
    if (!destino || !destino.trim()) return;
    try {
      const r = await fetch("/api/interacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ petId: params.id, tipo: "ENCAMINHAMENTO", texto: `Pet encaminhado para: ${destino.trim()}`, canal: "Sistema" }),
      });
      if (!r.ok) throw new Error(String(r.status));
      toast.success(`Encaminhado para ${destino.trim()}`);
    } catch {
      toast.error("Erro ao encaminhar");
    }
  }

  const tutorWhats = useMemo(() => {
    if (!pet?.tutor?.contacts) return null;
    const wa = pet.tutor.contacts.find(c => c.isWhatsApp) || pet.tutor.contacts.find(c => c.isPrimary) || pet.tutor.contacts[0];
    return wa?.number || null;
  }, [pet]);

  if (loading) {
    return <div className="p-10 text-center text-gray-400">Carregando ficha...</div>;
  }
  if (!pet) {
    return (
      <div className="p-10 text-center">
        <div className="text-gray-700 font-semibold mb-2">Pet não encontrado</div>
        <Link href="/dashboard/erp/pets" className="text-sm" style={{ color: "#009AAC" }}>← Voltar para lista</Link>
      </div>
    );
  }

  const pipelineClinico = "Em tratamento"; // TODO: backend campo real
  const pipelineFisio = "—";

  return (
    <div className="min-h-screen bg-white">
      {/* Top bar */}
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard/erp/pets" className="p-2 rounded-lg hover:bg-gray-100">
            <LuArrowLeft size={18} />
          </Link>
          <div className="flex-1 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "#e6f6f8", color: "#009AAC" }}>
              {pet.avatar ? <img src={pet.avatar} alt={pet.name} className="w-12 h-12 rounded-full object-cover" /> : <PetIcon species={pet.species} size={28} />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold" style={{ color: "#014D5E" }}>{pet.name}</h2>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#eef2f4", color: "#64748b" }}>
                  {speciesLabel(pet.species)}
                </span>
                {pet.birthDate && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#eef2f4", color: "#64748b" }}>
                    {ageFromBirth(pet.birthDate)}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: "#fef3c7", color: "#92400e" }}>
                  {pipelineClinico}
                </span>
              </div>
              {pet.tutor && (
                <div className="text-xs text-gray-500 mt-0.5">
                  Tutor: <Link href={`/dashboard/erp/tutores/${pet.tutorId}`} className="hover:underline" style={{ color: "#009AAC" }}>{pet.tutor.name}</Link>
                  {tutorWhats && <span> · {tutorWhats}</span>}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tutorWhats && (
              <a
                href={`https://wa.me/${tutorWhats.replace(/\D/g, "")}`}
                target="_blank" rel="noopener"
                className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
                style={{ borderColor: "#22C55E", color: "#16a34a" }}
              >
                <LuMessageSquare size={14} /> WhatsApp
              </a>
            )}
            <button
              onClick={handleEncaminhar}
              className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
              style={{ borderColor: "#E8DFC8", color: "#475569" }}
            >
              <LuShare2 size={14} /> Encaminhar
            </button>
            <Link
              href={`/dashboard/erp/pets/${pet.id}/editar`}
              className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
              style={{ borderColor: "#E8DFC8", color: "#475569" }}
            >
              <LuPencil size={14} /> Editar
            </Link>
            <button
              onClick={() => setDelOpen(true)}
              className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
              style={{ borderColor: "#fecaca", color: "#ef4444" }}
            >
              <LuTrash size={14} /> Excluir
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          {/* Magia da recepção */}
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92611a" }}>
            <span className="font-semibold">💭 Sobre {pet.name}:</span> {pet.observations || <span className="italic opacity-70">Adicionar algo que vale lembrar sobre o pet — apelido, comportamento, medo, preferência (até 140 caracteres).</span>}
          </div>

          {/* Etiquetas */}
          <div className="bg-white border rounded-xl p-4" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#0E2244" }}>
                <LuTag size={14} /> Etiquetas
              </h3>
              <button
                onClick={() => setTagsOpen(o => !o)}
                className="text-xs flex items-center gap-1"
                style={{ color: "#009AAC" }}
              >
                <LuPlus size={12} /> Adicionar
              </button>
            </div>
            <div className="text-sm text-gray-400">
              Sem etiquetas. Use pra agrupar pets por temperamento, restrição, dieta, etc.
            </div>
            {tagsOpen && (
              <div className="mt-3 pt-3 border-t flex items-center gap-2" style={{ borderColor: "#F0EBE0" }}>
                <select className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white" style={{ borderColor: "#E8DFC8" }} disabled>
                  <option>Selecionar etiqueta... (em breve)</option>
                </select>
                <button className="px-3 py-1.5 rounded-lg text-xs text-white" style={{ background: "#009AAC" }} disabled>+</button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="bg-white border rounded-xl overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex border-b" style={{ borderColor: "#E8DFC8" }}>
              {(
                [
                  { k: "CLINICA", label: "Clínica" },
                  { k: "PACOTES", label: "Pacotes" },
                  { k: "EXAMES", label: "Exames" },
                ] as const
              ).map(t => (
                <button
                  key={t.k}
                  onClick={() => setTab(t.k)}
                  className="flex-1 px-4 py-3 text-sm font-medium border-b-2 transition"
                  style={{
                    borderColor: tab === t.k ? "#009AAC" : "transparent",
                    color: tab === t.k ? "#009AAC" : "#6B7280",
                    background: tab === t.k ? "#f6fdfd" : "transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "CLINICA" && (
              <div className="p-5 space-y-5">
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Dados Clínicos</h3>
                    <Link href={`/dashboard/erp/pets/${pet.id}/editar`} className="text-xs flex items-center gap-1" style={{ color: "#009AAC" }}>
                      <LuPencil size={12} /> Editar
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                    <Field label="Espécie" value={speciesLabel(pet.species)} />
                    <Field label="Raça" value={pet.breed} />
                    <Field label="Sexo" value={genderLabel(pet.gender)} />
                    <Field label="Esterilização" value={
                      !pet.sterilization ? "—" :
                      pet.sterilization.toLowerCase().includes("steril") || pet.sterilization.toLowerCase().includes("castr") ? "Sim" :
                      pet.sterilization.toLowerCase().includes("not") ? "Não" :
                      pet.sterilization
                    } />
                    <Field label="Idade" value={ageFromBirth(pet.birthDate)} />
                    <Field label="Peso" value={pet.weight ? `${pet.weight} kg` : null} />
                    <Field label="Pelagem" value={pet.coat} />
                    <Field label="Cor" value={pet.coatColor} />
                    <Field label="Microchip" value={pet.microchip} />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#0E2244" }}>Pipelines do Pet</h3>
                  <div className="border rounded-xl divide-y" style={{ borderColor: "#E8DFC8" }}>
                    <PipelineRow label="CLÍNICO — TRATAMENTO" stage={pipelineClinico} />
                    <PipelineRow label="FISIOTERAPIA — PACOTE" stage={pipelineFisio} muted />
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: "#0E2244" }}>
                    <LuClock size={14} /> Cadência de acompanhamento
                  </h3>
                  <div className="border rounded-xl p-4 flex items-center justify-between" style={{ borderColor: "#E8DFC8" }}>
                    <span className="text-sm text-gray-400">Nenhuma cadência ativa.</span>
                    <button className="px-3 py-1.5 rounded-lg text-xs border flex items-center gap-1.5" style={{ borderColor: "#E8DFC8", color: "#009AAC" }} disabled>
                      <LuPlus size={12} /> Iniciar cadência
                    </button>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold mb-2" style={{ color: "#0E2244" }}>Alergias e medicações</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <Field label="Alergias" value={pet.allergies?.length ? pet.allergies.join(", ") : null} />
                    <Field label="Notas médicas" value={pet.medicalNotes} block />
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Histórico de Atendimentos</h3>
                    <Link href={`/dashboard/erp/agendamentos/novo?petId=${pet.id}`} className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>
                      <LuPlus size={12} /> Novo Atendimento
                    </Link>
                  </div>
                  <div className="border rounded-xl p-5 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>
                    {pet._count?.appointments ? `${pet._count.appointments} consultas registradas.` : "Nenhum atendimento registrado."}
                  </div>
                </section>
              </div>
            )}

            {tab === "PACOTES" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Pacotes de Sessões de {pet.name}</h3>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>
                    <LuPackage size={12} /> Criar Pacote
                  </button>
                </div>
                <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>
                  Nenhum pacote criado ainda.
                  <div className="mt-2">
                    <button className="px-3 py-1.5 rounded-lg text-xs border" style={{ borderColor: "#E8DFC8", color: "#009AAC" }}>
                      + Criar primeiro pacote
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "EXAMES" && (
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold" style={{ color: "#0E2244" }}>Exames e Serviços Externos</h3>
                  <button className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5" style={{ background: "#009AAC" }}>
                    <LuFlaskConical size={12} /> Solicitar
                  </button>
                </div>
                <div className="border rounded-xl p-6 text-center text-sm text-gray-400" style={{ borderColor: "#E8DFC8" }}>
                  Nenhum exame ou serviço externo registrado.
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="flex items-center gap-3 pt-2">
            <Link
              href={`/dashboard/erp/pets/${pet.id}/editar`}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm border flex items-center justify-center gap-2"
              style={{ borderColor: "#E8DFC8", color: "#475569" }}
            >
              <LuPencil size={14} /> Editar Dados
            </Link>
            <Link
              href={`/dashboard/erp/tutores/${pet.tutorId}`}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm border flex items-center justify-center gap-2"
              style={{ borderColor: "#E8DFC8", color: "#475569" }}
            >
              Ficha do Tutor <LuArrowLeft size={14} className="rotate-180" />
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <PetProfilePanel petId={pet.id} />
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={delOpen}
        entityLabel="Pet"
        itemName={pet.name}
        consequenceText="Os atendimentos e tratamentos vinculados também serão removidos."
        onConfirm={handleDelete}
        onClose={() => setDelOpen(false)}
      />
    </div>
  );
}

function Field({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  return (
    <div className={block ? "md:col-span-2" : ""}>
      <div className="text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{label}</div>
      <div className="text-gray-700">{value || <span className="text-gray-300">—</span>}</div>
    </div>
  );
}

function PipelineRow({ label, stage, muted }: { label: string; stage: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50/60 transition cursor-pointer">
      <div className="font-semibold text-xs tracking-wide" style={{ color: muted ? "#94a3b8" : "#0E2244" }}>{label}</div>
      <div className="flex items-center gap-2">
        <span
          className="px-2 py-0.5 rounded-md text-[11px] font-medium"
          style={{
            background: muted ? "#f1f5f7" : "#fef3c7",
            color: muted ? "#94a3b8" : "#92400e",
          }}
        >
          {stage}
        </span>
        <LuArrowLeft size={14} className="rotate-180 text-gray-400" />
      </div>
    </div>
  );
}
