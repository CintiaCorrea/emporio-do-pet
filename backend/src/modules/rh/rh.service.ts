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

  // ---------------- COMUNICADOS (Fatia 3) ----------------
  /** Admin publica um comunicado (a TODOS ou a 1 funcionário). Avisa o direcionado. */
  async criarComunicado(user: any, dto: { titulo?: string; texto?: string; targetUserId?: string }) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração publica comunicados.');
    if (!dto?.titulo?.trim() || !dto?.texto?.trim()) throw new BadRequestException('Título e texto são obrigatórios.');
    const com = await (this.prisma as any).rhComunicado.create({ data: { titulo: dto.titulo.trim(), texto: dto.texto.trim(), targetUserId: dto.targetUserId || null, createdById: user.id } });
    if (dto.targetUserId) await this.notificar(user.id, dto.targetUserId, `📢 Novo comunicado do RH: ${com.titulo}`);
    return com;
  }

  /** Lista: funcionário → os pra TODOS ou pra ele (com flag `lido`); admin → todos (com nº de leituras). */
  async listarComunicados(user: any) {
    if (isRhAdmin(user)) {
      const coms = await (this.prisma as any).rhComunicado.findMany({ orderBy: { createdAt: 'desc' } });
      const ids = coms.map((c: any) => c.id);
      const leituras = ids.length ? await (this.prisma as any).rhComunicadoLeitura.groupBy({ by: ['comunicadoId'], where: { comunicadoId: { in: ids } }, _count: true }) : [];
      const cont = (cid: string) => leituras.find((l: any) => l.comunicadoId === cid)?._count || 0;
      const tIds = Array.from(new Set(coms.map((c: any) => c.targetUserId).filter(Boolean))) as string[];
      const profs = tIds.length ? await this.prisma.profissional.findMany({ where: { userId: { in: tIds } }, select: { userId: true, nomeExibicao: true, nomeCompleto: true } }) : [];
      const users = tIds.length ? await this.prisma.user.findMany({ where: { id: { in: tIds } }, select: { id: true, name: true } }) : [];
      const tNome = (uid: string) => { const p = profs.find((x) => x.userId === uid); const u = users.find((x) => x.id === uid); return p?.nomeExibicao || p?.nomeCompleto || u?.name || 'Funcionário'; };
      return coms.map((c: any) => ({ ...c, totalLeituras: cont(c.id), targetNome: c.targetUserId ? tNome(c.targetUserId) : null }));
    }
    const coms = await (this.prisma as any).rhComunicado.findMany({ where: { OR: [{ targetUserId: null }, { targetUserId: user.id }] }, orderBy: { createdAt: 'desc' } });
    const ids = coms.map((c: any) => c.id);
    const minhas = ids.length ? await (this.prisma as any).rhComunicadoLeitura.findMany({ where: { userId: user.id, comunicadoId: { in: ids } }, select: { comunicadoId: true } }) : [];
    const lidoSet = new Set(minhas.map((l: any) => l.comunicadoId));
    return coms.map((c: any) => ({ ...c, lido: lidoSet.has(c.id) }));
  }

  /** Funcionário confirma ciência ("Li e estou ciente"). */
  async marcarLido(user: any, id: string) {
    const com = await (this.prisma as any).rhComunicado.findUnique({ where: { id } });
    if (!com) throw new NotFoundException('Comunicado não encontrado.');
    await (this.prisma as any).rhComunicadoLeitura.upsert({
      where: { comunicadoId_userId: { comunicadoId: id, userId: user.id } },
      create: { comunicadoId: id, userId: user.id },
      update: {},
    });
    return { ok: true };
  }

  async removerComunicado(user: any, id: string) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração remove comunicados.');
    await (this.prisma as any).rhComunicadoLeitura.deleteMany({ where: { comunicadoId: id } }).catch(() => undefined);
    await (this.prisma as any).rhComunicado.delete({ where: { id } }).catch(() => undefined);
    return { ok: true };
  }

  /** Lista de funcionários (admin) — pro seletor de "enviar holerite/documento pra alguém". */
  async listarFuncionarios(user: any) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração.');
    const profs = await this.prisma.profissional.findMany({ where: { ativo: true, userId: { not: null } }, select: { userId: true, nomeExibicao: true, nomeCompleto: true, tipo: true } });
    return profs.filter((p) => p.userId).map((p) => ({ userId: p.userId, nome: p.nomeExibicao || p.nomeCompleto, cargo: p.tipo }));
  }

  // ---------------- PONTO (Fatia 4) ----------------
  // Fuso fixo America/Fortaleza = UTC-3 (sem horário de verão). Agrupa o "dia" pelo -3.
  private static readonly TZ_OFF_MS = 3 * 60 * 60 * 1000; // 3h
  /** "YYYY-MM-DD" (dia local -3) de um Date. */
  private diaLocal(d: Date): string {
    return new Date(d.getTime() - RhService.TZ_OFF_MS).toISOString().slice(0, 10);
  }
  /** "HH:MM" (hora local -3) de um Date. */
  private horaLocal(d: Date): string {
    return new Date(d.getTime() - RhService.TZ_OFF_MS).toISOString().slice(11, 16);
  }
  /** Início do dia local (00:00 -3) como Date UTC. */
  private inicioDiaLocalUTC(diaISO: string): Date {
    return new Date(`${diaISO}T03:00:00.000Z`);
  }
  private readonly ORDEM_TIPO = ['ENTRADA', 'SAIDA_ALMOCO', 'VOLTA_ALMOCO', 'SAIDA'];
  private readonly TIPOS_IN = new Set(['ENTRADA', 'VOLTA_ALMOCO']);
  private readonly TIPOS_OUT = new Set(['SAIDA_ALMOCO', 'SAIDA']);

  /** Soma de minutos trabalhados a partir das batidas de UM dia (pareando IN→OUT). */
  private minutosDoDia(batidas: any[], liveNow?: Date): number {
    const orden = [...batidas].sort((a, b) => new Date(a.batidaEm).getTime() - new Date(b.batidaEm).getTime());
    let total = 0;
    let entrouEm: number | null = null;
    for (const b of orden) {
      const t = new Date(b.batidaEm).getTime();
      if (this.TIPOS_IN.has(b.tipo)) {
        if (entrouEm == null) entrouEm = t;
      } else if (this.TIPOS_OUT.has(b.tipo)) {
        if (entrouEm != null) { total += Math.max(0, t - entrouEm); entrouEm = null; }
      }
    }
    // ainda "dentro" agora (só faz sentido pro dia de hoje) → conta até agora
    if (entrouEm != null && liveNow) total += Math.max(0, liveNow.getTime() - entrouEm);
    return Math.round(total / 60000);
  }
  private fmtHoras(min: number): string {
    const h = Math.floor(min / 60), m = min % 60;
    return `${h}h${String(m).padStart(2, '0')}`;
  }
  /** Próximo tipo esperado a partir da ÚLTIMA batida (ciclo Entrada→Almoço→Volta→Saída→Entrada). */
  private proximoTipo(batidasHoje: any[]): string {
    const ult = batidasHoje[batidasHoje.length - 1];
    if (!ult) return 'ENTRADA';
    const next: Record<string, string> = { ENTRADA: 'SAIDA_ALMOCO', SAIDA_ALMOCO: 'VOLTA_ALMOCO', VOLTA_ALMOCO: 'SAIDA', SAIDA: 'ENTRADA' };
    return next[ult.tipo] || 'ENTRADA';
  }

  /** Funcionário bate o ponto (próxima batida do ciclo, ou `tipo` explícito). */
  async baterPonto(user: any, dto?: { tipo?: string }) {
    const agora = new Date();
    const hoje = this.diaLocal(agora);
    const ini = this.inicioDiaLocalUTC(hoje);
    const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);
    const batidasHoje = await (this.prisma as any).rhPonto.findMany({ where: { userId: user.id, batidaEm: { gte: ini, lt: fim } }, orderBy: { batidaEm: 'asc' } });
    const tipo = dto?.tipo && this.ORDEM_TIPO.includes(dto.tipo) ? dto.tipo : this.proximoTipo(batidasHoje);
    const nova = await (this.prisma as any).rhPonto.create({ data: { userId: user.id, tipo, batidaEm: agora, origem: 'web' } });
    return { batida: nova, hoje: await this.pontoHoje(user) };
  }

  /** Estado do ponto de HOJE do funcionário logado (status + batidas + horas ao vivo). */
  async pontoHoje(user: any) {
    const agora = new Date();
    const hoje = this.diaLocal(agora);
    const ini = this.inicioDiaLocalUTC(hoje);
    const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);
    const batidas = await (this.prisma as any).rhPonto.findMany({ where: { userId: user.id, batidaEm: { gte: ini, lt: fim } }, orderBy: { batidaEm: 'asc' } });
    const ultima = batidas[batidas.length - 1];
    const dentro = ultima ? this.TIPOS_IN.has(ultima.tipo) : false;
    const emIntervalo = ultima?.tipo === 'SAIDA_ALMOCO';
    const encerrou = ultima?.tipo === 'SAIDA';
    const status = !ultima ? 'FORA' : encerrou ? 'ENCERRADO' : emIntervalo ? 'INTERVALO' : dentro ? 'TRABALHANDO' : 'FORA';
    const min = this.minutosDoDia(batidas, agora);
    return {
      dia: hoje,
      status,
      minutos: min,
      horas: this.fmtHoras(min),
      proximoTipo: this.proximoTipo(batidas),
      batidas: batidas.map((b: any) => ({ id: b.id, tipo: b.tipo, hora: this.horaLocal(new Date(b.batidaEm)), ajuste: b.ajuste })),
      desde: dentro && ultima ? this.horaLocal(new Date(ultima.batidaEm)) : null,
    };
  }

  /** Espelho de ponto do mês. Funcionário → só o dele; admin → de qualquer userId. */
  async espelho(user: any, q: { userId?: string; mes?: string }) {
    const alvo = q.userId && isRhAdmin(user) ? q.userId : user.id;
    if (!isRhAdmin(user) && alvo !== user.id) throw new ForbiddenException('Você só vê o seu espelho.');
    const mes = /^\d{4}-\d{2}$/.test(q.mes || '') ? q.mes! : this.diaLocal(new Date()).slice(0, 7);
    const ini = this.inicioDiaLocalUTC(`${mes}-01`);
    const fimMes = new Date(ini); fimMes.setUTCMonth(fimMes.getUTCMonth() + 1);
    const batidas = await (this.prisma as any).rhPonto.findMany({ where: { userId: alvo, batidaEm: { gte: ini, lt: fimMes } }, orderBy: { batidaEm: 'asc' } });
    const hojeLocal = this.diaLocal(new Date());
    const porDia = new Map<string, any[]>();
    for (const b of batidas) { const d = this.diaLocal(new Date(b.batidaEm)); if (!porDia.has(d)) porDia.set(d, []); porDia.get(d)!.push(b); }
    const dias = Array.from(porDia.keys()).sort().map((d) => {
      const arr = porDia.get(d)!;
      const min = this.minutosDoDia(arr, d === hojeLocal ? new Date() : undefined);
      const de = (tp: string) => { const x = arr.find((b: any) => b.tipo === tp); return x ? this.horaLocal(new Date(x.batidaEm)) : null; };
      return {
        dia: d, entrada: de('ENTRADA'), saidaAlmoco: de('SAIDA_ALMOCO'), voltaAlmoco: de('VOLTA_ALMOCO'), saida: de('SAIDA'),
        minutos: min, horas: this.fmtHoras(min), emCurso: d === hojeLocal && arr.length > 0 && this.TIPOS_IN.has(arr[arr.length - 1].tipo),
        temAjuste: arr.some((b: any) => b.ajuste),
        batidas: arr.map((b: any) => ({ tipo: b.tipo, hora: this.horaLocal(new Date(b.batidaEm)), ajuste: b.ajuste })),
      };
    });
    const totalMin = dias.reduce((s, x) => s + x.minutos, 0);
    // nome do funcionário (pro cabeçalho da folha)
    const prof = await this.prisma.profissional.findFirst({ where: { userId: alvo }, select: { nomeExibicao: true, nomeCompleto: true, tipo: true } });
    const u = await this.prisma.user.findUnique({ where: { id: alvo }, select: { name: true } });
    return { userId: alvo, funcionarioNome: prof?.nomeExibicao || prof?.nomeCompleto || u?.name || 'Funcionário', funcionarioCargo: prof?.tipo || '', mes, dias, totalMinutos: totalMin, totalHoras: this.fmtHoras(totalMin) };
  }

  /** Painel do admin: ponto de HOJE de toda a equipe (quem está, intervalo, encerrou, não bateu). */
  async equipeHoje(user: any) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração.');
    const agora = new Date();
    const hoje = this.diaLocal(agora);
    const ini = this.inicioDiaLocalUTC(hoje);
    const fim = new Date(ini.getTime() + 24 * 60 * 60 * 1000);
    const funcs = await this.prisma.profissional.findMany({ where: { ativo: true, userId: { not: null } }, select: { userId: true, nomeExibicao: true, nomeCompleto: true, tipo: true } });
    const ids = funcs.map((f) => f.userId).filter(Boolean) as string[];
    const batidas = ids.length ? await (this.prisma as any).rhPonto.findMany({ where: { userId: { in: ids }, batidaEm: { gte: ini, lt: fim } }, orderBy: { batidaEm: 'asc' } }) : [];
    const porUser = new Map<string, any[]>();
    for (const b of batidas) { if (!porUser.has(b.userId)) porUser.set(b.userId, []); porUser.get(b.userId)!.push(b); }
    return funcs.map((f) => {
      const arr = porUser.get(f.userId!) || [];
      const ultima = arr[arr.length - 1];
      const dentro = ultima ? this.TIPOS_IN.has(ultima.tipo) : false;
      const status = !ultima ? 'NAO_BATEU' : ultima.tipo === 'SAIDA' ? 'ENCERRADO' : ultima.tipo === 'SAIDA_ALMOCO' ? 'INTERVALO' : dentro ? 'TRABALHANDO' : 'FORA';
      const min = this.minutosDoDia(arr, new Date());
      const de = (tp: string) => { const x = arr.find((b: any) => b.tipo === tp); return x ? this.horaLocal(new Date(x.batidaEm)) : null; };
      return { userId: f.userId, nome: f.nomeExibicao || f.nomeCompleto, cargo: f.tipo, status, horas: this.fmtHoras(min), entrada: de('ENTRADA'), saidaAlmoco: de('SAIDA_ALMOCO'), voltaAlmoco: de('VOLTA_ALMOCO'), saida: de('SAIDA') };
    });
  }

  /** Admin lança um AJUSTE (batida corrigida) com justificativa obrigatória — vira linha auditável. */
  async lancarAjuste(user: any, dto: { userId?: string; data?: string; tipo?: string; hora?: string; justificativa?: string }) {
    if (!isRhAdmin(user)) throw new ForbiddenException('Só a administração lança ajustes.');
    if (!dto?.userId) throw new BadRequestException('Selecione o funcionário.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.data || '')) throw new BadRequestException('Data inválida.');
    if (!/^\d{2}:\d{2}$/.test(dto.hora || '')) throw new BadRequestException('Hora inválida.');
    if (!this.ORDEM_TIPO.includes(dto.tipo || '')) throw new BadRequestException('Tipo de batida inválido.');
    if (!dto?.justificativa?.trim()) throw new BadRequestException('A justificativa do ajuste é obrigatória.');
    // data+hora local (-3) → UTC
    const batidaEm = new Date(`${dto.data}T${dto.hora}:00.000Z`);
    batidaEm.setTime(batidaEm.getTime() + RhService.TZ_OFF_MS);
    const nova = await (this.prisma as any).rhPonto.create({ data: { userId: dto.userId, tipo: dto.tipo, batidaEm, origem: 'ajuste', ajuste: true, ajustadoPorId: user.id, justificativa: dto.justificativa.trim() } });
    await this.notificar(user.id, dto.userId, `⏱️ A administração lançou um ajuste no seu ponto (${dto.tipo} em ${dto.data} ${dto.hora}). Motivo: ${dto.justificativa.trim()}`);
    return nova;
  }
}
