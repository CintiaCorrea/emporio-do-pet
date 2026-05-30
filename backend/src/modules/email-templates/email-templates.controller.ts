import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto, UpdateEmailTemplateDto, CreateEmailVariableDto, UpdateEmailVariableDto } from './dto/email.dto';

@ApiTags('email-templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('email-templates')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) { return this.service.listTemplates(includeInactive === 'true'); }
  @Post()
  create(@Body() dto: CreateEmailTemplateDto) { return this.service.createTemplate(dto); }
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmailTemplateDto) { return this.service.updateTemplate(id, dto); }
  @Delete(':id')
  remove(@Param('id') id: string) { return this.service.removeTemplate(id); }

  @Get('variables/lista')
  listVars(@Query('includeInactive') includeInactive?: string) { return this.service.listVariables(includeInactive === 'true'); }
  @Post('variables')
  createVar(@Body() dto: CreateEmailVariableDto) { return this.service.createVariable(dto); }
  @Patch('variables/:id')
  updateVar(@Param('id') id: string, @Body() dto: UpdateEmailVariableDto) { return this.service.updateVariable(id, dto); }
  @Delete('variables/:id')
  removeVar(@Param('id') id: string) { return this.service.removeVariable(id); }

  @Post('seed-pacote-inicial')
  seed() { return this.service.seedPacoteInicial(); }

  @Post('import-batch')
  importBatch(@Body() body: { rows: any[]; upsert?: boolean }) {
    return this.service.importBatch(body.rows, body.upsert);
  }
}