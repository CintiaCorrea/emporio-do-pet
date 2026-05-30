import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function POST(request: NextRequest) {
  return backendProxy(request, '/cadencias/seed-pacote-inicial', { method: 'POST' });
}
