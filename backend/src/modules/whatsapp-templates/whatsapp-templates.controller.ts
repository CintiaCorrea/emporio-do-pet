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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';
import { CreateSimpleTemplateDto } from './dto/create-whatsapp-template.dto';

interface JwtUser {
  id: string;
  email: string;
}

@Controller('whatsapp-templates')
@UseGuards(JwtAuthGuard)
export class WhatsAppTemplatesController {
  constructor(private readonly templatesService: WhatsAppTemplatesService) {}

  /**
   * List all templates
   */
  @Get()
  async listTemplates(
    @CurrentUser() user: JwtUser,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('after') after?: string,
  ) {
    return this.templatesService.listTemplates(user.id, {
      status,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      after,
    });
  }

  /**
   * Get template metadata (categories, languages, button types)
   */
  @Get('metadata')
  getMetadata() {
    return {
      categories: this.templatesService.getCategories(),
      languages: this.templatesService.getLanguages(),
      buttonTypes: this.templatesService.getButtonTypes(),
    };
  }

  /**
   * Get status information
   */
  @Get('status-info/:status')
  getStatusInfo(@Param('status') status: string) {
    return this.templatesService.getStatusInfo(status);
  }

  /**
   * Get template by ID
   */
  @Get(':id')
  async getTemplate(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    const template = await this.templatesService.getTemplate(user.id, id);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  /**
   * Get template by name
   */
  @Get('by-name/:name')
  async getTemplateByName(@CurrentUser() user: JwtUser, @Param('name') name: string) {
    const template = await this.templatesService.getTemplateByName(user.id, name);
    if (!template) {
      return { error: 'Template not found' };
    }
    return template;
  }

  /**
   * Create a new template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateSimpleTemplateDto,
  ) {
    return this.templatesService.createTemplate(user.id, dto);
  }

  /**
   * Update a template (only for REJECTED or PAUSED templates)
   */
  @Patch(':id')
  async updateTemplate(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateSimpleTemplateDto>,
  ) {
    return this.templatesService.updateTemplate(user.id, id, dto);
  }

  /**
   * Delete a template by name
   */
  @Delete(':name')
  @HttpCode(HttpStatus.OK)
  async deleteTemplate(@CurrentUser() user: JwtUser, @Param('name') name: string) {
    return this.templatesService.deleteTemplate(user.id, name);
  }
}
