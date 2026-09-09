// O QUE É UMA VENDA — a mesma regra do servidor, deste lado da tela.
//
// A Cintia, em 09/09/2026: "está aparecendo na tela de vendas itens que não são de vendas.
// Isso também precisa ser barrado."
//
// O que aparecia: a INTERNAÇÃO, no "Histórico de compras" do pet e do cliente, com o texto do
// diagnóstico no lugar do produto ("Anemia + trombocitopenia (transfusão)"). Ela entrava porque
// a lista filtrava por VALOR — e a internação tem valor (a diária). Valor maior que zero não é
// o mesmo que "é uma venda": consulta, retorno e internação também têm valor.
//
// A regra certa é o TIPO. O gêmeo desta função vive no backend
// (src/modules/crm/consulta-vendas.regras.ts), onde ela consertou o caso das vendas de setembro
// que não apareciam. As duas precisam concordar: se uma grafia nova nascer, entra nas duas.
//
// As grafias existem em duplicidade por história: o importador do SimplesVet grava 'VENDA', o
// nosso ponto de venda e a internação gravam 'Venda'. Comparação de texto no banco distingue
// maiúscula de minúscula, e foi assim que a Consulta de vendas passou meses mostrando só o
// passado importado.

const semAcento = (t: unknown) =>
  String(t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/** `true` para qualquer grafia de venda ('VENDA', 'Venda', 'venda'). */
export function ehTipoDeVenda(tipo?: string | null): boolean {
  return semAcento(tipo) === "venda";
}

/** `true` para qualquer grafia de orçamento — proposta não é venda e não entra no total. */
export function ehTipoDeOrcamento(tipo?: string | null): boolean {
  return semAcento(tipo) === "orcamento";
}

/**
 * É uma COMPRA do cliente? Tipo de venda E com valor.
 *
 * O valor continua na conta porque venda de R$ 0,00 não é compra — é lançamento em aberto ou
 * engano, e listar "R$ 0,00" no histórico do cliente só ocupa linha.
 */
export function ehCompra(a: { type?: string | null; value?: number | null } | null | undefined): boolean {
  return !!a && ehTipoDeVenda(a.type) && (Number(a.value) || 0) > 0;
}
