import { IsOptional, IsString } from 'class-validator';

export class CriarRhDocumentoDto {
  @IsString()
  tipo!: string; // Atestado | Contrato | Holerite | Documentos pessoais | Comprovante | Outros

  @IsString()
  nome!: string; // título/nome do arquivo

  @IsString()
  url!: string; // link no storage (Tigris)

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsString()
  userId?: string; // só admin: enviar documento POR um funcionário
}

export class AtualizarStatusRhDto {
  @IsString()
  status!: string; // ENVIADO | VISTO | APROVADO
}

export class CriarRhSolicitacaoDto {
  @IsString()
  tipo!: string; // Férias | Adiantamento | Folga | Troca de escala | Outro

  @IsString()
  texto!: string;
}

export class ResponderRhSolicitacaoDto {
  @IsString()
  status!: string; // APROVADA | NEGADA | PENDENTE

  @IsOptional()
  @IsString()
  resposta?: string;
}

export class CriarRhComunicadoDto {
  @IsString()
  titulo!: string;

  @IsString()
  texto!: string;

  @IsOptional()
  @IsString()
  targetUserId?: string; // vazio = a TODOS
}

export class BaterPontoDto {
  @IsOptional()
  @IsString()
  tipo?: string; // ENTRADA | SAIDA_ALMOCO | VOLTA_ALMOCO | SAIDA (vazio = próxima do ciclo)
}

export class AjustePontoDto {
  @IsString()
  userId!: string; // funcionário

  @IsString()
  data!: string; // YYYY-MM-DD (dia local)

  @IsString()
  tipo!: string; // ENTRADA | SAIDA_ALMOCO | VOLTA_ALMOCO | SAIDA

  @IsString()
  hora!: string; // HH:MM (hora local)

  @IsString()
  justificativa!: string; // obrigatória
}
