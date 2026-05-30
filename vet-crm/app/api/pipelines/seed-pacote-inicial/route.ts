import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function POST(request: NextRequest) {
  return backendProxy(request, '/pipelines/seed-pacote-inicial', { method: 'POST' });
}
