import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class RecebimentoDto {
  @IsOptional() @IsString() appointmentId?: string;
  @IsNumber() valorTotal!: number;
  @IsOptional() @IsNumber() desconto?: number;
  @IsOptional() @IsNumber() troco?: number;
  @IsOptional() @IsArray() formas?: any[];
  @IsOptional() @IsString() observacao?: string;
}
