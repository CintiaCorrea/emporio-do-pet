import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Logger,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { WhatsAppService } from './whatsapp.service';
import { CloudStorageService } from '../media/cloud-storage.service';
import { PrismaService } from '../prisma/prisma.service';
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
    return this.whatsAppService.updateConversation(id, { assignedUserId: body.userId } as any);
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

  // Serve a mídia (imagem/áudio) de uma mensagem, baixada do storage privado.
  @Get('messages/:msgId/media')
  async getMessageMedia(
    @Param('msgId') msgId: string,
    @Res() res: Response,
  ) {
    const media = await this.whatsAppService.getMessageMedia(msgId);
    if (!media) {
      res.status(404).json({ error: 'Mídia não encontrada' });
      return;
    }
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, max-age=300');
    res.send(media.buffer);
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
  @Post('conversations/:id/media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
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

    // 1) Nossa cópia (permanente). Prefixo único: dois "foto.jpg" gravariam na mesma
    //    chave e o segundo apagaria o primeiro.
    const guardado = await this.cloudStorage.upload(
      file.buffer,
      `${Date.now()}-${randomUUID().slice(0, 8)}-${file.originalname}`,
      mime,
      `whatsapp/${conversation.userId}`,
    );

    // 2) Cópia do Meta (temporária, é a que ele entrega) — reusa o upload que o
    //    agente de IA já usa pra mandar áudio.
    const subida = await this.whatsAppService.uploadMedia(
      file.buffer, mime, file.originalname, config || undefined,
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
    const conversations = await this.whatsAppService.getConversations(null, undefined, { limit: 1000 });
    
    const stats = {
      totalConversations: conversations.pagination.total,
      openConversations: 0,
      unreadConversations: 0,
      assignedToAgent: 0,
    };

    for (const conv of conversations.data) {
      if (conv.status === 'OPEN') stats.openConversations++;
      if (conv.unreadCount > 0) stats.unreadConversations++;
      if (conv.assignedAgentId) stats.assignedToAgent++;
    }

    return stats;
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
