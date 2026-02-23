import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateHospitalizationDto } from './dto/create-hospitalization.dto';
import { UpdateHospitalizationDto } from './dto/update-hospitalization.dto';
import { HospitalizationsService } from './hospitalizations.service';

@ApiTags('hospitalizations')
@Controller('hospitalizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HospitalizationsController {
  constructor(private readonly hospitalizationsService: HospitalizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar internações (derivadas de appointments)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.hospitalizationsService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      status,
      priority,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Criar internação (cria appointment)' })
  create(@Body() dto: CreateHospitalizationDto) {
    return this.hospitalizationsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar internação por ID' })
  get(@Param('id') id: string) {
    return this.hospitalizationsService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar internação' })
  update(@Param('id') id: string, @Body() dto: UpdateHospitalizationDto) {
    return this.hospitalizationsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir internação (deleta appointment)' })
  remove(@Param('id') id: string) {
    return this.hospitalizationsService.remove(id);
  }
}
