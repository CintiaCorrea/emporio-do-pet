import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min, MinLength } from 'class-validator';

enum FinanceEntryType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

enum FinanceEntryStatus {
  PAID = 'PAID',
  PENDING = 'PENDING',
  OVERDUE = 'OVERDUE',
  CANCELED = 'CANCELED',
}

enum FinancePaymentMethod {
  CASH = 'CASH',
  PIX = 'PIX',
  BOLETO = 'BOLETO',
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  TRANSFER = 'TRANSFER',
  OTHER = 'OTHER',
}

export class CreateFinanceEntryDto {
  @ApiProperty({ enum: FinanceEntryType, example: 'INCOME' })
  @IsEnum(FinanceEntryType)
  type: FinanceEntryType;

  @ApiPropertyOptional({ enum: FinanceEntryStatus, example: 'PENDING' })
  @IsOptional()
  @IsEnum(FinanceEntryStatus)
  status?: FinanceEntryStatus;

  @ApiPropertyOptional({ enum: FinancePaymentMethod, example: 'PIX' })
  @IsOptional()
  @IsEnum(FinancePaymentMethod)
  method?: FinancePaymentMethod;

  @ApiProperty({ example: 'Maria Silva', description: 'Cliente/Fornecedor' })
  @IsString()
  @MinLength(1)
  counterpartyName: string;

  @ApiProperty({ example: 'Consulta', description: 'Serviço/Referência' })
  @IsString()
  @MinLength(1)
  service: string;

  @ApiPropertyOptional({ example: 'Observações...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 250000, description: 'Valor em centavos (BRL)' })
  @IsInt()
  @Min(0)
  amountCents: number;

  @ApiPropertyOptional({ example: '2026-01-07T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional({ example: '2026-01-10T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ example: '2026-01-10T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  paidAt?: string;
}
