import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { EmailService } from '../email/email.service';
import {
  CreateClinicalDocumentDto,
  GenerateDocumentsDto,
  UpdateClinicalDocumentDto,
  ShareDocumentDto,
  ClinicalDocType,
} from './dto/create-clinical-document.dto';
import { DOCUMENT_PROMPTS, DOCUMENT_TYPE_LABELS, getDocumentHtmlWrapper } from './templates/document-prompts';

@Injectable()
export class ClinicalDocumentsService {
  private readonly logger = new Logger(ClinicalDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, dto: CreateClinicalDocumentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { pet: true, tutor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    return this.prisma.clinicalDocument.create({
      data: {
        appointmentId: dto.appointmentId,
        petId: appointment.petId,
        tutorId: appointment.tutorId,
        userId,
        recordingId: dto.recordingId,
        type: dto.type,
        title: dto.title,
        content: dto.content,
        htmlContent: dto.htmlContent,
        status: 'PUBLISHED',
        isAiGenerated: false,
        signedBy: dto.signedBy,
        crmv: dto.crmv,
        metadata: dto.metadata,
      },
      include: {
        appointment: true,
        pet: { select: { id: true, name: true, species: true } },
        tutor: { select: { id: true, name: true } },
      },
    });
  }

  async generateDocuments(userId: string, dto: GenerateDocumentsDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        pet: true,
        tutor: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
        user: { select: { id: true, name: true } },
        treatments: { include: { product: true } },
        recording: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Get transcription/analysis data
    let transcription = '';
    let analysis: any = null;
    let recordingId: string | null = dto.recordingId || null;

    if (appointment.recording) {
      recordingId = appointment.recording.id;
      transcription = appointment.recording.transcription || '';
      if (appointment.recording.aiAnalysis) {
        try {
          analysis = JSON.parse(appointment.recording.aiAnalysis);
        } catch {
          analysis = null;
        }
      }
    }

    // If no transcription, use appointment notes
    if (!transcription && appointment.notes) {
      transcription = appointment.notes;
    }

    if (!transcription && !analysis) {
      throw new BadRequestException(
        'Não há transcrição ou notas da consulta para gerar documentos. Grave a consulta ou adicione notas ao agendamento.',
      );
    }

    const provider = dto.provider || 'openai';
    const model = dto.model || 'gpt-4o-mini';

    // Build context
    const petAge = appointment.pet?.birthDate
      ? this.calculateAge(appointment.pet.birthDate)
      : 'Idade não informada';

    const contextInfo = `
DADOS DO PACIENTE:
- Nome: ${appointment.pet?.name || 'Não informado'}
- Espécie: ${appointment.pet?.species || 'Não informada'}
- Raça: ${appointment.pet?.breed || 'Não informada'}
- Idade: ${petAge}
- Peso: ${appointment.pet?.weight ? `${appointment.pet.weight}kg` : 'Não informado'}
- Sexo: ${appointment.pet?.gender || 'Não informado'}

TUTOR: ${appointment.tutor?.name || 'Não informado'}

VETERINÁRIO: ${appointment.user?.name || 'Não informado'}
${dto.crmv ? `CRMV: ${dto.crmv}` : ''}

DATA DA CONSULTA: ${appointment.date.toLocaleDateString('pt-BR')}

${appointment.description ? `MOTIVO DA CONSULTA: ${appointment.description}` : ''}

${transcription ? `TRANSCRIÇÃO DA CONSULTA:\n${transcription}` : ''}

${analysis ? `ANÁLISE DA IA:\n${JSON.stringify(analysis, null, 2)}` : ''}

${appointment.treatments?.length ? `TRATAMENTOS REGISTRADOS:\n${appointment.treatments.map(t => `- ${t.description} (R$${t.cost})`).join('\n')}` : ''}

${dto.additionalContext ? `CONTEXTO ADICIONAL:\n${dto.additionalContext}` : ''}
`;

    // Generate documents for each requested type
    const generatedDocs: any[] = [];

    for (const docType of dto.types) {
      try {
        this.logger.log(`Generating ${docType} document for appointment ${dto.appointmentId}`);

        const prompt = DOCUMENT_PROMPTS[docType] || DOCUMENT_PROMPTS.GENERAL;
        const docTitle = DOCUMENT_TYPE_LABELS[docType] || 'Documento Clínico';

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
              content: `Gere o documento "${docTitle}" com base nas seguintes informações da consulta:\n\n${contextInfo}`,
            },
          ],
          temperature: 0.3,
          maxTokens: 4096,
        });

