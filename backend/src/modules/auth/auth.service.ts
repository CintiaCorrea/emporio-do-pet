import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
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
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
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

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

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

  // Bootstrap: setar senha sem validar atual. Removido após uso inicial.
  async adminSetPassword(email: string, passwordHash: string) {
    return this.prisma.user.update({
      where: { email },
      data: { password: passwordHash },
    });
  }

}
