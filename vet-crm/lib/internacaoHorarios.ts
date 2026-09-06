// NUCLEO UNICO dos HORARIOS da internacao — "a que horas isto tem de ser feito?"
//
// Vale para os dois usos, que sao a mesma conta:
//   - PRESCRICAO: a que horas o remedio e aplicado
//   - AFERICAO:   de quanto em quanto tempo os parametros sao medidos
//
// Isto decide ALERTA CLINICO. Alerta que nao dispara na hora certa e pior do que alerta
// nenhum, porque a equipe confia nele. Por isso saiu de dentro da tela e ganhou teste.
//
// O QUE MUDOU EM 05/09/2026. A Cintia: "em alguns casos precisamos monitorar alguns
// parametros de tempo em tempo e gostaria de estipular esse tempo tipo (1 hora, 15 minutos)".
//
// A conta antiga so entendia HORAS — a expressao era /(\d+)\s*\/?\s*\d*\s*h/i e o passo do
// laco era `h * 60`. "15 minutos" nao casava com nada, virava 0, e o sistema simplesmente
// nao gerava horario nenhum: sem erro, sem aviso, sem alerta. Paciente grave que precisava
// de aferição de 15 em 15 minutos ficava sem lembrete.
//
// Agora a conta e em MINUTOS, e "8/8h" continua sendo 480 minutos como sempre foi.

/** Quantos minutos entre uma vez e a proxima. 0 = sem intervalo fixo ("se necessario"). */
export function minutosDaFrequencia(frequencia: string): number {
  const t = String(frequencia || '').toLowerCase().trim();
  if (!t) return 0;
  // "se necessario", "SOS", "continua" — nao tem hora marcada, e de proposito.
  if (/(s\.?o\.?s|se necess|quando necess|cont[ií]nu|livre demanda)/.test(t)) return 0;

  // MINUTOS primeiro: "15 min", "30min", "de 20 em 20 minutos", "20/20min".
  let m = /(\d+)\s*(?:\/\s*\d+\s*)?m(?:in|inutos?)?\b/.exec(t);
  if (m) return parseInt(m[1], 10);
  m = /de\s*(\d+)\s*em\s*\d+\s*m(?:in|inutos?)?/.exec(t);
  if (m) return parseInt(m[1], 10);

  // HORAS: "8/8h", "24h (1x ao dia)", "de 6 em 6 horas", "1 hora", "12 h".
  m = /de\s*(\d+)\s*em\s*\d+\s*h/.exec(t);
  if (m) return parseInt(m[1], 10) * 60;
  m = /(\d+)\s*(?:\/\s*\d+\s*)?h(?:oras?|s)?\b/.exec(t);
  if (m) return parseInt(m[1], 10) * 60;

  // "1x ao dia", "2x ao dia" — divide o dia em partes iguais.
  m = /(\d+)\s*x\s*(?:ao|por)?\s*dia/.exec(t);
  if (m) { const n = parseInt(m[1], 10); return n > 0 ? Math.round(1440 / n) : 0; }

  return 0;
}

/** Compatibilidade com o que a tela usava. Frequência em minutos vira fração de hora. */
export function horasDaFrequencia(frequencia: string): number {
  return minutosDaFrequencia(frequencia) / 60;
}

