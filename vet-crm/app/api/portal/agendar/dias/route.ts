import { NextRequest } from 'next/server';
import { chamarPortal } from '@/lib/portal-proxy';

export async function GET(request: NextRequest) {
  const qs = new URL(request.url).searchParams.toString();
  const { resposta } = await chamarPortal(request, `/portal/agendar/dias?${qs}`);
  return resposta;
}
