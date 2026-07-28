/**
 * Acesso do Portal do Tutor: telefone -> codigo no WhatsApp -> sessao.
 *
 * Duas regras que valem para o arquivo inteiro:
 *
 * 1. NUNCA revelar se um telefone tem cadastro antes do codigo ser conferido.
 *    Se revelasse, qualquer pessoa poderia ficar digitando numeros para descobrir
 *    quem e cliente da clinica. Por isso `solicitarCodigo` responde a MESMA coisa
 *    para numero conhecido, desconhecido ou bloqueado.
 *
 * 2. O tutor so e definido pelo servidor. O front nunca manda "eu sou o tutor X":
 *    ate na hora do desempate os candidatos sao recalculados aqui a partir do
 *    telefone, e a escolha do tutor precisa estar entre eles.
 */
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PortalWhatsappService } from './portal-whatsapp.service';
import { findTutorByPhoneUnique } from '../../common/tutor-match';
import { last8, normalizePhone } from '../../common/phone';
import {
  BLOQUEIO_MIN,
  CODIGOS_POR_HORA,
  CODIGO_MAX_TENTATIVAS,
  CODIGO_VALIDADE_MIN,
  DESEMPATE_VALIDADE_MIN,
  REENVIO_ESPERA_SEG,
  SESSAO_DIAS,
  gerarCodigo,
  gerarToken,
  hashConfere,
  hashSegredo,
  idadeEmAnos,
  mascararTelefone,
} from './codigo.util';

export type EventoAcesso =
  | 'CODIGO_ENVIADO'
  | 'CODIGO_ERRADO'
  | 'ENTROU'
  | 'SEM_CADASTRO'
  | 'DESEMPATE'
  | 'BLOQUEADO'
  | 'SAIU';

export interface PedidoCodigo {
  /** Sempre `true` — ver regra 1 no topo do arquivo. */
  enviado: true;
  telefoneMascarado: string;
  expiraEmSegundos: number;
  reenviarEmSegundos: number;
}

export type ResultadoVerificacao =
  | { status: 'ok'; token: string; expiraEm: Date; tutor: { id: string; nome: string } }
  | { status: 'escolher'; desempateToken: string; opcoes: OpcaoCadastro[] }
  | { status: 'sem_cadastro' }
  | { status: 'invalido'; tentativasRestantes: number }
  | { status: 'bloqueado'; minutos: number };

