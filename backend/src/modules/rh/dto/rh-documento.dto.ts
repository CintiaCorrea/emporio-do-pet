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
