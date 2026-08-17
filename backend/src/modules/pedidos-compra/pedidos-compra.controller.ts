import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreatePedidoCompraDto } from './dto/create-pedido-compra.dto';
import { UpdatePedidoCompraDto } from './dto/update-pedido-compra.dto';
import { PedidosCompraService } from './pedidos-compra.service';

@ApiTags('pedidos-compra')
@Controller('pedidos-compra')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PedidosCompraController {
  constructor(private readonly service: PedidosCompraService) {}

  @Get()
  @ApiOperation({ summary: 'Listar pedidos de compra' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'fornecedorId', required: false })
  list(@Query('status') status?: string, @Query('fornecedorId') fornecedorId?: string) {
    return this.service.list({ status, fornecedorId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalhe do pedido de compra' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar pedido de compra' })
  create(@Body() dto: CreatePedidoCompraDto, @CurrentUser() user: { id: string; name?: string; email: string }) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar pedido de compra' })
  update(@Param('id') id: string, @Body() dto: UpdatePedidoCompraDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir pedido de compra' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/receber')
  @ApiOperation({ summary: 'Receber o pedido — dá entrada no estoque de cada item' })
  receber(@Param('id') id: string, @CurrentUser() user: { id: string; name?: string; email: string }) {
    return this.service.receber(id, user);
  }
}
