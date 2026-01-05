// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function POST(request: Request) {
  try {
    const token = await getToken({
      req: request as any,
      secret: process.env.NEXTAUTH_SECRET,
    });

    console.log('Logout API - Token encontrado:', token ? `User: ${token.email}` : 'No token');

    const response = NextResponse.json(
      { 
        success: true,
        message: 'Logout realizado com sucesso' 
      },
      { status: 200 }
    );

    // Limpar o cookie de sessão do NextAuth
    response.cookies.delete('next-auth.session-token');
    response.cookies.delete('__Secure-next-auth.session-token');
    
    // Limpar cookies customizados se existirem
    response.cookies.delete('authToken');
    response.cookies.delete('userData');

    return response;
  } catch (error) {
    console.error('Erro no logout API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro durante o logout' 
      },
      { status: 500 }
    );
  }
}
