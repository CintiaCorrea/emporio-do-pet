import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CategoriaEmail } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateEmailTemplateDto {
  @ApiProperty() @IsString() nome!: string;
  @ApiProperty() @IsString() assunto!: string;
  @ApiProperty() @IsString() corpoHtml!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() corpoTexto?: string;
  @ApiPropertyOptional({ enum: CategoriaEmail }) @IsOptional() @IsEnum(CategoriaEmail) categoria?: CategoriaEmail;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
}
export class UpdateEmailTemplateDto extends PartialType(CreateEmailTemplateDto) {}

export class CreateEmailVariableDto {
  @ApiProperty() @IsString() chave!: string;
  @ApiProperty() @IsString() label!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() exemplo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoria?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}
export class UpdateEmailVariableDto extends PartialType(CreateEmailVariableDto) {}
