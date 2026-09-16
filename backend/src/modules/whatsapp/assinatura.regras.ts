// ── QUEM ASSINA AS MENSAGENS DO WHATSAPP ──────────────────────────────────────────────────
//
// Cintia, 16/09/2026, sobre a assinatura automática: "A — para os veterinários. A recepção não
// precisa assinar."
//
// ATÉ AQUI a assinatura era um botão ✍️ na tela, ligado por aba. Medido no mesmo dia: das
// mensagens digitadas pela recepção e pela gerência, quase metade saiu sem nome — aba com o botão
// desligado, colado no "Atualizar" do cabeçalho. Assinatura que depende de botão é assinatura que
// falha em silêncio.
//
// AGORA QUEM DECIDE É O SERVIDOR, pelo cadastro: tem profissional do tipo VETERINÁRIO → assina
// sempre. Qualquer outro → não assina. Não depende de aba, de botão nem de papel de acesso — a
// Dra. Vivian é ADMIN no acesso e veterinária no cadastro, e é o cadastro que diz quem ela é.

const TITULO = /^(dr|dra|drª|sr|sra|srª|vet|prof)\.?$/i;

/**
 * O nome curto que vai na frente da mensagem: título + primeiro nome.
 *
 * "Dra. Vivian Corrêa" → "Dra. Vivian". Sem isto a assinatura pegava a primeira palavra e saía só
 * "Dra." — a mesma regra que morava na tela.
 */
export function nomeDaAssinatura(nome?: string | null): string {
  const partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '';
  const titulo = partes.length > 1 && TITULO.test(partes[0]) ? partes[0] : '';
  const primeiro = titulo ? partes[1] : partes[0];
  return (titulo ? `${titulo} ${primeiro}` : primeiro).trim();
}

/** Assina? Só quem é veterinário no cadastro de profissionais. */
export function deveAssinar(tipoDoProfissional?: string | null): boolean {
  return String(tipoDoProfissional || '').toUpperCase() === 'VETERINARIO';
}

/**
 * A mensagem como ela sai.
 *
 * Não assina duas vezes: se o texto já começa com a assinatura (uma aba antiga, ainda com a versão
 * da tela que assinava), passa como veio.
 */
export function comAssinatura(texto: string, nome?: string | null, tipoDoProfissional?: string | null): string {
  const conteudo = String(texto ?? '');
  if (!deveAssinar(tipoDoProfissional)) return conteudo;
  const n = nomeDaAssinatura(nome);
  if (!n || !conteudo.trim()) return conteudo;
  const prefixo = `*${n}*:\n`;
  if (conteudo.startsWith(prefixo)) return conteudo;
  return prefixo + conteudo;
}

/**
 * Tira uma assinatura que a TELA antiga tenha posto, para o servidor decidir.
 *
 * A aba aberta antes da atualização continua mandando "*Maria*:\n..." até alguém recarregar a
 * página. Sem isto, a recepção seguiria assinando até o fim do dia — o contrário do que a Cintia
 * pediu. Só remove quando o nome é EXATAMENTE o de quem envia: texto que começa com negrito por
 * outro motivo ("*Atenção*:") não é tocado.
 */
export function semAssinaturaDaTela(texto: string, nome?: string | null): string {
  const conteudo = String(texto ?? '');
  const n = nomeDaAssinatura(nome);
  if (!n) return conteudo;
  const prefixo = `*${n}*:\n`;
  return conteudo.startsWith(prefixo) ? conteudo.slice(prefixo.length) : conteudo;
}
