import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Min } from 'class-validator';

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

export class ListFinanceEntriesQuery {
  @ApiPropertyOptional({ example: 'maria' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: FinanceEntryStatus })
  @IsOptional()
  @IsEnum(FinanceEntryStatus)
  status?: FinanceEntryStatus;

  @ApiPropertyOptional({ enum: FinanceEntryType })
  @IsOptional()
  @IsEnum(FinanceEntryType)
  type?: FinanceEntryType;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ example: '2026-01-31T23:59:59.999Z' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  take?: number;
}
