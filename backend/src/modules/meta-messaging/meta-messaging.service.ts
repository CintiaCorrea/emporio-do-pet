import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Inbox multicanal — Instagram Direct + Facebook Messenger.
 * Reaproveita as tabelas do WhatsApp (whatsapp_conversations / whatsapp_messages) com o campo
 * `canal` (INSTAGRAM | MESSENGER) e `perfilId` (qual Página/IG recebeu). Para IG/Messenger, o
 * contactPhone guarda o id externo prefixado ("ig:<IGSID>" / "msg:<PSID>") — não colide com telefone.
 *
 * Só age quando há perfil conectado (tabela meta_canal_perfis). Enquanto vazia, é inerte:
 * NÃO afeta o WhatsApp nem o inbox atual.
 */
@Injectable()
export class MetaMessagingService {
  private readonly logger = new Logger(MetaMessagingService.name);
  private readonly apiVersion: string;
  private readonly baseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.apiVersion = this.config.get<string>('whatsapp.apiVersion') || 'v21.0';
    this.baseUrl = `https://graph.facebook.com/${this.apiVersion}`;
  }

  /** Token de verificação do webhook (mesmo do WhatsApp — mesmo app). */
  get verifyToken(): string {
    return this.config.get<string>('whatsapp.webhookVerifyToken') || '';
  }

  private prefixo(canal: string): string {
    return canal === 'INSTAGRAM' ? 'ig' : 'msg';
  }

  /** Dono das conversas (mesma lógica do WhatsApp): 1º ADMIN ativo. */
  private async donoId(): Promise<string | null> {
    const u = await this.prisma.user.findFirst({ where: { role: 'ADMIN', isBlocked: false }, select: { id: true }, orderBy: { createdAt: 'asc' } }).catch(() => null);
    return u?.id || null;
  }

  /** Acha o perfil conectado pelo id da Página (Messenger) ou da conta IG (Instagram). */
  private async acharPerfil(canal: string, refId: string) {
    const where: any = canal === 'INSTAGRAM' ? { igId: refId } : { pageId: refId };
    return (this.prisma as any).metaCanalPerfil.findFirst({ where: { ...where, ativo: true } });
  }

  /** Acha ou cria a conversa do contato externo neste canal/perfil. */
  private async acharOuCriarConversa(canal: string, perfil: any, externalId: string, nome?: string) {
    const dono = await this.donoId();
    if (!dono) return null;
    const contactPhone = `${this.prefixo(canal)}:${externalId}`;
    const existente = await this.prisma.whatsAppConversation.findFirst({ where: { userId: dono, contactPhone } });
    if (existente) return existente;
    return this.prisma.whatsAppConversation.create({
      data: ({
        userId: dono, contactPhone, contactName: nome || null,
        canal, perfilId: perfil?.id || null, status: 'OPEN', lastMessageAt: new Date(),
      } as any),
    });
  }

  /**
   * Processa o webhook do Messenger (object=page) e do Instagram (object=instagram).
   * Cada entry traz messaging[] com { sender.id, recipient.id, message.text }.
   */
  async processarWebhook(body: any): Promise<void> {
    try {
      const obj = body?.object;
      const canal = obj === 'instagram' ? 'INSTAGRAM' : obj === 'page' ? 'MESSENGER' : null;
      if (!canal) return; // não é Messenger/IG (o WhatsApp tem webhook próprio)
      for (const entry of (body?.entry || [])) {
        // refId = id da Página (Messenger) ou da conta IG (Instagram) que RECEBEU.
        const refId = String(entry?.id || '');
        const perfil = await this.acharPerfil(canal, refId);
        if (!perfil) { this.logger.warn(`${canal}: sem perfil conectado p/ ${refId} — ignorado`); continue; }
        for (const ev of (entry?.messaging || [])) {
          const senderId = String(ev?.sender?.id || '');
          const texto = ev?.message?.text;
          const mid = ev?.message?.mid;
          if (!senderId || ev?.message?.is_echo) continue; // ignora eco das próprias respostas
          if (!texto && !ev?.message?.attachments) continue;
          const conv = await this.acharOuCriarConversa(canal, perfil, senderId);
          if (!conv) continue;
          // idempotência pelo mid
          if (mid) { const j = await this.prisma.whatsAppMessage.findFirst({ where: { waMessageId: mid } }); if (j) continue; }
          const conteudo = texto || '[anexo]';
          await this.prisma.whatsAppMessage.create({
            data: { conversationId: conv.id, waMessageId: mid || null, direction: 'INBOUND', type: 'TEXT', status: 'DELIVERED', content: conteudo, deliveredAt: new Date() },
          });
          await this.prisma.whatsAppConversation.update({ where: { id: conv.id }, data: { lastMessageAt: new Date(), lastMessagePreview: conteudo.substring(0, 100), unreadCount: { increment: 1 }, status: 'OPEN' } });
        }
      }
    } catch (e: any) {
      this.logger.warn(`Falha ao processar webhook Meta: ${e?.message || e}`);
    }
  }

  /** Envia uma resposta de texto por Instagram/Messenger (usa o token da Página do perfil). */
  async enviarTexto(conversationId: string, texto: string): Promise<{ success: boolean; error?: string }> {
    const conv: any = await this.prisma.whatsAppConversation.findUnique({ where: { id: conversationId } });
    if (!conv || conv.canal === 'WHATSAPP') return { success: false, error: 'Conversa não é de Instagram/Messenger.' };
    const perfil = conv.perfilId ? await (this.prisma as any).metaCanalPerfil.findUnique({ where: { id: conv.perfilId } }) : null;
    if (!perfil?.accessToken || !perfil?.pageId) return { success: false, error: 'Perfil sem token configurado.' };
    const externalId = String(conv.contactPhone || '').replace(/^(ig|msg):/, '');
    try {
      const r = await fetch(`${this.baseUrl}/${perfil.pageId}/messages`, {
        method: 'POST', headers: { Authorization: `Bearer ${perfil.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: { id: externalId }, message: { text: texto }, messaging_type: 'RESPONSE' }),
      });
      const d: any = await r.json().catch(() => ({}));
      if (!r.ok || d?.error) return { success: false, error: d?.error?.message || `HTTP ${r.status}` };
      await this.prisma.whatsAppMessage.create({
        data: { conversationId, waMessageId: d?.message_id || null, direction: 'OUTBOUND', type: 'TEXT', status: 'SENT', content: texto, metadata: { canal: conv.canal } as any },
      });
      await this.prisma.whatsAppConversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date(), lastMessagePreview: texto.substring(0, 100) } }).catch(() => undefined);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'erro' };
    }
  }
}
