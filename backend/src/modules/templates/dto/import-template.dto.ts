import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum TemplateCategory {
  ATENDIMENTO = 'ATENDIMENTO',
  VENDAS = 'VENDAS',
  MARKETING = 'MARKETING',
  SUPORTE = 'SUPORTE',
  AGENDAMENTO = 'AGENDAMENTO',
  PERSONALIZADO = 'PERSONALIZADO',
}

export enum AIProvider {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  DEEPSEEK = 'DEEPSEEK',
}

export class TemplateImportDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TemplateCategory)
  @IsOptional()
  category?: TemplateCategory;

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
}

export class ImportTemplatesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateImportDto)
  templates: TemplateImportDto[];
}
