"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  LuArrowLeft, LuPencil, LuTrash, LuPlus, LuMessageSquare, LuChevronRight, LuEllipsisVertical, LuMail,
} from "react-icons/lu";
import toast from "react-hot-toast";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import { openWhatsAppMeta } from "@/lib/actions/whatsapp";
import { SendEmailModal } from "@/components/email/SendEmailModal";
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

interface Atendimento {
  id: string;
  type: string;
  status: string;
  date: string;
  description?: string | null;
  diagnosis?: string | null;
  chiefComplaint?: string | null;
  value: number;
  user?: { id: string; name: string };
}

const TYPE_LABEL: Record<string, string> = {
  CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação",
  EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação",
  CIRURGIA: "Cirurgia", SESSAO_FISIO: "Sessão de Fisioterapia", OUTRO: "Outro",
};
const STATUS_PILL: Record<string, { label: string; bg: string; color: string }> = {
  SCHEDULED: { label: "Agendado", bg: "#eef2f4", color: "#64748b" },
  IN_PROGRESS: { label: "Em andamento", bg: "#fef3c7", color: "#92400e" },
  COMPLETED: { label: "Realizado", bg: "#dcfce7", color: "#15803d" },
  MISSED: { label: "Faltou", bg: "#fee2e2", color: "#b91c1c" },
  CANCELED: { label: "Cancelado", bg: "#f1f5f9", color: "#475569" },
  CONFIRMED: { label: "Confirmado", bg: "#dbeafe", color: "#1e40af" },
};

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

