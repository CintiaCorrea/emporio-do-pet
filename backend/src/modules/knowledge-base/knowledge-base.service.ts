import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateKnowledgeBaseDto, UpdateKnowledgeBaseDto } from './dto';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class KnowledgeBaseService {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly aiServiceUrl: string;
  private readonly uploadDir: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.aiServiceUrl =
      this.configService.get<string>('aiService.url') || 'http://localhost:8000';
    this.uploadDir = path.resolve('uploads/knowledge');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async create(userId: string, dto: CreateKnowledgeBaseDto) {
    return this.prisma.knowledgeBase.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        status: 'READY',
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.knowledgeBase.findMany({
      where: { userId },
      include: {
        _count: { select: { documents: true, agents: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const kb = await this.prisma.knowledgeBase.findFirst({
      where: { id, userId },
      include: {
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { agents: true } },
      },
    });

    if (!kb) {
      throw new NotFoundException('Base de conhecimento não encontrada');
    }

    return kb;
  }

  async update(userId: string, id: string, dto: UpdateKnowledgeBaseDto) {
    await this.findOne(userId, id);

    return this.prisma.knowledgeBase.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    const kb = await this.findOne(userId, id);

    // Delete chunks from AI Service
    try {
      await fetch(`${this.aiServiceUrl}/v1/rag/knowledge-bases/${id}`, {
        method: 'DELETE',
      });
    } catch (e) {
      this.logger.warn(`Failed to delete chunks from AI Service: ${e}`);
    }

    // Delete local files
    for (const doc of kb.documents) {
      try {
        if (fs.existsSync(doc.filePath)) {
          fs.unlinkSync(doc.filePath);
        }
      } catch (e) {
        this.logger.warn(`Failed to delete file ${doc.filePath}: ${e}`);
      }
    }

    return this.prisma.knowledgeBase.delete({ where: { id } });
  }

  async uploadDocument(
    userId: string,
    knowledgeBaseId: string,
    file: Express.Multer.File,
  ) {
    await this.findOne(userId, knowledgeBaseId);

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Tipo de arquivo não suportado. Use PDF, DOCX, TXT ou CSV.',
      );
    }

    const fileTypeMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'text/csv': 'csv',
    };

    const fileType = fileTypeMap[file.mimetype] || 'txt';
    const ext = path.extname(file.originalname) || `.${fileType}`;
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`;
    const filePath = path.join(this.uploadDir, fileName);

    fs.writeFileSync(filePath, file.buffer);

    const document = await this.prisma.knowledgeDocument.create({
      data: {
        knowledgeBaseId,
        fileName: file.originalname,
        fileType,
        fileSize: file.size,
        filePath,
        status: 'PENDING',
      },
    });

    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        totalSizeBytes: { increment: file.size },
      },
    });

    // Trigger async ingestion in AI Service
    this.triggerIngestion(document.id, filePath, fileType, knowledgeBaseId, userId);

    return document;
  }

  private async triggerIngestion(
    documentId: string,
    filePath: string,
    fileType: string,
    knowledgeBaseId: string,
    userId: string,
  ) {
    try {
      const credentials = await this.getOpenAICredentials(userId);
      if (!credentials) {
        await this.prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            status: 'ERROR',
            errorMessage: 'Credenciais OpenAI não configuradas. Configure na página de Integrações.',
          },
        });
        return;
      }

      const response = await fetch(`${this.aiServiceUrl}/v1/rag/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_id: documentId,
          file_path: filePath,
          file_type: fileType,
          knowledge_base_id: knowledgeBaseId,
          credentials: {
            api_key: credentials.apiKey,
            base_url: credentials.baseUrl,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        this.logger.error(`Ingestion failed: ${JSON.stringify(error)}`);
        await this.prisma.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            status: 'ERROR',
            errorMessage: error?.detail?.message || 'Falha na ingestão do documento',
          },
        });
      }
    } catch (error) {
      this.logger.error(`Ingestion trigger failed: ${error}`);
      await this.prisma.knowledgeDocument.update({
        where: { id: documentId },
        data: {
          status: 'ERROR',
          errorMessage: error instanceof Error ? error.message : 'Erro na ingestão',
        },
      });
    }
  }

  private async getOpenAICredentials(userId: string) {
    const settings = await this.prisma.integrationSettings.findUnique({
      where: { userId },
    });

    if (settings?.openaiConfig) {
      try {
        const config = JSON.parse(settings.openaiConfig);
        if (config.apiKey) {
          return { apiKey: config.apiKey, baseUrl: config.baseUrl || undefined };
        }
      } catch {}
    }

    const envKey = this.configService.get<string>('integrations.openai');
    if (envKey) {
      return { apiKey: envKey, baseUrl: undefined };
    }

    return null;
  }

  async findDocuments(userId: string, knowledgeBaseId: string) {
    await this.findOne(userId, knowledgeBaseId);

    return this.prisma.knowledgeDocument.findMany({
      where: { knowledgeBaseId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeDocument(userId: string, knowledgeBaseId: string, documentId: string) {
    await this.findOne(userId, knowledgeBaseId);

    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, knowledgeBaseId },
    });

    if (!doc) {
      throw new NotFoundException('Documento não encontrado');
    }

    // Delete chunks from AI Service
    try {
      await fetch(`${this.aiServiceUrl}/v1/rag/documents/${documentId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      this.logger.warn(`Failed to delete chunks from AI Service: ${e}`);
    }

    // Delete local file
    try {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (e) {
      this.logger.warn(`Failed to delete file ${doc.filePath}: ${e}`);
    }

    await this.prisma.knowledgeDocument.delete({ where: { id: documentId } });

    // Update KB counters
    await this.prisma.knowledgeBase.update({
      where: { id: knowledgeBaseId },
      data: {
        totalSizeBytes: { decrement: doc.fileSize },
        totalDocuments: {
          decrement: doc.status === 'READY' ? 1 : 0,
        },
        totalChunks: {
          decrement: doc.chunkCount,
        },
      },
    });

    return { success: true };
  }

  async getDocumentStatus(userId: string, knowledgeBaseId: string, documentId: string) {
    await this.findOne(userId, knowledgeBaseId);

    const doc = await this.prisma.knowledgeDocument.findFirst({
      where: { id: documentId, knowledgeBaseId },
    });

    if (!doc) {
      throw new NotFoundException('Documento não encontrado');
    }

    return {
      id: doc.id,
      status: doc.status,
      chunkCount: doc.chunkCount,
      errorMessage: doc.errorMessage,
    };
  }
}
