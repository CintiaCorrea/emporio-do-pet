import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AplicarProtocoloDto {
  @ApiProperty() @IsString() petId: string;
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateId?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['VACINA', 'VERMIFUGO', 'ECTOPARASITA']) tipo?: string;
  @ApiPropertyOptional({ description: 'Nome do protocolo (se sem template)' })
  @IsOptional() @IsString() nomeProtocolo?: string;
  @ApiProperty() @IsDateString() dataInicial: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() appointmentId?: string;
}

export class RegistrarDoseDto {
  @ApiPropertyOptional() @IsOptional() @IsIn(['PENDENTE', 'APLICADA', 'CANCELADA', 'SEM_RESPOSTA']) status?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dataAplicada?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() lote?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() fabricante?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() aplicadaPorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacao?: string;
}
