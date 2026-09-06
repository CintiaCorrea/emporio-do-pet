// 🔍 NÚCLEO ÚNICO DA BUSCA DE ITENS (produto, serviço, exame, pacote).
//
// A Cintia, em 06/09/2026: "Outro problema que temos enfrentado é localizar serviços e
// produtos quando digitamos a venda, muitas vezes não aparece. Pode checar?"
//
// O que existia em TODAS as telas de venda era esta linha, copiada sete vezes:
//
//     servicos.filter((s) => s.nome.toLowerCase().includes(q)).slice(0, 12)
//
// Ela falha de três jeitos, e os três acontecem o dia inteiro na recepção:
//
//  1. ACENTO. Quem digita rápido não põe acento. "antirrabica" não acha "Antirrábica",
//     "solucao" não acha "Solução", "medicacao" não acha "Medicação". O item existe, está
//     ativo, tem preço — e não aparece.
//
//  2. ORDEM DAS PALAVRAS. `includes` exige o trecho inteiro, colado e na ordem. Digitar
//     "fisio pl" não acha "06 - PL Fisio". "amoxicilina clavulanato" não acha
//     "Amoxicilina + Clavulanato 500mg". E boa parte do catálogo começa por número
//     ("06 - ", "10 - "), então quem procura pelo nome nunca chega no começo do texto.
//
//  3. O CORTE MUDO. Só 12 resultados apareciam, sem dizer que havia mais. Digitar "vacina"
//     com 30 vacinas no catálogo escondia 18 delas — e a tela não avisava nada.
//
// O resultado de fora era sempre o mesmo: "o sistema não acha". Não era o sistema estar
// lento, nem o item não existir. Era a busca.
//
// Aqui a busca passa a ser UMA função, com teste, usada por toda tela que vende.

/** Tira acento, caixa e espaço sobrando. "Solução Fisiológica" → "solucao fisiologica". */
export function normalizar(texto: unknown): string {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Os pedaços que a pessoa digitou. "amox 500 " → ["amox", "500"] */
export function termosDaBusca(q: unknown): string[] {
  return normalizar(q).split(" ").filter(Boolean);
}

/**
 * Nota de 0 a 100 de quanto o texto casa com o que foi digitado — ou 0 quando não casa.
 *
 * Regra: TODOS os pedaços digitados precisam aparecer, em qualquer ordem. A ordem só
 * decide quem sobe na lista:
 *   100 · o nome começa com o que foi digitado         ("acepran" → "Acepran 2mg")
 *    80 · algum pedaço começa uma palavra do nome      ("fisio"   → "06 - PL Fisio")
 *    60 · aparece no meio de uma palavra               ("epran"   → "Acepran")
 */
export function nota(texto: unknown, termos: string[]): number {
  if (!termos.length) return 0;
  const alvo = normalizar(texto);
  if (!alvo) return 0;

  let melhor = 0;
  for (const t of termos) {
    const i = alvo.indexOf(t);
    if (i < 0) return 0;                                    // faltou um pedaço → não casa
    const inicioDePalavra = i === 0 || alvo[i - 1] === " " || /[^a-z0-9]/.test(alvo[i - 1]);
    const pontos = i === 0 ? 100 : inicioDePalavra ? 80 : 60;
    if (pontos > melhor) melhor = pontos;
  }
  return melhor;
}

export type ResultadoBusca<T> = {
  /** O que mostrar na lista, já ordenado e cortado no limite. */
  itens: T[];
  /** Quantos casaram no total — inclusive os que não couberam. */
  total: number;
  /** Quantos ficaram de fora do limite. Zero quando coube tudo. */
  escondidos: number;
};

/**
 * Busca no catálogo. Usa esta função em TODA tela que vende — é o que garante que a
 * recepção ache a mesma coisa no ponto de venda, no orçamento, na comanda do pet e na
 * internação.
 *
 * @param nomeDe  como tirar o texto de cada item (nem toda tela chama o campo de "nome":
 *                produto do catálogo antigo usa "name")
 */
export function buscarItens<T>(
  itens: readonly T[],
  q: unknown,
  nomeDe: (item: T) => unknown,
  limite = 40,
): ResultadoBusca<T> {
  const termos = termosDaBusca(q);
  if (!termos.length) return { itens: [], total: 0, escondidos: 0 };

  const casaram: { item: T; n: number; nome: string }[] = [];
  for (const item of itens) {
    const texto = nomeDe(item);
    const n = nota(texto, termos);
    if (n > 0) casaram.push({ item, n, nome: normalizar(texto) });
  }

  // Melhor nota primeiro; empatou, o nome mais curto (é o mais específico); empatou de
  // novo, ordem alfabética — pra lista não dançar entre uma digitada e outra.
  casaram.sort((a, b) => b.n - a.n || a.nome.length - b.nome.length || a.nome.localeCompare(b.nome, "pt-BR"));

  return {
    itens: casaram.slice(0, limite).map((c) => c.item),
    total: casaram.length,
    escondidos: Math.max(0, casaram.length - limite),
  };
}

/** O aviso de rodapé da lista, ou vazio quando coube tudo. */
export function avisoDeCorte(r: { escondidos: number }): string {
  return r.escondidos > 0 ? `+${r.escondidos} não cabem na lista — digite mais uma palavra` : "";
}
