import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** RH admin = User com role ADMIN (o "lado da empresa"). Demais = funcionário (vê só o próprio). */
const isRhAdmin = (u: any): boolean => u?.role === 'ADMIN';

@Injectable()
export class RhService {
  constructor(private readonly prisma: PrismaService) {}

  /** Envia um documento. Funcionário só envia PRA SI; admin pode enviar por outro (dto.userId). */
  async criarDocumento(user: any, dto: { tipo?: string; nome?: string; url?: string; observacao?: string; userId?: string }) {
    if (!dto?.url || !dto?.nome) throw new BadRequestException('Documento (arquivo) e nome são obrigatórios.');
    const dono = dto.userId && isRhAdmin(user) ? dto.userId : user.id;
    return (this.prisma as any).rhDocumento.create({
      data: {
        userId: dono,
        tipo: (dto.tipo || 'Outros').trim(),
        nome: dto.nome.trim(),
        url: dto.url,
        observacao: dto.observacao?.trim() || null,
        status: 'ENVIADO',
        enviadoPorId: user.id,
      },
    });
  }

  /** Lista documentos. Funcionário → SÓ os próprios. Admin → todos (com nome do funcionário). */
  async listarDocumentos(user: any, q: { userId?: string; tipo?: string; status?: string }) {
    const where: any = {};
    if (isRhAdmin(user)) {
      if (q.userId) where.userId = q.userId;
    } else {
      where.userId = user.id; // 🔒 funcionário só enxerga os DELE
    }
    if (q.tipo) where.tipo = q.tipo;
    if (q.status) where.status = q.status;
    const docs = await (this.prisma as any).rhDocumento.findMany({ where, orderBy: { createdAt: 'desc' } });
    if (!isRhAdmin(user)) return docs;
    // Admin: enriquece com o nome/cargo do funcionário dono.
    const ids = Array.from(new Set(docs.map((d: any) => d.userId))) as string[];
    const profs = ids.length ? await this.prisma.profissional.findMany({ where: { userId: { in: ids } }, select: { userId: true, nomeExibicao: true, nomeCompleto: true, tipo: true } }) : [];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nomeDe = (uid: string) => { const p = profs.find((x) => x.userId === uid); const u = users.find((x) => x.id === uid); return p?.nomeExibicao || p?.nomeCompleto || u?.name || 'Funcionário'; };
    const cargoDe = (uid: string) => profs.find((x) => x.userId === uid)?.tipo || '';
    return docs.map((d: any) => ({ ...d, funcionarioNome: nomeDe(d.userId), funcionarioCargo: cargoDe(d.userId) }));
  }

