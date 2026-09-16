// ── LIGAR UMA LINHA VENDIDA AO ITEM DO CATÁLOGO ───────────────────────────────────────────
//
// Cintia, 15/09/2026: "organize tudo de uma forma que eu possa arrumar sem perder tudo, e sem
// bagunçar o caixa, as vendas, orçamentos e os recebimentos".
//
// É a frase que desenha esta regra inteira. Ligar NÃO é editar a venda: a única coisa que muda
// na linha é de que item do catálogo ela é. Valor, quantidade, desconto, data, recebimento e
// caixa ficam byte a byte como estavam. É por isso que dá para arrumar setembro em produção,
// com o mês fechando, sem medo — e é por isso que a lista de campos permitidos existe aqui,
// escrita, em vez de estar só na cabeça de quem escreveu o serviço.

/** Os ÚNICOS campos que ligar pode escrever. Qualquer outro é edição de venda, e não é isto. */
export const CAMPOS_QUE_LIGAR_PODE_ESCREVER = ['catalogoItemId'] as const;

/**
 * Normaliza um nome para comparação.
 *
 * Sem acento, sem caixa, sem espaço dobrado. "CONSULTA - Dra Vivian" e "Consulta - Dra  Vivian"
 * são o mesmo item para quem trabalha no balcão, e precisam ser o mesmo item aqui — senão a
 * sugestão automática falha justamente nos nomes que a equipe digita de memória.
 */
export function nomeNormalizado(s?: string | null): string {
  return String(s ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * A SUGESTÃO É SÓ PARA NOME IDÊNTICO — de propósito.
 *
 * A tentação é casar por semelhança ("Fluidoterapia" com "Fluidoterapia até 10K"). Mas aqui um
 * palpite errado gruda a venda no item errado, e o erro fica invisível: o relatório passa a
 * mostrar um número plausível e falso, que é pior que o "Não classificado" honesto de hoje.
 *
 * Nome idêntico é o único caso em que a máquina sabe. O resto é a Cintia que escolhe.
 */
export function sugerirVinculo(
  descricao: string | null | undefined,
  catalogo: Array<{ id: string; nome: string }>,
): { id: string; nome: string } | null {
  const alvo = nomeNormalizado(descricao);
  if (!alvo) return null;
  const iguais = catalogo.filter((c) => nomeNormalizado(c.nome) === alvo);
  // DOIS cadastros com o mesmo nome: não há sugestão. Escolher um dos dois no escuro é
  // exatamente o erro que a etiqueta "nome repetido" veio denunciar.
  return iguais.length === 1 ? { id: iguais[0].id, nome: iguais[0].nome } : null;
}

/**
 * O QUANTO DO DINHEIRO JÁ ESTÁ CLASSIFICADO — o número que mede esta arrumação.
 *
 * Cintia: "me oriente como fazer para ficar mensurável". É este: a fração do faturamento que
 * sai em linha ligada ao catálogo. Em 15/09/2026 estava em 28%. Abaixo de 95% em regime
 * significa que voltou a entrar item solto em algum lugar — e aí se procura ONDE, em vez de
 * descobrir três meses depois que o relatório não fecha.
 */
export function percentualClassificado(linhas: Array<{ catalogoItemId?: string | null; valorTotal?: number | null }>): number {
  let total = 0, comVinculo = 0;
  for (const l of linhas) {
    const v = Number(l.valorTotal || 0);
    total += v;
    if (String(l.catalogoItemId || '').trim()) comVinculo += v;
  }
  if (total <= 0) return 100;   // período sem venda não está "mal classificado"
  return Math.round((comVinculo / total) * 1000) / 10;
}
