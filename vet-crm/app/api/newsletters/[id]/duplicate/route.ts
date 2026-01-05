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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID da newsletter é obrigatório' },
        { status: 400 }
      );
    }

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    const authHeader = await buildAuthHeader(request);
    const apiBase = buildApiBase(backendBaseUrl);

    // 1) Buscar a newsletter original no backend (com autorização)
    const originalRes = await fetch(`${apiBase}/newsletters/${id}`, {
      method: 'GET',
      headers: { ...authHeader },
    });

    const originalRaw = await originalRes.text();
    let original: any = null;
    try {
      original = originalRaw ? JSON.parse(originalRaw) : null;
    } catch {
      original = originalRaw;
    }

    if (!originalRes.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(original, 'Erro ao buscar newsletter original') },
        { status: originalRes.status },
      );
    }

    // 2) Criar a cópia no backend
    const createRes = await fetch(`${apiBase}/newsletters`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({
        title: `${original.title} (Cópia)`,
        subject: original.subject,
        content: original.content,
        status: 'DRAFT',
        recipientType: original.recipientType,
        scheduledFor: null,
        templateId: original.templateId ?? undefined,
      }),
    });

    const createdRaw = await createRes.text();
    let created: any = null;
    try {
      created = createdRaw ? JSON.parse(createdRaw) : null;
    } catch {
      created = createdRaw;
    }

    if (!createRes.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(created, 'Erro ao duplicar newsletter') },
        { status: createRes.status },
      );
    }

    // Mantém contrato esperado pela UI: retorna a newsletter criada (objeto "solto")
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('Erro ao duplicar newsletter:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao duplicar newsletter' },
      { status: 500 }
    );
  }
}
