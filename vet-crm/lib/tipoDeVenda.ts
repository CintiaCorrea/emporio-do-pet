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

/** O registro-prontuário da internação — nunca é cobrado; a conta sai em vendas próprias. */
export function ehRegistroDeInternacao(a?: { type?: string | null; notes?: unknown } | null): boolean {
  if (!a) return false;
  if (semAcento(a.type) === "internacao") return true;
  return typeof a.notes === "string" && a.notes.includes("HOSPITALIZATION");
}

/**
 * É VENDA? Quem decide é o NÚMERO DE VENDA, não o nome do atendimento.
 *
 * A Cintia, 16/09/2026: "consulta também é uma venda (...) venda é venda." O nome ("CONSULTA",
 * "Resultado de exames") é do PRONTUÁRIO. Quando a veterinária lança os serviços cobrados
 * dentro do atendimento, o registro ganha número de venda e continua com o nome da consulta —
 * e sumia da ficha. Eram 25 vendas (R$ 28.176,92), a castração da Cueia (#1130) entre elas.
 * Gêmea de backend/src/modules/crm/consulta-vendas.regras.ts (ehVenda).
 *
 * Exceções: orçamento (proposta) e o registro de internação (a diária combinada — foi ele que
 * aparecia com o diagnóstico no lugar do produto em 09/09).
 *
 * Quando a lista não trouxe o campo `numeroVenda` (undefined, e não null), não dá para saber
 * pelo número — aí vale o nome, como antes. Melhor mostrar a venda chamada "Venda" do que
 * esconder tudo por falta de um campo.
 */
export function ehVenda(a: { numeroVenda?: number | null; type?: string | null; notes?: unknown } | null | undefined): boolean {
  if (!a) return false;
  if (ehTipoDeOrcamento(a.type) || ehRegistroDeInternacao(a)) return false;
  if (a.numeroVenda === undefined) return ehTipoDeVenda(a.type);
  return a.numeroVenda != null;
}

/**
 * É uma COMPRA do cliente? É venda E tem valor.
 *
 * O valor continua na conta porque venda de R$ 0,00 não é compra — é lançamento em aberto ou
 * engano, e listar "R$ 0,00" no histórico do cliente só ocupa linha.
 */
export function ehCompra(a: { numeroVenda?: number | null; type?: string | null; value?: number | null; notes?: unknown } | null | undefined): boolean {
  return !!a && ehVenda(a) && (Number(a.value) || 0) > 0;
}
