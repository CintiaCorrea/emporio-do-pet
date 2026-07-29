import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

/**
 * Regras do agendamento online — painel da EQUIPE.
 * Usa o proxy da equipe (token do funcionario), NAO o do tutor.
 */
export async function GET(request: NextRequest) {
  return proxyToBackend(request, '/portal/admin/agenda/regras', { method: 'GET' });
}

export async function PUT(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/portal/admin/agenda/regras', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
