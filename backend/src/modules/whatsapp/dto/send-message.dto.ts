import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';
import { WhatsAppMessageType } from '@prisma/client';

export class SendMessageDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(WhatsAppMessageType)
  type?: WhatsAppMessageType = 'TEXT';

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  @IsObject()
  templateParams?: Record<string, string>;

  /** waMessageId da mensagem sendo respondida — manda como resposta citada. */
  @IsOptional()
  @IsString()
  replyToWaMessageId?: string;
}

export class SendDirectMessageDto {
  @IsString()
  to: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  templateName?: string;

  @IsOptional()
  templateParams?: Array<{ type: 'text'; text: string }>;

  @IsOptional()
  @IsString()
  language?: string;
}
