import { Module } from '@nestjs/common';
import { DietasController } from './dietas.controller';
import { DietasService } from './dietas.service';

/**
 * Modulo ALIMENTACAO/DIETA — clinico (do CRM). Nasceu junto com o Portal do
 * Tutor, que foi quem expos a falta, mas o dono e o modulo clinico: quem
 * prescreve e a equipe, e o portal so le.
 */
@Module({
  controllers: [DietasController],
  providers: [DietasService],
  exports: [DietasService],
})
export class DietasModule {}
