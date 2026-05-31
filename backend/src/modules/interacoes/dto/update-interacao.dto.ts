import { PartialType } from '@nestjs/swagger';
import { CreateInteracaoDto } from './create-interacao.dto';
export class UpdateInteracaoDto extends PartialType(CreateInteracaoDto) {}
