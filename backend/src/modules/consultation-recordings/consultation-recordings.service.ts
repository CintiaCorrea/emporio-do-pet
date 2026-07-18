import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIService } from '../ai/ai.service';
import { AudioService } from '../audio/audio.service';
import { CreateRecordingDto, UploadTranscriptionDto, AnalyzeTranscriptionDto } from './dto/create-recording.dto';

const CONSULTATION_ANALYSIS_PROMPT = `Você é um assistente veterinário especializado em análise de consultas clínicas.
Analise a transcrição abaixo de uma consulta veterinária e extraia informações estruturadas.

Retorne um JSON com a seguinte estrutura:
{
  "resumo": "Resumo breve da consulta em 2-3 frases",
  "queixaPrincipal": "Motivo principal da consulta relatado pelo tutor",
  "historico": "Histórico relevante mencionado durante a consulta",
  "sintomasRelatados": ["lista", "de", "sintomas"],
  "exameClinico": "Achados do exame clínico mencionados pelo veterinário",
  "diagnostico": "Diagnóstico ou suspeita diagnóstica",
  "diagnosticosDiferenciais": ["lista", "de", "diagnósticos", "diferenciais"],
  "tratamento": {
    "medicamentos": [
      {
        "nome": "Nome do medicamento",
        "dosagem": "Dosagem prescrita",
        "frequencia": "Frequência de administração",
        "duracao": "Duração do tratamento",
        "viaAdministracao": "Via de administração"
      }
    ],
    "procedimentos": ["Procedimentos realizados ou recomendados"],
    "orientacoes": ["Orientações gerais passadas ao tutor"]
  },
  "examesSolicitados": ["Exames complementares solicitados"],
  "retorno": "Informação sobre retorno/acompanhamento",
  "observacoes": "Outras observações relevantes"
}

IMPORTANTE:
- Preencha apenas os campos que foram mencionados na consulta
- Use null para campos sem informação
- Seja preciso e fiel à transcrição
- Nomes de medicamentos devem ter grafia correta
- Dosagens devem incluir unidade de medida

Transcrição da consulta:
`;

@Injectable()
export class ConsultationRecordingsService {
  private readonly logger = new Logger(ConsultationRecordingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AIService,
    private readonly audioService: AudioService,
  ) {}

