import { Global, Module } from '@nestjs/common';
import { PermissoesService } from './permissoes.service';

// @Global porque a pergunta "esta pessoa pode?" vai aparecer em vários módulos (caixa, vendas,
// internação) e importar o módulo em cada um só acrescentaria cerimônia. PrismaModule já é
// global pelo mesmo motivo.
@Global()
@Module({
  providers: [PermissoesService],
  exports: [PermissoesService],
})
export class PermissoesModule {}
