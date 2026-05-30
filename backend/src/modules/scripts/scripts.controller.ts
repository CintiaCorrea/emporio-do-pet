import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScriptsService } from './scripts.service';
import { CreateScriptCategoryDto, UpdateScriptCategoryDto, CreateScriptTemplateDto, UpdateScriptTemplateDto } from './dto/script.dto';

@ApiTags('scripts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('scripts')
export class ScriptsController {
  constructor(private readonly service: ScriptsService) {}

  // Categories
  @Get('categories')
  listCats(@Query('includeInactive') includeInactive?: string) {
    return this.service.listCategories(includeInactive === 'true');
  }
  @Post('categories')
  createCat(@Body() dto: CreateScriptCategoryDto) { return this.service.createCategory(dto); }
  @Patch('categories/:id')
  updateCat(@Param('id') id: string, @Body() dto: UpdateScriptCategoryDto) { return this.service.updateCategory(id, dto); }
  @Delete('categories/:id')
  removeCat(@Param('id') id: string) { return this.service.removeCategory(id); }

  // Scripts
  @Get()
  list(@Query('includeInactive') includeInactive?: string, @Query('categoryId') categoryId?: string) {
    return this.service.listScripts(includeInactive === 'true', categoryId);
  }
  @Post()
  create(@Body() dto: CreateScriptTemplateDto) { return this.service.createScript(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateScriptTemplateDto) { return this.service.updateScript(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.removeScript(id); }
  @Post(':id/use')
  use(@Param('id') id: string) { return this.service.incrementUsage(id); }

  // Seed
  @Post('seed-pacote-inicial')
  seed() { return this.service.seedPacoteInicial(); }
}
