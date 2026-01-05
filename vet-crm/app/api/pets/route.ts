import { NextRequest, NextResponse } from 'next/server';
import { mapPetToBackend, mapPetToFrontend } from '@/lib/pet-utils';
import { buildApiBase, buildAuthHeader, getBackendBaseUrl } from '@/lib/backend-proxy';

// GET - Listar todos os pets
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/pets${url.search}`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: { ...authHeader },
    });

    const data = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Erro interno do servidor' },
        { status: upstreamResponse.status }
      );
    }

    const pets = Array.isArray(data?.pets) ? data.pets : [];
    const mappedPets = pets.map((pet: any) => mapPetToFrontend(pet));

    return NextResponse.json({
      pets: mappedPets,
      pagination: data.pagination,
    });

  } catch (error) {
    console.error('Erro ao buscar pets:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST - Criar novo pet
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validações básicas
    if (!body.name || !body.species || !body.tutorId) {
      return NextResponse.json(
        { error: 'Nome, espécie e tutorId são obrigatórios' },
        { status: 400 }
      );
    }

    // Mapear dados para o formato do backend
    const petData = mapPetToBackend(body);

    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 }
      );
    }

    const authHeader = await buildAuthHeader(request);
    const upstreamResponse = await fetch(`${buildApiBase(backendBaseUrl)}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify(petData),
    });

    const data = await upstreamResponse.json();
    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: data?.error || data?.message || 'Erro interno do servidor' },
        { status: upstreamResponse.status }
      );
    }

    const mappedPet = mapPetToFrontend(data);
    return NextResponse.json(mappedPet, { status: upstreamResponse.status });

  } catch (error) {
    console.error('Erro ao criar pet:', error);
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
