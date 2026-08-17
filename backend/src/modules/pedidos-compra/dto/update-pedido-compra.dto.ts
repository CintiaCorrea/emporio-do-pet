import { PartialType } from '@nestjs/swagger';
import { CreatePedidoCompraDto } from './create-pedido-compra.dto';

// Tudo opcional na edição (inclusive os itens — se vierem, substituem os atuais).
export class UpdatePedidoCompraDto extends PartialType(CreatePedidoCompraDto) {}
