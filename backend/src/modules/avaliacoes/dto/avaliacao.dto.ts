import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { CanalColetaNPS, CategoriaAlvoNPS, ClassificacaoNPS, StatusAvaliacaoGoogle } from '@prisma/client';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAvaliacaoNPSDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() atendimentoId?: string;
  @ApiProperty({ enum: CategoriaAlvoNPS }) @IsEnum(CategoriaAlvoNPS) categoriaAlvo!: CategoriaAlvoNPS;
  @ApiPropertyOptional() @IsOptional() @IsString() profissionalId?: string;
  @ApiProperty() @IsInt() @Min(0) @Max(10) score!: number;
  @ApiPropertyOptional({ enum: ClassificacaoNPS }) @IsOptional() @IsEnum(ClassificacaoNPS) classificacao?: ClassificacaoNPS;
  @ApiPropertyOptional() @IsOptional() @IsString() comentario?: string;
  @ApiPropertyOptional({ enum: CanalColetaNPS }) @IsOptional() @IsEnum(CanalColetaNPS) canalColeta?: CanalColetaNPS;
  @ApiPropertyOptional() @IsOptional() @IsDateString() dataColeta?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coletadoPor?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}
export class UpdateAvaliacaoNPSDto extends PartialType(CreateAvaliacaoNPSDto) {}

export class CreateAvaliacaoGoogleDto {
  @ApiPropertyOptional() @IsOptional() @IsString() tutorId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() petId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() atendimentoId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() profissionalId?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() coletadoPor?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() gostou?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() comentarioNegativo?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() canalEnvio?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() linkEnviado?: string;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(5) notaDada?: number;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() votoConfirmado?: boolean;
  @ApiPropertyOptional({ enum: StatusAvaliacaoGoogle }) @IsOptional() @IsEnum(StatusAvaliacaoGoogle) status?: StatusAvaliacaoGoogle;
  @ApiPropertyOptional() @IsOptional() @IsString() observacoes?: string;
}
export class UpdateAvaliacaoGoogleDto extends PartialType(CreateAvaliacaoGoogleDto) {}
