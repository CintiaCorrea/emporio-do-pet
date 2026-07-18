import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { IsArray, IsEnum, IsInt, IsString } from 'class-validator';
import { TutorStatus } from '@prisma/client';
import { TutorsService } from './tutors.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

class UpdateStatusDto {
  @IsEnum(TutorStatus)
  status: TutorStatus;
}

class ManageTagsDto {
  @IsArray()
  @IsString({ each: true })
  tags: string[];
}

class RecordPurchaseDto {
  @IsInt()
  amountCents: number;
}

@ApiTags('tutors')

@Controller('tutors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TutorsController {
  constructor(private readonly tutorsService: TutorsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo tutor' })
  create(@Body() createTutorDto: CreateTutorDto) {
    return this.tutorsService.create(createTutorDto);
  }

  @Post(':id/reclassify-as-lead')
  @ApiOperation({ summary: 'Reclassifica um cliente-fantasma de volta pra lead (só se não tiver pet/atendimento)' })
  reclassifyAsLead(@Param('id') id: string) {
    return this.tutorsService.reclassifyAsLead(id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tutores' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAll(
    @Query('search') search?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.tutorsService.findAll({ search, skip, take });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estatísticas do CRM (tutores com classificacao=Cliente)' })
  getStats() {
    return this.tutorsService.getStats();
  }

  @Get('lista-simples')
  @ApiOperation({ summary: 'Lista leve de tutores para a tela de Clientes' })
  listaSimples() {
    return this.tutorsService.listaSimples();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tutor por ID' })
  findOne(@Param('id') id: string) {
    return this.tutorsService.findByIdExpanded(id);
  }


  @Get(':id/profile-stats')
  @ApiOperation({ summary: 'Estatísticas individuais do tutor (LTV, frequência, etc)' })
  profileStats(@Param('id') id: string) { return this.tutorsService.profileStats(id); }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tutor' })
  update(@Param('id') id: string, @Body() updateTutorDto: UpdateTutorDto) {
    return this.tutorsService.update(id, updateTutorDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status do tutor' })
  @HttpCode(HttpStatus.OK)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.tutorsService.updateStatus(id, dto.status);
  }

  @Post(':id/tags')
  @ApiOperation({ summary: 'Adicionar tags ao tutor' })
  @HttpCode(HttpStatus.OK)
  addTags(@Param('id') id: string, @Body() dto: ManageTagsDto) {
    return this.tutorsService.addTags(id, dto.tags);
  }

  @Delete(':id/tags')
  @ApiOperation({ summary: 'Remover tags do tutor' })
  @HttpCode(HttpStatus.OK)
  removeTags(@Param('id') id: string, @Body() dto: ManageTagsDto) {
    return this.tutorsService.removeTags(id, dto.tags);
  }

  @Post(':id/purchase')
  @ApiOperation({ summary: 'Registrar compra (deprecated — use Appointment)' })
  @HttpCode(HttpStatus.OK)
  recordPurchase(@Param('id') id: string, @Body() dto: RecordPurchaseDto) {
    return this.tutorsService.recordPurchase(id, dto.amountCents);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover tutor' })
  remove(@Param('id') id: string) {
    return this.tutorsService.remove(id);
  }
}
