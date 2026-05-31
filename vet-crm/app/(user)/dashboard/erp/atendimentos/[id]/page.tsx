"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { LuArrowLeft, LuPencil, LuStethoscope, LuClipboardList, LuActivity, LuPill, LuCalendar, LuDollarSign } from "react-icons/lu";
import PetIcon from "@/components/profile/PetIcon";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { speciesLabel } from "@/lib/pets/labels";

interface AppointmentItem {
  id: string;
  servicoId?: string;
  descricao?: string | null;
  executorUserId?: string | null;
  fornecedorId?: string | null;
  quantidade: number;
  valorUnitario: number;
  custoUnitario: number;
  desconto: number;
  valorTotal: number;
  comissaoValor?: number | null;
  servico?: { id: string; nome: string };
  executorUser?: { id: string; name: string };
  fornecedor?: { id: string; nome: string };
}

interface Atendimento {
  id: string;
  type: string;
  status: string;
  date: string;
  duration: number;
  description?: string | null;
  notes?: string | null;
  value: number;
  paymentMethod?: string | null;
  chiefComplaint?: string | null;
  anamnesis?: string | null;
  physicalExam?: string | null;
  diagnosis?: string | null;
  conduct?: string | null;
  prescription?: string | null;
  examsRequested?: string | null;
  followUpNotes?: string | null;
  nextReturnDate?: string | null;
  petWeight?: number | null;
  temperature?: number | null;
  petId: string;
  tutorId: string;
  userId: string;
  pet?: { id: string; name: string; species: string };
  tutor?: { id: string; name: string };
  user?: { id: string; name: string };
  items?: AppointmentItem[];
}

