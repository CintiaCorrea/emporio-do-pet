// QUANTO A PESSOA QUIS DIZER COM O QUE ELA DIGITOU.
//
// Cintia, 15/09/2026: "não está permitindo lançar os centavos nas baixas do caixa".
//
// O defeito era pior do que não aceitar: o campo era ligado ao NÚMERO enquanto se digitava.
// Ao teclar "12," o sistema convertia para 12 e reescrevia o campo — a vírgula sumia. Quem
// digitava "12,50" terminava com 125, e não com 12,50. Um recebimento de doze reais e cinquenta
// virava cento e vinte e cinco sem ninguém ver o momento em que mudou.
//
// Esta função é o que o campo consulta, e é pura para poder ser testada: dinheiro digitado
// errado não pode depender de alguém clicar na tela para descobrir.

/**
 * Converte o texto digitado num valor em reais.
 *
 * Aceita o que a pessoa realmente digita: vírgula ou ponto como decimal, ponto como separador de
 * milhar, "R$", espaços. Texto sem número nenhum devolve 0.
 *
 * A REGRA DO ÚLTIMO SEPARADOR: em "1.234,56" e em "1,234.56" o último símbolo é o decimal. É o
 * que distingue mil reais de um real e vinte e três centavos — e errar isto é errar por mil.
 */
export function valorDigitado(texto: unknown): number {
  const cru = String(texto ?? '').trim();
  if (!cru) return 0;

  // Só dígitos, separadores e o sinal. "R$ 1.234,56" vira "1.234,56".
  const limpo = cru.replace(/[^\d.,-]/g, '');
  if (!limpo || !/\d/.test(limpo)) return 0;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  const corte = Math.max(ultimaVirgula, ultimoPonto);

  let numero: string;
  if (corte < 0) {
    numero = limpo;                                   // "1234"
  } else {
    const inteiro = limpo.slice(0, corte).replace(/[.,]/g, '');
    const decimal = limpo.slice(corte + 1).replace(/[.,]/g, '');
    // Separador com 3 dígitos depois e nenhum outro separador antes é MILHAR, não decimal:
    // "1.234" é mil duzentos e trinta e quatro, não um real e vinte e três.
    const ehMilhar = decimal.length === 3 && !/[.,]/.test(limpo.slice(0, corte));
    numero = ehMilhar ? `${inteiro}${decimal}` : `${inteiro}.${decimal}`;
  }

  const v = Number(numero);
  return Number.isFinite(v) ? v : 0;
}

/** O texto que fica no campo quando ninguém está digitando nele. Vazio para zero. */
export function valorParaCampo(v: number): string {
  return v ? Number(v).toFixed(2).replace('.', ',') : '';
}
