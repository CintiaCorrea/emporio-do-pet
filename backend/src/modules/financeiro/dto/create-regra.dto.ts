import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, IsBoolean, IsEnum } from 'class-validator';
import { EscopoRegra } from '@prisma/client';

export class CreateRegraDto {
  @ApiProperty({ example: 'Enel', description: 'Termo procurado na descrição' })
  @IsString()
  termo: string;

  @ApiPropertyOptional({ enum: EscopoRegra, default: EscopoRegra.AMBOS })
  @IsOptional()
  @IsEnum(EscopoRegra)
  escopo?: EscopoRegra;

  @ApiPropertyOptional({ default: 0, description: 'Desempate: menor prioridade ganha' })
  @IsOptional()
  @IsInt()
  prioridade?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ativo?: boolean;

  @ApiPropertyOptional({ description: 'Alvo — categoria (plano de contas)' })
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional({ description: 'Alvo — unidade' })
  @IsOptional()
  @IsString()
  unidadeId?: string;

  @ApiPropertyOptional({ description: 'Alvo — marca' })
  @IsOptional()
  @IsString()
  marcaId?: string;

  @ApiPropertyOptional({ description: 'Alvo — linha de serviço' })
  @IsOptional()
  @IsString()
  linhaServicoId?: string;

  @ApiPropertyOptional({ description: 'Alvo — conta' })
  @IsOptional()
  @IsString()
  contaId?: string;
}
