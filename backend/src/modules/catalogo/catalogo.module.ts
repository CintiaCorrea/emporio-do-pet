import { Module } from '@nestjs/common';
import { CatalogoController } from './catalogo.controller';
import { CatalogoService } from './catalogo.service';
import { CatalogoScheduler } from './catalogo.scheduler';

@Module({
  controllers: [CatalogoController],
  providers: [CatalogoService, CatalogoScheduler],
  exports: [CatalogoService],
})
export class CatalogoModule {}
