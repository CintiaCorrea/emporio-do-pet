/**
 * Notificações do portal (web push) — Fatia 6.
 *
 * Como funciona, em português: o celular do tutor pede permissão e devolve um
 * "endereço" (endpoint). Guardamos esse endereço; para avisar algo, mandamos a
 * mensagem para ele assinada com as chaves VAPID do servidor. Não é WhatsApp e
 * não custa nada por mensagem.
 *
 * Duas regras que valem para tudo aqui:
 *
 * 1. **Nunca mandar dado clínico na notificação.** A notificação aparece na tela
 *    de bloqueio, que qualquer pessoa vê. Então o texto é um convite ("o boletim
 *    do Thor chegou"), nunca o conteúdo ("Thor com vômito e febre").
 * 2. **Nada é enviado duas vezes.** Cada aviso tem um `assunto` idempotente
 *    (ex.: `agenda:<id>`); se já existe registro, não manda de novo.
 *
 * Sem as chaves VAPID configuradas o serviço simplesmente não envia e avisa no
 * log — nunca derruba a requisição de quem chamou.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface Aviso {
  titulo: string;
  texto: string;
  /** Para onde levar quando o tutor toca na notificação. */
  url?: string;
  /** Chave idempotente: o mesmo assunto nunca é enviado duas vezes. */
  assunto?: string;
}

@Injectable()
export class PortalPushService {
  private readonly logger = new Logger(PortalPushService.name);
  private configurado = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publica = this.chavePublica;
    const privada = this.config.get<string>('PORTAL_VAPID_PRIVADA');
    const contato =
      this.config.get<string>('PORTAL_VAPID_CONTATO') || 'mailto:adm.emporiodopet@gmail.com';

    if (publica && privada) {
      webpush.setVapidDetails(contato, publica, privada);
      this.configurado = true;
    }
  }

  /** O navegador precisa dela para se inscrever. Pública de propósito. */
  get chavePublica(): string | undefined {
    return this.config.get<string>('PORTAL_VAPID_PUBLICA');
  }

  get ativo(): boolean {
    return this.configurado;
  }

  // ---------------------------------------------------------------------------
  // Inscrição do aparelho
  // ---------------------------------------------------------------------------
  async inscrever(
    tutorId: string,
    inscricao: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
    userAgent?: string,
  ) {
    const endpoint = inscricao?.endpoint;
    const p256dh = inscricao?.keys?.p256dh;
    const auth = inscricao?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return { inscrito: false };

    // O mesmo aparelho pode trocar de tutor (celular de família): o endpoint é
    // único, então atualizamos o dono em vez de duplicar.
    await this.prisma.portalPush.upsert({
      where: { endpoint },
      create: { tutorId, endpoint, p256dh, auth, userAgent: userAgent?.slice(0, 300) },
      update: { tutorId, p256dh, auth, falhas: 0 },
    });

    return { inscrito: true };
  }

  async desinscrever(tutorId: string, endpoint?: string) {
    if (!endpoint) return { removido: 0 };
    const r = await this.prisma.portalPush.deleteMany({ where: { tutorId, endpoint } });
    return { removido: r.count };
  }

  async aparelhosDo(tutorId: string) {
    return this.prisma.portalPush.count({ where: { tutorId } });
  }

  // ---------------------------------------------------------------------------
  // Envio
  // ---------------------------------------------------------------------------
  /**
   * Manda o aviso para todos os aparelhos do tutor.
   * Devolve quantos aparelhos receberam (0 também é resposta válida: pode ser
   * que ele nunca tenha permitido notificação).
   */
  async avisar(tutorId: string, aviso: Aviso): Promise<{ enviados: number; motivo?: string }> {
    if (!this.configurado) {
      this.logger.warn('Notificação não enviada: chaves VAPID não configuradas.');
      return { enviados: 0, motivo: 'SEM_CHAVES' };
    }

    // Idempotência: mesmo assunto nunca duas vezes.
    if (aviso.assunto) {
      const jaFoi = await this.prisma.portalPushEnviado.findUnique({
        where: { tutorId_assunto: { tutorId, assunto: aviso.assunto } },
      });
      if (jaFoi) return { enviados: 0, motivo: 'JA_ENVIADO' };
    }

    const aparelhos = await this.prisma.portalPush.findMany({ where: { tutorId } });
    if (!aparelhos.length) return { enviados: 0, motivo: 'SEM_APARELHO' };

    const carga = JSON.stringify({
      titulo: aviso.titulo,
      texto: aviso.texto,
      url: aviso.url || '/portal',
      tag: aviso.assunto,
    });

    let enviados = 0;

    for (const a of aparelhos) {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          carga,
        );
        enviados++;
        await this.prisma.portalPush.update({
          where: { id: a.id },
          data: { ultimoEnvio: new Date(), falhas: 0 },
        });
      } catch (e) {
        const status = (e as { statusCode?: number })?.statusCode;
        // 404/410 = o navegador diz que essa inscrição morreu (app desinstalado,
        // permissão revogada). Apagar é o certo — insistir é lixo eterno.
        if (status === 404 || status === 410) {
          await this.prisma.portalPush.delete({ where: { id: a.id } }).catch(() => undefined);
          this.logger.log('Inscrição expirada removida.');
        } else {
          await this.prisma.portalPush.update({
            where: { id: a.id },
            data: { falhas: { increment: 1 } },
          });
          this.logger.warn(`Falha ao notificar (status ${status || '?'}).`);
        }
      }
    }

    if (enviados && aviso.assunto) {
      await this.prisma.portalPushEnviado
        .create({ data: { tutorId, assunto: aviso.assunto, titulo: aviso.titulo } })
        .catch(() => undefined); // corrida: se outro processo gravou, está ótimo
    }

    return { enviados };
  }

  /** Aviso de teste, para o tutor conferir que a permissão funcionou. */
  async testar(tutorId: string) {
    return this.avisar(tutorId, {
      titulo: 'Tudo certo! 🐾',
      texto: 'É assim que a gente vai te avisar das novidades do seu pet.',
      url: '/portal',
    });
  }
}
