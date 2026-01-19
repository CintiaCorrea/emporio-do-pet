import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET: Listar colunas de um board via query ?boardId=...
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const boardId = searchParams.get('boardId');
  if (!boardId) {
    return NextResponse.json({ error: 'ID do board é obrigatório' }, { status: 400 });
  }
  return proxyToBackend(request, `/boards/${boardId}/columns`, { method: 'GET' });
}

// POST: Criar coluna (espera body com boardId)
export async function POST(request: NextRequest) {
  const raw = await request.text();
  let parsed: any = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  const boardId = parsed?.boardId;
  if (!boardId || typeof boardId !== 'string') {
    return NextResponse.json({ error: 'ID do board é obrigatório' }, { status: 400 });
  }

  const body = JSON.stringify({
    name: parsed?.name,
    color: parsed?.color,
    // frontend usa 0-based; backend também espera 0-based
    position: parsed?.position,
  });

  return proxyToBackend(request, `/boards/${boardId}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
