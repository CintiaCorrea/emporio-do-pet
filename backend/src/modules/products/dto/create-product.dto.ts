import { IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum ProductType {
  MEDICINE = 'MEDICINE',
  VACCINE = 'VACCINE',
  SERVICE = 'SERVICE',
}

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: ProductType })
  @IsEnum(ProductType)
  type: ProductType;

  @ApiProperty({ example: 99.9 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
