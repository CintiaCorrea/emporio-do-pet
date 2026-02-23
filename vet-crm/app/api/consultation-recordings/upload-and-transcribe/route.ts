import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, '');
  return normalized.endsWith('/api') ? normalized : `${normalized}/api`;
}

/**
 * POST /api/consultation-recordings/upload-and-transcribe
 * Creates a recording + uploads audio + transcribes via Whisper in one step.
 * Requires: appointmentId in form data + audio file.
 */
export async function POST(request: NextRequest) {
  try {
    // Get auth token
    const secret = process.env.NEXTAUTH_SECRET;
    const token = secret ? await getToken({ req: request as any, secret }) : null;
    const authHeader: Record<string, string> = {};
    if (token?.accessToken && typeof token.accessToken === 'string') {
      authHeader['Authorization'] = `Bearer ${token.accessToken}`;
    }

    // Read form data from request
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;
    const appointmentId = formData.get('appointmentId')?.toString();

    if (!audioFile) {
      return NextResponse.json({ error: 'Arquivo de áudio é obrigatório' }, { status: 400 });
    }
    if (!appointmentId) {
      return NextResponse.json({ error: 'appointmentId é obrigatório' }, { status: 400 });
    }

    // Build new FormData to forward to backend
    const backendFormData = new FormData();
    backendFormData.append('audio', audioFile, audioFile.name || 'audio.webm');
    backendFormData.append('appointmentId', appointmentId);

    const language = formData.get('language');
    if (language) backendFormData.append('language', language.toString());

    const audioDuration = formData.get('audioDuration');
    if (audioDuration) backendFormData.append('audioDuration', audioDuration.toString());

    const apiBase = buildApiBase(BACKEND_URL);
    const upstreamUrl = `${apiBase}/consultation-recordings/upload-and-transcribe`;

    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { ...authHeader },
      body: backendFormData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error || data?.message || 'Erro ao transcrever áudio';
      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Create and transcribe error:', error);
    return NextResponse.json(
      { error: 'Falha ao processar áudio. Tente novamente.' },
      { status: 500 }
    );
  }
}
