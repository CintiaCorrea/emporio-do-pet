// REGRAS PURAS do financeiro — isoladas aqui pra serem TESTÁVEIS (blindagem contra regressão).
// Tudo em CENTAVOS (inteiros). O rateio "floor + última parcela absorve o resíduo" aparecia
// duplicado em pacotes e devolução — agora é um só (ratearCentavos), garantindo soma exata.

/** Rateia um total em N parcelas de centavos: N-1 iguais (floor) + a última absorve o resíduo.
 *  Garante que a soma das parcelas = total (sem perder/criar centavos). */
export function ratearCentavos(totalCent: number, n: number): number[] {
  const N = Math.max(1, Math.round(Number(n) || 1));
  const base = Math.floor(totalCent / N);
  return Array.from({ length: N }, (_, i) => (i < N - 1 ? base : totalCent - base * (N - 1)));
}

/** Competência (1º dia do mês, UTC) de uma data. */
export const competenciaMes = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

/** Data de expiração de um pacote a partir do início + validade (meses se a unidade casar /mes/i, senão dias). */
export function dataExpiracao(inicio: Date, vqtd: number, unidade: string | null | undefined): Date {
  const exp = new Date(inicio);
  if (/mes/i.test(String(unidade || ''))) exp.setMonth(exp.getMonth() + vqtd);
  else exp.setDate(exp.getDate() + vqtd); // padrão: Dias
  return exp;
}

/** DRE F2 — reconhecimento de receita de PACOTE. Difere 1/N por sessão; na expiração com sessões não
 *  usadas, o restante vira receita (breakage/quebra). Puro — espelha o que o recebimentos.service faz. */
export function reconhecimentoPacote(p: {
  valorCent: number; nSessoes: number; sessoesUsadas: number; expirado: boolean;
}): { reconhecidoAgora: number; diferido: number; breakage: number } {
  const parcelas = ratearCentavos(p.valorCent, p.nSessoes);
  const usados = Math.max(0, Math.min(Math.round(Number(p.sessoesUsadas) || 0), parcelas.length));
  const reconhecidoAgora = parcelas.slice(0, usados).reduce((s, v) => s + v, 0);
  const restante = parcelas.slice(usados).reduce((s, v) => s + v, 0);
  const breakage = p.expirado ? restante : 0;
  const diferido = p.valorCent - reconhecidoAgora - breakage;
  return { reconhecidoAgora, diferido, breakage };
}

/** DEVOLUÇÃO de venda — devolve o LÍQUIDO (bruto − taxa da operadora, que NÃO é estornada) e espelha
 *  em N parcelas. Puro — espelha o devolucao.service. Valores de entrada em REAIS; saída em centavos. */
export function calcDevolucao(input: { itensValor: number[]; taxaPct: number; parcelas: number }): {
  brutoCent: number; taxaCent: number; liquidoCent: number; N: number; parcelasCent: number[];
} {
  const brutoCent = input.itensValor.reduce((s, v) => s + Math.round((Number(v) || 0) * 100), 0);
  const taxaCent = Math.round(brutoCent * ((Number(input.taxaPct) || 0) / 100));
  const liquidoCent = brutoCent - taxaCent;
  const N = Math.max(1, Number(input.parcelas) || 1);
  const parcelasCent = ratearCentavos(liquidoCent, N);
  return { brutoCent, taxaCent, liquidoCent, N, parcelasCent };
}
