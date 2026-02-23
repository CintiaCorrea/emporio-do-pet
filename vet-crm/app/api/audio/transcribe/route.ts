import { NextRequest, NextResponse } from 'next/server';
import { buildAuthHeader, getBackendBaseUrl, buildApiBase } from '@/lib/backend-proxy';

// POST /api/audio/transcribe - Speech-to-Text (upload)
export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado' },
        { status: 500 }
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/audio/transcribe/upload`;

    // Read the raw body as ArrayBuffer to preserve the multipart boundary
    const contentType = request.headers.get('content-type') || '';
    const bodyBuffer = await request.arrayBuffer();

    console.log('[transcribe] Sending to backend:', upstreamUrl);
    console.log('[transcribe] Content-Type:', contentType);
    console.log('[transcribe] Body size:', bodyBuffer.byteLength);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...authHeader,
      },
      body: bodyBuffer,
    });

    const responseText = await upstreamResponse.text();
    console.log('[transcribe] Backend response status:', upstreamResponse.status);
    console.log('[transcribe] Backend response:', responseText.substring(0, 500));

    let data: Record<string, unknown> = {};
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || 'Unknown error' };
    }

    if (!upstreamResponse.ok) {
      const message = data.error || data.message || 'Erro na transcrição';
      return NextResponse.json({ error: message }, { status: upstreamResponse.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return NextResponse.json(
      { error: 'Erro ao transcrever áudio' },
      { status: 500 }
    );
  }
}
