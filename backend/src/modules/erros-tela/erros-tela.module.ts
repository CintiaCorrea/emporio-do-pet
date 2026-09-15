import { Global, Module } from '@nestjs/common';
import { ErrosTelaController } from './erros-tela.controller';
import { ErrosTelaService } from './erros-tela.service';

// @Global para o expurgo diário (que roda no scheduler de exames) poder chamá-lo sem que os
// módulos precisem se conhecer.
@Global()
@Module({
  controllers: [ErrosTelaController],
  providers: [ErrosTelaService],
  exports: [ErrosTelaService],
})
export class ErrosTelaModule {}
