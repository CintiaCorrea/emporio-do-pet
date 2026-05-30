import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateListaItemDto {
  @ApiProperty() @IsString() lista!: string;
  @ApiProperty() @IsString() valor!: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() ordem?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() ativo?: boolean;
}

export class UpdateListaItemDto extends PartialType(CreateListaItemDto) {}
