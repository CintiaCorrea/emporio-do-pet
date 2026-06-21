import { IsString, IsOptional, IsNumber, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class OrcamentoItemDto {
  @ApiPropertyOptional() @IsOptional() @IsString() servicoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() descricao?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() quantidade?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() valorUnitario?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() desconto?: number;
}

export class CreateOrcamentoDto {
  @ApiProperty() @IsString() petId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() validade?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
  @ApiPropertyOptional({ type: [OrcamentoItemDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => OrcamentoItemDto)
  itens?: OrcamentoItemDto[];
}
