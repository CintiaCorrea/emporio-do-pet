// REGRA DA ATUALIZAÇÃO DE TELA — pura, para poder ser testada.
// Ela responde duas coisas: (1) a tela aberta está velha? (2) já posso recarregar sozinho?

/** A tela aberta está velha? Só quando os dois carimbos existem e são diferentes. */
export function telaEstaVelha(versaoDaTela: string, versaoDoServidor: unknown): boolean {
  if (typeof versaoDoServidor !== "string") return false;
  const servidor = versaoDoServidor.trim();
  if (!servidor || servidor === "dev") return false; // sem carimbo no ar: não incomoda ninguém
  if (!versaoDaTela || versaoDaTela === "dev") return false; // rodando local: não incomoda
  return servidor !== versaoDaTela;
}

/**
 * Posso recarregar a tela sozinho?
 * Só quando a pessoa TROCA DE TELA — aí ela não está no meio de um lançamento, e não se perde
 * nada digitado. E só uma vez por versão, para nunca entrar em laço de recarregar.
 */
export function podeRecarregarSozinho(p: {
  velha: boolean;
  trocouDeTela: boolean;
  versaoJaTentada: string | null;
  versaoDoServidor: string;
}): boolean {
  if (!p.velha || !p.trocouDeTela) return false;
  return p.versaoJaTentada !== p.versaoDoServidor;
}