/** "06:00" → minutos desde a meia-noite. `null` quando não é hora válida. */
export function minutosDoHorario(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = parseInt(m[1], 10), min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

const hhmm = (min: number) =>
  `${String(Math.floor((min % 1440) / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Teto de horários por dia. De 15 em 15 minutos dá 96 — que e legitimo num paciente grave.
 * O teto existe pra um engano de digitacao ("1 minuto") nao gerar 1.440 alertas e travar a
 * tela; a partir dele, a frequência é tratada como monitoramento contínuo (sem hora marcada).
 */
export const MAX_HORARIOS_DIA = 96;

/**
 * Os horários de um dia, a partir da primeira vez.
 *
 * "06:00" + "8/8h"   → 06:00, 14:00, 22:00
 * "06:00" + "15 min" → 06:00, 06:15, 06:30, ... (96 no dia)
 *
 * Devolve lista vazia quando não dá pra calcular — sem primeira hora, sem intervalo, ou
 * intervalo tão curto que passa do teto.
 */
export function calcularHorarios(primeira: string, frequencia: string): string[] {
  const passo = minutosDaFrequencia(frequencia);
  const ini = minutosDoHorario(primeira);
  if (passo <= 0 || ini == null) return [];
  if (1440 / passo > MAX_HORARIOS_DIA) return [];
  const out: string[] = [];
  for (let t = 0; t < 1440; t += passo) out.push(hhmm(ini + t));
  return out;
}

// ── PRESCRIÇÃO PONTUAL ───────────────────────────────────────────────────────────────
//
// A Cintia, em 05/09/2026: "algumas prescrições são pontuais, elas não têm recorrência.
// Talvez pudéssemos resolver isso colocando frequência e período".
//
// Antes toda prescrição repetia todo dia, para sempre, enquanto a internação existisse. Uma
// dose única de contraste antes do exame virava alerta todo dia — e alerta que a equipe
// aprende a ignorar deixa de proteger o paciente.

/** Por quanto tempo a prescrição vale. */
export type PeriodoPrescricao =
  | { tipo: 'UNICA' }                       // uma vez só, e acabou
  | { tipo: 'DIAS'; dias: number }          // por N dias a partir da primeira
  | { tipo: 'INTERNACAO' };                 // enquanto o animal estiver internado

export const PERIODOS: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: 'UNICA', rotulo: 'Dose única', ajuda: 'Aplica uma vez e não repete' },
  { valor: 'DIAS', rotulo: 'Por alguns dias', ajuda: 'Repete pelos dias que você definir' },
  { valor: 'INTERNACAO', rotulo: 'Enquanto internado', ajuda: 'Repete todo dia até a alta' },
];

export type Prescricao = {
  primeira?: string;
  frequencia?: string;
  periodoTipo?: string;   // UNICA | DIAS | INTERNACAO (vazio = INTERNACAO, como era antes)
  periodoDias?: number;
};

/** Os horários de HOJE para esta prescrição. Dose única não tem recorrência nenhuma. */
export function horariosDaPrescricao(p: Prescricao): string[] {
  if ((p?.periodoTipo || 'INTERNACAO') === 'UNICA') {
    const ini = minutosDoHorario(p?.primeira || '');
    return ini == null ? [] : [hhmm(ini)];
  }
  return calcularHorarios(p?.primeira || '', p?.frequencia || '');
}

/**
 * A prescrição ainda vale neste dia?
 *
 * Dose única vale só no dia da primeira aplicação. "Por N dias" vale nos N dias a partir
 * dela. "Enquanto internado" vale sempre — era o único comportamento até 05/09/2026, e
 * continua sendo o padrão de quem não escolheu nada.
 */
export function prescricaoAtivaEm(
  p: Prescricao & { criadaEm?: string },
  dia: Date,
  admissao?: string,
): boolean {
  const tipo = p?.periodoTipo || 'INTERNACAO';
  if (tipo === 'INTERNACAO') return true;

  const inicioTxt = p?.criadaEm || admissao;
  if (!inicioTxt) return true; // sem saber quando começou, não esconde: sumir prescrição é pior
  const inicio = new Date(inicioTxt);
  if (Number.isNaN(inicio.getTime())) return true;

  const soDia = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diasPassados = Math.floor((soDia(dia) - soDia(inicio)) / 86_400_000);
  if (diasPassados < 0) return false;
  if (tipo === 'UNICA') return diasPassados === 0;
  return diasPassados < Math.max(1, Number(p?.periodoDias) || 1);
}

/** Como o período aparece escrito na lista de prescrições. */
export function rotuloDoPeriodo(p: Prescricao): string {
  const tipo = p?.periodoTipo || 'INTERNACAO';
  if (tipo === 'UNICA') return 'dose única';
  if (tipo === 'DIAS') { const n = Math.max(1, Number(p?.periodoDias) || 1); return `por ${n} dia${n > 1 ? 's' : ''}`; }
  return 'enquanto internado';
}
