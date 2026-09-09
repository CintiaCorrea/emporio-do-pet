// A SITUAÇÃO DE UM ORÇAMENTO — uma escada de três degraus, com um nome só.
//
// A Cintia, em 09/09/2026, perguntando "qual a diferença entre vendido e fechado?" — e a
// resposta honesta era: nenhuma, eram duas palavras nossas para a mesma coisa, em duas telas
// diferentes. A tela de Orçamentos dizia "Virou venda"; a aba dentro da Consulta de vendas
// dizia "Vendido". Os vocabulários inteiros divergiam (Rascunho/Expirado de um lado,
// Em aberto/Vencido do outro).
//
// Ela definiu a escada: **em aberto → venda → recebido**.
//
//   · EM ABERTO   proposta feita, nada aconteceu ainda
//   · APROVADO    o cliente disse sim, mas ainda não virou venda
//   · VENCIDO     a validade passou e não virou venda
//   · VIROU VENDA foi para o caixa, e ainda não foi pago
//   · RECEBIDO    foi para o caixa E foi pago — é o "fechado" dela
//
// A ordem de precedência importa: um orçamento vencido que virou venda é VENDA, não vencido —
// o que aconteceu depois manda. E "recebido" só existe se a venda ligada tiver recebimento;
// sem isso, um orçamento convertido e não pago apareceria como concluído, e a recepção
// deixaria de cobrar.

// A VALIDADE E UMA DATA DE CALENDARIO, nao um instante. `new Date("2026-09-09")` e meia-noite
// em UTC, que aqui e 21h do dia 8 — e o orcamento aparecia vencido um dia antes. `diaCalendario`
// (lib/datas) existe exatamente para isso, e foi construida no mesmo bug com vacina e boletim.
import { diaCalendario } from '@/lib/datas';

export type ChaveSituacao = "ABERTO" | "APROVADO" | "VENCIDO" | "VENDA" | "RECEBIDO";

export type OrcamentoParaSituacao = {
  status?: string | null;
  validade?: string | Date | null;
  appointmentId?: string | null;
  /** A venda ligada, quando o servidor a traz — é dela que sai o "recebido". */
  appointment?: { value?: number | null; recebimentos?: { valorTotal?: number | null }[] | null } | null;
};

export const SITUACOES: Record<ChaveSituacao, { rotulo: string; bg: string; fg: string }> = {
  ABERTO: { rotulo: "Em aberto", bg: "#FEF3C7", fg: "#92400E" },
  APROVADO: { rotulo: "Aprovado", bg: "#E7F6EF", fg: "#0F6E56" },
  VENCIDO: { rotulo: "Vencido", bg: "#FBE6E6", fg: "#A32D2D" },
  VENDA: { rotulo: "Virou venda", bg: "#E0F4F6", fg: "#00707E" },
  RECEBIDO: { rotulo: "Recebido", bg: "#E6F1FB", fg: "#185FA5" },
};

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

/** O dia de hoje, zerado — para comparar validade sem a hora atrapalhar. */
function hojeZerado(agora: Date = new Date()): Date {
  const d = new Date(agora);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function situacaoDoOrcamento(o: OrcamentoParaSituacao | null | undefined, agora?: Date): ChaveSituacao {
  if (!o) return "ABERTO";

  if (o.appointmentId) {
    const ap = o.appointment;
    const valor = num(ap?.value);
    const pago = (ap?.recebimentos || []).reduce((s, r) => s + num(r?.valorTotal), 0);
    // Sem a venda carregada não dá para saber se foi pago — e chutar "recebido" faria a
    // recepção parar de cobrar. Na dúvida, VENDA: alguém confere.
    if (valor > 0 && pago >= valor - 0.005) return "RECEBIDO";
    return "VENDA";
  }

  const venc = diaCalendario(o.validade as any);
  if (venc) {
    const v = new Date(venc); v.setHours(0, 0, 0, 0);
    if (v < hojeZerado(agora)) return "VENCIDO";
  }

  if (String(o.status || "").toUpperCase() === "APROVADO") return "APROVADO";
  return "ABERTO";
}

/**
 * Ainda é orçamento? (não virou venda)
 *
 * É o que a lista mostra por padrão: "é para manter somente o que permaneceu orçamento"
 * (Cintia, 09/09/2026). O que virou venda continua acessível num filtro — some da lista do
 * dia a dia sem apagar a história, que é o que impede cobrar duas vezes.
 */
export function permaneceOrcamento(o: OrcamentoParaSituacao | null | undefined, agora?: Date): boolean {
  const s = situacaoDoOrcamento(o, agora);
  return s !== "VENDA" && s !== "RECEBIDO";
}

/** "vence em 3 dias" / "venceu há 5 dias" — o que a recepção precisa para priorizar. */
export function prazoDoOrcamento(validade?: string | Date | null, agora?: Date): string {
  const v = diaCalendario(validade as any);
  if (!v) return "sem validade";
  v.setHours(0, 0, 0, 0);
  const dias = Math.round((v.getTime() - hojeZerado(agora).getTime()) / 86400000);
  if (dias === 0) return "vence hoje";
  return dias > 0
    ? `vence em ${dias} dia${dias > 1 ? "s" : ""}`
    : `venceu há ${-dias} dia${-dias > 1 ? "s" : ""}`;
}
