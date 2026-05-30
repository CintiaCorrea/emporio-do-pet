import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FornecedoresService } from './fornecedores.service';
import { CreateFornecedorDto, UpdateFornecedorDto } from './dto/fornecedor.dto';
import { CreateExameDto, UpdateExameDto } from './dto/exame.dto';
import { ImportBatchDto } from './dto/import.dto';

@ApiTags('fornecedores')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fornecedores')
export class FornecedoresController {
  constructor(private readonly service: FornecedoresService) {}

  // ===== Fornecedores =====
  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    return this.service.listFornecedores(includeInactive === 'true');
  }
  @Post()
  create(@Body() dto: CreateFornecedorDto) { return this.service.createFornecedor(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFornecedorDto) { return this.service.updateFornecedor(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.removeFornecedor(id); }

  // ===== Exames =====
  @Get('exames/lista')
  listExames(
    @Query('includeInactive') includeInactive?: string,
    @Query('fornecedorId') fornecedorId?: string,
  ) {
    return this.service.listExames(includeInactive === 'true', fornecedorId);
  }
  @Post('exames')
  createExame(@Body() dto: CreateExameDto) { return this.service.createExame(dto); }
  @Patch('exames/:id')
  updateExame(@Param('id') id: string, @Body() dto: UpdateExameDto) { return this.service.updateExame(id, dto); }
  @Delete('exames/:id')
  removeExame(@Param('id') id: string) { return this.service.removeExame(id); }

  // ===== Seed inicial =====
  @Post('seed-pacote-inicial')
  seed() { return this.service.seedPacoteInicial(); }

  // ===== Import em lote =====
  @Post('exames/import-batch')
  importBatch(@Body() dto: ImportBatchDto) { return this.service.importBatch(dto); }
}