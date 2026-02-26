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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppTemplatesService } from './whatsapp-templates.service';
import { CreateSimpleTemplateDto, CreateWhatsAppTemplateDto } from './dto/create-whatsapp-template.dto';

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

  @Get('flows')
  async listFlows(@CurrentUser() user: JwtUser) {
    return this.templatesService.listFlows(user.id);
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
   * Create a new template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @CurrentUser() user: JwtUser,
    @Body() dto: CreateWhatsAppTemplateDto,
  ) {
    return this.templatesService.createTemplate(user.id, dto);
  }

  @Post('upload-media')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 100 * 1024 * 1024 },
    }),
  )
  async uploadMedia(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo não enviado.');
    }
    const result = await this.templatesService.uploadTemplateMedia(file.buffer, file.mimetype, file.originalname);
    if (!result.handle) {
      throw new BadRequestException(result.error || 'Não foi possível fazer upload da mídia.');
    }
    return { handle: result.handle };
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
