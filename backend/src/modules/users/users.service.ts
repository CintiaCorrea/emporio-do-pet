import { BadRequestException, Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já cadastrado');
    }

    return this.prisma.user.create({
      data: {
        ...createUserDto,
        // Por padrão, somente ADMIN entra aprovado. Demais roles aguardam aprovação.
        isApproved: createUserDto.role === 'ADMIN',
        isBlocked: false,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        signatureUrl: true,
        permissions: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
        // Dados do profissional (CRMV, nome público, especialidade) — usados para
        // preencher as variáveis @USUARIO_*@ dos modelos de documento/receita.
        profissional: {
          select: {
            nomeExibicao: true,
            crmv: true,
            especialidade: true,
            tipo: true,
            telefone: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        signatureUrl: true,
        permissions: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async findByEmail(email: string) {
    // Insensível a maiúsculas: o e-mail pode chegar com a 1ª letra em maiúscula
    // (autocorreção do teclado do celular). Evita login/duplicado por diferença de caixa.
    return this.prisma.user.findFirst({
      where: { email: { equals: (email || '').trim(), mode: 'insensitive' } },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findById(id);

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        signatureUrl: true,
        permissions: true,
        isApproved: true,
        isBlocked: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Excluir funcionario APAGA em cascata todo atendimento em que ele e' o responsavel
   * (Appointment.user e' onDelete: Cascade) — e junto vao as vendas desses atendimentos,
   * de TODOS os clientes. E' a mesma porta pela qual 22 vendas sumiram em 31/08/2026,
   * e a mais destrutiva das tres: apagar uma veterinaria que saiu levaria o historico
   * de vendas dela inteiro.
   *
   * Com qualquer historico, a exclusao e' recusada. O caminho passa a ser BLOQUEAR o
   * acesso (isBlocked): o login para de funcionar, ele sai das listas de notificacao e
   * de escala, e nada e' apagado. Vale ate para o ADMIN.
   */
  async remove(id: string) {
    await this.findById(id);

    const [atendimentos, vendas] = await Promise.all([
      this.prisma.appointment.count({ where: { userId: id } }),
      this.prisma.appointment.count({ where: { userId: id, numeroVenda: { not: null } } }),
    ]);
    if (atendimentos > 0) {
      const detalhe = vendas > 0
        ? `${vendas} venda(s) e ${atendimentos} atendimento(s)`
        : `${atendimentos} atendimento(s)`;
      throw new BadRequestException(
        `TEM_HISTORICO: Este profissional e o responsavel por ${detalhe}. Excluir apagaria tudo junto, sem volta — inclusive vendas de outros clientes. Bloqueie o acesso dele em vez de excluir: ele perde o login e sai das listas, mas o historico fica de pe.`,
      );
    }

    return this.prisma.user.delete({ where: { id } });
  }

  /** Desliga o funcionario sem apagar nada: o login para de funcionar na hora. */
  async bloquear(id: string, bloqueado: boolean) {
    await this.findById(id);
    return this.prisma.user.update({
      where: { id },
      data: { isBlocked: bloqueado },
      select: { id: true, name: true, isBlocked: true },
    });
  }
}
