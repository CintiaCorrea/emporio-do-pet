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
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('pets')
@Controller('pets')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar novo pet' })
  create(@Body() createPetDto: CreatePetDto) {
    return this.petsService.create(createPetDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar pets' })
  @ApiQuery({ name: 'tutorId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'species', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAll(
    @Query('tutorId') tutorId?: string,
    @Query('search') search?: string,
    @Query('species') species?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.petsService.findAll({
      tutorId,
      search,
      species,
      status,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      skip,
      take,
    });
  }

  @Get('lista-simples')
  @ApiOperation({ summary: 'Lista leve de todos os pets em ordem alfabetica' })
  listaSimples() {
    return this.petsService.listaSimples();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar pet por ID' })
  findOne(@Param('id') id: string) {
    return this.petsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar pet' })
  update(@Param('id') id: string, @Body() updatePetDto: UpdatePetDto) {
    return this.petsService.update(id, updatePetDto);
  }

  @Patch(':id/transferir')
  @ApiOperation({ summary: 'Transferir pet para outro cliente (mesclagem de duplicados)' })
  transferir(@Param('id') id: string, @Body() body: { tutorId: string }) {
    return this.petsService.transferir(id, body?.tutorId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover pet' })
  remove(@Param('id') id: string) {
    return this.petsService.remove(id);
  }

  @Get(':id/profile-stats')
  profileStats(@Param('id') id: string) { return this.petsService.profileStats(id); }
}