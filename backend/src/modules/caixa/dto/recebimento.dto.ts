import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';

export class RecebimentoDto {
  @IsOptional() @IsString() appointmentId?: string;
  @IsNumber() valorTotal!: number;
  @IsOptional() @IsNumber() desconto?: number;
  @IsOptional() @IsNumber() troco?: number;
  @IsOptional() @IsArray() formas?: any[];
  // formas serializadas como texto (contorna um bug de serialização no navegador que zerava o array
  // "formas" no JSON — chegava [[]]). Quando presente, tem prioridade sobre `formas`.
  @IsOptional() @IsString() formasStr?: string;
  @IsOptional() @IsString() observacao?: string;
}
