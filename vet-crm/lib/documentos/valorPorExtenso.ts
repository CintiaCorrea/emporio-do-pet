// VALOR POR EXTENSO — o recibo pede (Cintia, 17/09/2026). Fica separado e com teste porque é
// conta de dinheiro em papel que vai para a mão do cliente: "mil e dez reais" não pode virar
// "mil dez reais" nem perder os centavos.

const UNIDADES = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez",
  "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

/** 1 a 999 por extenso. */
function ateNovecentos(n: number): string {
  if (n < 20) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10), u = n % 10;
    return u ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d];
  }
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), resto = n % 100;
  return resto ? `${CENTENAS[c]} e ${ateNovecentos(resto)}` : CENTENAS[c];
}

/** Número inteiro por extenso (até bilhões — mais que isso não existe em recibo de clínica). */
function inteiroPorExtenso(n: number): string {
  if (n === 0) return "zero";
  const partes: string[] = [];
  const grupos: { valor: number; um: string; muitos: string }[] = [
    { valor: 1_000_000_000, um: "um bilhão", muitos: "bilhões" },
    { valor: 1_000_000, um: "um milhão", muitos: "milhões" },
    { valor: 1_000, um: "mil", muitos: "mil" },
  ];
  let resto = n;
  for (const g of grupos) {
    const q = Math.floor(resto / g.valor);
    if (q > 0) {
      partes.push(q === 1 ? g.um : `${ateNovecentos(q)} ${g.muitos}`);
      resto -= q * g.valor;
    }
  }
  if (resto > 0) partes.push(ateNovecentos(resto));
  if (partes.length === 1) return partes[0];
  // "e" quando o último pedaço é menor que cem ou redondo (mil e dez, mil e duzentos); senão
  // só o espaço, como se fala: "mil cento e noventa e oito".
  const ultimo = partes[partes.length - 1];
  const anteriores = partes.slice(0, -1).join(" e ");
  const ligar = resto > 0 && (resto < 100 || resto % 100 === 0);
  return `${anteriores}${ligar ? " e " : " "}${ultimo}`;
}

/** "R$ 1.198,99" → "mil cento e noventa e oito reais e noventa e nove centavos". */
export function valorPorExtenso(valor: unknown): string {
  const cent = Math.round(Math.abs(Number(valor) || 0) * 100);
  const reais = Math.floor(cent / 100);
  const centavos = cent % 100;
  const parteReais = reais === 1 ? "um real" : `${inteiroPorExtenso(reais)} reais`;
  if (!centavos) return parteReais;
  const parteCentavos = centavos === 1 ? "um centavo" : `${inteiroPorExtenso(centavos)} centavos`;
  if (!reais) return parteCentavos;
  return `${parteReais} e ${parteCentavos}`;
}
