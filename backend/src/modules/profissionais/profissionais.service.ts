import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfissionalDto } from './dto/create-profissional.dto';
import { UpdateProfissionalDto } from './dto/update-profissional.dto';

@Injectable()
export class ProfissionaisService {
  constructor(private readonly prisma: PrismaService) {}

  // Cria ou vincula um User quando dto traz acesso ao sistema
  private async ensureUser(dto: any, existingUserId?: string | null): Promise<string | null> {
    if (!dto.criarAcesso) return existingUserId || null;
    if (!dto.email) throw new BadRequestException('Email obrigatório pra dar acesso ao sistema');
    const role = dto.role || 'RECEPTIONIST';
    if (existingUserId) {
      // Atualizar role/email do user existente
      await this.prisma.user.update({
        where: { id: existingUserId },
        data: {
          email: dto.email,
          role,
          name: dto.nomeCompleto,
          ...(dto.password ? { password: await bcrypt.hash(dto.password, 10) } : {}),
        },
      });
      return existingUserId;
    }
    // Verificar se já existe um User com esse email
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) return existing.id;
    if (!dto.password) throw new BadRequestException('Senha obrigatória ao criar novo acesso');
    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.nomeCompleto,
        password: await bcrypt.hash(dto.password, 10),
        role,
        isApproved: true,
      },
    });
    return created.id;
  }

  async create(dto: CreateProfissionalDto & any) {
    const userId = await this.ensureUser(dto);
    return this.prisma.profissional.create({
      data: {
        nomeCompleto: dto.nomeCompleto,
        nomeExibicao: dto.nomeExibicao,
        iniciais: dto.iniciais,
        tipo: dto.tipo,
        especialidade: dto.especialidade,
        crmv: dto.crmv,
        telefone: dto.telefone,
        email: dto.email,
        fotoUrl: dto.fotoUrl,
        corAvatar: dto.corAvatar,
        comissaoPercentual: dto.comissaoPercentual,
        userId,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        observacoes: dto.observacoes,
        ativo: dto.ativo ?? true,
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

  async update(id: string, dto: UpdateProfissionalDto & any) {
    const existing = await this.findOne(id);
    const userId = await this.ensureUser(dto, existing.userId);
    return this.prisma.profissional.update({
      where: { id },
      data: {
        nomeCompleto: dto.nomeCompleto,
        nomeExibicao: dto.nomeExibicao,
        iniciais: dto.iniciais,
        tipo: dto.tipo,
        especialidade: dto.especialidade,
        crmv: dto.crmv,
        telefone: dto.telefone,
        email: dto.email,
        fotoUrl: dto.fotoUrl,
        corAvatar: dto.corAvatar,
        comissaoPercentual: dto.comissaoPercentual,
        userId,
        dataInicio: dto.dataInicio ? new Date(dto.dataInicio) : undefined,
        observacoes: dto.observacoes,
        ativo: dto.ativo,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.profissional.delete({ where: { id } });
  }
}
