import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// Troca da PRÓPRIA senha (tela "Minha senha") — exige a senha atual no backend.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/auth/minha-senha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