        // Clean up HTML content
        let htmlContent = result.content;
        // Remove markdown code blocks if present
        htmlContent = htmlContent.replace(/```html\n?/g, '').replace(/```\n?/g, '');
        // Remove <html>, <head>, <body> wrappers if AI included them
        htmlContent = htmlContent
          .replace(/<\/?html[^>]*>/gi, '')
          .replace(/<\/?head[^>]*>/gi, '')
          .replace(/<\/?body[^>]*>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<meta[^>]*>/gi, '')
          .replace(/<!DOCTYPE[^>]*>/gi, '')
          .trim();

        // Create the full HTML document
        const fullHtml = getDocumentHtmlWrapper(docTitle, htmlContent, {
          clinicName: 'Empório do Pet',
          vetName: dto.signedBy || appointment.user?.name || undefined,
          crmv: dto.crmv,
          date: appointment.date.toLocaleDateString('pt-BR'),
          petName: appointment.pet?.name,
          tutorName: appointment.tutor?.name,
        });

        // Extract plain text from HTML for the content field
        const plainText = htmlContent
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        const doc = await this.prisma.clinicalDocument.create({
          data: {
            appointmentId: dto.appointmentId,
            petId: appointment.petId,
            tutorId: appointment.tutorId,
            userId,
            recordingId,
            type: docType,
            title: `${docTitle} - ${appointment.pet?.name || 'Paciente'}`,
            content: plainText,
            htmlContent: fullHtml,
            status: 'PUBLISHED',
            isAiGenerated: true,
            aiModel: `${provider}/${model}`,
            signedBy: dto.signedBy || appointment.user?.name,
            crmv: dto.crmv,
          },
          include: {
            pet: { select: { id: true, name: true, species: true } },
            tutor: { select: { id: true, name: true } },
          },
        });

