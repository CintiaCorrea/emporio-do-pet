import { NextRequest, NextResponse } from 'next/server';

interface BatchUpdateRequest {
  ids: string[];
  isActive?: boolean;
  category?: string;
}

interface BatchDeleteRequest {
  ids: string[];
}

// PATCH - Atualização em lote
export async function PATCH(request: NextRequest) {
  try {
    const _body: BatchUpdateRequest = await request.json();
    return NextResponse.json(
      { error: 'Atualização em lote de templates não disponível (endpoint não implementado no backend).' },
      { status: 501 },
    );

  } catch (error) {
    console.error('Erro ao atualizar templates em lote:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao atualizar templates' },
      { status: 500 }
    );
  }
}

// POST - Deletar em lote
export async function POST(request: NextRequest) {
  try {
    const _body: BatchDeleteRequest = await request.json();
    return NextResponse.json(
      { error: 'Exclusão em lote de templates não disponível (endpoint não implementado no backend).' },
      { status: 501 },
    );

  } catch (error) {
    console.error('Erro ao deletar templates em lote:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao deletar templates' },
      { status: 500 }
    );
  }
}
