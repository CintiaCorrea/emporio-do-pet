import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EtiquetasService } from './etiquetas.service';
import { CreateTagCategoryDto, UpdateTagCategoryDto } from './dto/category.dto';
import { CreateEtiquetaDto, UpdateEtiquetaDto } from './dto/etiqueta.dto';

@ApiTags('etiquetas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('etiquetas')
export class EtiquetasController {
  constructor(private readonly service: EtiquetasService) {}

  // ===== Categorias =====
  @Get('categorias')
  listCategories(@Query('includeInactive') includeInactive?: string) {
    return this.service.listCategories(includeInactive === 'true');
  }

  @Post('categorias')
  createCategory(@Body() dto: CreateTagCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categorias/:id')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateTagCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categorias/:id')
  removeCategory(@Param('id') id: string) {
    return this.service.removeCategory(id);
  }

  // ===== Etiquetas =====
  @Get('templates')
  listEtiquetas(
    @Query('includeInactive') includeInactive?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.listEtiquetas(includeInactive === 'true', categoryId);
  }

  @Post('templates')
  createEtiqueta(@Body() dto: CreateEtiquetaDto) {
    return this.service.createEtiqueta(dto);
  }

  @Patch('templates/:id')
  updateEtiqueta(@Param('id') id: string, @Body() dto: UpdateEtiquetaDto) {
    return this.service.updateEtiqueta(id, dto);
  }

  @Delete('templates/:id')
  removeEtiqueta(@Param('id') id: string) {
    return this.service.removeEtiqueta(id);
  }
}
