import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RedisService } from '../redis/redis.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string) {
    // Normaliza o e-mail: no celular o teclado deixa a 1ª letra maiúscula por padrão,
    // e a busca no banco é sensível a maiúsculas — sem isso o login falha com a senha
    // certa. Todos os e-mails cadastrados são minúsculos, então baixar a caixa é seguro.
    const emailNorm = (email || '').trim().toLowerCase();
    const user = await this.usersService.findByEmail(emailNorm);
    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    // Bloqueios / aprovação
    // ADMIN não precisa de aprovação
    if ((user as any).isBlocked) {
      throw new UnauthorizedException('Usuário bloqueado');
    }
    if (user.role !== 'ADMIN' && !(user as any).isApproved) {
      throw new UnauthorizedException('Usuário pendente de aprovação');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = user;
    return result;
  }

  // ───────────────────────── Acesso por horário (escala/plantão) ─────────────────────────
  private hm(s: any): number | null { const m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); return m ? Number(m[1]) * 60 + Number(m[2]) : null; }
  private temEscala(escala: any): boolean { try { const o = typeof escala === 'string' ? JSON.parse(escala) : escala; return !!o && o.semana && Object.keys(o.semana).length > 0; } catch { return false; } }
  private dentroDaEscala(escala: any, dow: number, mins: number, tol: number): boolean {
    let o: any = escala; if (typeof escala === 'string') { try { o = JSON.parse(escala); } catch { return false; } }
    const janelas: any[] = o?.semana?.[String(dow)] || [];
    for (const par of janelas) {
      const ini = this.hm(par?.[0]); const fim = this.hm(par?.[1]);
      if (ini == null || fim == null) continue;
      if (mins >= ini && mins <= fim + tol) return true; // tolerância só no FIM
    }
    return false;
  }
  private segundaYMD(f: Date): string {
    const d = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate()));
    const dow = d.getUTCDay();
    d.setUTCDate(d.getUTCDate() + (dow === 0 ? -6 : 1 - dow));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  }
  private async slotsDaSemana(anchorYMD: string): Promise<Record<string, string[]>> {
    const itens = await this.prisma.listaItem.findMany({ where: { lista: 'plantao_escala' } });
    const item = itens.find((it) => { try { return JSON.parse(it.valor).semana === anchorYMD; } catch { return false; } });
    if (!item) return {};
    try { return JSON.parse(item.valor).slots || {}; } catch { return {}; }
  }

  /**
   * Barra o login fora do horário de escala/plantão — SÓ se o interruptor mestre estiver
   * ligado (Config › Acesso por horário). Entra quem: é admin, tem acesso livre, não tem
   * escala, está dentro da própria escala (+tol) ou está no plantão do dia (+tol).
   * FALHA LIBERANDO: qualquer erro na checagem NÃO tranca ninguém — só o bloqueio proposital
   * lança 401. Plantão noturno (19:01–06:59) não vira à meia-noite (madrugada = noite de ontem).
   */
  private async verificarAcessoPorHorario(user: any): Promise<void> {
    try {
      const cfgItem = await this.prisma.listaItem.findFirst({ where: { lista: 'config_acesso_login' } });
      let cfg = { ativo: false, toleranciaMin: 60, avisarAdmin: true };
      if (cfgItem) { try { const v = JSON.parse(cfgItem.valor); cfg = { ativo: !!v.ativo, toleranciaMin: Number(v.toleranciaMin) || 60, avisarAdmin: v.avisarAdmin !== false }; } catch { /* config ilegível = libera */ } }
      if (!cfg.ativo) return;                       // interruptor desligado
      if (user.role === 'ADMIN') return;            // admin sempre entra

      const livre = await this.prisma.listaItem.findFirst({ where: { lista: 'acesso_livre', valor: user.id } });
      if (livre) return;                            // acesso livre

      const prof = await this.prisma.profissional.findFirst({ where: { userId: user.id }, select: { escala: true } });
      if (!prof || !this.temEscala(prof.escala)) return; // sem escala = entra (default seguro)

      const tol = cfg.toleranciaMin;
      const nowF = new Date(Date.now() - 3 * 3600 * 1000); // relógio de Fortaleza (UTC-3)
      const dow = nowF.getUTCDay();
      const mins = nowF.getUTCHours() * 60 + nowF.getUTCMinutes();

      if (this.dentroDaEscala(prof.escala, dow, mins, tol)) return; // dentro da própria escala

      // Plantão diurno (só domingo): 07:00–19:00 (+tol)
      if (dow === 0 && mins >= 7 * 60 && mins <= 19 * 60 + tol) {
        const slots = await this.slotsDaSemana(this.segundaYMD(nowF));
        if ((slots[`0-dia`] || []).includes(user.id)) return;
      }
      // Plantão noturno, parte da noite (mesmo dia): 19:01–23:59
      if (mins >= 19 * 60 + 1) {
        const slots = await this.slotsDaSemana(this.segundaYMD(nowF));
        if ((slots[`${dow}-noite`] || []).includes(user.id)) return;
      }
      // Plantão noturno, madrugada (pertence à noite de ONTEM): 00:00–06:59 (+tol)
      if (mins <= 6 * 60 + 59 + tol) {
        const yF = new Date(nowF.getTime() - 24 * 3600 * 1000);
        const slots = await this.slotsDaSemana(this.segundaYMD(yF));
        if ((slots[`${yF.getUTCDay()}-noite`] || []).includes(user.id)) return;
      }

      // Bloqueado — registra aviso pra administração (se ligado) e barra o login.
      if (cfg.avisarAdmin) {
        try { await this.prisma.listaItem.create({ data: { lista: 'acesso_bloqueio', valor: JSON.stringify({ userId: user.id, email: user.email, nome: user.name || '', at: new Date().toISOString() }) } }); } catch { /* aviso é best-effort */ }
      }
      this.logger.warn(`Login bloqueado por horário: ${user.email}`);
      throw new UnauthorizedException('Acesso liberado apenas no seu horário de escala ou plantão. Fale com a administração.');
    } catch (e) {
      if (e instanceof UnauthorizedException) throw e; // bloqueio proposital
      this.logger.warn(`Checagem de horário falhou (liberando por segurança): ${e instanceof Error ? e.message : String(e)}`);
      return; // qualquer outro erro NÃO tranca ninguém
    }
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Restrição por escala/plantão (só barra login NOVO; sessão ativa não é derrubada).
    // Interruptor mestre em Config › Acesso por horário; começa DESLIGADO.
    await this.verificarAcessoPorHorario(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
    });

    // Salvar refresh token no Redis
    try {
      await this.redisService.set(
        `refresh:${user.id}`,
        refreshToken,
        60 * 60 * 24 * 30, // 30 dias
      );
    } catch (err) {
      // Redis indisponível não deve derrubar login em produção.
      // Mantemos o refresh token retornado, mas sem persistência/revogação.
      this.logger.warn(
        `Falha ao salvar refresh token no Redis para ${user.email}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }

    this.logger.log(`Usuário ${user.email} logado com sucesso`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        image: user.image,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    try {
      const hashedPassword = await bcrypt.hash(registerDto.password, 12);

      const user = await this.usersService.create({
        ...registerDto,
        password: hashedPassword,
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password: _, ...result } = user;

      this.logger.log(`Novo usuário registrado: ${user.email}`);

      return result;
    } catch (err) {
      this.logger.error(
        `Erro ao registrar usuário (${registerDto?.email ?? 'email desconhecido'}):`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token não fornecido');
    }

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token expirado. Por favor, faça login novamente.');
      }
      throw new UnauthorizedException('Refresh token inválido');
    }

    const user = await this.usersService.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    // Verificar se o refresh token está no Redis (se disponível)
    try {
      const storedToken = await this.redisService.get(`refresh:${user.id}`);
      if (storedToken && storedToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token foi revogado');
      }
    } catch (err) {
      // Redis indisponível - continuar sem validação de revogação
      if (!(err instanceof UnauthorizedException)) {
        this.logger.warn(
          `Falha ao verificar refresh token no Redis para ${user.email}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      } else {
        throw err;
      }
    }

    const newPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(newPayload);

    return { accessToken };
  }

  async logout(userId: string) {
    try {
      await this.redisService.del(`refresh:${userId}`);
    } catch (err) {
      this.logger.warn(
        `Falha ao remover refresh token no Redis para userId=${userId}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
    this.logger.log(`Usuário ${userId} deslogado`);
  }

  async validateToken(token: string): Promise<JwtPayload | null> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      return null;
    }
  }

  async changeOwnPassword(email: string, newPassword: string) {
    const hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { email },
      data: { password: hash },
    });
    return { ok: true };
  }

}
