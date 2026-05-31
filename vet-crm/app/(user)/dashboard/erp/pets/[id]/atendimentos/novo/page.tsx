"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { LuArrowLeft, LuSave, LuStethoscope, LuClipboardList, LuActivity, LuPill, LuFlaskConical, LuCalendar, LuDollarSign } from "react-icons/lu";
import toast from "react-hot-toast";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel } from "@/lib/pets/labels";

interface Pet {
  id: string; name: string; species: string; breed?: string | null;
  tutorId: string;
  tutor?: { id: string; name: string };
}

interface Profissional { id: string; name: string; }

const TYPES = [
  { v: "CONSULTA", label: "Consulta" },
  { v: "RETORNO", label: "Retorno" },
  { v: "AVALIACAO", label: "Avaliação" },
  { v: "EMERGENCIA", label: "Emergência" },
  { v: "PROCEDIMENTO", label: "Procedimento" },
  { v: "VACINACAO", label: "Vacinação" },
  { v: "CIRURGIA", label: "Cirurgia" },
  { v: "SESSAO_FISIO", label: "Sessão de Fisioterapia" },
  { v: "OUTRO", label: "Outro" },
];
const STATUS = [
  { v: "SCHEDULED", label: "Agendado" },
  { v: "IN_PROGRESS", label: "Em andamento" },
  { v: "COMPLETED", label: "Realizado" },
  { v: "MISSED", label: "Faltou" },
  { v: "CANCELED", label: "Cancelado" },
];
const PAYMENT_METHODS = [
  "Dinheiro", "PIX", "Cartão Crédito", "Cartão Débito", "Transferência", "Pacote", "Cortesia", "Pendente",
];

async function safeJson<T>(res: Response, fb: T): Promise<T> {
  try { if (!res.ok) return fb; const d = await res.json(); return d == null ? fb : d; } catch { return fb; }
}

