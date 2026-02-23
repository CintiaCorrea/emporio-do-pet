import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { GenerateContentDto } from './dto/generate-content.dto';

@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar documentos do usuário' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  async list(
    @CurrentUser('id') userId: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('category') category?: string,
  ) {
    const documents = await this.documentsService.list(userId, { search, status, category });
    return { documents };
  }

  @Post()
  @ApiOperation({ summary: 'Criar documento' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateDocumentDto) {
    return this.documentsService.create(userId, dto);
  }

  @Post('generate-content')
  @ApiOperation({ summary: 'Gerar conteúdo formatado com IA a partir de transcrição' })
  generateContent(@CurrentUser('id') userId: string, @Body() dto: GenerateContentDto) {
    return this.documentsService.generateContent(userId, dto);
  }

  @Post('generate-from-transcription')
  @ApiOperation({ summary: 'Gerar documento formatado com IA usando os templates clínicos' })
  generateFromTranscription(
    @CurrentUser('id') userId: string,
    @Body() dto: {
      transcription: string;
      documentType: string;
      signedBy?: string;
      crmv?: string;
      additionalContext?: string;
      customTitle?: string;
      petName?: string;
      tutorName?: string;
      provider?: string;
      model?: string;
    },
  ) {
    return this.documentsService.generateFromTranscription(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar documento por ID' })
  findOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.documentsService.findById(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar documento' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Excluir documento' })
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.documentsService.remove(userId, id);
  }
}

