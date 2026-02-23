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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientsService } from './clients.service';
import { CreateClientDto, ClientStatus, ClientType } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { IsString, IsArray, IsInt, IsOptional, IsEnum } from 'class-validator';
import { ClientStatus as PrismaClientStatus } from '@prisma/client';

class UpdateStatusDto {
  @IsEnum(ClientStatus)
  status: ClientStatus;
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

@ApiTags('clients')
@Controller('clients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clients com filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ClientStatus })
  @ApiQuery({ name: 'type', required: false, enum: ClientType })
  @ApiQuery({ name: 'tags', required: false, type: [String] })
  @ApiQuery({ name: 'fromLead', required: false, type: Boolean })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('search') search?: string,
    @Query('status') status?: ClientStatus,
    @Query('type') type?: ClientType,
    @Query('tags') tags?: string | string[],
    @Query('fromLead') fromLead?: string,
  ) {
    return this.clientsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      skip: skip !== undefined ? Number(skip) : undefined,
      take: take !== undefined ? Number(take) : undefined,
      search,
      status: status as unknown as PrismaClientStatus,
      type: type as 'INDIVIDUAL' | 'COMPANY',
      tags: tags ? (Array.isArray(tags) ? tags : [tags]) : undefined,
      fromLead: fromLead === 'true' ? true : fromLead === 'false' ? false : undefined,
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get client statistics' })
  getStats() {
    return this.clientsService.getStats();
  }

  @Post()
  @ApiOperation({ summary: 'Criar client' })
  create(@Body() dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar client por ID' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar client (parcial)' })
  update(@Param('id') id: string, @Body() dto: UpdateClientDto) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir client' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update client status' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.clientsService.updateStatus(id, dto.status as unknown as PrismaClientStatus);
  }

  @Post(':id/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add tags to client' })
  addTags(@Param('id') id: string, @Body() dto: ManageTagsDto) {
    return this.clientsService.addTags(id, dto.tags);
  }

  @Delete(':id/tags')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove tags from client' })
  removeTags(@Param('id') id: string, @Body() dto: ManageTagsDto) {
    return this.clientsService.removeTags(id, dto.tags);
  }

  @Post(':id/purchase')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Record a purchase for client' })
  recordPurchase(@Param('id') id: string, @Body() dto: RecordPurchaseDto) {
    return this.clientsService.recordPurchase(id, dto.amountCents);
  }
}
