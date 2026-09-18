// CARIMBO DO BUILD. Cada publicação gera um número novo aqui, no Dockerfile, logo antes do
// `pnpm build` (17/09/2026, Cintia: "preciso que as atualizações das telas de vendas sejam
// rápidas para que a recepção não cobre os valores errados").
//
// Como funciona: a tela que está aberta no computador da recepção carrega ESTE número junto do
// programa dela. O servidor, que já está na versão nova, devolve o número DELE em /api/versao.
// Números diferentes = a tela está velha.
//
// Este valor aqui é só o de desenvolvimento; em produção ele é trocado na hora de publicar.
export const VERSAO_PUBLICADA = "dev";
