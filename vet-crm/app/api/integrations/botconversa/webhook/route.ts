import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

const BC_API_KEY = '49058590-48d7-4da9-a5a6-d15261c50756';
const BC_BASE = 'https://backend.botconversa.com.br/api/v1/webhook';

/**
 * Normaliza telefone BR.
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
 * Busca tags atuais do contato no BotConversa.
 */
async function fetchSubscriberTags(phone) {
  if (!phone) return [];
  try {
    const res = await fetch(`${BC_BASE}/subscriber/get_by_phone/${phone}/`, {
      headers: { 'API-KEY': BC_API_KEY },
    });
    if (!res.ok) return [];
    const data = await res.json();
    const tags = data.tags || data.data?.tags || [];
    if (!Array.isArray(tags)) return [];
    return tags
      .map(t => (typeof t === 'string' ? t : t.name || t.tag || ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Verifica se telefone existe como Tutor no backend.
 */
async function findExistingTutor(apiBase, phone) {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  if (!d) return null;
  const tail9 = d.slice(-9);
  const tail8 = d.slice(-8);
  try {
    const r = await fetch(`${apiBase}/tutors?search=${tail9}&limit=5`);
    if (!r.ok) return null;
    const data = await r.json();
    const arr = Array.isArray(data) ? data : (data.tutors || data.data || []);
    if (arr.length > 0) return arr[0].id;
    const r2 = await fetch(`${apiBase}/tutors?search=${tail8}&limit=5`);
    if (!r2.ok) return null;
    const data2 = await r2.json();
    const arr2 = Array.isArray(data2) ? data2 : (data2.tutors || data2.data || []);
    return arr2.length > 0 ? arr2[0].id : null;
  } catch {
    return null;
  }
}

/**
 * Determina tipo_contato baseado em tags do BC.
 * Tag "Cliente" -> cliente. Senao mantem o que veio.
 */
function classifyByTags(tags, defaultType) {
  if (!Array.isArray(tags) || tags.length === 0) return defaultType;
  const hasClienteTag = tags.some(t => /^cliente$/i.test(String(t).trim()));
  if (hasClienteTag) return 'cliente';
  return defaultType;
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

      const phone = normalized.full_phone || normalized.phone || normalized.telefone;

      if (phone) {
        // 1. Busca tags atuais do BC
        const bcTags = await fetchSubscriberTags(phone);
        if (bcTags.length > 0) {
          normalized._bcTags = bcTags;
          // 2. Classifica via tag
          normalized.tipo_contato = classifyByTags(bcTags, normalized.tipo_contato || 'lead');
        }
        // 3. Confirma com lookup no banco do app (auto-detect)
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
    enrichment: 'tags do BC + auto-detect Tutor existente -> forca tipo_contato',
  });
}
