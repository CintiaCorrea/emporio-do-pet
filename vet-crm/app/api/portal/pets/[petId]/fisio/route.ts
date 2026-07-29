import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

interface Rota {
  params: Promise<{ petId: string }>;
}

/** O backend confere se o pet e mesmo do tutor da sessao antes de responder. */
export async function GET(request: NextRequest, { params }: Rota) {
  const { petId } = await params;
  const { resposta } = await chamarPortal(request, `/portal/pets/${petId}/fisio`);
  return resposta;
}
