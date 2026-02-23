import { IsOptional, IsString, IsBoolean, IsEnum } from 'class-validator';
import { WhatsAppConversationStatus } from '@prisma/client';

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(WhatsAppConversationStatus)
  status?: WhatsAppConversationStatus;

  @IsOptional()
  @IsString()
  assignedAgentId?: string | null;

  @IsOptional()
  @IsString()
  tutorId?: string | null;

  @IsOptional()
  @IsBoolean()
  isAutoReplyEnabled?: boolean;
}
