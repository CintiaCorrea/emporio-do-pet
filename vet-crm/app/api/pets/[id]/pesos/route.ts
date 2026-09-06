import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Histórico de peso do pet — alimenta o gráfico da ficha.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/pets/${id}/pesos`, { method: 'GET' });
}
