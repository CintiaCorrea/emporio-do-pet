import { NextRequest } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// POST /api/fornecedores/exames/precificar-lote — aplica um markup % em lote sobre o custo do lab.
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/fornecedores/exames/precificar-lote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
