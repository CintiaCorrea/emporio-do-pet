import { IsString, IsOptional, IsEnum, IsDateString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum NewsletterStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

enum RecipientType {
  CLIENT = 'CLIENT',
  LEAD = 'LEAD',
  TUTOR = 'TUTOR',
  ALL = 'ALL',
}

export class CreateNewsletterDto {
  @ApiProperty({ example: 'Newsletter de Janeiro' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Novidades do mês!' })
  @IsString()
  subject: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ enum: NewsletterStatus })
  @IsOptional()
  @IsEnum(NewsletterStatus)
  status?: NewsletterStatus;

  @ApiProperty({ enum: RecipientType })
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiPropertyOptional({ example: '2024-01-15T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @ApiPropertyOptional({ description: 'ID do template' })
  @IsOptional()
  @IsUUID()
  templateId?: string;
}

