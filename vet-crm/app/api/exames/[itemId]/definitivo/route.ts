import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Apaga de vez, sem esperar os 45 dias. Quem confere o perfil é o BACKEND: este proxy só repassa
// o token, e uma trava que morasse aqui seria contornável chamando a API direto.
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/${encodeURIComponent(itemId)}/definitivo`, { method: 'DELETE' });
}
