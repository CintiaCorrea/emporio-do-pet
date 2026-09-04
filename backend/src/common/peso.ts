// NUCLEO UNICO do PESO do animal.
//
// Existe porque em 04/09/2026 a Cintia encontrou o Snoopy (#7974), poodle de 11 anos,
// cadastrado com **8100 kg**. Alguem digitou 8,1 sem a virgula. O peso e digitado em
// CINCO telas diferentes e o servidor nao validava nada — aceitava qualquer numero.
//
// Isso deixou de ser detalhe: a partir da decisao de 04/09, diaria de internacao,
// medicacao e caucao passam a ser cobradas por FAIXA DE PESO. Com 8100 kg o Snoopy cai
// na faixa mais cara (Extra GG) e e cobrado errado, todas as vezes, para sempre.

/** Acima disto nao existe cao nem gato. O maior mastim do mundo nao passa de ~110 kg. */
export const PESO_MAX_KG = 120;

/** Abaixo disto nao existe filhote vivo (gatinho recem-nascido tem ~0,1 kg). */
export const PESO_MIN_KG = 0.05;

/** Piso das SUGESTOES de correcao — ver o comentario em sugestoesDeCorrecao. */
export const PESO_MIN_SUGESTAO_KG = 0.5;

/**
 * A partir daqui e quase certo que faltou a virgula. Nao BARRA (a trava dura e
 * PESO_MAX_KG), mas entra no relatorio de revisao.
 */
export const PESO_SUSPEITO_KG = 100;

/** O peso e possivel para um cao ou gato? Vazio/nulo conta como valido (campo opcional). */
export function pesoPlausivel(kg?: number | null): boolean {
  if (kg == null || kg === ('' as any)) return true;
  const n = Number(kg);
  if (!Number.isFinite(n)) return false;
  if (n === 0) return true; // 0 = "nao pesado ainda", usado pelo sistema
  return n >= PESO_MIN_KG && n <= PESO_MAX_KG;
}

/** A mensagem que a pessoa ve quando erra. Oferece as leituras possiveis do que digitou. */
export function avisoPesoInvalido(kg?: number | null): string {
  const n = Number(kg);
  const base = `Peso de ${n} kg nao e possivel para um cao ou gato (limite: ${PESO_MAX_KG} kg).`;
  const s = sugestoesDeCorrecao(n);
  if (!s.length) return `${base} Confira se a virgula foi digitada.`;
  const lista = s.map((v) => `${String(v).replace('.', ',')} kg`).join(' ou ');
  return `${base} Voce quis dizer ${lista}?`;
}

/**
 * Leituras possiveis de quem esqueceu a virgula (ou digitou em gramas), dividindo por
 * 10, 100 e 1000 e ficando com as que dao um peso possivel.
 *
 * Devolve TODAS, da menor pra maior — de proposito. 8100 pode ser 8,1 kg (gramas) ou
 * 81 kg (mastim), e o sistema NAO tem como saber qual. Chutar um so daria falsa certeza:
 * foi exatamente isso que o teste desta funcao pegou em 04/09/2026. Quem sabe o peso do
 * animal e quem esta com ele na frente — a tela pergunta em vez de decidir.
 */
export function sugestoesDeCorrecao(kg?: number | null): number[] {
  const n = Number(kg);
  if (!Number.isFinite(n) || n <= PESO_MAX_KG) return [];
  const out: number[] = [];
  for (const div of [1000, 100, 10]) {
    const v = Math.round((n / div) * 100) / 100;
    // Piso MAIOR que o da validacao, de proposito: 184 kg poderia ser lido como 0,184 kg
    // (184 gramas — um gatinho recem-nascido), mas como SUGESTAO isso e ruido. Quem cadastra
    // um recem-nascido digita o peso certo; quem erra a virgula quase sempre tem um animal
    // de meio quilo pra cima. O teste desta funcao pegou esse ruido em 04/09/2026.
    if (v >= PESO_MIN_SUGESTAO_KG && v <= PESO_MAX_KG && !out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

/** Entra no relatorio de revisao? Mais amplo que a trava: pega o que passou antes dela existir. */
export function pesoSuspeito(kg?: number | null): boolean {
  if (kg == null) return false;
  const n = Number(kg);
  if (!Number.isFinite(n) || n === 0) return false;
  return n > PESO_SUSPEITO_KG || (n > 0 && n < PESO_MIN_KG);
}
