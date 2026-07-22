import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';

function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

/**
 * POST /api/consultation-recordings/:id/upload-and-transcribe
 * Proxies multipart/form-data (audio file) to the backend.
 * The backend transcribes via Whisper and returns the transcription.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Get auth token
    const secret = process.env.NEXTAUTH_SECRET;
    const token = secret ? await getToken({ req: request as any, secret }) : null;
    const authHeader: Record<string, string> = {};
    if (token?.accessToken && typeof token.accessToken === 'string') {
      authHeader['Authorization'] = `Bearer ${token.accessToken}`;
    }

    // STREAM o corpo multipart direto pro backend, SEM ler com formData(). Áudio de
    // consulta longa (40 MB) bufferizado na memória estourava o Next (OOM -> 502).
    // Passa o content-type original (com o boundary) pro multer do backend entender.
    const apiBase = buildApiBase(BACKEND_URL);
    const upstreamUrl = `${apiBase}/consultation-recordings/${id}/upload-and-transcribe`;

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { ...authHeader, 'content-type': request.headers.get('content-type') || 'application/octet-stream' },
      body: request.body,
      duplex: 'half',
    } as any);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.message || 'Erro ao transcrever áudio';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Upload and transcribe error:', error);
    return NextResponse.json(
      { error: 'Falha ao processar áudio. Tente novamente.' },
      { status: 500 }
    );
  }
}
