import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

interface Rota {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Rota) {
  const { id } = await params;
  const body = await request.text();
  const { resposta } = await chamarPortal(request, `/portal/agendamentos/${id}/desmarcar`, {
    method: 'POST',
    body: body || '{}',
  });
  return resposta;
}
