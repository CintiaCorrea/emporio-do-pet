import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

/**
 * Normaliza telefone brasileiro inserindo o "9" do celular quando faltar.
 */
function normalizePhoneBR(phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  if (d.length === 13 && d.startsWith('55') && d[4] === '9') return d;
  if (d.length === 12 && d.startsWith('55') && /[6789]/.test(d[4])) {
    return d.slice(0, 4) + '9' + d.slice(4);
  }
  if (d.length === 11 && d[2] === '9' && /[6789]/.test(d[2])) return '55' + d;
  if (d.length === 10 && /[6789]/.test(d[2])) {
    return '55' + d.slice(0, 2) + '9' + d.slice(2);
  }
  return d;
}

function normalizePayloadPhones(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  const keys = ['phone', 'full_phone', 'telefone', 'fone'];
  for (const k of keys) {
    if (payload[k]) {
      const norm = normalizePhoneBR(payload[k]);
      if (norm) payload[k] = norm;
    }
  }
  return payload;
}

async function forward(request, method) {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ ok: false, error: 'Backend nao configurado' }, { status: 500 });
  }
  const apiBase = buildApiBase(backendBase);
  const url = `${apiBase}/integrations/botconversa/webhook`;

  let body;
  if (method === 'POST') {
    const raw = await request.text();
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizePayloadPhones(parsed);
      body = JSON.stringify(normalized);
    } catch {
      body = raw;
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    const txt = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(txt); } catch { parsed = { ok: res.ok, raw: txt.slice(0, 500) }; }
    return NextResponse.json(parsed, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 502 });
  }
}

export async function POST(request) {
  return forward(request, 'POST');
}

export async function GET(request) {
  return NextResponse.json({
    ok: true,
    info: 'BotConversa webhook endpoint',
    method: 'POST',
    expectedFields: ['phone OR full_phone', 'tutor_nome', 'pet_nome'],
    normalization: 'phone/full_phone normalizados pra formato 55DDD9XXXXXXXX',
  });
}
