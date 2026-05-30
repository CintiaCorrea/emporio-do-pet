import { PartialType } from '@nestjs/swagger';
import { CreateProfissionalDto } from './create-profissional.dto';

export class UpdateProfissionalDto extends PartialType(CreateProfissionalDto) {}
