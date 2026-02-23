import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTutorDto } from './create-tutor.dto';

/**
 * Atualização de tutor não gerencia contatos.
 * Contatos são gerenciados pelo módulo `contacts`.
 */
export class UpdateTutorDto extends PartialType(OmitType(CreateTutorDto, ['contacts'] as const)) {}
