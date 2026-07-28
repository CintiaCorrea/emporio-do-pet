/**
 * Ponte do Portal do Tutor com o backend.
 *
 * Por que NAO usar o `backend-proxy` da equipe: aquele injeta o token do
 * FUNCIONARIO logado (NextAuth). Se o portal usasse ele, um tutor navegando no
 * mesmo navegador de alguem da clinica poderia herdar permissao de equipe.
 * Aqui so viaja o token do tutor, e nada mais.
 *
 * O token fica num cookie httpOnly: JavaScript da pagina nao consegue ler,
 * entao um script injetado nao rouba a sessao do tutor.
 */
import { NextRequest, NextResponse } from 'next/server';

export const COOKIE_SESSAO = 'ptl_sessao';
const TRINTA_DIAS = 30 * 24 * 60 * 60;

function baseDoBackend() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== 'production' ? 'http://127.0.0.1:3333' : undefined)
  );
}

function apiBase(raw: string) {
  const limpo = raw.replace(/\/$/, '').replace('://localhost', '://127.0.0.1');
  return limpo.endsWith('/api') ? limpo : `${limpo}/api`;
}

/** Repassa uma chamada para /api/portal/* no backend, levando so a sessao do tutor. */
export async function chamarPortal(
  request: NextRequest,
  caminho: string,
  init?: { method?: string; body?: string },
): Promise<{ resposta: NextResponse; dados: any }> {
  const base = baseDoBackend();
  if (!base) {
    const resposta = NextResponse.json({ error: 'Backend nao configurado' }, { status: 500 });
    return { resposta, dados: null };
  }

  const token = request.cookies.get(COOKIE_SESSAO)?.value;

  try {
    const upstream = await fetch(`${apiBase(base)}${caminho}`, {
      method: init?.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        // Preserva o IP de origem para o limite de tentativas do backend.
        'x-forwarded-for': request.headers.get('x-forwarded-for') || '',
        'user-agent': request.headers.get('user-agent') || '',
      },
      body: init?.body,
      cache: 'no-store',
    });

    const texto = await upstream.text();
    const dados = texto ? JSON.parse(texto) : null;
    return {
      resposta: NextResponse.json(dados, { status: upstream.status }),
      dados,
    };
  } catch {
    const resposta = NextResponse.json({ error: 'Falha ao conectar ao backend' }, { status: 502 });
    return { resposta, dados: null };
  }
}

/**
 * Guarda a sessao no cookie e TIRA o token do corpo da resposta — o navegador
 * nunca precisa ver o token, e assim ele nao sobra em log nem em cache.
 */
export function guardarSessao(dados: any): NextResponse {
  const { token, ...semToken } = dados || {};
  const resposta = NextResponse.json(semToken, { status: 200 });

  if (token) {
    resposta.cookies.set(COOKIE_SESSAO, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: TRINTA_DIAS,
    });
  }

  return resposta;
}

export function limparSessao(resposta: NextResponse): NextResponse {
  resposta.cookies.set(COOKIE_SESSAO, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return resposta;
}
