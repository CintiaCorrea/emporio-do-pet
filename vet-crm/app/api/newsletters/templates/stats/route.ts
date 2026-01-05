// app/api/newsletters/templates/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';

// GET - Estatísticas dos templates
export async function GET(request: NextRequest) {
  try {
    // Estatísticas de templates ainda não expostas no backend NestJS.
    // (Evitamos Prisma no frontend para não depender de DATABASE_URL local/tenant.)
    return NextResponse.json(
      { error: 'Estatísticas de templates não disponíveis (endpoint não implementado no backend).' },
      { status: 501 },
    );

  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
