import { NextRequest } from 'next/server';
import { chamarPortal, guardarSessao } from '@/lib/portal-proxy';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const { resposta, dados } = await chamarPortal(request, '/portal/auth/verificar', {
    method: 'POST',
    body,
  });

  // Deu certo de primeira (telefone de um cadastro so) -> ja entra.
  if (dados?.status === 'ok') return guardarSessao(dados);

  // 'escolher' | 'sem_cadastro' | 'invalido' | 'bloqueado' seguem para a tela.
  return resposta;
}
