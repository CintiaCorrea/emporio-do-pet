import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/fornecedores/exames', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
}
