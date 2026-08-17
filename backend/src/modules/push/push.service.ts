/**
 * Push (web push) da EQUIPE — avisa o recepcionista/vet mesmo com o sistema FECHADO.
 * Espelha o portal-push, mas por userId. Guarda a inscrição de cada aparelho (staff_push)
 * e envia a notificação assinada com as chaves VAPID. Sem VAPID configurado, não envia
 * (e nunca derruba quem chamou).
 *
 * ⚠️ NUNCA colocar dado clínico/sensível no texto — a notificação aparece na tela de bloqueio.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';

export interface Aviso {
  titulo: string;
  texto: string;
  url?: string; // pra onde levar ao tocar
  tag?: string; // agrupa/idempotência do lado do navegador
}

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private configurado = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const publica = this.chavePublica;
    const privada = this.config.get<string>('VAPID_PRIVATE_KEY');
    const contato = this.config.get<string>('VAPID_SUBJECT') || 'mailto:adm.emporiodopet@gmail.com';
    if (publica && privada) {
      try {
        webpush.setVapidDetails(contato, publica, privada);
        this.configurado = true;
      } catch (e: any) {
        this.logger.warn(`VAPID inválido: ${e?.message || e}`);
      }
    } else {
      this.logger.log('Push desativado (VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configurados).');
    }
  }

  /** O navegador precisa dela pra se inscrever. Pública de propósito. */
  get chavePublica(): string | undefined {
    return this.config.get<string>('VAPID_PUBLIC_KEY');
  }
  get ativo(): boolean {
    return this.configurado;
  }

  async inscrever(
    userId: string,
    sub: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
    userAgent?: string,
  ) {
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return { inscrito: false };

    await this.prisma.staffPush.upsert({
      where: { endpoint },
      create: { userId, endpoint, p256dh, auth, userAgent: userAgent?.slice(0, 300) },
      update: { userId, p256dh, auth, falhas: 0 },
    });
    return { inscrito: true };
  }

  async desinscrever(userId: string, endpoint?: string) {
    if (!endpoint) return { removido: 0 };
    const r = await this.prisma.staffPush.deleteMany({ where: { userId, endpoint } });
    return { removido: r.count };
  }

  /** Manda o aviso pra todos os aparelhos do usuário. Fire-and-forget nos callers. */
  async avisar(userId: string, aviso: Aviso): Promise<{ enviados: number; motivo?: string }> {
    if (!this.configurado) return { enviados: 0, motivo: 'SEM_CHAVES' };
    const aparelhos = await this.prisma.staffPush.findMany({ where: { userId } });
    if (!aparelhos.length) return { enviados: 0, motivo: 'SEM_APARELHO' };

    const carga = JSON.stringify({
      titulo: aviso.titulo,
      texto: aviso.texto,
      url: aviso.url || '/dashboard',
      tag: aviso.tag,
    });

    let enviados = 0;
    for (const a of aparelhos) {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, carga);
        enviados++;
        await this.prisma.staffPush.update({ where: { id: a.id }, data: { ultimoEnvio: new Date(), falhas: 0 } });
      } catch (e: any) {
        const status = e?.statusCode;
        // 404/410 = inscrição morta (permissão revogada / navegador limpo). Apaga.
        if (status === 404 || status === 410) {
          await this.prisma.staffPush.delete({ where: { id: a.id } }).catch(() => undefined);
        } else {
          await this.prisma.staffPush.update({ where: { id: a.id }, data: { falhas: { increment: 1 } } }).catch(() => undefined);
          this.logger.warn(`Falha ao push (status ${status || '?'}).`);
        }
      }
    }
    return { enviados };
  }

  async testar(userId: string) {
    return this.avisar(userId, {
      titulo: 'Tudo certo! 🐾',
      texto: 'É assim que você vai receber os avisos — mesmo com o sistema fechado.',
      url: '/dashboard',
      tag: 'push-teste',
    });
  }
}
