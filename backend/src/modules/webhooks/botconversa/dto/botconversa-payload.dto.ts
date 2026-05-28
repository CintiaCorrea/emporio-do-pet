/**
 * Payload do webhook BotConversa.
 *
 * O BotConversa envia campos em snake_case + PascalCase + outros
 * campos customizados que variam por flow. Em vez de declarar todos
 * (e quebrar quando aparecer um novo), aceitamos um Record livre e
 * o BotconversaWebhookService extrai os campos relevantes com
 * fallback de nomes (full_phone, phone, Telefone, etc).
 */
export type BotconversaPayload = Record<string, any>;
