import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// Webhook público — não exige JWT (BotConversa não tem credenciais nossas)
async function forward(request: NextRequest, method: 'GET' | 'POST') {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ ok: false, error: 'Backend não configurado' }, { status: 500 });
  }
  const apiBase = buildApiBase(backendBase);
  const url = `${apiBase}/integrations/botconversa/webhook`;

  const body = method === 'POST' ? await request.text() : undefined;
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const txt = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { parsed = { ok: res.ok, raw: txt.slice(0, 500) }; }
    return NextResponse.json(parsed, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  return forward(request, 'POST');
}

export async function GET(request: NextRequest) {
  // Healthcheck pra Cintia testar a URL no navegador
  return NextResponse.json({
    ok: true,
    info: 'BotConversa webhook endpoint',
    method: 'POST',
    expectedFields: ['phone OR full_phone', 'tutor_nome', 'pet_nome', 'pet_especie', 'pet_idade', 'resumo_ia OR ResumoIA', 'servico_interesse'],
  });
}
