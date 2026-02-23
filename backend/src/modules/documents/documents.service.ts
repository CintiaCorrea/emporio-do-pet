import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { GenerateContentDto } from './dto/generate-content.dto';
import { DOCUMENT_PROMPTS, DOCUMENT_TYPE_LABELS, getDocumentHtmlWrapper } from '../clinical-documents/templates/document-prompts';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
  ) {}

  async list(userId: string, params?: { search?: string; status?: string; category?: string }) {
    const search = params?.search?.trim() || '';
    const status = params?.status?.trim() || undefined;
    const category = params?.category?.trim() || undefined;

    return this.prisma.document.findMany({
      where: {
        userId,
        ...(status ? { status: status as any } : {}),
        ...(category ? { category } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateDocumentDto) {
    const title = dto.title?.trim();
    if (!title) throw new BadRequestException('Título é obrigatório');

    return this.prisma.document.create({
      data: {
        userId,
        title,
        content: dto.content || '',
        status: (dto.status as any) || 'DRAFT',
        category: dto.category ?? null,
        tags: dto.tags || [],
      },
    });
  }

  async findById(userId: string, id: string) {
    const doc = await this.prisma.document.findFirst({
      where: { id, userId },
    });
    if (!doc) throw new NotFoundException('Documento não encontrado');
    return doc;
  }

  async update(userId: string, id: string, dto: UpdateDocumentDto) {
    await this.findById(userId, id);

    return this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title?.trim() } : {}),
        ...(dto.content !== undefined ? { content: dto.content ?? '' } : {}),
        ...(dto.status !== undefined ? { status: dto.status as any } : {}),
        ...(dto.category !== undefined ? { category: dto.category as any } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags || [] } : {}),
      },
    });
  }

  async remove(userId: string, id: string) {
    await this.findById(userId, id);
    await this.prisma.document.delete({ where: { id } });
    return { success: true };
  }

  async generateContent(userId: string, dto: GenerateContentDto) {
    const { transcription, type = 'document', provider = 'openai' } = dto;

    if (!transcription?.trim()) {
      throw new BadRequestException('Transcrição é obrigatória');
    }

    const systemPrompt = `Você é um assistente especializado em formatação de documentos veterinários.
Sua tarefa é transformar uma transcrição de áudio em um documento bem estruturado e formatado.

Regras:
1. Mantenha o conteúdo original, apenas melhore a formatação e organização
2. Corrija erros gramaticais e de pontuação
3. Organize em parágrafos lógicos
4. Use linguagem profissional e clara
5. Se houver informações sobre medicamentos, dosagens ou procedimentos, destaque-os claramente
6. NÃO adicione informações que não estejam na transcrição original
7. Mantenha o tom e intenção do conteúdo original

Tipo de documento: ${type}

Retorne APENAS o conteúdo formatado do documento, sem comentários adicionais ou explicações.`;

    const result = await this.aiService.chatCompletion(userId, {
      provider: provider as 'openai' | 'gemini' | 'deepseek',
      model: provider === 'openai' ? 'gpt-4-turbo-preview' : 'gemini-pro',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Transcrição:\n\n${transcription}` },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    });

    return {
      content: result.content,
      usage: result.usage,
    };
  }

  /**
   * Generate a formatted document from transcription using the same templates as clinical documents
   */
  async generateFromTranscription(
    userId: string,
    dto: {
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
    const {
      transcription,
      documentType,
      signedBy,
      crmv,
      additionalContext,
      customTitle,
      petName,
      tutorName,
      provider = 'openai',
      model = 'gpt-4o-mini',
    } = dto;

    if (!transcription?.trim()) {
      throw new BadRequestException('Transcrição é obrigatória');
    }

    if (!documentType) {
      throw new BadRequestException('Tipo de documento é obrigatório');
    }

    this.logger.log(`Generating ${documentType} document from transcription`);

    const prompt = DOCUMENT_PROMPTS[documentType as keyof typeof DOCUMENT_PROMPTS] || DOCUMENT_PROMPTS.GENERAL;
    const docTitle = customTitle || DOCUMENT_TYPE_LABELS[documentType] || 'Documento';

    let contextInfo = `TRANSCRIÇÃO/CONTEÚDO BASE:\n${transcription}`;

    if (petName) contextInfo += `\n\nPACIENTE: ${petName}`;
    if (tutorName) contextInfo += `\nTUTOR: ${tutorName}`;
    if (signedBy) contextInfo += `\nVETERINÁRIO: ${signedBy}`;
    if (crmv) contextInfo += `\nCRMV: ${crmv}`;
    if (additionalContext) contextInfo += `\n\nCONTEXTO ADICIONAL:\n${additionalContext}`;

    const result = await this.aiService.chatCompletion(userId, {
      provider: provider as any,
      model,
      messages: [
        {
          role: 'system',
          content: `${prompt}\n\nGere o conteúdo em HTML estruturado (sem tags <html>, <head>, <body> - apenas o conteúdo interno). Use <h2>, <h3>, <p>, <ul>, <ol>, <table> para estruturar.`,
        },
        {
          role: 'user',
          content: `Gere o documento "${docTitle}" com base nas seguintes informações:\n\n${contextInfo}`,
        },
      ],
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Clean up HTML content
    let htmlContent = result.content;
    htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
    htmlContent = htmlContent
      .replace(/<\/?html[^>]*>/gi, '')
      .replace(/<\/?head[^>]*>/gi, '')
      .replace(/<\/?body[^>]*>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .trim();

    // Create the full HTML document with styling
    const fullHtml = getDocumentHtmlWrapper(docTitle, htmlContent, {
      clinicName: 'Empório do Pet',
      vetName: signedBy,
      crmv,
      date: new Date().toLocaleDateString('pt-BR'),
      petName,
      tutorName,
    });

    // Extract plain text for the content field
    const plainText = htmlContent
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      title: docTitle,
      content: plainText,
      htmlContent: fullHtml,
      documentType,
      usage: result.usage,
    };
  }
}

