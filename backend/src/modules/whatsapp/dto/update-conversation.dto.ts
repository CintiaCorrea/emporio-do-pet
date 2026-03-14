import { IsOptional, IsString, IsBoolean, IsEnum, IsDateString } from 'class-validator';
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
  assignedUserId?: string | null;

  @IsOptional()
  @IsDateString()
  humanTakeoverAt?: Date | null;

  @IsOptional()
  @IsString()
  tutorId?: string | null;

  @IsOptional()
  @IsBoolean()
  isAutoReplyEnabled?: boolean;
}
