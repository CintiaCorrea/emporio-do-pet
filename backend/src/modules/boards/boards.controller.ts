import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BoardsService } from './boards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('boards')
@Controller('boards')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BoardsController {
  constructor(private readonly boardsService: BoardsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar novo board' })
  create(@CurrentUser('id') userId: string, @Body() createBoardDto: CreateBoardDto) {
    return this.boardsService.create(userId, createBoardDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar boards do usuário' })
  findAll(@CurrentUser('id') userId: string) {
    return this.boardsService.findAll(userId);
  }

  @Get('default/consultation')
  @ApiOperation({ summary: 'Obter board de Consultas (cria se não existir)' })
  getConsultationBoard(@CurrentUser('id') userId: string) {
    return this.boardsService.getConsultationBoard(userId);
  }

  @Get('default/hospitalization')
  @ApiOperation({ summary: 'Obter board de Internações (cria se não existir)' })
  getHospitalizationBoard(@CurrentUser('id') userId: string) {
    return this.boardsService.getHospitalizationBoard(userId);
  }

  @Post('default/ensure')
  @ApiOperation({ summary: 'Garantir que boards padrão existam para o usuário' })
  ensureDefaultBoards(@CurrentUser('id') userId: string) {
    return this.boardsService.ensureDefaultBoards(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar board por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.boardsService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar board' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateBoardDto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, userId, updateBoardDto);
  }

  @Patch(':id/favorite')
  @ApiOperation({ summary: 'Alternar favorito do board' })
  toggleFavorite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.boardsService.toggleFavorite(id, userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover board' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.boardsService.remove(id, userId);
  }
}
