import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProfissionalDto) {
    return this.prisma.profissional.create({
      data: {
        ...dto,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.profissional.findMany({
      where: includeInactive ? {} : { ativo: true },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: [{ ativo: 'desc' }, { tipo: 'asc' }, { nomeCompleto: 'asc' }],
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.profissional.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    if (!item) throw new NotFoundException('Profissional não encontrado');
    return item;
  }

  async update(id: string, dto: UpdateProfissionalDto) {
    await this.findOne(id);
    return this.prisma.profissional.update({
      where: { id },
      data: {
        ...dto,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.profissional.delete({ where: { id } });
  }
}
