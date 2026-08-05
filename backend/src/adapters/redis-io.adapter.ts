import { INestApplicationContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { ServerOptions } from 'socket.io';

/**
 * Faz o Socket.IO usar o Redis como "central de recados" entre as 2 máquinas do backend.
 *
 * SEM isto: um evento (ex.: "chegou WhatsApp") emitido na máquina A não chega nos usuários
 * conectados na máquina B → o tempo real fica quebrado → o front compensa ficando o tempo
 * todo "perguntando" (polling), o que sufoca o banco. (Ver relatório de estabilidade 27/07.)
 *
 * COM isto: as duas máquinas trocam os eventos pelo Redis e todo mundo recebe na hora.
 *
 * Seguro por padrão: se o Redis não responder na inicialização, `connectToRedis()` devolve
 * `false` e o servidor segue no modo antigo (em memória) — nada é derrubado.
 */
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(private readonly appCtx: INestApplicationContext) {
    super(appCtx);
  }

  private build(redisCfg: any): Redis {
    if (redisCfg?.url) {
      return new Redis(redisCfg.url, {
        tls: redisCfg.tls ? {} : undefined,
        maxRetriesPerRequest: null, // recomendado p/ clientes de pub/sub do adapter
      });
    }
    return new Redis({
      host: redisCfg?.host,
      port: redisCfg?.port,
      password: redisCfg?.password || undefined,
      db: redisCfg?.db,
      maxRetriesPerRequest: null,
    });
  }

  private waitReady(client: Redis): Promise<void> {
    return new Promise((resolve, reject) => {
      if (client.status === 'ready') return resolve();
      const t = setTimeout(() => reject(new Error('timeout conectando ao Redis')), 5000);
      client.once('ready', () => {
        clearTimeout(t);
        resolve();
      });
      client.once('error', (err) => {
        clearTimeout(t);
        reject(err);
      });
    });
  }

  async connectToRedis(): Promise<boolean> {
    const config = this.appCtx.get(ConfigService);
    const redisCfg: any = config.get('redis');
    let pubClient: Redis | undefined;
    let subClient: Redis | undefined;
    try {
      pubClient = this.build(redisCfg);
      subClient = pubClient.duplicate();

      // Só confia no adapter depois que os dois clientes conectarem (com timeout curto).
      await Promise.all([this.waitReady(pubClient), this.waitReady(subClient)]);

      // Erros pós-conexão são logados, mas não derrubam o servidor (ioredis re-tenta sozinho).
      pubClient.on('error', (e) => this.logger.error(`Redis pub error: ${e?.message}`));
      subClient.on('error', (e) => this.logger.error(`Redis sub error: ${e?.message}`));

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('✅ Socket.IO com Redis adapter (tempo real entre as 2 máquinas)');
      return true;
    } catch (e: any) {
      this.logger.error(
        `Redis adapter indisponível — seguindo em memória (modo antigo). Motivo: ${e?.message || e}`,
      );
      try {
        pubClient?.disconnect();
        subClient?.disconnect();
      } catch {
        /* ignore */
      }
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