        generatedDocs.push(doc);
      } catch (error) {
        this.logger.error(`Error generating ${docType}: ${error}`);
        generatedDocs.push({
          type: docType,
          error: error instanceof Error ? error.message : 'Erro na geração',
        });
      }
    }

    return {
      appointmentId: dto.appointmentId,
      generated: generatedDocs.filter((d) => !d.error),
      errors: generatedDocs.filter((d) => d.error),
      total: generatedDocs.length,
    };
  }

  async findById(id: string) {
    const doc = await this.prisma.clinicalDocument.findUnique({
      where: { id },
      include: {
        appointment: {
          select: { id: true, date: true, description: true, status: true },
        },
        pet: {
          select: { id: true, name: true, species: true, breed: true, weight: true },
        },
        tutor: {
          select: { id: true, name: true, email: true, contacts: { where: { isPrimary: true }, take: 1 } },
        },
        user: { select: { id: true, name: true } },
        recording: { select: { id: true, status: true, aiSummary: true } },
      },
    });

    if (!doc) {
      throw new NotFoundException('Documento clínico não encontrado');
    }

    return doc;
  }

  async findByAppointment(appointmentId: string) {
    return this.prisma.clinicalDocument.findMany({
      where: { appointmentId },
      orderBy: { createdAt: 'desc' },
      include: {
        pet: { select: { id: true, name: true, species: true } },
        tutor: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });
  }

  async findByPet(petId: string, params?: { type?: string; page?: number; limit?: number }) {
    const { type, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { petId };
    if (type) where.type = type;

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: { select: { id: true, date: true, description: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return {
      documents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findByTutor(tutorId: string, params?: { type?: string; page?: number; limit?: number }) {
    const { type, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { tutorId };
    if (type) where.type = type;

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: { select: { id: true, date: true, description: true } },
          pet: { select: { id: true, name: true, species: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return {
      documents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async findAll(userId: string, params?: { type?: string; status?: string; page?: number; limit?: number; search?: string }) {
    const { type, status, page = 1, limit = 20, search } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (type) where.type = type;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { pet: { name: { contains: search, mode: 'insensitive' } } },
        { tutor: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [documents, total] = await Promise.all([
      this.prisma.clinicalDocument.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: { select: { id: true, date: true } },
          pet: { select: { id: true, name: true, species: true } },
          tutor: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      }),
      this.prisma.clinicalDocument.count({ where }),
    ]);

    return {
      documents,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, dto: UpdateClinicalDocumentDto) {
    await this.findById(id);

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.htmlContent !== undefined) data.htmlContent = dto.htmlContent;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.signedBy !== undefined) data.signedBy = dto.signedBy;
    if (dto.crmv !== undefined) data.crmv = dto.crmv;
    if (dto.metadata !== undefined) data.metadata = dto.metadata;

    // Increment version on content changes
    if (dto.content || dto.htmlContent) {
      data.version = { increment: 1 };
    }

    return this.prisma.clinicalDocument.update({
      where: { id },
      data,
      include: {
        pet: { select: { id: true, name: true, species: true } },
        tutor: { select: { id: true, name: true } },
      },
    });
  }

  async shareDocument(id: string, userId: string, dto: ShareDocumentDto) {
    const doc = await this.findById(id);

    if (dto.method === 'email') {
      // Send via email
      const emailHtml = doc.htmlContent || `<p>${doc.content}</p>`;

      await this.emailService.sendEmail({
        to: dto.recipient,
        subject: `Documento Clínico - ${doc.title}`,
        html: emailHtml,
        text: doc.content,
      });
    } else if (dto.method === 'whatsapp') {
      // For WhatsApp, we'll return the content for the frontend to handle
      // since WhatsApp sending requires the WhatsApp module context
      this.logger.log(`Document ${id} marked for WhatsApp sharing to ${dto.recipient}`);
    }

    // Update shared status
    const currentSharedVia = doc.sharedVia || [];
    if (!currentSharedVia.includes(dto.method)) {
      currentSharedVia.push(dto.method);
    }

    return this.prisma.clinicalDocument.update({
      where: { id },
      data: {
        sharedVia: currentSharedVia,
        sharedAt: new Date(),
        sharedTo: dto.recipient,
      },
    });
  }

  async getDocumentHtml(id: string): Promise<string> {
    const doc = await this.findById(id);

    if (doc.htmlContent) {
      return doc.htmlContent;
    }

    // Generate basic HTML from content
    return getDocumentHtmlWrapper(doc.title, `<p>${doc.content.replace(/\n/g, '</p><p>')}</p>`, {
      clinicName: 'Empório do Pet',
      vetName: doc.signedBy || undefined,
      crmv: doc.crmv || undefined,
      petName: doc.pet?.name,
      tutorName: doc.tutor?.name,
    });
  }

  async getStats(userId: string) {
    const [total, byType, byStatus, recent] = await Promise.all([
      this.prisma.clinicalDocument.count({ where: { userId } }),
      this.prisma.clinicalDocument.groupBy({
        by: ['type'],
        where: { userId },
        _count: true,
      }),
      this.prisma.clinicalDocument.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      this.prisma.clinicalDocument.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
    ]);

    const aiGenerated = await this.prisma.clinicalDocument.count({
      where: { userId, isAiGenerated: true },
    });

    return {
      total,
      aiGenerated,
      last30Days: recent,
      byType: byType.map((t) => ({ type: t.type, label: DOCUMENT_TYPE_LABELS[t.type] || t.type, count: t._count })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
    };
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.clinicalDocument.delete({ where: { id } });
  }

  private calculateAge(birthDate: Date): string {
    const now = new Date();
    const diff = now.getTime() - birthDate.getTime();
    const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
    const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

    if (years > 0) {
      return `${years} ano${years > 1 ? 's' : ''}${months > 0 ? ` e ${months} mes${months > 1 ? 'es' : ''}` : ''}`;
    }
    return `${months} mes${months > 1 ? 'es' : ''}`;
  }
}
