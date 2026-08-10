import { Global, Module } from '@nestjs/common';
import { CronHealthService } from './cron-health.service';
import { CronHealthController } from './cron-health.controller';

/**
 * Global: qualquer scheduler pode injetar CronHealthService e chamar registrar('<job>')
 * sem precisar importar módulo. O controller expõe GET /api/health/automations (admin).
 */
@Global()
@Module({
  providers: [CronHealthService],
  controllers: [CronHealthController],
  exports: [CronHealthService],
})
export class CronHealthModule {}
