import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ColumnsService } from './columns.service';
import { CreateColumnDto } from './dto/create-column.dto';
import { UpdateColumnDto } from './dto/update-column.dto';
import { CreateCardDto } from './dto/create-card.dto';
import { BatchUpdateColumnsDto } from './dto/batch-update-columns.dto';

@ApiTags('columns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class ColumnsController {
  constructor(private readonly columnsService: ColumnsService) {}

  // Boards -> Columns
  @Get('boards/:boardId/columns')
  @ApiOperation({ summary: 'Listar colunas de um board' })
  listBoardColumns(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.columnsService.listBoardColumns(boardId, userId);
  }

  @Post('boards/:boardId/columns')
  @ApiOperation({ summary: 'Criar coluna em um board' })
  createBoardColumn(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateColumnDto,
  ) {
    return this.columnsService.createBoardColumn(boardId, userId, dto);
  }

  @Patch('boards/:boardId/columns')
  @ApiOperation({ summary: 'Atualizar colunas de um board (reordenação em lote)' })
  batchUpdateBoardColumns(
    @Param('boardId') boardId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: BatchUpdateColumnsDto,
  ) {
    return this.columnsService.batchUpdateBoardColumns(boardId, userId, dto.columns);
  }

  // Column CRUD
  @Put('columns/:id')
  @ApiOperation({ summary: 'Atualizar coluna (rename, cor, etc)' })
  updateColumnPut(
    @Param('id') columnId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnsService.updateColumn(columnId, userId, dto);
  }

  @Patch('columns/:id')
  @ApiOperation({ summary: 'Atualizar coluna (parcial / mover posição)' })
  updateColumnPatch(
    @Param('id') columnId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateColumnDto,
  ) {
    return this.columnsService.updateColumn(columnId, userId, dto);
  }

  @Delete('columns/:id')
  @ApiOperation({ summary: 'Excluir coluna' })
  deleteColumn(@Param('id') columnId: string, @CurrentUser('id') userId: string) {
    return this.columnsService.deleteColumn(columnId, userId);
  }

  // Column -> Cards
  @Post('columns/:id/cards')
  @ApiOperation({ summary: 'Criar card em uma coluna' })
  createCard(
    @Param('id') columnId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCardDto,
  ) {
    return this.columnsService.createCard(columnId, userId, dto);
  }
}


