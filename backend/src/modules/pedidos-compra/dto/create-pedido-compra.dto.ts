import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class PedidoCompraItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiProperty()
  @IsString()
  descricao: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantidade: number;

  @ApiPropertyOptional({ example: 19.9 })
  @IsOptional()
  @IsNumber()
  custoUnitario?: number;
}

export class CreatePedidoCompraDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fornecedorId?: string;

  @ApiPropertyOptional({ description: 'RASCUNHO | ENVIADO | RECEBIDO | CANCELADO' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  observacao?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  previsao?: string;

  @ApiProperty({ type: [PedidoCompraItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => PedidoCompraItemDto)
  itens: PedidoCompraItemDto[];
}
