import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ComissaoBase } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateServiceCategoryDto {
  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiPropertyOptional({ enum: ['VALOR_CHEIO', 'MARGEM', 'SEM_COMISSAO'] })
  @IsOptional() @IsEnum(ComissaoBase)
  comissaoBasePadrao?: ComissaoBase;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

export class UpdateServiceCategoryDto extends PartialType(CreateServiceCategoryDto) {}
