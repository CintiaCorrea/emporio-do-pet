/**
 * A resposta do servidor pede liberação do gerente?
 *
 * Mora aqui, fora do componente, para poder ser testada sem JSX. A frase é a que
 * caixa/desconto.regras escreve ("passa do permitido ... liberação de um gerente") e a antiga do
 * ponto de venda ("passa do limite").
 */
export const precisaDeLiberacao = (mensagem?: string | null) =>
  /liberação de um gerente|passa do limite|passa do permitido/i.test(String(mensagem || ""));
