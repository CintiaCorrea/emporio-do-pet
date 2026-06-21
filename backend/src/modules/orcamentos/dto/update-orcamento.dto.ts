import { IsString, IsOptional, IsArray, ValidateNested, IsDateString, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrcamentoItemDto } from './create-orcamento.dto';

export class UpdateOrcamentoDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['RASCUNHO', 'APROVADO', 'RECUSADO', 'EXPIRADO']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
  @ApiPropertyOptional({ type: [OrcamentoItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrcamentoItemDto)
  itens?: OrcamentoItemDto[];
}