export default function NovoAtendimentoPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const petId = params?.id as string;

  const [pet, setPet] = useState<Pet | null>(null);
  const [vets, setVets] = useState<Profissional[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    type: "CONSULTA",
    status: "COMPLETED",
    date: new Date().toISOString().slice(0, 16), // datetime-local
    duration: 30,
    userId: "", // vet
    description: "",
    chiefComplaint: "",
    anamnesis: "",
    physicalExam: "",
    diagnosis: "",
    conduct: "",
    prescription: "",
    examsRequested: "",
    followUpNotes: "",
    nextReturnDate: "",
    petWeight: "",
    temperature: "",
    value: "",
    paymentMethod: "",
    notes: "",
  });

  usePageTitle("Novo Atendimento", pet ? `${pet.name} · Tutor: ${pet.tutor?.name || ""}` : undefined);

  useEffect(() => {
    if (!petId) return;
    (async () => {
      const r1 = await fetch(`/api/pets/${petId}`);
      const p = await safeJson<Pet | null>(r1, null);
      setPet(p);
      // tentar puxar lista de vets
      const r2 = await fetch(`/api/users?role=VETERINARIAN&limit=100`).catch(() => null);
      const users = r2 ? await safeJson<any>(r2, []) : [];
      const list = Array.isArray(users) ? users : (users.users || users.data || []);
      setVets(list);
      // default vet = usuário logado se for veterinário
      if (session?.user?.id && session?.user?.role === "VETERINARIAN") {
        setForm(f => ({ ...f, userId: session.user.id! }));
      } else if (list[0]?.id) {
        setForm(f => ({ ...f, userId: list[0].id }));
      }
    })();
  }, [petId, session?.user?.id, session?.user?.role]);

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm({ ...form, [k]: v });
  }

  async function handleSave() {
    if (!pet) return;
    if (!form.userId) { toast.error("Selecione o veterinário responsável"); return; }
    if (!form.date) { toast.error("Defina a data e hora"); return; }

    setSaving(true);
    const payload: any = {
      tutorId: pet.tutorId,
      petId: pet.id,
      userId: form.userId,
      date: new Date(form.date).toISOString(),
      duration: Number(form.duration) || 30,
      type: form.type,
      status: form.status,
      description: form.description || null,
      chiefComplaint: form.chiefComplaint || null,
      anamnesis: form.anamnesis || null,
      physicalExam: form.physicalExam || null,
      diagnosis: form.diagnosis || null,
      conduct: form.conduct || null,
      prescription: form.prescription || null,
      examsRequested: form.examsRequested || null,
      followUpNotes: form.followUpNotes || null,
      nextReturnDate: form.nextReturnDate ? new Date(form.nextReturnDate).toISOString() : null,
      petWeight: form.petWeight ? Number(form.petWeight) : null,
      temperature: form.temperature ? Number(form.temperature) : null,
      value: form.value ? Number(form.value) : 0,
      paymentMethod: form.paymentMethod || null,
      notes: form.notes || null,
    };
    try {
      const res = await fetch("/api/atendimentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(`Erro: ${err?.message || res.status}`);
        setSaving(false);
        return;
      }
      toast.success("Atendimento registrado");
      router.push(`/dashboard/erp/pets/${pet.id}`);
    } catch (e) {
      toast.error(`Erro: ${String(e)}`);
      setSaving(false);
    }
  }

  if (!pet) return <div className="p-10 text-center text-gray-400">Carregando...</div>;

  return (
    <div className="min-h-screen bg-white">
      {/* Topo */}
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href={`/dashboard/erp/pets/${pet.id}`} className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#e6f6f8", color: "#009AAC" }}>
            <PetIcon species={pet.species} size={22} />
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500">Pet: <strong className="text-[#0E2244]">{pet.name}</strong> · {speciesLabel(pet.species)} · Tutor: <strong className="text-[#0E2244]">{pet.tutor?.name}</strong></div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
            style={{ background: "#009AAC" }}
          >
            <LuSave size={14} /> {saving ? "Salvando..." : "Salvar Atendimento"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-5">
        {/* Seção: Cabeçalho do atendimento */}
        <Section title="Cabeçalho" Icon={LuClipboardList}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Tipo *">
              <select value={form.type} onChange={e => set("type", e.target.value)} className="input">
                {TYPES.map(t => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Data e hora *">
              <input type="datetime-local" value={form.date} onChange={e => set("date", e.target.value)} className="input" />
            </Field>
            <Field label="Duração (min)">
              <input type="number" min={5} step={5} value={form.duration} onChange={e => set("duration", Number(e.target.value) as any)} className="input" />
            </Field>
            <Field label="Veterinário *">
              <select value={form.userId} onChange={e => set("userId", e.target.value)} className="input">
                <option value="">Selecione...</option>
                {vets.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={e => set("status", e.target.value)} className="input">
                {STATUS.map(s => <option key={s.v} value={s.v}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Resumo (1 linha)">
              <input value={form.description} onChange={e => set("description", e.target.value)} placeholder="Ex: Avaliação dermatológica" className="input" />
            </Field>
          </div>
        </Section>

        {/* Seção: Anamnese e exame físico */}
        <Section title="Anamnese & exame físico" Icon={LuStethoscope}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Queixa principal" block>
              <textarea rows={2} value={form.chiefComplaint} onChange={e => set("chiefComplaint", e.target.value)} className="input" placeholder="O que motivou a consulta hoje" />
            </Field>
            <Field label="Anamnese" block>
              <textarea rows={4} value={form.anamnesis} onChange={e => set("anamnesis", e.target.value)} className="input" placeholder="Histórico relatado pelo tutor" />
            </Field>
            <Field label="Exame físico" block>
              <textarea rows={4} value={form.physicalExam} onChange={e => set("physicalExam", e.target.value)} className="input" placeholder="Achados do exame realizado" />
            </Field>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3">
            <Field label="Peso (kg)">
              <input type="number" step="0.01" min={0} value={form.petWeight} onChange={e => set("petWeight", e.target.value)} className="input" />
            </Field>
            <Field label="Temperatura (ºC)">
              <input type="number" step="0.1" value={form.temperature} onChange={e => set("temperature", e.target.value)} className="input" />
            </Field>
          </div>
        </Section>

        {/* Seção: Diagnóstico e conduta */}
        <Section title="Diagnóstico & conduta" Icon={LuActivity}>
          <div className="grid grid-cols-1 gap-3">
            <Field label="Diagnóstico" block>
              <textarea rows={2} value={form.diagnosis} onChange={e => set("diagnosis", e.target.value)} className="input" />
            </Field>
            <Field label="Conduta / tratamento" block>
              <textarea rows={3} value={form.conduct} onChange={e => set("conduct", e.target.value)} className="input" />
            </Field>
          </div>
        </Section>

        {/* Seção: Prescrição e exames */}
        <Section title="Prescrição & exames solicitados" Icon={LuPill}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Prescrição" block>
              <textarea rows={4} value={form.prescription} onChange={e => set("prescription", e.target.value)} className="input" placeholder="Medicamentos, doses, frequência" />
            </Field>
            <Field label="Exames solicitados" block>
              <textarea rows={4} value={form.examsRequested} onChange={e => set("examsRequested", e.target.value)} className="input" placeholder="Lista de exames pedidos neste atendimento" />
            </Field>
          </div>
        </Section>

        {/* Seção: Próximo passo */}
        <Section title="Próximo passo" Icon={LuCalendar}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Acompanhamento (o que a recepção vai perguntar no próximo toque)" block>
              <textarea rows={3} value={form.followUpNotes} onChange={e => set("followUpNotes", e.target.value)} className="input" placeholder="Ex: confirmar se a urina voltou ao normal, se a tosse diminuiu" />
            </Field>
            <Field label="Data sugerida do próximo retorno">
              <input type="date" value={form.nextReturnDate} onChange={e => set("nextReturnDate", e.target.value)} className="input" />
            </Field>
          </div>
        </Section>

        {/* Seção: Cobrança */}
        <Section title="Cobrança" Icon={LuDollarSign}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Field label="Valor total (R$)">
              <input type="number" step="0.01" min={0} value={form.value} onChange={e => set("value", e.target.value)} className="input" />
            </Field>
            <Field label="Forma de pagamento">
              <select value={form.paymentMethod} onChange={e => set("paymentMethod", e.target.value)} className="input">
                <option value="">Selecione...</option>
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Observações administrativas (privado)" block>
            <textarea rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} className="input" />
          </Field>
        </Section>

        <div className="flex items-center justify-end gap-2 pt-2 pb-8">
          <Link href={`/dashboard/erp/pets/${pet.id}`} className="px-4 py-2 rounded-lg text-sm border" style={{ borderColor: "#E8DFC8" }}>Cancelar</Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center gap-2 disabled:opacity-60"
            style={{ background: "#009AAC" }}
          >
            <LuSave size={14} /> {saving ? "Salvando..." : "Salvar Atendimento"}
          </button>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #E8DFC8;
          border-radius: 8px;
          font-size: 14px;
          background: white;
          outline: none;
          color: #1e293b;
        }
        .input:focus { border-color: #009AAC; }
      `}</style>
    </div>
  );
}

function Section({ title, Icon, children }: { title: string; Icon?: any; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5" style={{ borderColor: "#E8DFC8" }}>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "#014D5E" }}>
        {Icon && <Icon size={15} />} {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children, block }: { label: string; children: React.ReactNode; block?: boolean }) {
  return (
    <div className={block ? "md:col-span-2" : ""}>
      <label className="block text-[11px] text-gray-500 mb-1 font-medium">{label}</label>
      {children}
    </div>
  );
}