const TYPE_LABEL: Record<string, string> = {
  CONSULTA: "Consulta", RETORNO: "Retorno", AVALIACAO: "Avaliação",
  EMERGENCIA: "Emergência", PROCEDIMENTO: "Procedimento", VACINACAO: "Vacinação",
  CIRURGIA: "Cirurgia", SESSAO_FISIO: "Sessão de Fisioterapia", OUTRO: "Outro",
};
const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
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
function fmtDate(s?: string | null) {
  if (!s) return "—";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

export default function AtendimentoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id as string;
  const [data, setData] = useState<Atendimento | null>(null);
  const [loading, setLoading] = useState(true);

  usePageTitle(data ? `Atendimento · ${TYPE_LABEL[data.type] || data.type}` : "Atendimento", data?.pet ? `${data.pet.name}` : undefined);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const res = await fetch(`/api/atendimentos/${id}`);
      const d = await safeJson<Atendimento | null>(res, null);
      setData(d);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="p-10 text-center text-gray-400">Carregando ficha...</div>;
  if (!data) return (
    <div className="p-10 text-center">
      <div className="text-gray-700 font-semibold mb-2">Atendimento não encontrado</div>
      <Link href="/dashboard/erp/pets" className="text-sm" style={{ color: "#009AAC" }}>← Voltar</Link>
    </div>
  );

  const st = STATUS_LABEL[data.status] || { label: data.status, bg: "#eef2f4", color: "#64748b" };

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b" style={{ borderColor: "#E8DFC8" }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-3">
          <Link href={`/dashboard/erp/pets/${data.petId}`} className="p-2 rounded-lg hover:bg-gray-100"><LuArrowLeft size={18} /></Link>
          {data.pet && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#e6f6f8", color: "#009AAC" }}>
              <PetIcon species={data.pet.species} size={22} />
            </div>
          )}
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold" style={{ color: "#014D5E" }}>{TYPE_LABEL[data.type] || data.type}</h2>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-medium" style={{ background: st.bg, color: st.color }}>{st.label}</span>
              <span className="text-xs text-gray-500">· {fmtDt(data.date)} · {data.duration}min</span>
            </div>
            {data.pet && data.tutor && (
              <div className="text-xs text-gray-500 mt-0.5">
                Pet: <Link href={`/dashboard/erp/pets/${data.petId}`} className="hover:underline" style={{ color: "#009AAC" }}>{data.pet.name}</Link>
                {" "}({speciesLabel(data.pet.species)}) · Tutor: <Link href={`/dashboard/erp/tutores/${data.tutorId}`} className="hover:underline" style={{ color: "#009AAC" }}>{data.tutor.name}</Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-5 space-y-4">
        {data.description && (
          <div className="rounded-xl border px-4 py-3 text-sm" style={{ background: "#f6fdfd", borderColor: "#bae6fd", color: "#0c4a6e" }}>
            <span className="font-semibold">Resumo: </span>{data.description}
          </div>
        )}

        <Section title="Cabeçalho" Icon={LuClipboardList}>
          <Grid cols={3}>
            <KV label="Tipo" value={TYPE_LABEL[data.type] || data.type} />
            <KV label="Veterinário" value={data.user?.name || "—"} />
            <KV label="Status" value={st.label} />
            <KV label="Data e hora" value={fmtDt(data.date)} />
            <KV label="Duração" value={`${data.duration} min`} />
            <KV label="Peso" value={data.petWeight ? `${data.petWeight} kg` : "—"} />
          </Grid>
        </Section>

        <Section title="Anamnese & exame físico" Icon={LuStethoscope}>
          <KV label="Queixa principal" value={data.chiefComplaint} block />
          <KV label="Anamnese" value={data.anamnesis} block />
          <KV label="Exame físico" value={data.physicalExam} block />
          <Grid cols={3}>
            <KV label="Peso (kg)" value={data.petWeight != null ? String(data.petWeight) : "—"} />
            <KV label="Temperatura (ºC)" value={data.temperature != null ? String(data.temperature) : "—"} />
          </Grid>
        </Section>

        <Section title="Diagnóstico & conduta" Icon={LuActivity}>
          <KV label="Diagnóstico" value={data.diagnosis} block />
          <KV label="Conduta / tratamento" value={data.conduct} block />
        </Section>

        <Section title="Prescrição & exames" Icon={LuPill}>
          <KV label="Prescrição" value={data.prescription} block />
          <KV label="Exames solicitados" value={data.examsRequested} block />
        </Section>

        <Section title="Próximo passo" Icon={LuCalendar}>
          <KV label="Acompanhamento (recepção)" value={data.followUpNotes} block />
          <KV label="Próximo retorno sugerido" value={fmtDate(data.nextReturnDate)} />
        </Section>

        {data.items && data.items.length > 0 && (
          <Section title="Serviços e Valores" Icon={LuDollarSign}>
            <div className="border rounded-lg overflow-hidden" style={{ borderColor: "#E8DFC8" }}>
              <table className="w-full text-sm">
                <thead className="border-b" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
                  <tr>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Serviço / descrição</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 w-16">Qtd</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">Valor</th>
                    <th className="text-left px-3 py-2 font-medium text-gray-500">Executado por</th>
                    <th className="text-right px-3 py-2 font-medium text-gray-500 w-24">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it) => (
                    <tr key={it.id} className="border-b" style={{ borderColor: "#F0EBE0" }}>
                      <td className="px-3 py-1.5 text-gray-700">{it.servico?.nome || it.descricao || "—"}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500">{it.quantidade}</td>
                      <td className="px-3 py-1.5 text-right text-gray-500 tabular-nums">R$ {Number(it.valorUnitario || 0).toFixed(2)}</td>
                      <td className="px-3 py-1.5 text-gray-500">{it.fornecedor?.nome || it.executorUser?.name || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums" style={{ color: "#014D5E" }}>R$ {Number(it.valorTotal || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t" style={{ background: "#FAFAFA", borderColor: "#E8DFC8" }}>
                  <tr>
                    <td colSpan={4} className="px-3 py-2 text-right text-xs font-medium text-gray-500">Total geral</td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color: "#014D5E" }}>
                      R$ {data.items.reduce((s, it) => s + (Number(it.valorTotal) || 0), 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Section>
        )}

        <Section title="Cobrança" Icon={LuDollarSign}>
          <Grid cols={3}>
            <KV label="Valor total" value={data.value ? `R$ ${Number(data.value).toFixed(2)}` : "—"} />
            <KV label="Forma de pagamento" value={data.paymentMethod} />
          </Grid>
          {data.notes && <KV label="Observações administrativas" value={data.notes} block />}
        </Section>

        <div className="flex items-center justify-end pb-8">
          <Link href={`/dashboard/erp/atendimentos/${data.id}/editar`} className="px-4 py-2 rounded-lg text-sm border flex items-center gap-2" style={{ borderColor: "#E8DFC8", color: "#475569" }}>
            <LuPencil size={14} /> Editar Atendimento
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, Icon, children }: { title: string; Icon?: any; children: React.ReactNode }) {
  return (
    <section className="bg-white border rounded-2xl p-5 space-y-3" style={{ borderColor: "#E8DFC8" }}>
      <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: "#014D5E" }}>
        {Icon && <Icon size={15} />} {title}
      </h3>
      {children}
    </section>
  );
}
function Grid({ cols = 2, children }: { cols?: 2 | 3; children: React.ReactNode }) {
  return <div className={`grid grid-cols-1 md:grid-cols-${cols} gap-3`}>{children}</div>;
}
function KV({ label, value, block }: { label: string; value?: string | number | null; block?: boolean }) {
  return (
    <div className={block ? "md:col-span-3" : ""}>
      <div className="text-[10.5px] uppercase tracking-wide text-gray-400 font-semibold mb-0.5">{label}</div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{value ? String(value) : <span className="text-gray-300">—</span>}</div>
    </div>
  );
}
