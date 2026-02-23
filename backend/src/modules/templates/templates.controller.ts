import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto, TemplateStatus } from './dto/create-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(user.id, dto);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('includeDefaults') includeDefaults?: string,
  ) {
    return this.templatesService.findAll(user.id, {
      category,
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      includeDefaults: includeDefaults === 'true',
    });
  }

  @Get('categories')
  getCategories() {
    return this.templatesService.getCategories();
  }

  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.remove(user.id, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: TemplateStatus,
  ) {
    return this.templatesService.updateStatus(user.id, id, status);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('name') name?: string,
  ) {
    return this.templatesService.duplicate(user.id, id, name);
  }

  @Get(':id/export')
  exportOne(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templatesService.exportTemplate(user.id, id);
  }

  @Post('export')
  exportMany(
    @CurrentUser() user: JwtUser,
    @Body('templateIds') templateIds?: string[],
  ) {
    return this.templatesService.exportTemplates(user.id, templateIds);
  }

  @Post('import')
  importTemplates(
    @CurrentUser() user: JwtUser,
    @Body('templates')
    templates: Array<{
      name: string;
      description?: string;
      category?: string;
      content: string;
      variables?: string[];
      provider?: string;
      model?: string;
    }>,
  ) {
    return this.templatesService.importTemplates(user.id, templates);
  }
}