  async create(userId: string, dto: CreateRecordingDto) {
    // Verify appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: { pet: true, tutor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Check if recording already exists for this appointment
    const existing = await this.prisma.consultationRecording.findUnique({
      where: { appointmentId: dto.appointmentId },
    });

    if (existing) {
      throw new BadRequestException('Já existe uma gravação para este agendamento');
    }

    return this.prisma.consultationRecording.create({
      data: {
        appointmentId: dto.appointmentId,
        userId,
        audioUrl: dto.audioUrl,
        audioFileName: dto.audioFileName,
        audioDuration: dto.audioDuration,
        language: dto.language || 'pt-BR',
        status: 'RECORDING',
      },
      include: {
        appointment: {
          include: {
            pet: { select: { id: true, name: true, species: true, breed: true } },
            tutor: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async findById(id: string) {
    const recording = await this.prisma.consultationRecording.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            pet: { select: { id: true, name: true, species: true, breed: true, weight: true, birthDate: true } },
            tutor: { select: { id: true, name: true, email: true } },
            user: { select: { id: true, name: true } },
            treatments: true,
          },
        },
        clinicalDocuments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!recording) {
      throw new NotFoundException('Gravação não encontrada');
    }

    return recording;
  }

  async findByAppointment(appointmentId: string) {
    const recording = await this.prisma.consultationRecording.findUnique({
      where: { appointmentId },
      include: {
        appointment: {
          include: {
            pet: { select: { id: true, name: true, species: true, breed: true } },
            tutor: { select: { id: true, name: true } },
            user: { select: { id: true, name: true } },
          },
        },
        clinicalDocuments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    
    // Return as array for consistency with history endpoint
    return recording ? [recording] : [];
  }

  async findAll(userId: string, params?: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status) where.status = status;

    const [recordings, total] = await Promise.all([
      this.prisma.consultationRecording.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          appointment: {
            include: {
              pet: { select: { id: true, name: true, species: true } },
              tutor: { select: { id: true, name: true } },
            },
          },
          _count: { select: { clinicalDocuments: true } },
        },
      }),
      this.prisma.consultationRecording.count({ where }),
    ]);

    return {
      recordings,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  async uploadTranscription(id: string, dto: UploadTranscriptionDto) {
    const recording = await this.findById(id);

    return this.prisma.consultationRecording.update({
      where: { id },
      data: {
        transcription: dto.transcription,
        audioDuration: dto.audioDuration ?? recording.audioDuration,
        language: dto.language ?? recording.language,
        status: 'TRANSCRIBED',
      },
    });
  }

  // Chave OpenAI: prioriza a configurada pelo usuário; senão usa a do servidor (OPENAI_API_KEY).
  private async resolveOpenAiKey(userId: string): Promise<string> {
    const settings = await this.prisma.integrationSettings.findUnique({ where: { userId } });
    let key = '';
    if (settings?.openaiConfig) {
      try {
        const c = typeof settings.openaiConfig === 'string' ? JSON.parse(settings.openaiConfig) : settings.openaiConfig;
        key = c?.apiKey || '';
      } catch { key = ''; }
    }
    if (!key) key = process.env.OPENAI_API_KEY || '';
    if (!key) throw new BadRequestException('Chave OpenAI não configurada. Adicione em Configurações › IA (ou defina OPENAI_API_KEY no servidor).');
    return key;
  }

  async transcribeAudio(id: string, userId: string) {
    const recording = await this.findById(id);

    if (!recording.audioUrl) {
      throw new BadRequestException('Gravação sem URL de áudio');
    }

    // Chave OpenAI: do usuário ou, na ausência, a do servidor (OPENAI_API_KEY).
    const apiKey = await this.resolveOpenAiKey(userId);

    // Update status to processing
    await this.prisma.consultationRecording.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      const result = await this.audioService.transcribeFromUrl(
        recording.audioUrl,
        apiKey,
        recording.language || 'pt',
        'Consulta veterinária com tutor e veterinário. Termos médicos veterinários.',
      );

      return this.prisma.consultationRecording.update({
        where: { id },
        data: {
          transcription: result.text,
          audioDuration: result.duration ?? recording.audioDuration,
          status: 'TRANSCRIBED',
        },
      });
    } catch (error) {
      await this.prisma.consultationRecording.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Erro na transcrição',
        },
      });
      throw error;
    }
  }

