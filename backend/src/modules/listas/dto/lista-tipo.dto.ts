import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Matches } from 'class-validator';

export class CreateListaTipoDto {
  @ApiProperty({ description: 'Identificador snake_case (canais, tipos_exame...)' })
  @IsString()
  @Matches(/^[a-z][a-z0-9_]*$/, { message: 'nome deve ser snake_case (a-z, 0-9, _)' })
  nome!: string;

  @ApiProperty({ description: 'Label visível (Canais de entrada)' })
  @IsString()
  label!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() emoji?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}

export class UpdateListaTipoDto extends PartialType(CreateListaTipoDto) {}
