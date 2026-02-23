import { NextRequest, NextResponse } from 'next/server';
import { speciesMap } from '@/lib/pet-utils';
import { proxyToBackend } from '@/lib/backend-proxy';

function mapSpeciesToBackend(species: string | null) {
  if (!species) return null;
  // Se já vier no formato do backend, mantém
  const upper = species.toUpperCase();
  if (['CANINE', 'FELINE', 'BIRD', 'RODENT', 'REPTILE', 'OTHER'].includes(upper)) return upper;
  // Se vier no formato do frontend, mapeia
  return (speciesMap as any)[species] || null;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mapped = mapSpeciesToBackend(url.searchParams.get('species'));
  if (url.searchParams.has('species')) {
    if (!mapped) {
      return NextResponse.json({ error: 'Espécie inválida' }, { status: 400 });
    }
    url.searchParams.set('species', mapped);
  }

  return proxyToBackend(request, `/breeds${url.search}`, { method: 'GET' });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const species = mapSpeciesToBackend(body?.species ?? null);
  const name = typeof body?.name === 'string' ? body.name : '';

  if (!species || !name?.trim()) {
    return NextResponse.json({ error: 'species e name são obrigatórios' }, { status: 400 });
  }

  return proxyToBackend(request, `/breeds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ species, name }),
  });
}

