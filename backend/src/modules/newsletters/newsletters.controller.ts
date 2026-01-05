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
import { NewslettersService } from './newsletters.service';
import { CreateNewsletterDto } from './dto/create-newsletter.dto';
import { UpdateNewsletterDto } from './dto/update-newsletter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('newsletters')
@Controller('newsletters')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NewslettersController {
  constructor(private readonly newslettersService: NewslettersService) {}

  @Post()
  @ApiOperation({ summary: 'Criar newsletter' })
  create(
    @CurrentUser('id') userId: string,
    @Body() createNewsletterDto: CreateNewsletterDto,
  ) {
    return this.newslettersService.create(userId, createNewsletterDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar newsletters' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('skip') skip?: number,
    @Query('take') take?: number,
  ) {
    return this.newslettersService.findAll(userId, { status, skip, take });
  }

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates disponíveis' })
  getTemplates() {
    return this.newslettersService.getTemplates();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar newsletter por ID' })
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.newslettersService.findById(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar newsletter' })
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() updateNewsletterDto: UpdateNewsletterDto,
  ) {
    return this.newslettersService.update(id, userId, updateNewsletterDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover newsletter' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.newslettersService.remove(id, userId);
  }
}

