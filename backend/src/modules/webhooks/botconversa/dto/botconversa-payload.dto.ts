import { Allow, IsOptional, IsString } from 'class-validator';

/**
 * Payload do webhook BotConversa.
 *
 * O BotConversa envia campos em snake_case + outros campos
 * customizados que variam por flow. Esse DTO é intencionalmente
 * permissivo:
 *  - declara os campos conhecidos (vindo do mapeamento Base44)
 *  - aceita qualquer campo extra via @Allow() — não rejeita
 *
 * Validação real (telefone obrigatório, etc) acontece no service.
 */
export class BotconversaPayloadDto {
  // Telefone — BotConversa manda em full_phone (DDI+DDD+número) e/ou phone
  @IsOptional()
  @IsString()
  full_phone?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nome_completo?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  trigger?: string;

  @IsOptional()
  @IsString()
  tipo_contato?: string;

  // Pet info (BotConversa)
  @IsOptional()
  @IsString()
  Pet?: string;

  @IsOptional()
  @IsString()
  Especie?: string;

  @IsOptional()
  @IsString()
  IdadePet?: string;

  @IsOptional()
  @IsString()
  NomeServicoEscolhido?: string;

  @IsOptional()
  @IsString()
  ResumoIA?: string;

  // Permite qualquer outro campo que o BotConversa enviar
  @Allow()
  [key: string]: any;
}
