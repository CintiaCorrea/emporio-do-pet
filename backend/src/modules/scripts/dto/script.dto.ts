import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateScriptCategoryDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() emoji?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateScriptCategoryDto extends PartialType(CreateScriptCategoryDto) {}

export class CreateScriptTemplateDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiProperty() @IsString() conteudo!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() @IsString({ each: true }) variaveis?: string[];
  @ApiPropertyOptional() @IsOptional() @IsString() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateScriptTemplateDto extends PartialType(CreateScriptTemplateDto) {}
