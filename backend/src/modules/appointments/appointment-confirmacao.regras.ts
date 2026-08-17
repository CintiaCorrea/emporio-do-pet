// Regra PURA (blindada) de quais agendamentos podem receber/aceitar confirmação por WhatsApp.
// Um agendamento MORTO (cancelado, remarcado, concluído, bloqueado) NUNCA pode ser confirmado —
// senão ele "ressuscita" como duplicado do horário novo (bug da Margarida 12/08: 11:30 remarcado
// p/ 10:00 voltou confirmado). Usado pelo scheduler (não envia) e pelo listener (não aceita).

export const STATUS_NAO_CONFIRMAVEL = [
  'Cancelado', 'CANCELLED',
  'Remarcado', 'REMARCADO',
  'Concluído', 'CONCLUIDO', 'Realizado', 'NO_SHOW',
  'Bloqueada',
];

export function podeConfirmar(status?: string | null): boolean {
  return !STATUS_NAO_CONFIRMAVEL.includes(String(status || '').trim());
}
