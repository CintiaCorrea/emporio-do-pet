import { IsString, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInteracaoDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()
  leadId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  tutorId?: string;

  @ApiPropertyOptional() @IsOptional() @IsUUID()
  petId?: string;

  @ApiPropertyOptional({ description: 'ID do usuário autor (se omitido, usa o do JWT)' })
  @IsOptional() @IsUUID()
  autorUserId?: string;

  @ApiPropertyOptional({ description: 'NOTA | ENCAMINHAMENTO | AGENDAMENTO | EMAIL_ENVIADO | WHATSAPP_ENVIADO | LIGACAO | PRESENCIAL | PERDIDO' })
  @IsOptional() @IsString()
  tipo?: string;

  @ApiProperty({ description: 'Texto da interação / resumo da conversa' })
  @IsString()
  texto: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  proximaAcao?: string;

  @ApiPropertyOptional() @IsOptional() @IsDateString()
  proximoFollowupAt?: string;

  @ApiPropertyOptional({ description: 'Canal: WhatsApp BC | WhatsApp Meta | Email | Ligação | Presencial' })
  @IsOptional() @IsString()
  canal?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  threadId?: string;
}
