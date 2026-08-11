import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContaDto, UpdateContaDto } from './dto/conta.dto';
import {
  CreateGrupoDto,
  UpdateGrupoDto,
  CreateCategoriaDto,
  UpdateCategoriaDto,
} from './dto/categoria.dto';
import {
  CreateUnidadeDto, UpdateUnidadeDto,
  CreateMarcaDto, UpdateMarcaDto,
  CreateLinhaDto, UpdateLinhaDto,
  CreateContatoDto, UpdateContatoDto,
  CreateFormaDto, UpdateFormaDto,
} from './dto/apoios.dto';

/** Cadastros do módulo (dimensões + plano de contas + contas). */
@Injectable()
export class CadastrosService {
  constructor(private readonly prisma: PrismaService) {}

  unidades() {
    return this.prisma.unidade.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: { marcaPadrao: true },
    });
  }

  marcas() {
    return this.prisma.marca.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
    });
  }

  linhasServico() {
    return this.prisma.linhaServico.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
  }

  categorias() {
    return this.prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: [{ grupo: { ordem: 'asc' } }, { ordem: 'asc' }, { nome: 'asc' }],
      include: { grupo: true },
    });
  }

  contas() {
    return this.prisma.contaFinanceira.findMany({
      where: { ativo: true },
      orderBy: { nome: 'asc' },
      include: { unidade: true },
    });
  }

  /* ---------- gestão de Contas (inclui inativas) ---------- */

  async contasTodas() {
    const contas = await this.prisma.contaFinanceira.findMany({
      orderBy: [{ ativo: 'desc' }, { nome: 'asc' }],
      include: { unidade: true },
    });
    // Saldo REAL de cada conta = saldo inicial + entradas − saídas dos lançamentos JÁ realizados
    // (CONFIRMADO/CONCILIADO; PENDENTE de a-pagar/a-receber não conta ainda).
    const status = { in: ['CONFIRMADO', 'CONCILIADO'] } as any;
    const [somas, transfOut, transfIn] = await Promise.all([
      this.prisma.lancamento.groupBy({ by: ['contaId', 'tipo'], where: { status, tipo: { in: ['RECEITA', 'DESPESA'] } as any }, _sum: { valorCentavos: true } }),
      // Transferência SAINDO da conta (origem) = saída; ENTRANDO (destino) = entrada. Neutra no DRE, mexe no saldo.
      this.prisma.lancamento.groupBy({ by: ['contaId'], where: { status, tipo: 'TRANSFERENCIA' as any }, _sum: { valorCentavos: true } }),
      this.prisma.lancamento.groupBy({ by: ['contaDestinoId'], where: { status, tipo: 'TRANSFERENCIA' as any }, _sum: { valorCentavos: true } }),
    ]);
    const mapa = new Map<string, { entradas: number; saidas: number }>();
    const bump = (id: string | null, campo: 'entradas' | 'saidas', v: number) => {
      if (!id) return; const cur = mapa.get(id) || { entradas: 0, saidas: 0 }; cur[campo] += v || 0; mapa.set(id, cur);
    };
    for (const s of somas) bump(s.contaId, s.tipo === 'RECEITA' ? 'entradas' : 'saidas', s._sum?.valorCentavos || 0);
    for (const s of transfOut) bump(s.contaId, 'saidas', s._sum?.valorCentavos || 0);
    for (const s of transfIn) bump((s as any).contaDestinoId, 'entradas', s._sum?.valorCentavos || 0);
    return contas.map((c) => {
      const m = mapa.get(c.id) || { entradas: 0, saidas: 0 };
      return {
        ...c,
        entradasCentavos: m.entradas,
        saidasCentavos: m.saidas,
        saldoAtualCentavos: (c.saldoInicialCentavos || 0) + m.entradas - m.saidas,
      };
    });
  }

  /** saldoInicialData chega como string ISO — converte pra Date (Prisma). */
  private prepConta<T extends { saldoInicialData?: string }>(dto: T) {
    const { saldoInicialData, ...rest } = dto as any;
    return {
      ...rest,
      ...(saldoInicialData !== undefined
        ? { saldoInicialData: saldoInicialData ? new Date(saldoInicialData) : null }
        : {}),
    };
  }

  criarConta(dto: CreateContaDto) {
    return this.prisma.contaFinanceira.create({ data: this.prepConta(dto) });
  }

  async atualizarConta(id: string, dto: UpdateContaDto) {
    const conta = await this.prisma.contaFinanceira.findUnique({ where: { id } });
    if (!conta) throw new NotFoundException('Conta não encontrada');
    return this.prisma.contaFinanceira.update({ where: { id }, data: this.prepConta(dto) });
  }

  async removerConta(id: string) {
    const conta = await this.prisma.contaFinanceira.findUnique({ where: { id } });
    if (!conta) throw new NotFoundException('Conta não encontrada');
    const emUso = await this.prisma.lancamento.count({ where: { contaId: id } });
    if (emUso > 0) {
      throw new BadRequestException(
        `Esta conta tem ${emUso} lançamento(s). Desative-a em vez de excluir (o histórico é preservado).`,
      );
    }
    await this.prisma.contaFinanceira.delete({ where: { id } });
    return { message: 'Conta excluída' };
  }

  /* ---------- Plano de contas: grupos + categorias ---------- */

  /** Plano completo: grupos ordenados, cada um com suas categorias (inclui inativas). */
  async planoDeContas() {
    const grupos = await this.prisma.grupoCategoria.findMany({
      orderBy: { ordem: 'asc' },
      include: {
        categorias: { orderBy: [{ ordem: 'asc' }, { nome: 'asc' }] },
      },
    });
    // contagem de uso por categoria (para bloquear exclusão)
    const usos = await this.prisma.lancamento.groupBy({
      by: ['categoriaId'],
      _count: { _all: true },
      where: { categoriaId: { not: null } },
    });
    const usoPorCat = new Map(usos.map((u) => [u.categoriaId, u._count._all]));
    return grupos.map((g) => ({
      ...g,
      categorias: g.categorias.map((c) => ({ ...c, usos: usoPorCat.get(c.id) ?? 0 })),
    }));
  }

  criarGrupo(dto: CreateGrupoDto) {
    return this.prisma.grupoCategoria.create({ data: { ...dto, ordem: dto.ordem ?? 99 } });
  }

  async atualizarGrupo(id: string, dto: UpdateGrupoDto) {
    const g = await this.prisma.grupoCategoria.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Grupo não encontrado');
    return this.prisma.grupoCategoria.update({ where: { id }, data: { ...dto } });
  }

  async removerGrupo(id: string) {
    const g = await this.prisma.grupoCategoria.findUnique({
      where: { id },
      include: { _count: { select: { categorias: true } } },
    });
    if (!g) throw new NotFoundException('Grupo não encontrado');
    if (g._count.categorias > 0) {
      throw new BadRequestException('O grupo tem categorias — mova ou exclua as categorias antes.');
    }
    await this.prisma.grupoCategoria.delete({ where: { id } });
    return { message: 'Grupo excluído' };
  }

  criarCategoria(dto: CreateCategoriaDto) {
    return this.prisma.categoria.create({ data: { ...dto } });
  }

  async atualizarCategoria(id: string, dto: UpdateCategoriaDto) {
    const c = await this.prisma.categoria.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Categoria não encontrada');
    return this.prisma.categoria.update({ where: { id }, data: { ...dto } });
  }

  async removerCategoria(id: string) {
    const c = await this.prisma.categoria.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Categoria não encontrada');
    const emUso = await this.prisma.lancamento.count({ where: { categoriaId: id } });
    if (emUso > 0) {
      throw new BadRequestException(
        `Esta categoria tem ${emUso} lançamento(s). Desative-a em vez de excluir (o histórico é preservado).`,
      );
    }
    await this.prisma.categoria.delete({ where: { id } });
    return { message: 'Categoria excluída' };
  }

  /* ---------- Unidades ---------- */

  unidadesTodas() {
    return this.prisma.unidade.findMany({ orderBy: [{ ativo: 'desc' }, { nome: 'asc' }], include: { marcaPadrao: true } });
  }
  criarUnidade(dto: CreateUnidadeDto) {
    return this.prisma.unidade.create({ data: { ...dto } as any });
  }
  async atualizarUnidade(id: string, dto: UpdateUnidadeDto) {
    if (!(await this.prisma.unidade.findUnique({ where: { id } }))) throw new NotFoundException('Unidade não encontrada');
    return this.prisma.unidade.update({ where: { id }, data: { ...dto } as any });
  }
  async removerUnidade(id: string) {
    const emUso = await this.prisma.lancamento.count({ where: { unidadeId: id } });
    if (emUso > 0) throw new BadRequestException(`Unidade com ${emUso} lançamento(s). Desative em vez de excluir.`);
    await this.prisma.unidade.delete({ where: { id } });
    return { message: 'Unidade excluída' };
  }

  /* ---------- Marcas ---------- */

  marcasTodas() {
    return this.prisma.marca.findMany({ orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] });
  }
  criarMarca(dto: CreateMarcaDto) {
    return this.prisma.marca.create({ data: { ...dto } });
  }
  async atualizarMarca(id: string, dto: UpdateMarcaDto) {
    if (!(await this.prisma.marca.findUnique({ where: { id } }))) throw new NotFoundException('Marca não encontrada');
    return this.prisma.marca.update({ where: { id }, data: { ...dto } });
  }
  async removerMarca(id: string) {
    const emUso = await this.prisma.lancamento.count({ where: { marcaId: id } });
    if (emUso > 0) throw new BadRequestException(`Marca com ${emUso} lançamento(s). Desative em vez de excluir.`);
    await this.prisma.marca.delete({ where: { id } });
    return { message: 'Marca excluída' };
  }

  /* ---------- Linhas de serviço ---------- */

  linhasTodas() {
    return this.prisma.linhaServico.findMany({ orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }] });
  }
  criarLinha(dto: CreateLinhaDto) {
    return this.prisma.linhaServico.create({ data: { ...dto } });
  }
  async atualizarLinha(id: string, dto: UpdateLinhaDto) {
    if (!(await this.prisma.linhaServico.findUnique({ where: { id } }))) throw new NotFoundException('Linha não encontrada');
    return this.prisma.linhaServico.update({ where: { id }, data: { ...dto } });
  }
  async removerLinha(id: string) {
    const emUso = await this.prisma.lancamento.count({ where: { linhaServicoId: id } });
    if (emUso > 0) throw new BadRequestException(`Linha com ${emUso} lançamento(s). Desative em vez de excluir.`);
    await this.prisma.linhaServico.delete({ where: { id } });
    return { message: 'Linha excluída' };
  }

  /* ---------- Contatos ---------- */

  contatos() {
    return this.prisma.contato.findMany({ orderBy: [{ ativo: 'desc' }, { nome: 'asc' }] });
  }
  criarContato(dto: CreateContatoDto) {
    return this.prisma.contato.create({ data: { ...dto } });
  }
  async atualizarContato(id: string, dto: UpdateContatoDto) {
    if (!(await this.prisma.contato.findUnique({ where: { id } }))) throw new NotFoundException('Contato não encontrado');
    return this.prisma.contato.update({ where: { id }, data: { ...dto } });
  }
  async removerContato(id: string) {
    await this.prisma.contato.delete({ where: { id } }).catch(() => null);
    return { message: 'Contato excluído' };
  }

  /* ---------- Formas de pagamento ---------- */

  formas() {
    return this.prisma.formaPagamento.findMany({ orderBy: [{ ativo: 'desc' }, { ordem: 'asc' }, { nome: 'asc' }] });
  }
  criarForma(dto: CreateFormaDto) {
    return this.prisma.formaPagamento.create({ data: { ...dto } });
  }
  async atualizarForma(id: string, dto: UpdateFormaDto) {
    if (!(await this.prisma.formaPagamento.findUnique({ where: { id } }))) throw new NotFoundException('Forma não encontrada');
    return this.prisma.formaPagamento.update({ where: { id }, data: { ...dto } });
  }
  async removerForma(id: string) {
    await this.prisma.formaPagamento.delete({ where: { id } }).catch(() => null);
    return { message: 'Forma excluída' };
  }
}
