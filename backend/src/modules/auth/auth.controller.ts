import { BadRequestException, Body, Controller, Headers, HttpCode, HttpStatus, Post, Request, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login do usuário' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('register')
  @ApiOperation({ summary: 'Registro de novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário registrado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'Email já cadastrado' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renovar token de acesso usando refresh token' })
  @ApiResponse({ status: 200, description: 'Token renovado com sucesso' })
  @ApiResponse({ status: 401, description: 'Refresh token inválido ou expirado' })
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout do usuário' })
  @ApiResponse({ status: 200, description: 'Logout realizado com sucesso' })
  async logout(@Request() req: { user: { id: string } }) {
    await this.authService.logout(req.user.id);
    return { message: 'Logout realizado com sucesso' };
  }

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter dados do usuário autenticado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async me(@Request() req: { user: unknown }) {
    return { user: req.user };
  }

  // ===========================================================================
  // BOOTSTRAP TEMPORÁRIO — REMOVER após reset de senha inicial
  // Protegido pelo mesmo BOTCONVERSA_WEBHOOK_SECRET já configurado no Fly.
  // Reseta a senha do email passado pra uma string aleatória e retorna a
  // senha em texto plano UMA vez (Cintia loga com ela e troca pela UI).
  // ===========================================================================
  @Post('admin/bootstrap-reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'TEMPORÁRIO: reset de senha via secret header' })
  async bootstrapReset(
    @Headers('x-bootstrap-secret') secret: string | undefined,
    @Body() body: { email: string },
  ) {
    const expected = process.env.BOTCONVERSA_WEBHOOK_SECRET;
    if (!expected || secret !== expected) {
      throw new UnauthorizedException();
    }
    if (!body?.email) {
      throw new BadRequestException('email required');
    }
    // Gera senha aleatória 12 chars
    const newPassword = Array.from(
      { length: 12 },
      () => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'[
        Math.floor(Math.random() * 67)
      ],
    ).join('');
    const bcrypt = await import('bcryptjs');
    const hash = await bcrypt.hash(newPassword, 10);
    await this.authService.adminSetPassword(body.email, hash);
    return { newPassword };
  }

}