export interface OpcaoCadastro {
  tutorId: string;
  /** Primeiro nome so — o suficiente para reconhecer sem expor o cadastro alheio. */
  primeiroNome: string;
  pets: Array<{ nome: string; especie: string; raca: string | null; idadeAnos: number | null }>;
}

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: PortalWhatsappService,
    private readonly config: ConfigService,
  ) {}

  /** Segredo do servidor somado ao codigo antes do hash. */
  private get pepper(): string {
    return (
      this.config.get<string>('PORTAL_OTP_PEPPER') ||
      this.config.get<string>('jwt.secret') ||
      this.config.get<string>('JWT_SECRET') ||
      'portal-dev-pepper'
    );
  }

  private async registrar(
    telefone8: string,
    evento: EventoAcesso,
    extra?: { tutorId?: string; detalhe?: string; ip?: string },
  ): Promise<void> {
    await this.prisma.portalAcesso
      .create({
        data: {
          telefone8,
          evento,
          tutorId: extra?.tutorId,
          detalhe: extra?.detalhe,
          ip: extra?.ip,
        },
      })
      .catch((e) => this.logger.warn(`Falha ao registrar acesso: ${(e as Error).message}`));
  }

  /** Numero descansando depois de errar o codigo vezes demais. */
  private async estaBloqueado(telefone8: string): Promise<boolean> {
    const desde = new Date(Date.now() - BLOQUEIO_MIN * 60_000);
    const n = await this.prisma.portalAcesso.count({
      where: { telefone8, evento: 'BLOQUEADO', createdAt: { gte: desde } },
    });
    return n > 0;
  }

  // ---------------------------------------------------------------------------
  // Passo 1 — pedir o codigo
  // ---------------------------------------------------------------------------
  async solicitarCodigo(telefoneRaw: string, ip?: string): Promise<PedidoCodigo> {
    const telefone = normalizePhone(telefoneRaw);
    const telefone8 = last8(telefone);

    // Unica validacao que da erro: numero curto demais para ser telefone.
    // Nao e vazamento — nao diz nada sobre cadastro.
    if (telefone8.length < 8) {
      throw new BadRequestException('Telefone incompleto');
    }

    const resposta: PedidoCodigo = {
      enviado: true,
      telefoneMascarado: mascararTelefone(telefone),
      expiraEmSegundos: CODIGO_VALIDADE_MIN * 60,
      reenviarEmSegundos: REENVIO_ESPERA_SEG,
    };

    if (await this.estaBloqueado(telefone8)) return resposta;

    const agora = new Date();

    // Nao reenviar em rajada (protege o tutor de receber 5 mensagens seguidas).
    const ultimo = await this.prisma.portalCodigo.findFirst({
      where: { telefone8, tipo: 'ACESSO' },
      orderBy: { createdAt: 'desc' },
    });
    if (ultimo && agora.getTime() - ultimo.createdAt.getTime() < REENVIO_ESPERA_SEG * 1000) {
      return resposta;
    }

    // Teto por hora: segura custo de mensagem e tentativa de forca bruta.
    const desdeUmaHora = new Date(agora.getTime() - 60 * 60_000);
    const naHora = await this.prisma.portalCodigo.count({
      where: { telefone8, tipo: 'ACESSO', createdAt: { gte: desdeUmaHora } },
    });
    if (naHora >= CODIGOS_POR_HORA) {
      await this.registrar(telefone8, 'BLOQUEADO', { detalhe: 'teto de codigos por hora', ip });
      return resposta;
    }

    const codigo = gerarCodigo();
    await this.prisma.portalCodigo.create({
      data: {
        telefone,
        telefone8,
        tipo: 'ACESSO',
        codigoHash: hashSegredo(codigo, this.pepper),
        expiraEm: new Date(agora.getTime() + CODIGO_VALIDADE_MIN * 60_000),
        ip,
      },
    });

    // Mandamos o codigo mesmo para numero sem cadastro: e o que permite dizer
    // "nao encontramos seu cadastro" so DEPOIS de provar que o numero e dele.
    await this.whatsapp.enviarCodigo(telefone, codigo);
    await this.registrar(telefone8, 'CODIGO_ENVIADO', { ip });

    return resposta;
  }

  // ---------------------------------------------------------------------------
  // Passo 2 — conferir o codigo
  // ---------------------------------------------------------------------------
  async verificarCodigo(
    telefoneRaw: string,
    codigo: string,
    ctx: { ip?: string; userAgent?: string } = {},
  ): Promise<ResultadoVerificacao> {
    const telefone = normalizePhone(telefoneRaw);
    const telefone8 = last8(telefone);
    if (telefone8.length < 8) throw new BadRequestException('Telefone incompleto');

    if (await this.estaBloqueado(telefone8)) {
      return { status: 'bloqueado', minutos: BLOQUEIO_MIN };
    }

    const registro = await this.prisma.portalCodigo.findFirst({
      where: {
        telefone8,
        tipo: 'ACESSO',
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!registro) {
      await this.registrar(telefone8, 'CODIGO_ERRADO', { detalhe: 'sem codigo valido', ip: ctx.ip });
      return { status: 'invalido', tentativasRestantes: 0 };
    }

    const informado = hashSegredo((codigo || '').replace(/\D/g, ''), this.pepper);
    if (!hashConfere(informado, registro.codigoHash)) {
      const tentativas = registro.tentativas + 1;
      await this.prisma.portalCodigo.update({
        where: { id: registro.id },
        data: { tentativas },
      });
      await this.registrar(telefone8, 'CODIGO_ERRADO', { ip: ctx.ip });

      if (tentativas >= CODIGO_MAX_TENTATIVAS) {
        // Queima o codigo e poe o numero para descansar.
        await this.prisma.portalCodigo.update({
          where: { id: registro.id },
          data: { usadoEm: new Date() },
        });
        await this.registrar(telefone8, 'BLOQUEADO', {
          detalhe: `${CODIGO_MAX_TENTATIVAS} erros seguidos`,
          ip: ctx.ip,
        });
        return { status: 'bloqueado', minutos: BLOQUEIO_MIN };
      }

      return { status: 'invalido', tentativasRestantes: CODIGO_MAX_TENTATIVAS - tentativas };
    }

    // Codigo certo: o numero e dele. So agora falamos de cadastro.
    await this.prisma.portalCodigo.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    });

    const match = await findTutorByPhoneUnique(this.prisma, telefone);

    if (match.status === 'none') {
      await this.registrar(telefone8, 'SEM_CADASTRO', { ip: ctx.ip });
      return { status: 'sem_cadastro' };
    }

    if (match.status === 'unique') {
      const sessao = await this.criarSessao(match.tutorId, telefone, ctx);
      await this.registrar(telefone8, 'ENTROU', { tutorId: match.tutorId, ip: ctx.ip });
      return sessao;
    }

    // Telefone repetido em varios cadastros: quem decide e o tutor, com uma
    // pergunta que so o dono sabe responder ("qual desses pets e seu?").
    const opcoes = await this.montarOpcoes(match.tutorIds);
    const desempateToken = gerarToken();
    await this.prisma.portalCodigo.create({
      data: {
        telefone,
        telefone8,
        tipo: 'DESEMPATE',
        codigoHash: hashSegredo(desempateToken, this.pepper),
        expiraEm: new Date(Date.now() + DESEMPATE_VALIDADE_MIN * 60_000),
        ip: ctx.ip,
      },
    });
    await this.registrar(telefone8, 'DESEMPATE', {
      detalhe: `${match.tutorIds.length} cadastros`,
      ip: ctx.ip,
    });

    return { status: 'escolher', desempateToken, opcoes };
  }

  // ---------------------------------------------------------------------------
  // Passo 3 (so quando ha duplicidade) — escolher o cadastro
  // ---------------------------------------------------------------------------
  async escolherCadastro(
    desempateToken: string,
    tutorId: string,
    ctx: { ip?: string; userAgent?: string } = {},
  ): Promise<ResultadoVerificacao> {
    const registro = await this.prisma.portalCodigo.findFirst({
      where: {
        tipo: 'DESEMPATE',
        codigoHash: hashSegredo(desempateToken || '', this.pepper),
        usadoEm: null,
        expiraEm: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!registro) return { status: 'invalido', tentativasRestantes: 0 };

    // O candidato e recalculado AQUI. Mandar um tutorId qualquer nao funciona:
    // ele precisa estar entre os cadastros daquele telefone.
    const match = await findTutorByPhoneUnique(this.prisma, registro.telefone);
    const permitidos =
      match.status === 'ambiguous'
        ? match.tutorIds
        : match.status === 'unique'
          ? [match.tutorId]
          : [];

    if (!permitidos.includes(tutorId)) {
      await this.registrar(registro.telefone8, 'CODIGO_ERRADO', {
        detalhe: 'cadastro fora da lista do telefone',
        ip: ctx.ip,
      });
      return { status: 'invalido', tentativasRestantes: 0 };
    }

    await this.prisma.portalCodigo.update({
      where: { id: registro.id },
      data: { usadoEm: new Date() },
    });

    const sessao = await this.criarSessao(tutorId, registro.telefone, ctx);
    await this.registrar(registro.telefone8, 'ENTROU', { tutorId, ip: ctx.ip });
    return sessao;
  }

  // ---------------------------------------------------------------------------
  // Sessao
  // ---------------------------------------------------------------------------
  private async criarSessao(
    tutorId: string,
    telefone: string,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<Extract<ResultadoVerificacao, { status: 'ok' }>> {
    const token = gerarToken();
    const expiraEm = new Date(Date.now() + SESSAO_DIAS * 24 * 60 * 60_000);

    await this.prisma.portalSessao.create({
      data: {
        tokenHash: hashSegredo(token, this.pepper),
        tutorId,
        telefone,
        expiraEm,
        userAgent: ctx.userAgent?.slice(0, 300),
        ip: ctx.ip,
        ultimoAcesso: new Date(),
      },
    });

    const tutor = await this.prisma.tutor.findUnique({
      where: { id: tutorId },
      select: { id: true, name: true },
    });

    return {
      status: 'ok',
      token,
      expiraEm,
      tutor: { id: tutorId, nome: tutor?.name || '' },
    };
  }

  /** Usado pelo guard a cada requisicao. Devolve o tutor dono do token, ou null. */
  async tutorDaSessao(token?: string | null): Promise<string | null> {
    if (!token) return null;
    const sessao = await this.prisma.portalSessao.findUnique({
      where: { tokenHash: hashSegredo(token, this.pepper) },
    });
    if (!sessao) return null;
    if (sessao.revogadaEm) return null;
    if (sessao.expiraEm.getTime() < Date.now()) return null;

    // Marca presenca no maximo de 10 em 10 minutos — nao escrever a cada clique.
    const dezMin = 10 * 60_000;
    if (!sessao.ultimoAcesso || Date.now() - sessao.ultimoAcesso.getTime() > dezMin) {
      await this.prisma.portalSessao
        .update({ where: { id: sessao.id }, data: { ultimoAcesso: new Date() } })
        .catch(() => undefined);
    }

    return sessao.tutorId;
  }

  async sair(token?: string | null): Promise<void> {
    if (!token) return;
    const tokenHash = hashSegredo(token, this.pepper);
    const sessao = await this.prisma.portalSessao.findUnique({ where: { tokenHash } });
    if (!sessao || sessao.revogadaEm) return;
    await this.prisma.portalSessao.update({
      where: { tokenHash },
      data: { revogadaEm: new Date() },
    });
    await this.registrar(last8(sessao.telefone), 'SAIU', { tutorId: sessao.tutorId });
  }

  // ---------------------------------------------------------------------------
  private async montarOpcoes(tutorIds: string[]): Promise<OpcaoCadastro[]> {
    const tutores = await this.prisma.tutor.findMany({
      where: { id: { in: tutorIds } },
      select: {
        id: true,
        name: true,
        pets: {
          where: { status: 'ACTIVE' },
          select: { name: true, species: true, breed: true, birthDate: true },
          orderBy: { createdAt: 'asc' },
          take: 4,
        },
      },
    });

    return tutores.map((t) => ({
      tutorId: t.id,
      primeiroNome: (t.name || '').trim().split(/\s+/)[0] || 'Cadastro',
      pets: t.pets.map((p) => ({
        nome: p.name,
        especie: String(p.species),
        raca: p.breed,
        idadeAnos: idadeEmAnos(p.birthDate),
      })),
    }));
  }
}
