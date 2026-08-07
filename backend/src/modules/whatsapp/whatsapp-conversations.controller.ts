import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  Res,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { writeFile, readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppService } from './whatsapp.service';
import { CloudStorageService } from '../media/cloud-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '@prisma/client';
import {
  SendMessageDto,
  ListConversationsQuery,
  UpdateConversationDto,
  AssignAgentDto,
} from './dto';

interface JwtUser {
  id: string;
  email: string;
  name?: string;
  role: string;
}

@Controller('whatsapp')
@UseGuards(JwtAuthGuard)
export class WhatsAppConversationsController {
  private readonly logger = new Logger(WhatsAppConversationsController.name);

  constructor(
    private readonly whatsAppService: WhatsAppService,
    private readonly cloudStorage: CloudStorageService,
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ============================================
  // Conversations
  // ============================================

  @Get('conversations')
  async listConversations(
    @CurrentUser() user: JwtUser,
    @Query() query: ListConversationsQuery,
  ) {
    this.logger.log(`Listing all conversations (shared inbox) for user ${user.id}`);
    
    return this.whatsAppService.getConversations(
      null,
      {
        status: query.status,
        search: query.search,
        hasUnread: query.hasUnread,
        assignedAgentId: query.assignedAgentId,
        tutorId: query.tutorId,
      },
      {
        page: query.page,
        limit: query.limit,
      },
    );
  }

  @Get('conversations/:id')
  async getConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const conversation = await this.whatsAppService.getConversation(id);
    
    if (!conversation) {
      return { error: 'Conversation not found' };
    }
    
    return conversation;
  }

