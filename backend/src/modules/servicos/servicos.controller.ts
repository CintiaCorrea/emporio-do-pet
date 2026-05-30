import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServicosService } from './servicos.service';
import { CreateServiceCategoryDto, UpdateServiceCategoryDto } from './dto/category.dto';
import { CreateServicoDto, UpdateServicoDto } from './dto/servico.dto';

@ApiTags('servicos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('servicos')
export class ServicosController {
  constructor(private readonly service: ServicosService) {}

  // ===== Categorias =====
  @Get('categorias')
  listCategories(@Query('includeInactive') includeInactive?: string) {
    return this.service.listCategories(includeInactive === 'true');
  }
  @Post('categorias')
  createCategory(@Body() dto: CreateServiceCategoryDto) {
    return this.service.createCategory(dto);
  }
  @Patch('categorias/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateServiceCategoryDto) {
    return this.service.updateCategory(id, dto);
  }
  @Delete('categorias/:id')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  // ===== Serviços =====
  @Get('itens')
  listServicos(
    @Query('includeInactive') includeInactive?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.listServicos(includeInactive === 'true', categoryId);
  }
  @Post('itens')
  createServico(@Body() dto: CreateServicoDto) {
    return this.service.createServico(dto);
  }
  @Patch('itens/:id')
  updateServico(@Param('id') id: string, @Body() dto: UpdateServicoDto) {
    return this.service.updateServico(id, dto);
  }
  @Delete('itens/:id')
  removeServico(@Param('id') id: string) {
    return this.service.removeServico(id);
  }

  // ===== Seed (pacote inicial) =====
  @Post('seed')
  seedPacoteInicial() {
    return this.service.seedPacoteInicial();
  }
}
