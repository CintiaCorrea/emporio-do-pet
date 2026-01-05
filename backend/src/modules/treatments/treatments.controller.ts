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
import { CreateTreatmentDto } from './dto/create-treatment.dto';
import { UpdateTreatmentDto } from './dto/update-treatment.dto';
import { TreatmentsService } from './treatments.service';

@ApiTags('treatments')
@Controller('treatments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar tratamentos' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'appointmentId', required: false })
  @ApiQuery({ name: 'petId', required: false })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('petId') petId?: string,
  ) {
    return this.treatmentsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
      search,
      appointmentId,
      petId,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Criar tratamento' })
  create(@Body() dto: CreateTreatmentDto) {
    return this.treatmentsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tratamento por ID' })
  findOne(@Param('id') id: string) {
    return this.treatmentsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tratamento (parcial)' })
  update(@Param('id') id: string, @Body() dto: UpdateTreatmentDto) {
    return this.treatmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir tratamento' })
  remove(@Param('id') id: string) {
    return this.treatmentsService.remove(id);
  }
}


