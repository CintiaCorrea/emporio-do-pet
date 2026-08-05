import { PartialType } from '@nestjs/swagger';
import { CreateLancamentoDto } from './create-lancamento.dto';

export class UpdateLancamentoDto extends PartialType(CreateLancamentoDto) {}
