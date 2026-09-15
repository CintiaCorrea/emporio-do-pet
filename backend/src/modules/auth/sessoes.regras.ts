import * as crypto from 'crypto';

// ── VÁRIAS ABAS, VÁRIAS SESSÕES ───────────────────────────────────────────────────────────
//
// Cintia, 15/09/2026: "preciso poder usar mais de uma aba, pois trabalhamos com várias linhas
// dentro do mesmo sistema".
//
// O QUE HAVIA: o refresh token era guardado numa chave por usuário — `refresh:<userId>` — e
// cada novo login SOBRESCREVIA a anterior. Quem abrisse o sistema numa segunda aba, ou no
// celular, ou entrasse de novo depois de um tempo parado, matava a sessão que já estava aberta.
//
// E MORRIA EM SILÊNCIO: a pessoa continuava com a tela na frente, clicava em salvar, o pedido
// saía sem credencial válida e era recusado na porta — sem gerar linha de log, sem mensagem na
// tela. Foi isso que a Dra. Vivian viveu tentando salvar um orçamento.
//
// AGORA CADA SESSÃO TEM A SUA CHAVE. Guardar o hash e não o token: a chave do Redis vira o
// identificador de uma sessão, e o token em si não fica escrito em lugar nenhum além do
// navegador de quem o recebeu.

/** Prefixo das sessões de um usuário. `delByPattern` usa isto para encerrar todas de uma vez. */
export function padraoDasSessoes(userId: string): string {
  return `refresh:${userId}:*`;
}

/**
 * A chave de UMA sessão. O token entra como hash — curto para caber bem no Redis e suficiente
 * para não colidir na prática.
 */
export function chaveDaSessao(userId: string, refreshToken: string): string {
  const marca = crypto.createHash('sha256').update(String(refreshToken || '')).digest('hex').slice(0, 32);
  return `refresh:${userId}:${marca}`;
}

/** A chave antiga, de quando havia uma sessão só. Mantida para não deslogar ninguém no deploy. */
export function chaveAntiga(userId: string): string {
  return `refresh:${userId}`;
}

/**
 * Esta sessão ainda vale?
 *
 * Três situações, e a terceira é a que existe só por causa do deploy:
 *   · a chave da sessão existe → vale;
 *   · não existe, mas o token bate com a chave ANTIGA → vale (sessão aberta antes desta
 *     mudança; ninguém é deslogado por causa de uma atualização do sistema);
 *   · nenhuma das duas → foi encerrada por um logout.
 *
 * Redis fora do ar devolve `true`: o sistema já se comportava assim antes (a revogação é um
 * extra sobre um JWT que continua sendo verificado por assinatura e validade). Derrubar todo
 * mundo porque o Redis piscou seria trocar um risco pequeno por uma parada geral.
 */
export function sessaoValida(opts: {
  existeChaveNova: boolean;
  tokenAntigoGuardado?: string | null;
  refreshToken: string;
  redisFalhou?: boolean;
}): boolean {
  if (opts.redisFalhou) return true;
  if (opts.existeChaveNova) return true;
  const antigo = opts.tokenAntigoGuardado;
  if (antigo && antigo === opts.refreshToken) return true;
  // Nunca houve registro nenhum (Redis limpo, ou sessão de antes de qualquer gravação): a
  // assinatura do JWT ainda foi conferida, e negar aqui deslogaria quem nunca fez nada errado.
  return !antigo && !opts.existeChaveNova ? true : false;
}
