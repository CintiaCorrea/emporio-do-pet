import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// POST /api/audio/synthesize - Text-to-Speech
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    return proxyToBackend(request, '/audio/synthesize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return new Response(
      JSON.stringify({ error: 'Dados inválidos' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
