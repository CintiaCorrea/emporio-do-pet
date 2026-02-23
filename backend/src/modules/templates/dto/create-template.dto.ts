import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';

export enum TemplateCategory {
  ATENDIMENTO = 'ATENDIMENTO',
  VENDAS = 'VENDAS',
  MARKETING = 'MARKETING',
  SUPORTE = 'SUPORTE',
  AGENDAMENTO = 'AGENDAMENTO',
  PERSONALIZADO = 'PERSONALIZADO',
}

export enum TemplateStatus {
  PUBLISHED = 'PUBLISHED',
  DRAFT = 'DRAFT',
  ARCHIVED = 'ARCHIVED',
}

export enum AIProvider {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  DEEPSEEK = 'DEEPSEEK',
}

export class CreateTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory = TemplateCategory.PERSONALIZADO;

  @IsEnum(TemplateStatus)
  @IsOptional()
  status?: TemplateStatus = TemplateStatus.DRAFT;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  variables?: string[];

  @IsEnum(AIProvider)
  @IsOptional()
  provider?: AIProvider;

  @IsString()
  @IsOptional()
  model?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;
}
