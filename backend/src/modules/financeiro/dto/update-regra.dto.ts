import { PartialType } from '@nestjs/swagger';
import { CreateRegraDto } from './create-regra.dto';

export class UpdateRegraDto extends PartialType(CreateRegraDto) {}
