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
        escala: dto.escala,
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
    const prof = await this.prisma.profissional.update({
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
        escala: dto.escala,
        ativo: dto.ativo,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
    });
    // Desativar a profissional também BLOQUEIA o login dela (e reativar libera) — assim
    // ela some do inbox interno e não acessa mais quando removida.
    if (dto.ativo !== undefined && userId) {
      await this.prisma.user.update({ where: { id: userId }, data: { isBlocked: dto.ativo === false } }).catch(() => undefined);
    }
    return prof;
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    // Excluir a profissional bloqueia o login dela (a conta de usuário não é apagada,
    // pra preservar histórico, mas ela some do inbox interno e não acessa mais).
    if (existing.userId) {
      await this.prisma.user.update({ where: { id: existing.userId }, data: { isBlocked: true } }).catch(() => undefined);
    }
    return this.prisma.profissional.delete({ where: { id } });
  }

  async importBatch(rows: any[], upsert = true) {
    let criados = 0, atualizados = 0, ignorados = 0;
    const TIPO_MAP: Record<string, string> = {
      'veterinario': 'VETERINARIO', 'veterinário': 'VETERINARIO', 'vet': 'VETERINARIO',
      'recepcionista': 'RECEPCIONISTA', 'recepção': 'RECEPCIONISTA',
      'estagiario': 'ESTAGIARIO', 'estagiário': 'ESTAGIARIO',
      'gerente': 'GERENTE', 'outro': 'OUTRO',
    };
    for (const r of rows) {
      const nome = r.nomeCompleto || r.nome || r.nome_completo;
      if (!nome) { ignorados++; continue; }
      const tipoKey = (r.tipo || 'outro').toString().toLowerCase().trim();
      const tipo = (TIPO_MAP[tipoKey] || 'OUTRO') as any;
      const data: any = {
        nomeCompleto: nome,
        nomeExibicao: r.nomeExibicao || r.nome_exibicao || nome,
        iniciais: r.iniciais || nome.split(' ').slice(0,2).map((x: string) => x[0]).join('').toUpperCase().slice(0,2),
        tipo,
        especialidade: r.especialidade || null,
        crmv: r.crmv || null,
        telefone: r.telefone || null,
        email: r.email || null,
        comissaoPercentual: r.comissaoPercentual ?? r.comissao_percentual ?? null,
        ativo: r.ativo !== undefined ? r.ativo : true,
      };
      let existente = null as any;
      if (data.email) existente = await this.prisma.profissional.findFirst({ where: { email: data.email } });
      if (!existente) existente = await this.prisma.profissional.findFirst({ where: { nomeCompleto: { equals: nome, mode: 'insensitive' } } });
      if (existente) {
        if (!upsert) { ignorados++; continue; }
        await this.prisma.profissional.update({ where: { id: existente.id }, data });
        atualizados++;
      } else {
        await this.prisma.profissional.create({ data });
        criados++;
      }
    }
    return { criados, atualizados, ignorados };
  }
}