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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  AgentTemplatesService,
  CreateAgentTemplateDto,
  UpdateAgentTemplateDto,
} from './services/agent-templates.service';

interface JwtUser {
  id: string;
  email: string;
  role: string;
}

@Controller('agent-templates')
@UseGuards(JwtAuthGuard)
export class AgentTemplatesController {
  constructor(private readonly templatesService: AgentTemplatesService) {}

  /**
   * Create a new agent template
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: JwtUser, @Body() dto: CreateAgentTemplateDto) {
    return this.templatesService.create(user.id, dto);
  }

  /**
   * Get all templates
   */
  @Get()
  findAll(
    @CurrentUser() user: JwtUser,
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('whatsappLinked') whatsappLinked?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.templatesService.findAll(user.id, {
      category,
      status,
      isWhatsAppLinked: whatsappLinked === 'true' ? true : whatsappLinked === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get default/system templates
   */
  @Get('defaults')
  getDefaults() {
    return this.templatesService.getDefaultTemplates();
  }

  /**
   * Get available WhatsApp templates for linking
   */
  @Get('whatsapp-available')
  getAvailableWhatsAppTemplates(@CurrentUser() user: JwtUser) {
    return this.templatesService.getAvailableWhatsAppTemplates(user.id);
  }

  /**
   * Get a single template
   */
  @Get(':id')
  findOne(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.findOne(user.id, id);
  }

  /**
   * Update a template
   */
  @Patch(':id')
  update(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAgentTemplateDto,
  ) {
    return this.templatesService.update(user.id, id, dto);
  }

  /**
   * Delete a template
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.remove(user.id, id);
  }

  /**
   * Sync WhatsApp template data
   */
  @Post(':id/sync-whatsapp')
  syncWhatsApp(@CurrentUser() user: JwtUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templatesService.syncWhatsAppTemplate(user.id, id);
  }

  /**
   * Create an agent from this template
   */
  @Post(':id/create-agent')
  createAgent(
    @CurrentUser() user: JwtUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    body: {
      name: string;
      description?: string;
      provider?: string;
      model?: string;
      systemPrompt?: string;
    },
  ) {
    return this.templatesService.createAgentFromTemplate(user.id, id, body.name, {
      description: body.description,
      provider: body.provider,
      model: body.model,
      systemPrompt: body.systemPrompt,
    });
  }
}
