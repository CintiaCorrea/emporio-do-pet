import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { name, email, password, role } = await request.json();

    // Se houver backend NestJS configurado, usar ele (evita Prisma no frontend e resolve conflitos de rota)
    // Esperado: BACKEND_URL=http://localhost:3001  (ou http://localhost:3001/api)
    const backendBaseUrl =
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (process.env.NODE_ENV !== 'production' ? 'http://localhost:3001' : undefined);

    if (backendBaseUrl) {
      const normalized = backendBaseUrl.replace(/\/$/, '');
      const endpoint = normalized.endsWith('/api')
        ? `${normalized}/auth/register`
        : `${normalized}/api/auth/register`;

      const upstreamResponse = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      const raw = await upstreamResponse.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = raw;
      }

      if (!upstreamResponse.ok) {
        const message =
          (data &&
            (data.error ||
              (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
              data.message)) ||
          'Erro no registro';

        return NextResponse.json({ error: message }, { status: upstreamResponse.status });
      }

      return NextResponse.json(data, { status: upstreamResponse.status });
    }

    // Validações básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Nome, email e senha são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Verificar se email já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está em uso' },
        { status: 409 }
      );
    }

    // Validar role
    const validRoles = ['ADMIN', 'VETERINARIAN', 'RECEPTIONIST'];
    const userRole = validRoles.includes(role) ? role : 'VETERINARIAN';

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 12);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: userRole,
        // emailVerified será null (padrão)
        // permissions será array vazio (padrão)
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { 
        message: 'Usuário criado com sucesso', 
        user 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro no registro:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
