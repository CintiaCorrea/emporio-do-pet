import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, buildAuthHeader, getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  return proxyToBackend(request, `/knowledge-bases/${id}/documents`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  const backendBaseUrl = getBackendBaseUrl();
  if (!backendBaseUrl) {
    return NextResponse.json({ error: 'Backend não configurado' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const authHeader = await buildAuthHeader(request);

    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/knowledge-bases/${id}/documents`;

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { ...authHeader },
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Erro ao enviar documento' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Erro ao enviar documento' }, { status: 500 });
  }
}
