import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

/**
 * Normaliza telefone brasileiro inserindo o "9" do celular quando faltar
 * ou removendo prefixo "55" duplicado.
 */
function normalizePhoneBR(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  
  // Caso > 13 digitos: BC envia "55{ddd}{telefone}" mas {telefone} ja inclui codigo pais
  // Resultado: 55 duplicado tipo "5585558586018111" (16 chars)
  if (d.length > 13) {
    const t11 = d.slice(-11);
    if (/^\d{2}9[6-9]/.test(t11)) {
      d = '55' + t11;
    } else {
      const t10 = d.slice(-10);
      if (/^\d{2}[6-9]/.test(t10)) {
        d = '55' + t10.slice(0, 2) + '9' + t10.slice(2);
      } else {
        d = d.slice(-13);
      }
    }
  }
  
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
    normalization: 'phone/full_phone normalizados pra 55DDD9XXXXXXXX (handles 10/11/12/13/16+ digitos)',
  });
}
