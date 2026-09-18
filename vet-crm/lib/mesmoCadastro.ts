// É A MESMA PESSOA? — a comparação lado a lado de Cadastros recebidos.
//
// Quando chega uma ficha pelo link público e o telefone bate com um cliente que já existe, a tela
// mostra os dois lado a lado para a recepção decidir. Cintia, 15/09/2026: "quando houver a
// possibilidade de parecer com algum outro cadastro que já temos, pode trazer as informações para
// checarmos direto na tela e confirmar ou não se é a mesma pessoa".
//
// O ✓ verde marca o que é igual nos dois lados. Até 18/09/2026 ele exigia que o valor tivesse ao
// menos um DÍGITO — sobrava CPF e data de nascimento. E-mail igual e nome de pet igual nunca
// marcavam, justamente os dois que a recepção reconhece primeiro ("ah, esse é o Beagle da Thais").
// O telefone não entra na comparação de propósito: foi ele que levantou a suspeita.

/** Minúsculas, sem acento, só letras e números: "José D'Ávila" e "jose davila" viram o mesmo. */
export const soLetrasENumeros = (v: unknown): string =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * Os dois lados batem?
 *
 * `modo: "lista"` é para o campo Pets: a ficha recebida traz UM pet e o cadastro antigo traz
 * todos, separados por vírgula ("Luna, Beagle"). Sem isso, um pet que já existe nunca marcaria.
 */
export function mesmoValor(a: string, b: string, modo?: 'lista'): boolean {
  const na = soLetrasENumeros(a);
  if (!na || !b) return false;
  if (modo === 'lista') return String(b).split(',').some((p) => soLetrasENumeros(p) === na);
  return na === soLetrasENumeros(b);
}
