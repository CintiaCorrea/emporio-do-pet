import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StockModule } from '../stock/stock.module';
import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

@Module({
  imports: [PrismaModule, StockModule],
  controllers: [PedidosCompraController],
  providers: [PedidosCompraService],
})
export class PedidosCompraModule {}
