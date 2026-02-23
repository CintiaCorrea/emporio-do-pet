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
import { CommissionsService } from './commissions.service';
import { CreateCommissionDto } from './dto/create-commission.dto';
import { UpdateCommissionDto } from './dto/update-commission.dto';

@ApiTags('commissions')
@Controller('commissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar comissões (derivadas de appointments)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  list(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.commissionsService.list({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      userId,
      startDate,
      endDate,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Criar comissão (atualiza appointment)' })
  create(@Body() dto: CreateCommissionDto) {
    return this.commissionsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar comissão por ID' })
  get(@Param('id') id: string) {
    return this.commissionsService.getById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar comissão (status/valor) via appointment' })
  update(@Param('id') id: string, @Body() dto: UpdateCommissionDto) {
    return this.commissionsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancelar comissão (cancela appointment)' })
  remove(@Param('id') id: string) {
    return this.commissionsService.remove(id);
  }
}
