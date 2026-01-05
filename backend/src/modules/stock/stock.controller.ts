import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { StockService } from './stock.service';

@ApiTags('stock')
@Controller('stock/movements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get()
  @ApiOperation({ summary: 'Listar movimentações de estoque' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('productId') productId?: string,
  ) {
    return this.stockService.listMovements({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      productId,
    });
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Listar movimentações de um produto' })
  listByProduct(@Param('productId') productId: string) {
    return this.stockService.listMovementsByProduct(productId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar movimentação de estoque (ajusta o stock do produto)' })
  create(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() user: { id: string; name?: string; email: string },
  ) {
    return this.stockService.createMovement(dto, user);
  }
}


