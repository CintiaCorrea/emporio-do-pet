import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

/**
 * Normaliza telefone brasileiro inserindo o "9" do celular quando faltar.
 *
 * Aceita formatos como:
 *   558586018111   (12 digitos, BR sem 9 do celular)  → 5585986018111
 *   5585986018111  (13 digitos, ja canonico)          → 5585986018111
 *   8586018111     (10 digitos, DDD+8sem9)            → 5585986018111
 *   85986018111    (11 digitos, DDD+9+8)              → 5585986018111
 *   +55...         (com simbolos)                     → strip e processa
 *
 * Regra: precisa ter o primeiro digito do numero local entre 6-9 (celular BR).
 * Senao retorna o input "so digitos" sem alterar (telefone fixo).
 */
function normalizePhoneBR(phone?: string | null): string | null {
  if (!phone) return null;
  const d = String(phone).replace(/\D/g, '');
  if (!d) return null;

  // Casos cobertos:
  // 1) 13 digitos comecando com 55 + DDD + 9 + 8 digitos → ja canonico
  if (d.length === 13 && d.startsWith('55') && d[4] === '9') {
    return d;
  }
  // 2) 12 digitos comecando com 55 + DDD + 8 digitos (sem 9), primeiro entre 6-9 → insere 9
  if (d.length === 12 && d.startsWith('55') && /[6789]/.test(d[4])) {
    return d.slice(0, 4) + '9' + d.slice(4);
  }
  // 3) 11 digitos DDD + 9 + 8 → adiciona 55
  if (d.length === 11 && d[2] === '9' && /[6789]/.test(d[2])) {
    return '55' + d;
  }
  // 4) 10 digitos DDD + 8 sem 9 → adiciona 55 + 9
  if (d.length === 10 && /[6789]/.test(d[2])) {
    return '55' + d.slice(0, 2) + '9' + d.slice(2);
  }
  // Default: retorna so digitos (telefone fixo ou formato desconhecido)
  return d;
}

/**
 * Normaliza todos os campos de telefone no payload do webhook BC.
 * Aceita aliases: phone, full_phone, telefone, fone.
 */
function normalizePayloadPhones(payload: any): any {
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

// Webhook público — não exige JWT (BotConversa não tem credenciais nossas)
async function forward(request: NextRequest, method: 'GET' | 'POST') {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ ok: false, error: 'Backend não configurado' }, { status: 500 });
  }
  const apiBase = buildApiBase(backendBase);
  const url = `${apiBase}/integrations/botconversa/webhook`;

  let body: string | undefined;
  if (method === 'POST') {
    const raw = await request.text();
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizePayloadPhones(parsed);
      body = JSON.stringify(normalized);
    } catch {
      // se não for JSON válido, passa adiante intacto
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
    normalization: 'phone/full_phone serao normalizados pra formato 55DDD9XXXXXXXX se vierem sem o 9 do celular',
  });
}
