import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

interface Rota {
  params: Promise<{ petId: string }>;
}

export async function GET(request: NextRequest, { params }: Rota) {
  const { petId } = await params;
  const { resposta } = await chamarPortal(request, `/portal/pets/${petId}/internacao`);
  return resposta;
}
