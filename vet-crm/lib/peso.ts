// NUCLEO UNICO do PESO no front — espelho de backend/src/common/peso.ts.
//
// Vive nos dois lados de proposito: a TELA avisa antes, com a mensagem certa e sem
// esperar a viagem ao servidor; o SERVIDOR garante, porque tela pode ser contornada.
// Mesmo padrao do caixa (lib/caixaAtual <-> caixa.regras).
//
// Existe porque o Snoopy (#7974), poodle, estava cadastrado com 8100 kg — 8,1 digitado
// sem a virgula. O peso e digitado em CINCO telas. E, desde 04/09/2026, diaria de
// internacao, medicacao e caucao sao cobradas por FAIXA DE PESO: peso errado passou a
// ser cobranca errada, todas as vezes.

export const PESO_MAX_KG = 120;
export const PESO_MIN_KG = 0.05;
/** Piso das SUGESTOES — abaixo disso a sugestao vira ruido (ver sugestoesDeCorrecao). */
export const PESO_MIN_SUGESTAO_KG = 0.5;

/** Aceita "8,1" e "8.1". Devolve null quando o campo esta vazio. */
export function lerPeso(texto: unknown): number | null {
  const t = String(texto ?? '').trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** O peso e possivel para um cao ou gato? Vazio e zero passam (campo opcional). */
export function pesoPlausivel(kg?: number | null): boolean {
  if (kg == null) return true;
  if (!Number.isFinite(kg)) return false;
  if (kg === 0) return true;
  return kg >= PESO_MIN_KG && kg <= PESO_MAX_KG;
}

/**
 * Leituras possiveis de quem esqueceu a virgula (ou digitou em gramas).
 * Devolve TODAS, da menor pra maior: 8100 pode ser 8,1 kg ou 81 kg, e o sistema NAO
 * tem como saber qual. Quem sabe e quem esta com o animal na frente.
 */
export function sugestoesDeCorrecao(kg?: number | null): number[] {
  if (kg == null || !Number.isFinite(kg) || kg <= PESO_MAX_KG) return [];
  const out: number[] = [];
  for (const div of [1000, 100, 10]) {
    const v = Math.round((kg / div) * 100) / 100;
    if (v >= PESO_MIN_SUGESTAO_KG && v <= PESO_MAX_KG && !out.includes(v)) out.push(v);
  }
  return out.sort((a, b) => a - b);
}

const comVirgula = (v: number) => String(v).replace('.', ',');

/**
 * A mensagem que a pessoa ve. Devolve null quando o peso esta certo.
 * Use no submit: `const erro = erroDoPeso(campo); if (erro) { toast.error(erro); return; }`
 */
export function erroDoPeso(texto: unknown): string | null {
  const n = lerPeso(texto);
  if (n === null) return null;
  if (Number.isNaN(n)) return 'Peso inválido. Escreva só o número, como 8,1.';
  if (n < 0) return 'O peso não pode ser negativo.';
  if (pesoPlausivel(n)) return null;

  if (n > PESO_MAX_KG) {
    const s = sugestoesDeCorrecao(n);
    const base = `${comVirgula(n)} kg não é possível para um cão ou gato.`;
    return s.length
      ? `${base} Você quis dizer ${s.map((v) => `${comVirgula(v)} kg`).join(' ou ')}?`
      : `${base} Confira se a vírgula foi digitada.`;
  }
  return `${comVirgula(n)} kg é menos que um filhote recém-nascido. Confira o número.`;
}
