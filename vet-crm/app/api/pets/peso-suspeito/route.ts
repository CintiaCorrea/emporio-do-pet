import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Repassa a varredura de pesos implausiveis. Ver backend pets.service.pesosSuspeitos.
export async function GET(request: NextRequest) {
  return proxyToBackend(request, `/pets/peso-suspeito`, { method: 'GET' });
}
