import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST /api/products/importar-catalogo — importa catálogo por CSV (dryRun=true = só prévia).
export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, '/products/importar-catalogo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