  async analyzeTranscription(id: string, userId: string, dto?: AnalyzeTranscriptionDto) {
    const recording = await this.findById(id);

    if (!recording.transcription) {
      throw new BadRequestException('Gravação sem transcrição. Transcreva o áudio primeiro.');
    }

    // Update status
    await this.prisma.consultationRecording.update({
      where: { id },
      data: { status: 'PROCESSING' },
    });

    try {
      const provider = dto?.provider || 'openai';
      const model = dto?.model || 'gpt-4o-mini';

      const petInfo = recording.appointment?.pet;
      const tutorInfo = recording.appointment?.tutor;

      let contextPrompt = CONSULTATION_ANALYSIS_PROMPT;
      if (petInfo) {
        contextPrompt += `\n\n[Contexto: Pet "${petInfo.name}", espécie: ${petInfo.species}${petInfo.breed ? `, raça: ${petInfo.breed}` : ''}${(petInfo as any).weight ? `, peso: ${(petInfo as any).weight}kg` : ''}]`;
      }
      if (tutorInfo) {
        contextPrompt += `\n[Tutor: ${tutorInfo.name}]`;
      }

      contextPrompt += `\n\n${recording.transcription}`;

      const result = await this.aiService.chatCompletion(userId, {
        provider: provider as any,
        model,
        messages: [
          { role: 'system', content: 'Você é um assistente veterinário especializado. Responda sempre em JSON válido.' },
          { role: 'user', content: contextPrompt },
        ],
        temperature: 0.3,
        maxTokens: 4096,
      });

      // Parse the AI response to extract structured data
      let analysisData: any;
      try {
        // Try to extract JSON from the response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        analysisData = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.content };
      } catch {
        analysisData = { raw: result.content };
      }

      const summary = analysisData.resumo || 'Análise concluída';

      return this.prisma.consultationRecording.update({
        where: { id },
        data: {
          aiAnalysis: JSON.stringify(analysisData),
          aiSummary: summary,
          status: 'ANALYZED',
        },
      });
    } catch (error) {
      await this.prisma.consultationRecording.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Erro na análise',
        },
      });
      throw error;
    }
  }

  /**
   * Upload audio buffer and transcribe directly via Whisper.
   * Audio is NOT stored permanently - only the transcription is saved (LGPD compliance).
   */
  async uploadAndTranscribe(
    id: string,
    userId: string,
    audioBuffer: Buffer,
    filename: string,
    audioDuration?: number,
    language?: string,
  ) {
    const recording = await this.findById(id);

    // Chave OpenAI: do usuário ou, na ausência, a do servidor (OPENAI_API_KEY).
    const apiKey = await this.resolveOpenAiKey(userId);

    // Update status to processing
    await this.prisma.consultationRecording.update({
      where: { id },
      data: {
        status: 'PROCESSING',
        audioDuration: audioDuration ?? recording.audioDuration,
        audioFileName: filename,
      },
    });

    try {
      const prompt = 'Consulta veterinária com tutor e veterinário. Termos médicos veterinários.';
      const result = await this.audioService.transcribeFromBuffer(
        audioBuffer,
        filename,
        apiKey,
        language || recording.language || 'pt',
        prompt,
      );

      const updated = await this.prisma.consultationRecording.update({
        where: { id },
        data: {
          transcription: result.text,
          audioDuration: result.duration ?? audioDuration ?? recording.audioDuration,
          status: 'TRANSCRIBED',
        },
        include: {
          appointment: {
            include: {
              pet: { select: { id: true, name: true, species: true, breed: true } },
              tutor: { select: { id: true, name: true } },
              user: { select: { id: true, name: true } },
            },
          },
        },
      });

      this.logger.log(`Upload+Transcribe successful for recording ${id}: ${result.text.length} chars`);

      return updated;
    } catch (error) {
      await this.prisma.consultationRecording.update({
        where: { id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Erro na transcrição',
        },
      });
      throw error;
    }
  }

  /**
   * Create a new recording + upload audio + transcribe in one step.
   * For convenience when there is no existing recording yet.
   */
  async createAndTranscribe(
    userId: string,
    appointmentId: string,
    audioBuffer: Buffer,
    filename: string,
    audioDuration?: number,
    language?: string,
  ) {
    // Verify appointment exists
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { pet: true, tutor: true },
    });

    if (!appointment) {
      throw new NotFoundException('Agendamento não encontrado');
    }

    // Check if recording already exists
    let recording = await this.prisma.consultationRecording.findUnique({
      where: { appointmentId },
    });

    if (recording) {
      // Use existing recording
      return this.uploadAndTranscribe(recording.id, userId, audioBuffer, filename, audioDuration, language);
    }

    // Create new recording
    recording = await this.prisma.consultationRecording.create({
      data: {
        appointmentId,
        userId,
        audioFileName: filename,
        audioDuration,
        language: language || 'pt-BR',
        status: 'RECORDING',
      },
    });

    return this.uploadAndTranscribe(recording.id, userId, audioBuffer, filename, audioDuration, language);
  }

  async completeRecording(id: string) {
    return this.prisma.consultationRecording.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async delete(id: string) {
    await this.findById(id);
    return this.prisma.consultationRecording.delete({ where: { id } });
  }
}
