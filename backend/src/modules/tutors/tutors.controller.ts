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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TutorsService } from './tutors.service';
import { CreateTutorDto } from './dto/create-tutor.dto';
import { UpdateTutorDto } from './dto/update-tutor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('tutors')

// TODO (próxima sessão — porta dos endpoints do antigo módulo clients):
//   GET    /tutors/stats              — estatísticas do CRM (total, ACTIVE, by classificacao)
//   PATCH  /tutors/:id/status         — atualizar status (TutorStatus)
//   POST   /tutors/:id/tags           — adicionar tags
//   DELETE /tutors/:id/tags           — remover tags
//   POST   /tutors/:id/purchase       — registrar atendimento (substitui /clients/:id/purchase;
//                                       a soma virá de Appointments dinamicamente, não de campo cacheado)
// Lógica original em git history: commit a672640^ (clients.service.ts deletado).
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

  @Get(':id')
  @ApiOperation({ summary: 'Buscar tutor por ID' })
  findOne(@Param('id') id: string) {
    return this.tutorsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar tutor' })
  update(@Param('id') id: string, @Body() updateTutorDto: UpdateTutorDto) {
    return this.tutorsService.update(id, updateTutorDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover tutor' })
  remove(@Param('id') id: string) {
    return this.tutorsService.remove(id);
  }
}
