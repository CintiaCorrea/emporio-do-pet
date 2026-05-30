import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CampanhasService } from './campanhas.service';
import { CreateCampanhaDto, UpdateCampanhaDto } from './dto/campanha.dto';

@ApiTags('campanhas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('campanhas')
export class CampanhasController {
  constructor(private readonly service: CampanhasService) {}

  @Get()
  list(@Query('status') status?: string) { return this.service.list(status); }
  @Post()
  create(@Body() dto: CreateCampanhaDto) { return this.service.create(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampanhaDto) { return this.service.update(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.remove(id); }

  @Post('import-batch')
  importBatch(@Body() body: { rows: any[]; upsert?: boolean }) {
    return this.service.importBatch(body.rows, body.upsert);
  }
}
