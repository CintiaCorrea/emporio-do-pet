import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

class BatchColumnUpdateItemDto {
  @ApiProperty({ example: 'a8655311-0447-4c83-a334-c08ef8b75499' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 0, description: 'Índice 0-based da posição' })
  @IsInt()
  @Min(0)
  position: number;
}

export class BatchUpdateColumnsDto {
  @ApiProperty({ type: [BatchColumnUpdateItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BatchColumnUpdateItemDto)
  columns: BatchColumnUpdateItemDto[];
}
