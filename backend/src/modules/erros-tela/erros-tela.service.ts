import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * O QUE DEU ERRADO NA TELA DE ALGUÉM.
 *
 * Cintia, 15/09/2026, no fim de uma tarde inteira perdida: "as vezes como não acontecem comigo,
 * não sei nem como nem porque estão acontecendo".
 *
 * Foi exatamente o que me custou horas hoje: a Dra. Vivian não conseguia salvar um orçamento, o
 * servidor não registrava nada — porque o pedido morria antes de chegar — e eu procurei no lugar
 * errado. O sistema sabia do erro. Só não tinha onde contar.
 *
 * GUARDA EM `lista_itens`, e não numa tabela nova, pelo mesmo motivo das outras configurações:
 * não vale uma migração de schema para um registro que é, por natureza, descartável.
 */
@Injectable()
export class ErrosTelaService {
  private readonly logger = new Logger(ErrosTelaService.name);
  private readonly LISTA = 'erros_tela';
  /** Depois disto o erro não ajuda mais ninguém e só pesa. */
  private readonly DIAS_GUARDADOS = 14;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra um erro. JUNTA OS REPETIDOS: a mesma falha, da mesma pessoa, na mesma tela, dentro
   * de 10 minutos, vira um contador em vez de dez linhas.
   *
   * Sem isso, um erro que dispara a cada tecla digitada encheria a lista e esconderia os outros
   * — e a lista existe justamente para o que é raro e ninguém viu.
   */
  async registrar(dados: {
    mensagem?: string;
    tela?: string;
    detalhe?: string;
    userId?: string | null;
    userNome?: string | null;
  }): Promise<{ ok: boolean }> {
    const mensagem = String(dados?.mensagem || '').trim().slice(0, 400);
    if (!mensagem) return { ok: false };
    const tela = String(dados?.tela || '').trim().slice(0, 200);
    const agora = new Date();

    try {
      const recentes = await this.prisma.listaItem.findMany({
        where: { lista: this.LISTA, createdAt: { gt: new Date(agora.getTime() - 10 * 60 * 1000) } },
        select: { id: true, valor: true },
        take: 50,
      });
      for (const it of recentes) {
        let d: any; try { d = JSON.parse(it.valor); } catch { continue; }
        if (d?.mensagem === mensagem && d?.tela === tela && d?.userId === (dados.userId || null)) {
          await this.prisma.listaItem.update({
            where: { id: it.id },
            data: { valor: JSON.stringify({ ...d, vezes: Number(d.vezes || 1) + 1, ultimaEm: agora.toISOString() }) },
          });
          return { ok: true };
        }
      }

      await this.prisma.listaItem.create({
        data: {
          lista: this.LISTA,
          valor: JSON.stringify({
            mensagem, tela,
            detalhe: String(dados?.detalhe || '').slice(0, 2000) || null,
            userId: dados.userId || null,
            userNome: dados.userNome || null,
            em: agora.toISOString(),
            ultimaEm: agora.toISOString(),
            vezes: 1,
          }),
        },
      });
      this.logger.warn(`Erro de tela (${dados.userNome || 'alguem'} em ${tela}): ${mensagem}`);
      return { ok: true };
    } catch (e) {
      // Registrar erro NUNCA pode causar erro. Se falhar, some — a tela de quem estava
      // trabalhando não pode quebrar por causa do relatório do que quebrou.
      this.logger.warn(`Nao consegui registrar erro de tela: ${String((e as any)?.message || e)}`);
      return { ok: false };
    }
  }

  /** Os erros de um dia (padrão: hoje, no fuso da clínica), mais recentes primeiro. */
  async listar(diaISO?: string) {
    const base = diaISO ? new Date(`${diaISO}T12:00:00-03:00`) : new Date();
    const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).format(base);
    const inicio = new Date(`${dia}T00:00:00-03:00`);
    const fim = new Date(`${dia}T23:59:59.999-03:00`);

    const itens = await this.prisma.listaItem.findMany({
      where: { lista: this.LISTA, createdAt: { gte: inicio, lte: fim } },
      select: { id: true, valor: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 300,
    }).catch(() => [] as any[]);

    return itens.map((it: any) => {
      let d: any = {}; try { d = JSON.parse(it.valor); } catch { /* linha ilegivel */ }
      return { id: it.id, ...d, em: d.em || it.createdAt };
    }).filter((x: any) => x.mensagem);
  }

  /** Apaga o que passou dos 14 dias. Chamado pelo expurgo diário dos exames, que já roda de madrugada. */
  async expurgar(): Promise<{ apagados: number }> {
    const limite = new Date(Date.now() - this.DIAS_GUARDADOS * 24 * 60 * 60 * 1000);
    const r = await this.prisma.listaItem.deleteMany({
      where: { lista: this.LISTA, createdAt: { lt: limite } },
    }).catch(() => ({ count: 0 }));
    return { apagados: r.count };
  }
}
