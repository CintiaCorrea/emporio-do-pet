import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export enum MovementType {
  IN = 'IN',
  OUT = 'OUT',
  ADJUSTMENT = 'ADJUSTMENT',
}

export class CreateStockMovementDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ enum: MovementType })
  @IsEnum(MovementType)
  type: MovementType;

  // Min(0): o ajuste de inventário (ADJUSTMENT) pode zerar um item (saldo alvo = 0).
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;

  // Entrada de compra: custo unitário pago — recalcula o custo médio ponderado do produto.
  @ApiPropertyOptional({ example: 19.9 })
  @IsOptional()
  @IsNumber()
  custoUnitario?: number;
}
