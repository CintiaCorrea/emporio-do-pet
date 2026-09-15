import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Reabre uma venda já recebida, estornando o recebimento do caixa. Quem confere o perfil é o
// BACKEND — este proxy só repassa o token, e uma trava que morasse aqui seria contornável.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return proxyToBackend(request, `/caixa/venda/${encodeURIComponent(appointmentId)}/reabrir`, { method: 'PATCH' });
}
