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

  private coerceNonNegativeInt(value: unknown, fallback: number) {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : Number.NaN;

    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
  }

  private coercePositiveInt(value: unknown, fallback: number) {
    const n =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : Number.NaN;

    return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
  }

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
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    const safeSkip = this.coerceNonNegativeInt(skip, 0);
    const safeTake = this.coercePositiveInt(take, 20);

    return this.newslettersService.findAll(userId, { status, skip: safeSkip, take: safeTake });
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

