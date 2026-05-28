import { IsArray, IsEmail, IsOptional, IsString } from 'class-validator';

/**
 * Payload do webhook BotConversa.
 *
 * Espelha o que a recepção do Empório do Pet já valida no Base44 via
 * função botconversaLeadCapture. Campos opcionais porque o BotConversa
 * envia subsets diferentes conforme o flow.
 */
export class BotconversaPayloadDto {
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  resumoIA?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  // Pet info (quando o flow do bot já capturou)
  @IsOptional()
  @IsString()
  petNome?: string;

  @IsOptional()
  @IsString()
  petEspecie?: string;

  @IsOptional()
  @IsString()
  petIdade?: string;

  @IsOptional()
  @IsString()
  servicoInteresse?: string;

  @IsOptional()
  @IsString()
  origemCampanha?: string;
}
