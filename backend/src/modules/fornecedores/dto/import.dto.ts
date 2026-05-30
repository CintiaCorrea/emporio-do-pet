import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export class ImportExameRow {
  @ApiProperty() @IsString() nome!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() codigo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() categoria?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fornecedor?: string;
  @ApiPropertyOptional() @IsOptional() @IsNumber() custo?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() preco_venda?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() prazo_dias?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}

export class ImportBatchDto {
  @ApiProperty({ type: [ImportExameRow] })
  @IsArray() @ValidateNested({ each: true }) @Type(() => ImportExameRow)
  rows!: ImportExameRow[];

  @ApiPropertyOptional({ description: 'Se true, atualiza exames já existentes (match por código+fornecedor ou nome+fornecedor)' })
  @IsOptional() @IsBoolean() upsert?: boolean;
}
