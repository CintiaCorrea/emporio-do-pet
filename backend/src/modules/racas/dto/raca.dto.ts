import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { EspecieRaca } from '@prisma/client';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRacaDto {
  @ApiProperty()
  @IsString()
  nome!: string;

  @ApiProperty({ enum: EspecieRaca })
  @IsEnum(EspecieRaca)
  especie!: EspecieRaca;

  @ApiPropertyOptional()
  @IsOptional() @IsInt()
  ordem?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  ativo?: boolean;
}

export class UpdateRacaDto extends PartialType(CreateRacaDto) {}
