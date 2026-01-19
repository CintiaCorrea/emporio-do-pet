import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FinanceService } from './finance.service';
import { CreateFinanceEntryDto } from './dto/create-finance-entry.dto';
import { UpdateFinanceEntryDto } from './dto/update-finance-entry.dto';
import { ListFinanceEntriesQuery } from './dto/list-finance-entries.query';

@ApiTags('finance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('entries')
  @ApiOperation({ summary: 'Listar lançamentos financeiros' })
  findAll(@CurrentUser('id') userId: string, @Query() query: ListFinanceEntriesQuery) {
    return this.financeService.findAll(userId, query);
  }

  @Post('entries')
  @ApiOperation({ summary: 'Criar lançamento financeiro' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateFinanceEntryDto) {
    return this.financeService.create(userId, dto);
  }

  @Get('entries/:id')
  @ApiOperation({ summary: 'Buscar lançamento por ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.financeService.findById(userId, id);
  }

  @Patch('entries/:id')
  @ApiOperation({ summary: 'Atualizar lançamento' })
  update(@CurrentUser('id') userId: string, @Param('id') id: string, @Body() dto: UpdateFinanceEntryDto) {
    return this.financeService.update(userId, id, dto);
  }

  @Delete('entries/:id')
  @ApiOperation({ summary: 'Remover lançamento' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.financeService.remove(userId, id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumo financeiro (receitas)' })
  summary(@CurrentUser('id') userId: string, @Query('from') from?: string, @Query('to') to?: string) {
    return this.financeService.summary(userId, { from, to });
  }
}


