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
  "prontuarioSugerido": "RASCUNHO DE PRONTUÁRIO COMPLETO, em texto corrido, pronto para o veterinário revisar e colar no prontuário. Organize em blocos com estes títulos, cada um em sua linha (pule linha entre blocos):\n\nANAMNESE / QUEIXA:\n(o que o tutor relatou, início e evolução dos sinais, histórico relevante)\n\nEXAME FÍSICO:\n(achados relatados pelo veterinário: estado geral, mucosas, TPC, temperatura, FC/FR, palpação, achados por sistema — só o que foi dito)\n\nAVALIAÇÃO / IMPRESSÃO:\n(diagnóstico ou suspeita e diferenciais, do jeito que o veterinário falou)\n\nCONDUTA:\n(medicamentos com dose/via/frequência/duração, procedimentos, exames solicitados)\n\nORIENTAÇÕES AO TUTOR:\n(cuidados em casa, sinais de alerta, dieta, repouso)\n\nRETORNO:\n(quando reavaliar / acompanhamento)\n\nSeja completo e detalhado, MAS 100% fiel à transcrição — não invente nada que não foi dito. Se um bloco não teve informação na consulta, escreva 'Não registrado na consulta.' nesse bloco.",
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
- Use null para campos sem informação (exceto dentro de "prontuarioSugerido", onde os blocos vazios recebem "Não registrado na consulta.")
- Seja preciso e fiel à transcrição — este é um RASCUNHO de apoio para o veterinário revisar e assinar, NUNCA um documento final
- NÃO invente diagnósticos, doses ou condutas que o veterinário não disse; apenas organize e detalhe o que foi falado
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

  /**
   * Baixa o áudio da gravação do storage PRIVADO (Tigris/S3) com assinatura SigV4,
   * pra servir num player (a URL crua dá 403). Mesma lógica do proxy de mídia do WhatsApp.
   */
  async getAudio(id: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const rec = await this.prisma.consultationRecording.findUnique({ where: { id }, select: { audioUrl: true } });
    if (!rec?.audioUrl) return null;
    const endpoint = process.env.S3_ENDPOINT || '';
    const bucket = process.env.S3_BUCKET || '';
    const region = process.env.S3_REGION || 'auto';
    const ak = process.env.S3_ACCESS_KEY_ID || '';
    const sk = process.env.S3_SECRET_ACCESS_KEY || '';
    if (!endpoint || !bucket || !ak || !sk) return null;
    const prefix = `${endpoint}/${bucket}/`;
    if (!rec.audioUrl.startsWith(prefix)) return null;
    const key = rec.audioUrl.slice(prefix.length);
    if (!key) return null;
    const crypto = await import('crypto');
    const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateShort = date.substring(0, 8);
    const emptyHash = crypto.createHash('sha256').update('').digest('hex');
    const host = new URL(endpoint).host;
    const canonicalHeaders = [`host:${host}`, `x-amz-content-sha256:${emptyHash}`, `x-amz-date:${date}`].join('\n');
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalRequest = ['GET', `/${bucket}/${key}`, '', canonicalHeaders, '', signedHeaders, emptyHash].join('\n');
    const credentialScope = `${dateShort}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', date, credentialScope, crypto.createHash('sha256').update(canonicalRequest).digest('hex')].join('\n');
    const kDate = crypto.createHmac('sha256', `AWS4${sk}`).update(dateShort).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const signingKey = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${ak}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const res = await fetch(`${endpoint}/${bucket}/${key}`, { headers: { 'x-amz-content-sha256': emptyHash, 'x-amz-date': date, Authorization: authorization } });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'audio/webm';
    return { buffer, contentType };
  }

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

      // 👻 Copiloto Clínico (modo sombra): se ligado, gera sugestões AO VETERINÁRIO em 2º
      // plano e guarda pra avaliação em Gestão › Inteligência. Best-effort — não atrasa nem
      // quebra a análise; o veterinário sempre decide (a IA nunca fala com o tutor).
      void this.gerarGhostClinico(recording, analysisData, userId).catch((e) =>
        this.logger.warn(`Copiloto clínico (sombra): ${e?.message || e}`),
      );

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
   * 👻 COPILOTO CLÍNICO (modo sombra). Gera sugestões AO VETERINÁRIO sobre a consulta que
   * acabou de ser analisada e guarda em `ghost_clinico` para avaliação (👍/👎/✏️) na tela
   * Gestão › Inteligência › Copiloto Clínico. NUNCA age, NUNCA fala com o tutor, NUNCA
   * prescreve — é apoio à decisão; quem decide e assina é o profissional.
   * Só roda se o interruptor `config_ghost_clinico` estiver ligado. Best-effort.
   */
  private async gerarGhostClinico(recording: any, analysisData: any, userId: string): Promise<void> {
    // Interruptor mestre (tela Copiloto Clínico). Desligado = não gera nada.
    const cfg = await this.prisma.listaItem.findFirst({ where: { lista: 'config_ghost_clinico' } });
    let ativo = false;
    if (cfg) { try { ativo = !!JSON.parse(cfg.valor).ativo; } catch { /* ilegível = desligado */ } }
    if (!ativo) return;
    if (!recording?.transcription) return;

    const pet = recording.appointment?.pet;
    const petCtx = pet
      ? `${pet.name} (${[pet.species, pet.breed].filter(Boolean).join(' ') || 'sem raça'}${(pet as any).weight ? `, ${(pet as any).weight}kg` : ''})`
      : 'paciente';

    // 🧠 REPERTÓRIO: casos de referência da PRÓPRIA clínica (histórico do SimplesVet + casos
    // que vocês aprovaram), mesma espécie e tema parecido. É o que dá "a cara do Empório" às
    // sugestões — sem re-treinar modelo (few-shot: mostramos exemplos reais no prompt).
    const especie = (pet as any)?.species || null;
    const kw = this.palavraChaveClinica(analysisData?.queixaPrincipal, analysisData?.diagnostico);
    const refs: string[] = [];
    try {
      if (especie) {
        const whereBase: any = { tipo: 'ATENDIMENTO', pet: { is: { species: especie } } };
        let hist = await this.prisma.historicoClinico.findMany({
          where: { ...whereBase, texto: kw ? { contains: kw, mode: 'insensitive' } : { not: null } },
          orderBy: { data: 'desc' },
          take: 4,
          select: { titulo: true, texto: true },
        });
        if (hist.length === 0 && kw) {
          hist = await this.prisma.historicoClinico.findMany({
            where: { ...whereBase, texto: { not: null } },
            orderBy: { data: 'desc' },
            take: 3,
            select: { titulo: true, texto: true },
          });
        }
        for (const h of hist) refs.push(`• ${h.titulo ? h.titulo + ': ' : ''}${(h.texto || '').replace(/\s+/g, ' ').slice(0, 600)}`);
      }
      // casos aprovados pela própria clínica (👍), mesma espécie
      const aprovados = await this.prisma.listaItem.findMany({
        where: { lista: 'ghost_clinico', valor: { contains: '"feedback":"boa"' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { valor: true },
      });
      const spNorm = String(especie || '').toLowerCase().slice(0, 3);
      for (const a of aprovados) {
        if (refs.length >= 6) break;
        try {
          const d = JSON.parse(a.valor);
          if (spNorm && d.petInfo && !String(d.petInfo).toLowerCase().includes(spNorm)) continue;
          const base = d.prontuarioSugerido || d.diagnostico;
          if (base) refs.push(`• [caso aprovado pela clínica] ${String(base).replace(/\s+/g, ' ').slice(0, 500)}`);
        } catch { /* item ilegível */ }
      }
    } catch { /* repertório é best-effort — se falhar, gera sem referência */ }
    const referencia = refs.length
      ? `\n\nCASOS DE REFERÊNCIA DA PRÓPRIA CLÍNICA (para calibrar ao jeito desta clínica — NÃO copie cegamente, cada paciente é único):\n${refs.join('\n')}`
      : '';

    const system = [
      'Você é um assistente de APOIO À DECISÃO clínica veterinária. Você fala DIRETAMENTE COM O VETERINÁRIO — NUNCA com o tutor. Seu papel é ajudar o profissional a refletir sobre a consulta que acabou de acontecer. O veterinário sempre decide e assina.',
      '',
      'Com base na transcrição e no que o veterinário registrou, gere sugestões ÚTEIS e CONSERVADORAS:',
      '- "diferenciais": diagnósticos diferenciais relevantes que valeria considerar (não repita o que o vet já concluiu).',
      '- "perguntasFaltaram": perguntas de anamnese, achados de exame ou registros que talvez tenham faltado documentar.',
      '- "redFlags": sinais de alerta/gravidade a não perder de vista neste caso.',
      '',
      'REGRAS:',
      '- Tom de colega que sugere, nunca de quem manda.',
      '- Seja específico ao caso; NÃO invente dados que não estão na consulta.',
      '- Se não houver nada relevante numa categoria, devolva lista vazia.',
      '- NUNCA dê ordem de dose/prescrição; no máximo "considerar X conforme avaliação".',
      '- Cada item deve ser curto (1 frase).',
      '- Se houver CASOS DE REFERÊNCIA DA PRÓPRIA CLÍNICA, use-os para calibrar ao padrão da clínica; ao se apoiar neles, pode sinalizar com "(padrão observado na clínica)".',
      '- Responda SOMENTE com JSON válido: {"diferenciais":[],"perguntasFaltaram":[],"redFlags":[]}',
    ].join('\n');

    const resumoVet = {
      queixa: analysisData?.queixaPrincipal ?? null,
      exame: analysisData?.exameClinico ?? null,
      diagnostico: analysisData?.diagnostico ?? null,
      diferenciaisDoVet: analysisData?.diagnosticosDiferenciais ?? null,
      conduta: analysisData?.tratamento ?? null,
    };
    const userMsg = `CONTEXTO DO PACIENTE: ${petCtx}\n\nO QUE O VETERINÁRIO REGISTROU:\n${JSON.stringify(resumoVet, null, 2)}${referencia}\n\nTRANSCRIÇÃO DA CONSULTA:\n${recording.transcription}`;

    const result = await this.aiService.chatCompletion(userId, {
      provider: 'openai' as any,
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.3,
      maxTokens: 1200,
    });

    let cop: any = {};
    try { const m = result.content.match(/\{[\s\S]*\}/); cop = m ? JSON.parse(m[0]) : {}; } catch { cop = {}; }
    const limpar = (v: any) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).slice(0, 6) : []);
    const diferenciais = limpar(cop.diferenciais);
    const perguntasFaltaram = limpar(cop.perguntasFaltaram);
    const redFlags = limpar(cop.redFlags);

    await this.prisma.listaItem.create({
      data: {
        lista: 'ghost_clinico',
        valor: JSON.stringify({
          recordingId: recording.id,
          appointmentId: recording.appointmentId,
          petNome: pet?.name || null,
          petInfo: pet ? [pet.species, pet.breed].filter(Boolean).join(' ') : null,
          tutorNome: recording.appointment?.tutor?.name || null,
          vetNome: recording.appointment?.user?.name || null,
          prontuarioSugerido: analysisData?.prontuarioSugerido || null,
          diagnostico: analysisData?.diagnostico || null,
          diferenciais,
          perguntasFaltaram,
          redFlags,
          refsUsados: refs.length,
          at: new Date().toISOString(),
        }),
      },
    });
    this.logger.log(`🩺 Sugestão do Copiloto Clínico gerada (gravação ${recording.id}, ${refs.length} refs do repertório)`);
  }

  /** Extrai uma palavra-chave clínica (>=5 letras, fora de stopwords) p/ buscar casos parecidos no repertório. */
  private palavraChaveClinica(...campos: (string | null | undefined)[]): string | null {
    const stop = new Set([
      'para', 'com', 'sem', 'dos', 'das', 'uma', 'que', 'por', 'tutor', 'animal', 'relata',
      'apresenta', 'dias', 'hora', 'horas', 'sendo', 'pelo', 'pela', 'consulta', 'paciente',
      'queixa', 'principal', 'histórico', 'historico', 'desde', 'ontem', 'sinais',
    ]);
    for (const c of campos) {
      if (!c) continue;
      const palavras = String(c).toLowerCase().match(/[a-záàâãéêíóôõúüç]{5,}/gi) || [];
      const w = palavras.find((p) => !stop.has(p.toLowerCase()));
      if (w) return w;
    }
    return null;
  }

  /** Tamanho do repertório da clínica: atendimentos do SimplesVet + casos aprovados no copiloto. */
  async repertorioStats(): Promise<{ simplesvet: number; aprovados: number; total: number }> {
    const [simplesvet, aprovados] = await Promise.all([
      this.prisma.historicoClinico.count({ where: { tipo: 'ATENDIMENTO', texto: { not: null } } }),
      this.prisma.listaItem.count({ where: { lista: 'ghost_clinico', valor: { contains: '"feedback":"boa"' } } }),
    ]);
    return { simplesvet, aprovados, total: simplesvet + aprovados };
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
