import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ComissaoBase } from '@prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateServicoDto {
  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  valorPadrao?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  custoPadrao?: number;

  @ApiPropertyOptional({ enum: ComissaoBase })
  @IsOptional() @IsEnum(ComissaoBase)
  comissaoBaseDefault?: ComissaoBase;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

export class UpdateServicoDto extends PartialType(CreateServicoDto) {}
