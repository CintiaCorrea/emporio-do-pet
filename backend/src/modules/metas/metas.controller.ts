import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MetasService } from './metas.service';
import { CreateMetaDto, UpdateMetaDto } from './dto/meta.dto';

@ApiTags('metas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('metas')
export class MetasController {
  constructor(private readonly service: MetasService) {}
  @Get() list() { return this.service.list(); }
  @Post() create(@Body() dto: CreateMetaDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateMetaDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
  @Post('import-batch')
  importBatch(@Body() body: { rows: any[]; upsert?: boolean }) { return this.service.importBatch(body.rows, body.upsert); }
}
