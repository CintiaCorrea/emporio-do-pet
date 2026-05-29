import { Module } from '@nestjs/common';
import { HojeController } from './hoje.controller';
import { HojeService } from './hoje.service';

@Module({ controllers: [HojeController], providers: [HojeService] })
export class HojeModule {}