  @Patch('conversations/:id')
  async updateConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, dto);
  }

  @Post('conversations/:id/assign-agent')
  async assignAgent(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: AssignAgentDto,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.assignAgentToConversation(id, dto.agentId || null);
  }

  @Post('conversations/:id/assign-user')
  async assignToUser(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() body: { userId: string },
  ) {
    const updated = await this.whatsAppService.updateConversation(id, { assignedUserId: body.userId } as any);

    // Popup em tempo real p/ quem RECEBEU a conversa (nunca p/ si mesmo). Best-effort.
    if (body.userId && body.userId !== user.id) {
      try {
        const contato = (updated as any)?.tutor?.name || (updated as any)?.contactName || 'um cliente';
        await this.notifications.create({
          userId: body.userId,
          type: NotificationType.INFO,
          title: '📨 Conversa encaminhada pra você',
          message: `${user.name || 'Um colega'} passou a conversa de ${contato} pra você.`,
          link: `/dashboard/inbox-nativo?conversa=${id}`,
          metadata: { kind: 'conversa_encaminhada', conversationId: id, fromUserId: user.id },
        });
      } catch (e: any) { this.logger.warn(`Falha ao notificar encaminhamento: ${e?.message || e}`); }
    }

    return updated;
  }

    @Post('conversations/:id/takeover')
  async takeoverConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`User ${user.id} (${user.name}) taking over conversation ${id}`);
    return this.whatsAppService.takeoverConversation(id, user.id);
  }

  @Post('conversations/:id/release')
  async releaseConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`User ${user.id} releasing conversation ${id} back to AI agent`);
    return this.whatsAppService.releaseConversation(id);
  }

  @Post('conversations/:id/tags')
  async setTags(
    @Param('id') id: string,
    @Body() body: { tags: string[] },
  ) {
    return this.whatsAppService.setConversationTags(id, Array.isArray(body?.tags) ? body.tags : []);
  }

  @Post('conversations/:id/close')
  async closeConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, { status: 'CLOSED' });
  }

  // Marca a conversa como "não lida" (lembrete). Abrir a conversa limpa a marca.
  @Post('conversations/:id/mark-unread')
  async markUnread(@Param('id') id: string) {
    return this.whatsAppService.marcarNaoLida(id);
  }

  @Post('conversations/:id/reopen')
  async reopenConversation(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
  ) {
    const existing = await this.whatsAppService.getConversation(id);
    if (!existing) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.updateConversation(id, { status: 'OPEN' });
  }

  // ============================================
  // Messages
  // ============================================

  @Get('conversations/:id/messages')
  async getMessages(
    @CurrentUser() user: JwtUser,
    @Param('id') conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const conversation = await this.whatsAppService.getConversation(conversationId);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    return this.whatsAppService.getMessages(conversationId, {
      page: page || 1,
      limit: limit || 50,
    });
  }

  // Serve a mídia (imagem/vídeo/áudio) de uma mensagem, do storage privado.
  // Suporta Range (206) — vídeo precisa disso pra tocar/avançar no navegador.
  // ?download=1 força o download (attachment) em vez de abrir inline.
  @Get('messages/:msgId/media')
  async getMessageMedia(
    @Param('msgId') msgId: string,
    @Req() req: Request,
    @Res() res: Response,
    @Query('download') download?: string,
  ) {
    const range = (req.headers['range'] as string) || undefined;
    const media = await this.whatsAppService.getMessageMedia(msgId, range);
    if (!media) {
      res.status(404).json({ error: 'Mídia não encontrada' });
      return;
    }
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'private, max-age=300');
    if (download) {
      const ext = (media.contentType.split('/')[1] || 'bin').split(';')[0];
      res.setHeader('Content-Disposition', `attachment; filename="anexo-${msgId.slice(0, 8)}.${ext}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }
    if (media.status === 206 && media.contentRange) {
      res.status(206);
      res.setHeader('Content-Range', media.contentRange);
    }
    res.setHeader('Content-Length', String(media.buffer.length));
    res.send(media.buffer);
  }

  // Encaminha a mídia desta mensagem para OUTRA conversa.
  @Post('messages/:msgId/forward')
  async forwardMedia(@Param('msgId') msgId: string, @Body() body: { conversationId?: string }) {
    if (!body?.conversationId) throw new BadRequestException('conversationId obrigatório.');
    const r = await this.whatsAppService.encaminharMidia(msgId, body.conversationId);
    if (!r.success) throw new BadRequestException(r.error || 'Não consegui encaminhar.');
    return { success: true };
  }

  // ===== Biblioteca de figurinhas da clínica =====
  @Get('stickers')
  async listStickers() {
    return this.whatsAppService.listarStickers();
  }

  @Post('stickers')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 1 * 1024 * 1024 } }))
  async uploadSticker(@UploadedFile() file: Express.Multer.File, @Body('nome') nome?: string) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const r = await this.whatsAppService.salvarSticker(file.buffer, file.mimetype || '', nome);
    if ('error' in r) throw new BadRequestException(r.error);
    return r;
  }

  // Lista as figurinhas que já passaram pelas conversas (pra importar pra biblioteca).
  @Get('stickers/das-conversas')
  async listStickersFromChats() {
    return this.whatsAppService.listarStickersDasConversas();
  }

  // Importa figurinhas das conversas (por messageId) pra biblioteca.
  @Post('stickers/importar')
  async importStickers(@Body() body: { messageIds?: string[] }) {
    if (!Array.isArray(body?.messageIds) || !body.messageIds.length) {
      throw new BadRequestException('messageIds obrigatório.');
    }
    return this.whatsAppService.importarStickersDasConversas(body.messageIds);
  }

  // Serve o arquivo de uma figurinha da biblioteca (bucket privado → assinado no backend).
  @Get('stickers/:id/media')
  async getStickerMedia(@Param('id') id: string, @Res() res: Response) {
    const media = await this.whatsAppService.getStickerMedia(id);
    if (!media) {
      res.status(404).json({ error: 'Figurinha não encontrada' });
      return;
    }
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Length', String(media.buffer.length));
    res.send(media.buffer);
  }

  @Delete('stickers/:id')
  async deleteSticker(@Param('id') id: string) {
    return this.whatsAppService.removerSticker(id);
  }

  // Envia uma figurinha DA BIBLIOTECA para a conversa.
  @Post('conversations/:id/send-sticker')
  async sendSticker(@Param('id') conversationId: string, @Body() body: { stickerId?: string }) {
    if (!body?.stickerId) throw new BadRequestException('stickerId obrigatório.');
    const r = await this.whatsAppService.enviarStickerBiblioteca(conversationId, body.stickerId);
    if (!r.success) throw new BadRequestException(r.error || 'Não consegui enviar a figurinha.');
    return { success: true, messageId: r.message?.id };
  }

  // A equipe reage a uma mensagem com um emoji (envia pela Meta). emoji vazio = remove.
  @Post('messages/:msgId/react')
  async reactMessage(@Param('msgId') msgId: string, @Body() body: { emoji?: string }) {
    const r = await this.whatsAppService.reagirMensagem(msgId, body?.emoji ?? '');
    if (!r.success) throw new BadRequestException(r.error || 'Não consegui reagir.');
    return { success: true };
  }

  // Encaminha VÁRIAS mensagens (selecionadas) para outra conversa.
  @Post('messages/forward-batch')
  async forwardBatch(@Body() body: { msgIds?: string[]; conversationId?: string }) {
    if (!body?.conversationId || !Array.isArray(body?.msgIds) || !body.msgIds.length) {
      throw new BadRequestException('msgIds e conversationId obrigatórios.');
    }
    return this.whatsAppService.encaminharMensagens(body.msgIds.slice(0, 30), body.conversationId);
  }

  /**
   * Envia ANEXO (foto, documento, vídeo, áudio, figurinha) numa conversa.
   *
   * Guarda em DOIS lugares de propósito: no nosso bucket (o Meta apaga a cópia dele
   * em 30 dias — sem isso a conversa ficaria com anexo quebrado no histórico) e no
   * Meta (que é quem entrega pro cliente).
   *
   * Vale a janela de 24h do WhatsApp: fora dela, só template. Se o Meta recusar por
   * isso, o erro dele volta pra tela em vez de sumir.
   */
  /**
   * O navegador grava áudio em webm/opus, que o WhatsApp NÃO aceita. Converte pra
   * ogg/opus (formato de mensagem de voz aceito pelo Meta) com ffmpeg. Formatos que o
   * WhatsApp já aceita (ogg, mp3, aac, amr, mp4) passam direto (retorna null).
   */
  private async audioParaOgg(buffer: Buffer, mime: string): Promise<Buffer | null> {
    if (/audio\/(ogg|mpeg|mp3|aac|amr|mp4)/i.test(mime)) return null;
    const base = join(tmpdir(), `wa_aud_${Date.now()}_${randomUUID().slice(0, 8)}`);
    const inPath = `${base}.in`;
    const outPath = `${base}.ogg`;
    try {
      await writeFile(inPath, buffer);
      await new Promise<void>((resolve, reject) => {
        const ff = spawn('ffmpeg', ['-y', '-i', inPath, '-c:a', 'libopus', '-b:a', '32k', outPath]);
        let err = '';
        ff.stderr.on('data', (d) => { err += d.toString(); });
        ff.on('error', reject);
        ff.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-200)))));
      });
      return await readFile(outPath);
    } catch (e) {
      this.logger.warn(`Falha ao converter áudio p/ ogg: ${e}`);
      return null;
    } finally {
      unlink(inPath).catch(() => undefined);
      unlink(outPath).catch(() => undefined);
    }
  }

  // Envia uma mensagem + anexos (exames/receitas do prontuário) pro tutor.
  // Aberta → na hora; fechada → template abridor + fila (entrega quando o tutor responde).
  @Post('enviar-documentos')
  async enviarDocumentos(
    @CurrentUser() _user: JwtUser,
    @Body() body: { tutorId: string; texto?: string; anexos?: Array<{ url: string; tipo?: 'document' | 'image'; nome?: string }>; petNome?: string; template?: string; templateParams?: string[] },
  ) {
    if (!body?.tutorId) throw new BadRequestException('tutorId é obrigatório.');
    return this.whatsAppService.enviarDocumentosProntuario(body.tutorId, body.texto || '', body.anexos || [], body.petNome, body.template, body.templateParams);
  }

  @Post('conversations/:id/media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 60 * 1024 * 1024 } }))
  async sendMedia(
    @CurrentUser() user: JwtUser,
    @Param('id') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
    @Body('replyToWaMessageId') replyToWaMessageId?: string,
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');

    const conversation = await this.whatsAppService.getConversation(conversationId);
    if (!conversation) throw new BadRequestException('Conversa não encontrada.');

    const mime = file.mimetype || '';
    // Figurinha do WhatsApp é sempre .webp — mandar JPG como sticker o Meta recusa.
    const kind: 'image' | 'document' | 'video' | 'audio' | 'sticker' =
      mime === 'image/webp' ? 'sticker'
      : mime.startsWith('image/') ? 'image'
      : mime.startsWith('video/') ? 'video'
      : mime.startsWith('audio/') ? 'audio'
      : 'document';

    const config = await this.whatsAppService.getUserWhatsAppConfig(conversation.userId);

    // Áudio gravado no navegador vem em webm/opus — o WhatsApp não aceita. Converte p/ ogg/opus.
    let envBuffer = file.buffer;
    let envMime = mime;
    let envNome = file.originalname;
    if (kind === 'audio') {
      const ogg = await this.audioParaOgg(file.buffer, mime);
      if (ogg) {
        envBuffer = ogg;
        envMime = 'audio/ogg';
        envNome = (file.originalname || 'audio').replace(/\.[^.]+$/, '') + '.ogg';
      }
    }

    // 1) Nossa cópia (permanente). Prefixo único: dois "foto.jpg" gravariam na mesma
    //    chave e o segundo apagaria o primeiro.
    const guardado = await this.cloudStorage.upload(
      envBuffer,
      `${Date.now()}-${randomUUID().slice(0, 8)}-${envNome}`,
      envMime,
      `whatsapp/${conversation.userId}`,
    );

    // 2) Cópia do Meta (temporária, é a que ele entrega) — reusa o upload que o
    //    agente de IA já usa pra mandar áudio.
    const subida = await this.whatsAppService.uploadMedia(
      envBuffer, envMime, envNome, config || undefined,
    );
    if (!subida.mediaId) {
      throw new BadRequestException(`O WhatsApp não aceitou o arquivo: ${subida.error}`);
    }

    // 3) Envia
    const resposta = await this.whatsAppService.sendMediaMessage(
      conversation.contactPhone,
      subida.mediaId,
      kind,
      caption || undefined,
      file.originalname,
      config || undefined,
      replyToWaMessageId || undefined,
    );
    if (!resposta.success) {
      throw new BadRequestException(`Não consegui enviar: ${resposta.error}`);
    }

    // 4) Registra na conversa (com a NOSSA url, que não expira)
    const tipoBanco = kind === 'sticker' ? 'STICKER' : (kind.toUpperCase() as any);
    const msg = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId,
        waMessageId: resposta.messageId,
        direction: 'OUTBOUND',
        type: tipoBanco,
        status: 'SENT',
        content: caption || file.originalname,
        mediaType: mime,
        mediaCaption: caption || null,
        mediaCloudUrl: guardado.success ? guardado.url : null,
        mediaCloudId: guardado.success ? guardado.publicId : null,
        mediaStorageType: guardado.success ? guardado.provider : null,
        mediaDownloadedAt: guardado.success ? new Date() : null,
        sentAt: new Date(),
        metadata: {
          senderType: 'HUMAN',
          senderName: user.name || 'Atendente',
          senderUserId: user.id,
          ...(replyToWaMessageId ? { replyToWaMessageId } : {}),
        },
      },
      select: { id: true },
    });

    await this.prisma.whatsAppConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }).catch(() => undefined);

    this.logger.log(`Anexo ${kind} enviado na conversa ${conversationId} por ${user.id}`);
    return { id: msg.id, kind, waMessageId: resposta.messageId };
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @CurrentUser() user: JwtUser,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const conversation = await this.whatsAppService.getConversation(conversationId);
    if (!conversation) {
      return { error: 'Conversation not found' };
    }

    this.logger.log(`Sending message to conversation ${conversationId} by user ${user.id}`);

    const result = await this.whatsAppService.sendAndSaveMessage(
      conversation.userId,
      conversationId,
      dto.content,
      dto.type,
      { senderType: 'HUMAN', senderName: user.name || 'Atendente', senderId: user.id },
      dto.replyToWaMessageId,
    );

    return result;
  }

  // Envia o boletim de fisio: entrega já se a conversa está aberta (e registra no inbox),
  // ou manda a abridora + deixa o boletim na fila se estiver fechada.
  @Post('boletim')
  async enviarBoletim(@Body() dto: { tutorId: string; texto: string; petNome?: string }) {
    if (!dto?.tutorId || !dto?.texto) return { status: 'erro', error: 'tutorId e texto são obrigatórios' };
    return this.whatsAppService.enviarBoletim(dto.tutorId, dto.texto, dto.petNome);
  }

  // Boletim de internação: entrega já se a conversa está aberta, ou manda a abridora
  // (boletim_internacao, com botões) + deixa na fila se estiver fechada.
  @Post('boletim-internacao')
  async enviarBoletimInternacao(
    @Body() dto: { tutorId: string; texto: string; petNome?: string; midia?: { url: string; tipo: 'image' | 'video' } },
  ) {
    if (!dto?.tutorId || !dto?.texto) return { status: 'erro', error: 'tutorId e texto são obrigatórios' };
    return this.whatsAppService.enviarBoletimInternacao(dto.tutorId, dto.texto, dto.petNome, dto.midia);
  }

  // ============================================
  // Direct Send (without conversation)
  // ============================================

  @Post('send')
  async sendDirect(
    @CurrentUser() user: JwtUser,
    @Body() dto: { to: string; message: string },
  ) {
    this.logger.log(`Direct send to ${dto.to} from user ${user.id}`);

    // Get or create conversation
    const conversation = await this.whatsAppService.createOrGetConversation(
      user.id,
      dto.to,
    );

    // Send and save
    const result = await this.whatsAppService.sendAndSaveMessage(
      user.id,
      conversation.id,
      dto.message,
      'TEXT',
      { senderType: 'HUMAN', senderName: user.name || 'Atendente', senderId: user.id },
    );

    return {
      conversationId: conversation.id,
      ...result,
    };
  }

  // Garante uma conversa pra um telefone (cria se não existir) SEM enviar nada.
  // Usado pra anexar mídia por telefone (ex.: caixa "Nova mensagem").
  @Post('conversations/ensure')
  async ensureConversation(
    @CurrentUser() user: JwtUser,
    @Body() dto: { to: string },
  ) {
    if (!dto?.to) throw new BadRequestException('Telefone obrigatório.');
    const conversation = await this.whatsAppService.createOrGetConversation(user.id, dto.to);
    return { conversationId: conversation.id };
  }

  // Inicia conversa com TEMPLATE aprovado (necessário fora da janela de 24h).
  @Post('send-template')
  async sendTemplate(
    @CurrentUser() user: JwtUser,
    @Body() dto: { to: string; templateName: string; language?: string; params?: { type: 'text'; text: string }[]; preview?: string },
  ) {
    if (!dto?.to || !dto?.templateName) return { success: false, error: 'to e templateName são obrigatórios' };
    const conversation = await this.whatsAppService.createOrGetConversation(user.id, dto.to);
    const res = await this.whatsAppService.sendTemplateMessage(
      dto.to,
      dto.templateName,
      dto.params || [],
      dto.language || 'pt_BR',
    );
    if (!res.success) return { success: false, error: res.error || 'Falha ao enviar o template' };
    try {
      await this.whatsAppService.saveOutboundMessage(
        conversation.id,
        dto.preview || `[Modelo] ${dto.templateName}`,
        'TEXT',
        (res as any).messageId,
        { template: dto.templateName },
        { senderType: 'HUMAN', senderName: user.name || 'Atendente', senderId: user.id },
      );
    } catch {
      /* salvar a msg é best-effort */
    }
    return { success: true, conversationId: conversation.id };
  }

  // ============================================
  // Stats
  // ============================================

  @Get('stats')
  async getStats(@CurrentUser() user: JwtUser) {
    // 4 contagens diretas no banco — leve. (Antes carregava 1000 conversas + escrevia no banco.)
    return this.whatsAppService.getStats();
  }

  // ============================================
  // Connection Test
  // ============================================

  @Get('test-connection')
  async testConnection(@CurrentUser() user: JwtUser) {
    const config = await this.whatsAppService.getUserWhatsAppConfig(user.id);
    return this.whatsAppService.testConnection(config || undefined);
  }

  @Get('templates')
  async getTemplates(@CurrentUser() user: JwtUser) {
    const config = await this.whatsAppService.getUserWhatsAppConfig(user.id);
    return this.whatsAppService.getTemplates(config || undefined);
  }
}