  /** Muda o status (VISTO/APROVADO) — só admin. */
  async atualizarStatus(user: any, id: string, status: string) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração pode alterar o status.');
    const st = ['ENVIADO', 'VISTO', 'APROVADO'].includes(String(status)) ? status : 'VISTO';
    const doc = await (this.prisma as any).rhDocumento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    return (this.prisma as any).rhDocumento.update({ where: { id }, data: { status: st } });
  }

  /** Remove um documento — admin OU o próprio dono. */
  async removerDocumento(user: any, id: string) {
    const doc = await (this.prisma as any).rhDocumento.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    if (!isRhAdmin(user) && doc.userId !== user.id) throw new ForbiddenException('Você só pode remover os seus próprios documentos.');
    await (this.prisma as any).rhDocumento.delete({ where: { id } });
    return { ok: true };
  }

  /** Perfil do funcionário logado (cabeçalho do "Meu RH"). */
  async meuPerfil(user: any) {
    const prof = await this.prisma.profissional.findFirst({ where: { userId: user.id }, select: { nomeExibicao: true, nomeCompleto: true, iniciais: true, tipo: true, dataInicio: true } });
    const u = await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true, role: true } });
    return {
      nome: prof?.nomeExibicao || prof?.nomeCompleto || u?.name || 'Funcionário',
      iniciais: prof?.iniciais || (u?.name || '?').split(/\s+/).map((x) => x[0]).join('').slice(0, 2).toUpperCase(),
      cargo: prof?.tipo || u?.role || '',
      dataInicio: prof?.dataInicio || null,
      email: u?.email || '',
      admin: isRhAdmin(user),
    };
  }

  // ---------------- SOLICITAÇÕES (Fatia 2) ----------------
  /** Notifica via nota interna (best-effort — nunca trava). */
  private async notificar(fromUserId: string, toUserId: string, content: string) {
    if (!fromUserId || !toUserId || fromUserId === toUserId) return;
    try { await this.prisma.internalNote.create({ data: { fromUserId, toUserId, content } }); } catch { /* best-effort */ }
  }
  private async adminsIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({ where: { role: 'ADMIN', isBlocked: false }, select: { id: true } }).catch(() => []);
    return admins.map((a) => a.id);
  }

  /** Funcionário abre uma solicitação (pra si). Avisa a administração. */
  async criarSolicitacao(user: any, dto: { tipo?: string; texto?: string }) {
    if (!dto?.texto?.trim()) throw new BadRequestException('Descreva a sua solicitação.');
    const sol = await (this.prisma as any).rhSolicitacao.create({
      data: { userId: user.id, tipo: (dto.tipo || 'Outro').trim(), texto: dto.texto.trim(), status: 'PENDENTE' },
    });
    const nome = (await this.prisma.user.findUnique({ where: { id: user.id }, select: { name: true } }))?.name || 'Funcionário';
    for (const adm of await this.adminsIds()) await this.notificar(user.id, adm, `📨 Nova solicitação de ${sol.tipo} de ${nome}: ${sol.texto.slice(0, 120)}`);
    return sol;
  }

  /** Lista solicitações: funcionário → só as DELE; admin → todas (com nome). */
  async listarSolicitacoes(user: any, q: { status?: string }) {
    const where: any = {};
    if (!isRhAdmin(user)) where.userId = user.id; // 🔒
    if (q.status) where.status = q.status;
    const sols = await (this.prisma as any).rhSolicitacao.findMany({ where, orderBy: { createdAt: 'desc' } });
    if (!isRhAdmin(user)) return sols;
    const ids = Array.from(new Set(sols.map((s: any) => s.userId))) as string[];
    const profs = ids.length ? await this.prisma.profissional.findMany({ where: { userId: { in: ids } }, select: { userId: true, nomeExibicao: true, nomeCompleto: true, tipo: true } }) : [];
    const users = ids.length ? await this.prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }) : [];
    const nomeDe = (uid: string) => { const p = profs.find((x) => x.userId === uid); const u = users.find((x) => x.id === uid); return p?.nomeExibicao || p?.nomeCompleto || u?.name || 'Funcionário'; };
    const cargoDe = (uid: string) => profs.find((x) => x.userId === uid)?.tipo || '';
    return sols.map((s: any) => ({ ...s, funcionarioNome: nomeDe(s.userId), funcionarioCargo: cargoDe(s.userId) }));
  }

  /** Admin aprova/nega + responde. Avisa o funcionário. */
  async responderSolicitacao(user: any, id: string, status: string, resposta?: string) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração responde solicitações.');
    const st = ['PENDENTE', 'APROVADA', 'NEGADA'].includes(String(status)) ? status : 'PENDENTE';
    const sol = await (this.prisma as any).rhSolicitacao.findUnique({ where: { id } });
    if (!sol) throw new NotFoundException('Solicitação não encontrada.');
    const upd = await (this.prisma as any).rhSolicitacao.update({ where: { id }, data: { status: st, resposta: resposta?.trim() || null, respondidoPorId: user.id } });
    const rotulo = st === 'APROVADA' ? 'APROVADA ✅' : st === 'NEGADA' ? 'não aprovada' : 'atualizada';
    await this.notificar(user.id, sol.userId, `Sua solicitação de ${sol.tipo} foi ${rotulo}.${resposta?.trim() ? ` Obs.: ${resposta.trim()}` : ''}`);
    return upd;
  }

  /** Funcionário cancela a própria (enquanto PENDENTE) OU admin remove. */
  async removerSolicitacao(user: any, id: string) {
    const sol = await (this.prisma as any).rhSolicitacao.findUnique({ where: { id } });
    if (!sol) throw new NotFoundException('Solicitação não encontrada.');
    if (!isRhAdmin(user) && (sol.userId !== user.id || sol.status !== 'PENDENTE')) throw new ForbiddenException('Você só pode cancelar as suas solicitações enquanto estão pendentes.');
    await (this.prisma as any).rhSolicitacao.delete({ where: { id } });
    return { ok: true };
  }
}
