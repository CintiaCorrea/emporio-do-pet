import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

/**
 * Normaliza telefone brasileiro inserindo o "9" do celular ou removendo
 * prefixo "55" duplicado.
 */
function normalizePhoneBR(phone) {
  if (!phone) return null;
  let d = String(phone).replace(/\D/g, '');
  if (!d) return null;
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

/**
 * Verifica se o telefone JA pertence a um Tutor existente no banco.
 * Se sim, devolve o ID do tutor; senao null.
 * Faz busca pelos ultimos 9 e tambem ultimos 8 digitos (telefones antigos).
 */
async function findExistingTutor(apiBase, phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  // Busca pelos ultimos 9 digitos (canonico)
  const tail9 = d.slice(-9);
  const tail8 = d.slice(-8);
  try {
    const r = await fetch(`${apiBase}/tutors?search=${tail9}&limit=5`);
    if (!r.ok) return null;
    const data = await r.json();
    const arr = Array.isArray(data) ? data : (data.tutors || data.data || []);
    if (arr.length > 0) return arr[0].id;
    // Fallback: busca por 8 digitos
    const r2 = await fetch(`${apiBase}/tutors?search=${tail8}&limit=5`);
    if (!r2.ok) return null;
    const data2 = await r2.json();
    const arr2 = Array.isArray(data2) ? data2 : (data2.tutors || data2.data || []);
    return arr2.length > 0 ? arr2[0].id : null;
  } catch {
    return null;
  }
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

      // AUTO-DETECT: se telefone ja eh Tutor existente, forca tipo_contato=cliente
      const phone = normalized.full_phone || normalized.phone || normalized.telefone;
      if (phone) {
        const existingTutorId = await findExistingTutor(apiBase, phone);
        if (existingTutorId) {
          normalized.tipo_contato = 'cliente';
          normalized._autoDetected = true;
        }
      }

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
    normalization: 'phone normalizado pra 55DDD9XXXXXXXX. tipo_contato auto-detectado: se telefone ja eh Tutor, vira cliente.',
  });
}
