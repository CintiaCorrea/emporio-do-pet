/**
 * Utilitarios do acesso do Portal do Tutor.
 *
 * Regra de ouro: o codigo em texto NUNCA e gravado. Guardamos so o hash, do mesmo
 * jeito que se faz com senha — quem tiver acesso ao banco nao consegue entrar na
 * conta de um tutor.
 */
import * as crypto from 'crypto';

/** Quanto tempo o codigo do WhatsApp vale (o template diz "5 minutos"). */
export const CODIGO_VALIDADE_MIN = 5;
/** Erros seguidos ate o numero descansar. */
export const CODIGO_MAX_TENTATIVAS = 3;
/** Quanto tempo o numero fica descansando depois de estourar as tentativas. */
export const BLOQUEIO_MIN = 15;
/** Intervalo minimo entre dois pedidos de codigo do mesmo numero. */
export const REENVIO_ESPERA_SEG = 60;
/** Teto de codigos por numero por hora — segura custo de template e abuso. */
export const CODIGOS_POR_HORA = 3;
/** Duracao da sessao do tutor. */
export const SESSAO_DIAS = 30;
/** Validade do ticket de desempate ("qual desses pets e seu?"). */
export const DESEMPATE_VALIDADE_MIN = 5;

/**
 * Codigo de 6 digitos, sorteado com gerador criptografico (nao `Math.random`,
 * que e previsivel). Pode comecar com zero — o tutor digita o que ve.
 */
export function gerarCodigo(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Token opaco de sessao/desempate — 32 bytes de aleatoriedade real. */
export function gerarToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Hash do codigo/token. O "pepper" e um segredo do servidor: mesmo com o banco
 * na mao, sem ele nao da pra montar uma tabela de 1 milhao de hashes e descobrir
 * o codigo de alguem.
 */
export function hashSegredo(valor: string, pepper: string): string {
  return crypto.createHash('sha256').update(`${valor}:${pepper}`).digest('hex');
}

/**
 * Comparacao em tempo constante — evita descobrir o codigo medindo quanto tempo
 * a resposta demora.
 */
export function hashConfere(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * Mostra o telefone sem entregar o numero: 5585986018111 -> "(85) 9••••-8111".
 * Serve pro tutor reconhecer o proprio numero sem expor o numero de ninguem.
 */
export function mascararTelefone(normalizado: string): string {
  const d = (normalizado || '').replace(/\D/g, '');
  if (d.length < 8) return '•••••';
  const ddd = d.length >= 12 ? d.slice(2, 4) : d.slice(0, 2);
  const fim = d.slice(-4);
  return `(${ddd}) 9••••-${fim}`;
}

/** Idade em anos a partir do nascimento — usada so para o tutor reconhecer o pet. */
export function idadeEmAnos(nascimento?: Date | null): number | null {
  if (!nascimento) return null;
  const ms = Date.now() - new Date(nascimento).getTime();
  if (ms < 0) return null;
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
}
