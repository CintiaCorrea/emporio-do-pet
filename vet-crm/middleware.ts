// middleware.ts - VERSÃO ATUALIZADA
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

const protectedRoutes = [
  '/dashboard',
  '/dashboard/crm',
  '/dashboard/contatos',
  '/dashboard/integracoes',
  '/dashboard/pets',
  '/dashboard/pipeline',
  '/dashboard/pipelines',
  '/dashboard/relatorios',
  '/dashboard/tutores',
  '/dashboard/newsletter',
  '/dashboard/erp'
]

const publicRoutes = [
  '/login',
  '/register',
  '/api/auth',
  '/'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir todas as rotas de API de autenticação sem verificação
  if (pathname.startsWith('/api/auth')) {
    return NextResponse.next()
  }

  // Permitir todas as rotas de API
  if (pathname.startsWith('/api/')) {
    // Para rotas de API protegidas, obter o token e adicionar headers
    const isProtectedApiRoute = 
      pathname.startsWith('/api/boards') || 
      pathname.startsWith('/api/columns') ||
      pathname.startsWith('/api/appointments') ||
      pathname.startsWith('/api/crm') ||
      pathname.startsWith('/api/hospitalizations') ||
      pathname.startsWith('/api/products') ||
      pathname.startsWith('/api/treatments') ||
      pathname.startsWith('/api/stock') ||
      pathname.startsWith('/api/commissions')
    
    if (isProtectedApiRoute) {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
      })

      if (token) {
        const userId = (token as any).id ?? token.sub
        const userEmail = (token as any).email
        const userRole = (token as any).role

        // Se faltar info mínima do usuário, tratar como não autenticado
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Não autorizado' }), {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          })
        }

        // Clonar a request e adicionar headers com informações do usuário
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-user-id', String(userId))
        if (userEmail) requestHeaders.set('x-user-email', String(userEmail))
        if (userRole) requestHeaders.set('x-user-role', String(userRole))

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      } else {
        // Se não tem token, retornar erro 401
        return new Response(JSON.stringify({ error: 'Não autorizado' }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        })
      }
    }
    
    return NextResponse.next()
  }

  // ... resto do middleware para páginas (mantém igual) ...
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (isPublicRoute) {
    return NextResponse.next()
  }

  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (!isProtectedRoute) {
    return NextResponse.next()
  }

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', encodeURI(request.url))
    return NextResponse.redirect(loginUrl)
  }

  const allowedRoles = ['ADMIN', 'VETERINARIAN', 'RECEPTIONIST']
  const userRole = token.role as string

  if (!userRole || !allowedRoles.includes(userRole)) {
    const deniedUrl = new URL('/acesso-negado', request.url)
    return NextResponse.redirect(deniedUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
