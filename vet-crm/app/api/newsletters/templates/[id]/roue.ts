import { NextRequest, NextResponse } from 'next/server';

// NOTE: este arquivo tem nome "roue.ts" (provável typo), mas pode estar sendo usado.
// Para evitar Prisma/DATABASE_URL no frontend, deixamos um stub explícito.

export async function GET(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Endpoint de template por ID não disponível (não implementado no backend).' },
    { status: 501 },
  );
}

export async function PATCH(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Atualização de template não disponível (não implementado no backend).' },
    { status: 501 },
  );
}

export async function PUT(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Atualização de template não disponível (não implementado no backend).' },
    { status: 501 },
  );
}

export async function DELETE(_request: NextRequest) {
  return NextResponse.json(
    { error: 'Exclusão de template não disponível (não implementado no backend).' },
    { status: 501 },
  );
}
