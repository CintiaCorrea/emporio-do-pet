import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Matriz, acaoNegada, perfilDoUsuario, podeAcao } from './permissoes.regras';

/**
 * LÊ A MATRIZ QUE A CINTIA EDITA, do mesmo lugar em que a tela lê.
 *
 * As listas são as de sempre (`lista_itens`), e é isso que torna a mudança barata: não há
 * cadastro novo, nem migração, nem uma segunda configuração para ela manter. O que estava só no
 * navegador passa a valer também no servidor.
 *
 * `permissoes_acesso` → um item por perfil, valor `{ perfil, matriz }`.
 * `perfil_usuario`    → um item só, valor `{ map: { userId: perfilNome } }`.
 */
@Injectable()
export class PermissoesService {
  private readonly logger = new Logger(PermissoesService.name);

  // Cache curto: cada operação de dinheiro consultaria o banco duas vezes só para saber quem
  // pode. Dez segundos é o bastante para uma rajada de cliques e curto o bastante para a Cintia
  // mudar uma permissão e ver o efeito antes de terminar de fechar a tela.
  private cache: { em: number; matrizes: Record<string, Matriz>; mapa: Record<string, string> } | null = null;
  private readonly VALIDADE_MS = 10_000;

  constructor(private readonly prisma: PrismaService) {}

  private async carregar() {
    if (this.cache && Date.now() - this.cache.em < this.VALIDADE_MS) return this.cache;
    const matrizes: Record<string, Matriz> = {};
    let mapa: Record<string, string> = {};
    try {
      const itens = await this.prisma.listaItem.findMany({
        where: { lista: { in: ['permissoes_acesso', 'perfil_usuario'] } },
        select: { lista: true, valor: true },
      });
      for (const it of itens) {
        let o: any; try { o = JSON.parse(it.valor); } catch { continue; }
        if (it.lista === 'permissoes_acesso' && o?.perfil) matrizes[o.perfil] = o.matriz || {};
        else if (it.lista === 'perfil_usuario' && o?.map) mapa = o.map;
      }
    } catch (e) {
      // Sem conseguir ler, NÃO libera: `podeAcao` com matriz vazia devolve o padrão, que para
      // dinheiro é fechado. Um banco fora do ar não pode virar porta aberta.
      this.logger.warn(`Nao consegui ler as permissoes: ${String((e as any)?.message || e)}`);
    }
    this.cache = { em: Date.now(), matrizes, mapa };
    return this.cache;
  }

  /** Esta pessoa pode executar esta ação? O administrativo pode sempre (trava anti-tranca). */
  async pode(userId: string | null | undefined, papel: string | null | undefined, chave: string): Promise<boolean> {
    const { matrizes, mapa } = await this.carregar();
    const perfil = perfilDoUsuario(userId, papel, mapa);
    return podeAcao(matrizes[perfil], chave, papel);
  }

  /** A Cintia fechou esta ação para este perfil de propósito? Ver `acaoNegada`. */
  async negada(userId: string | null | undefined, papel: string | null | undefined, chave: string): Promise<boolean> {
    const { matrizes, mapa } = await this.carregar();
    const perfil = perfilDoUsuario(userId, papel, mapa);
    return acaoNegada(matrizes[perfil], chave, papel);
  }

  /** Esquece o que está em memória — usado quando a matriz é salva. */
  limparCache() { this.cache = null; }
}
