import { Module } from '@nestjs/common';
import { ProtocolosService } from './protocolos.service';
import { ProtocolosController } from './protocolos.controller';

@Module({
  controllers: [ProtocolosController],
  providers: [ProtocolosService],
  exports: [ProtocolosService],
})
export class ProtocolosModule {}
