import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRegraDto } from './dto/create-regra.dto';
import { UpdateRegraDto } from './dto/update-regra.dto';
import { RegraLike, alvosDaRegra, encontrarRegra } from './classificacao.util';

@Injectable()
export class RegrasService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateRegraDto) {
    return this.prisma.regra.create({ data: { ...dto } });
  }

  findAll() {
    return this.prisma.regra.findMany({
      orderBy: [{ ativo: 'desc' }, { prioridade: 'asc' }, { termo: 'asc' }],
    });
  }

  async findOne(id: string) {
    const regra = await this.prisma.regra.findUnique({ where: { id } });
    if (!regra) throw new NotFoundException('Regra não encontrada');
    return regra;
  }

  async update(id: string, dto: UpdateRegraDto) {
    await this.findOne(id);
    return this.prisma.regra.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.regra.delete({ where: { id } });
    return { message: 'Regra excluída' };
  }

  /**
   * Aplica a regra retroativamente aos lançamentos "a classificar" (sem categoria)
   * cuja descrição casa com o termo. Retorna quantos foram classificados.
   */
  async aplicarAosPendentes(id: string) {
    const regra = (await this.findOne(id)) as RegraLike;
    const tipos =
      regra.escopo === 'AMBOS' ? ['RECEITA', 'DESPESA'] : [regra.escopo];
    const pendentes = await this.prisma.lancamento.findMany({
      where: { categoriaId: null, tipo: { in: tipos as any } },
    });
    const alvos = alvosDaRegra(regra);
    let aplicados = 0;
    for (const l of pendentes) {
      if (!encontrarRegra(l.descricao, l.tipo, [regra])) continue;
      await this.prisma.lancamento.update({
        where: { id: l.id },
        data: { ...alvos },
      });
      aplicados++;
    }
    return { aplicados };
  }
}
