import { NextRequest, NextResponse } from 'next/server';
import { buildApiBase, buildAuthHeader, getBackendBaseUrl } from '@/lib/backend-proxy';

function extractErrorMessage(data: any, fallback: string) {
  return (
    (data &&
      (data.error ||
        (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
        data.message)) ||
    fallback
  );
}

export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    // Compatibilidade: o frontend pode mandar `recipients`, `sentAt`, etc.
    // O backend hoje cria apenas a newsletter (recipients/logs são gerenciados lá quando aplicável).
    const body = await request.json();
    const {
      title,
      subject,
      content,
      status,
      scheduledFor,
      recipientType,
      templateId,
    } = body ?? {};

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/newsletters`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        title,
        subject,
        content,
        status,
        scheduledFor,
        recipientType,
        templateId,
      }),
    });

    const raw = await upstreamResponse.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao criar newsletter') },
        { status: upstreamResponse.status },
      );
    }

    return NextResponse.json({ newsletter: data }, { status: upstreamResponse.status });
  } catch (error) {
    console.error('Error creating newsletter:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const url = new URL(request.url);
    const upstream = new URL(`${buildApiBase(backendBaseUrl)}/newsletters`);
    // repassa filtros/paginação se houver
    url.searchParams.forEach((value, key) => upstream.searchParams.set(key, value));
    // defaults para evitar NaN/undefined no backend
    if (!upstream.searchParams.has('skip')) upstream.searchParams.set('skip', '0');
    if (!upstream.searchParams.has('take')) upstream.searchParams.set('take', '20');

    const authHeader = await buildAuthHeader(request);
    const upstreamResponse = await fetch(upstream.toString(), {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    const raw = await upstreamResponse.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao buscar newsletters') },
        { status: upstreamResponse.status },
      );
    }

    // Backend retorna { newsletters, total, skip, take }
    const newsletters = Array.isArray(data?.newsletters) ? data.newsletters : Array.isArray(data) ? data : [];
    return NextResponse.json({ newsletters, pagination: { total: data?.total, skip: data?.skip, take: data?.take } });
  } catch (error) {
    console.error('Error fetching newsletters:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
