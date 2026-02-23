import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateFinanceEntryDto {
  @ApiPropertyOptional({ enum: FinanceEntryType })
  @IsOptional()
  @IsEnum(FinanceEntryType)
  type?: FinanceEntryType;

  @ApiPropertyOptional({ enum: FinanceEntryStatus })
  @IsOptional()
  @IsEnum(FinanceEntryStatus)
  status?: FinanceEntryStatus;

  @ApiPropertyOptional({ enum: FinancePaymentMethod })
  @IsOptional()
  @IsEnum(FinancePaymentMethod)
  method?: FinancePaymentMethod;

  @ApiPropertyOptional({ example: 'Maria Silva' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  counterpartyName?: string;

  @ApiPropertyOptional({ example: 'Consulta' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  service?: string;

  @ApiPropertyOptional({ example: 'Observações...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 250000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  dueDate?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  paidAt?: string | null;
}
