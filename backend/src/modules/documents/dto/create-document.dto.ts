import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class CreateDocumentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'HTML do TipTap' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ enum: DocumentStatus, default: DocumentStatus.DRAFT })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string | null;

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

