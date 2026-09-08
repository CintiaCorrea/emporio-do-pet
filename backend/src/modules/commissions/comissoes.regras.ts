// QUANDO A COMISSAO FECHA — regra pura.
//
// A Cintia, em 07/09/2026: "as comissoes fecham no dia 30 e quem confere e o adm."
//
// Parece uma linha e nao e: FEVEREIRO NAO TEM DIA 30. Um cron escrito como "todo dia 30" pula
// fevereiro inteiro — e ninguem descobre em fevereiro, descobre em marco, quando a comissao de
// um mes inteiro nao fechou. Por isso a regra e "dia 30, ou o ultimo dia do mes quando o mes
// acaba antes".

/** Quantos dias tem o mes desta data. */
export function diasDoMes(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/**
 * Hoje e dia de fechar a comissao?
 *
 * Dia 30 nos meses que tem 30 ou 31 dias; o ultimo dia nos que acabam antes (28 ou 29 em
 * fevereiro). Assim o fechamento acontece TODO mes, sem excecao silenciosa.
 */
export function ehDiaDeFecharComissao(d: Date): boolean {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
  const dia = d.getDate();
  const total = diasDoMes(d);
  return total >= 30 ? dia === 30 : dia === total;
}

/** O aviso do dia do fechamento — so faz sentido quando ha o que fechar. */
export function avisoDeFechamento(p: {
  pessoas: number;
  itens: number;
  comissao: number;
}): { titulo: string; mensagem: string } | null {
  const pessoas = Math.max(0, Number(p?.pessoas) || 0);
  const itens = Math.max(0, Number(p?.itens) || 0);
  const comissao = Number(p?.comissao) || 0;
  if (pessoas <= 0 || itens <= 0) return null;

  const brl = comissao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  return {
    titulo: 'Comissões do mês para conferir e fechar',
    mensagem: `${itens} ${itens === 1 ? 'item' : 'itens'} de ${pessoas} ${pessoas === 1 ? 'pessoa' : 'pessoas'}, somando ${brl}. O fechamento é seu — confira antes de fechar.`,
  };
}
