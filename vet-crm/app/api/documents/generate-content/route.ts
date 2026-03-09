import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// POST /api/documents/generate-content - Generate formatted document content with AI
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { transcription, type = 'document' } = body;

    if (!transcription || typeof transcription !== 'string') {
      return NextResponse.json(
        { error: 'Transcrição é obrigatória' },
        { status: 400 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3333';

    const response = await fetch(`${backendUrl}/documents/generate-content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        transcription,
        type,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || 'Erro ao gerar conteúdo' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error generating document content:', error);
    return NextResponse.json(
      { error: 'Erro ao gerar conteúdo do documento' },
      { status: 500 }
    );
  }
}
