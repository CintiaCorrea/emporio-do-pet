import { NextRequest, NextResponse } from 'next/server';

// Poll BotConversa - puxa subscribers atualizados recentes
// e dispara o webhook proprio com payload sintetico,
// reusando toda a logica de normalizacao, enriquecimento por tags e dedupe.
//
// Uso:
//   GET  /api/integrations/botconversa/poll?since=ISO  (padrao: 24h atras)
//   POST /api/integrations/botconversa/poll body { since?, dryRun?, limit? }
//
// Idempotente: chamar varias vezes nao duplica.

const BC_API_KEY =
  process.env.BOTCONVERSA_API_KEY ||
  process.env.BC_API_KEY ||
  '';
const BC_BASE = 'https://backend.botconversa.com.br/api/v1/webhook';
const BC_SECRET =
  process.env.BOTCONVERSA_WEBHOOK_SECRET || '';

type BCSubscriber = {
  id?: number | string;
  phone?: string;
  full_phone?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  last_interaction?: string;
  created_at?: string;
  tags?: any[];
};

function joinName(s: BCSubscriber): string {
  if (s.full_name) return s.full_name;
  const parts = [s.first_name, s.last_name].filter(Boolean) as string[];
  return parts.join(' ').trim();
}

function classifyByTags(tags: string[]): 'cliente' | 'lead' {
  return tags.some((t) => /cliente/i.test(t)) ? 'cliente' : 'lead';
}

function normalizeTags(raw: any[] | undefined): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t) => (typeof t === 'string' ? t : t?.name || t?.tag || ''))
    .filter(Boolean);
}

async function fetchSubscribers(): Promise<{ data: BCSubscriber[]; endpointUsed: string }> {
  const candidates = [
    `${BC_BASE}/subscriber/?ordering=-last_interaction&page_size=100`,
    `${BC_BASE}/subscribers/?ordering=-last_interaction&page_size=100`,
    `${BC_BASE}/subscriber/`,
    `${BC_BASE}/subscribers/`,
  ];
  for (const url of candidates) {
    try {
      const res = await fetch(url, {
        headers: { 'API-KEY': BC_API_KEY, Accept: 'application/json' },
      });
      if (!res.ok) continue;
      const j = await res.json();
      const list = Array.isArray(j) ? j : j.results || j.data || j.subscribers || [];
      if (Array.isArray(list)) return { data: list, endpointUsed: url };
    } catch {
      // tenta proximo
    }
  }
  return { data: [], endpointUsed: 'none' };
}

async function handle(request: NextRequest) {
  if (!BC_API_KEY) {
    return NextResponse.json(
      { ok: false, error: 'BOTCONVERSA_API_KEY nao configurada no env' },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const sinceParam =
    url.searchParams.get('since') ||
    (request.method === 'POST'
      ? await request
          .clone()
          .json()
          .then((b: any) => b?.since)
          .catch(() => null)
      : null);

  const since = sinceParam
    ? new Date(sinceParam)
    : new Date(Date.now() - 24 * 60 * 60 * 1000);

  const dryRun = url.searchParams.get('dryRun') === '1';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);

  const { data: subs, endpointUsed } = await fetchSubscribers();

  if (endpointUsed === 'none') {
    return NextResponse.json(
      {
        ok: false,
        error: 'Nenhum endpoint de subscriber do BC retornou lista.',
        triedBase: BC_BASE,
      },
      { status: 502 },
    );
  }

  const filtered = subs
    .filter((s) => {
      const ts = s.last_interaction || s.created_at;
      if (!ts) return true;
      return new Date(ts) >= since;
    })
    .sort((a, b) => {
      const ta = new Date(a.last_interaction || a.created_at || 0).getTime();
      const tb = new Date(b.last_interaction || b.created_at || 0).getTime();
      return tb - ta;
    })
    .slice(0, limit);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      endpointUsed,
      totalFromBC: subs.length,
      filteredCount: filtered.length,
      since: since.toISOString(),
      sample: filtered.slice(0, 5).map((s) => ({
        phone: s.phone || s.full_phone,
        name: joinName(s),
        last: s.last_interaction,
        tags: normalizeTags(s.tags),
      })),
    });
  }

  const webhookUrl = `${url.origin}/api/integrations/botconversa/webhook`;
  const results: any[] = [];
  for (const s of filtered) {
    const phone = s.phone || s.full_phone;
    if (!phone) continue;
    const tags = normalizeTags(s.tags);
    const tipo = classifyByTags(tags);
    const payload = {
      full_phone: phone,
      nome_completo: joinName(s) || 'Sem nome',
      tipo_contato: tipo,
      trigger: 'poll',
      bc_last_interaction: s.last_interaction,
    };
    try {
      const r = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Botconversa-Secret': BC_SECRET,
        },
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => ({}));
      results.push({ phone, name: payload.nome_completo, tipo, tags, status: r.status, ...j });
    } catch (e: any) {
      results.push({ phone, error: e?.message || String(e) });
    }
  }

  const summary = {
    polled: filtered.length,
    tutoresCreated: results.filter((r) => r.tutorCreated).length,
    leadsCreated: results.filter((r) => r.leadCreated).length,
    tutoresUpdated: results.reduce((a, r) => a + (r.tutorsUpdated || 0), 0),
    leadsUpdated: results.reduce((a, r) => a + (r.leadsUpdated || 0), 0),
    errors: results.filter((r) => r.error || (r.status && r.status >= 400)).length,
  };

  return NextResponse.json({
    ok: true,
    endpointUsed,
    totalFromBC: subs.length,
    since: since.toISOString(),
    now: new Date().toISOString(),
    summary,
    results,
  });
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
