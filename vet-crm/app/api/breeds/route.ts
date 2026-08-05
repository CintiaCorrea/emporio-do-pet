import { NextRequest, NextResponse } from 'next/server';
import { speciesMap } from '@/lib/pet-utils';
import { proxyToBackend } from '@/lib/backend-proxy';

// ADAPTADOR — unificação de raças (jul/2026).
// As telas de edição do pet chamam /api/breeds, mas a FONTE ÚNICA de raças agora é a lista
// CURADA em Configurações › Raças (tabela `racas`, backend /racas). Esta rota traduz
// breeds <-> racas para as telas não precisarem mudar nem uma linha:
//   espécie:  CANINE->CAO · FELINE->GATO · OTHER/BIRD/RODENT/REPTILE->OUTRO
//   campos:   {name} <-> {nome}
// A tabela antiga `pet_breeds` e o módulo backend `breeds` ficam aposentados (removidos depois).

const TO_ESPECIE: Record<string, 'CAO' | 'GATO' | 'OUTRO'> = {
  CANINE: 'CAO',
  FELINE: 'GATO',
  OTHER: 'OUTRO',
  BIRD: 'OUTRO',
  RODENT: 'OUTRO',
  REPTILE: 'OUTRO',
};
const TO_SPECIES: Record<string, string> = { CAO: 'CANINE', GATO: 'FELINE', OUTRO: 'OTHER' };

// Normaliza a espécie recebida para o formato do enum de pet (CANINE/FELINE/...).
// Aceita o formato do backend (CANINE) e o do frontend (via speciesMap).
function normSpecies(species: string | null): string | null {
  if (!species) return null;
  const up = species.toUpperCase();
  if (up in TO_ESPECIE) return up;
  const mapped = (speciesMap as any)[species];
  return mapped && mapped in TO_ESPECIE ? mapped : null;
}

// Uma `raca` do backend vira o formato que as telas de pet esperam (breed).
// Devolve name E nome (e species E especie) por segurança — qualquer campo que a tela leia funciona.
function racaToBreed(r: any, reqSpecies?: string | null) {
  const nome = r?.nome ?? r?.name ?? '';
  return {
    id: r?.id,
    name: nome,
    nome,
    species: reqSpecies || TO_SPECIES[r?.especie] || 'OTHER',
    especie: r?.especie,
    ativo: r?.ativo,
  };
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const speciesRaw = url.searchParams.get('species');
  const norm = normSpecies(speciesRaw);
  if (speciesRaw && !norm) {
    return NextResponse.json({ error: 'Espécie inválida' }, { status: 400 });
  }
  const especie = norm ? TO_ESPECIE[norm] : null;
  const backendPath = especie ? `/racas?especie=${especie}` : `/racas`;

  const res = await proxyToBackend(request, backendPath, { method: 'GET' });
  if (!res.ok) return res; // repassa erros (401/500 etc.) sem mexer

  const data = await res.json().catch(() => []);
  const arr = Array.isArray(data) ? data : data?.racas || data?.data || data?.itens || [];
  const breeds = arr.map((r: any) => racaToBreed(r, norm));
  return NextResponse.json(breeds);
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const norm = normSpecies(body?.species ?? null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';

  if (!norm || !name) {
    return NextResponse.json({ error: 'species e name são obrigatórios' }, { status: 400 });
  }

  const especie = TO_ESPECIE[norm];
  const res = await proxyToBackend(request, `/racas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nome: name, especie }),
  });
  if (!res.ok) return res;

  const created = await res.json().catch(() => null);
  return NextResponse.json(created ? racaToBreed(created, norm) : { ok: true });
}