function fmtDt(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function PetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [loadingPet, setLoadingPet] = useState(true);
  const [loadingAt, setLoadingAt] = useState(true);
  const [delOpen, setDelOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [delAtId, setDelAtId] = useState<string | null>(null);

  usePageTitle(pet ? pet.name : "Pet", pet?.tutor ? `Tutor: ${pet.tutor.name}` : undefined);

  async function loadPet() {
    setLoadingPet(true);
    const res = await fetch(`/api/pets/${petId}`);
    const d = await safeJson<Pet | null>(res, null);
    setPet(d);
    setLoadingPet(false);
  }
  async function loadAtendimentos() {
    setLoadingAt(true);
    const res = await fetch(`/api/atendimentos?petId=${petId}&limit=100`);
    const d = await safeJson<any>(res, { appointments: [] });
    const arr = Array.isArray(d) ? d : (d.appointments || d.atendimentos || d.data || []);
    // ordenar mais recentes primeiro
    arr.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAtendimentos(arr);
    setLoadingAt(false);
  }

  useEffect(() => {
    if (!petId) return;
    loadPet();
    loadAtendimentos();
    // eslint-disable-next-line
  }, [petId]);

  useEffect(() => {
    if (!openMenu) return;
    const close = () => setOpenMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openMenu]);

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

  async function handleDeleteAtendimento(id: string) {
    const res = await fetch(`/api/atendimentos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Atendimento removido");
      setAtendimentos(atendimentos.filter(a => a.id !== id));
    } else {
      toast.error("Erro ao remover");
    }
    setDelAtId(null);
  }

  const tutorWhats = pet?.tutor?.contacts?.find(c => c.isWhatsApp)?.number
    || pet?.tutor?.contacts?.find(c => c.isPrimary)?.number
    || pet?.tutor?.contacts?.[0]?.number || null;

  if (loadingPet) return <div className="p-10 text-center text-gray-400">Carregando ficha...</div>;
  if (!pet) {
    return (
      <div className="p-10 text-center">
        <div className="text-gray-700 font-semibold mb-2">Pet não encontrado</div>
        <Link href="/dashboard/erp/pets" className="text-sm" style={{ color: "#009AAC" }}>← Voltar para lista</Link>
      </div>
    );
  }

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
              <button
                onClick={() => openWhatsAppMeta(tutorWhats)}
                className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
                style={{ borderColor: "#22C55E", color: "#16a34a" }}
              >
                <LuMessageSquare size={14} /> WhatsApp
              </button>
            )}
            {pet.tutor?.email && (
              <button
                onClick={() => setEmailOpen(true)}
                className="px-3 py-1.5 rounded-lg text-sm border flex items-center gap-1.5"
                style={{ borderColor: "#E8DFC8", color: "#475569" }}
              >
                <LuMail size={14} /> Email
              </button>
            )}
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
            <span className="font-semibold">💭 Sobre {pet.name}:</span> {pet.observations || <span className="italic opacity-70">Adicionar algo que vale lembrar sobre o pet — apelido, comportamento, medo, preferência.</span>}
          </div>

          {/* Dados Clínicos */}
          <section className="bg-white border rounded-2xl p-5" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#014D5E" }}>Dados Clínicos</h3>
              <Link href={`/dashboard/erp/pets/${pet.id}/editar`} className="text-xs flex items-center gap-1" style={{ color: "#009AAC" }}>
                <LuPencil size={12} /> Editar
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
              <Field label="Espécie" value={speciesLabel(pet.species)} />
              <Field label="Raça" value={pet.breed} />
              <Field label="Sexo" value={genderLabel(pet.gender)} />
              <Field label="Idade" value={ageFromBirth(pet.birthDate)} />
              <Field label="Peso" value={pet.weight ? `${pet.weight} kg` : null} />
              <Field label="Pelagem" value={pet.coat} />
              <Field label="Cor" value={pet.coatColor} />
              <Field label="Microchip" value={pet.microchip} />
              <Field label="Esterilização" value={
                !pet.sterilization ? "—" :
                pet.sterilization.toLowerCase().includes("steril") || pet.sterilization.toLowerCase().includes("castr") ? "Sim" :
                pet.sterilization.toLowerCase().includes("not") ? "Não" :
                pet.sterilization
              } />
            </div>
            {(pet.allergies?.length || pet.medicalNotes) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t" style={{ borderColor: "#F0EBE0" }}>
                <Field label="Alergias" value={pet.allergies?.length ? pet.allergies.join(", ") : null} />
                <Field label="Notas médicas" value={pet.medicalNotes} block />
              </div>
            )}
          </section>

          {/* Histórico de Atendimentos */}
          <section className="bg-white border rounded-2xl p-5" style={{ borderColor: "#E8DFC8" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: "#014D5E" }}>Histórico de Atendimentos</h3>
              <Link
                href={`/dashboard/erp/pets/${pet.id}/atendimentos/novo`}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center gap-1.5"
                style={{ background: "#009AAC" }}
              >
                <LuPlus size={12} /> Novo Atendimento
              </Link>
            </div>
            {loadingAt ? (
              <div className="text-center py-6 text-sm text-gray-400">Carregando...</div>
            ) : atendimentos.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                Nenhum atendimento registrado ainda.
                <div className="mt-2">
                  <Link href={`/dashboard/erp/pets/${pet.id}/atendimentos/novo`} className="text-xs underline" style={{ color: "#009AAC" }}>
                    Registrar primeiro atendimento
                  </Link>
                </div>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#F0EBE0" }}>
                {atendimentos.map((a) => {
                  const st = STATUS_PILL[a.status] || { label: a.status, bg: "#eef2f4", color: "#64748b" };
                  const title = a.description || a.chiefComplaint || a.diagnosis || TYPE_LABEL[a.type] || a.type;
                  return (
                    <div key={a.id} className="flex items-center gap-3 py-3 hover:bg-gray-50/60 transition rounded-lg px-2 -mx-2 relative">
                      <Link href={`/dashboard/erp/atendimentos/${a.id}`} className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold tracking-wide" style={{ color: "#014D5E" }}>
                            {TYPE_LABEL[a.type] || a.type}
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium" style={{ background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                          {a.value > 0 && (
                            <span className="text-[10.5px] text-gray-500">R$ {Number(a.value).toFixed(2)}</span>
                          )}
                        </div>
                        <div className="text-sm text-gray-700 truncate mt-0.5">{title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">
                          {fmtDt(a.date)}{a.user?.name && ` · ${a.user.name}`}
                        </div>
                      </Link>
                      <Link href={`/dashboard/erp/atendimentos/${a.id}`} className="text-gray-400 hover:text-[#009AAC] flex-shrink-0">
                        <LuChevronRight size={16} />
                      </Link>
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === a.id ? null : a.id); }}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                          title="Mais ações"
                        >
                          <LuEllipsisVertical size={16} />
                        </button>
                        {openMenu === a.id && (
                          <div className="absolute right-0 top-7 w-44 bg-white border rounded-lg shadow-lg z-20 py-1" style={{ borderColor: "#E8DFC8" }}>
                            <Link
                              href={`/dashboard/erp/atendimentos/${a.id}`}
                              onClick={() => setOpenMenu(null)}
                              className="flex items-center gap-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-50"
                            >
                              Ver ficha
                            </Link>
                            <button
                              onClick={() => { setOpenMenu(null); setDelAtId(a.id); }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              <LuTrash size={12} /> Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Rodapé */}
          <div className="flex items-center gap-3 pt-2 pb-6">
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
        isOpen={!!delAtId}
        entityLabel="Atendimento"
        itemName={atendimentos.find(a => a.id === delAtId) ? (atendimentos.find(a => a.id === delAtId)!.description || TYPE_LABEL[atendimentos.find(a => a.id === delAtId)!.type] || "Atendimento") : "Atendimento"}
        consequenceText="Os itens (serviços/exames) vinculados também serão removidos."
        onConfirm={() => delAtId && handleDeleteAtendimento(delAtId)}
        onClose={() => setDelAtId(null)}
      />

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
