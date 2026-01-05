import { NextRequest, NextResponse } from 'next/server';
import { buildApiBase, buildAuthHeader, getBackendBaseUrl } from '@/lib/backend-proxy';

// Tipos para a requisição
interface CreateTemplateRequest {
  name: string;
  content: string;
  subject: string;
  description?: string;
  category?: string;
}

interface UpdateTemplateRequest {
  name?: string;
  content?: string;
  subject?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

function extractErrorMessage(data: any, fallback: string) {
  return (
    (data &&
      (data.error ||
        (Array.isArray(data.message) ? data.message.join(', ') : data.message) ||
        data.message)) ||
    fallback
  );
}

// GET - Listar todos os templates
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: 'Backend não configurado (defina NEXT_PUBLIC_API_URL ou BACKEND_URL)' },
        { status: 500 },
      );
    }

    // Backend retorna lista simples de templates ativos.
    const authHeader = await buildAuthHeader(request);
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/newsletters/templates`;

    const upstreamResponse = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        ...authHeader,
      },
    });

    const raw = await upstreamResponse.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!upstreamResponse.ok) {
      return NextResponse.json(
        { error: extractErrorMessage(data, 'Erro ao carregar templates') },
        { status: upstreamResponse.status },
      );
    }

    const templates = Array.isArray(data) ? data : Array.isArray(data?.templates) ? data.templates : [];
    return NextResponse.json({ templates });

  } catch (error) {
    console.error('Erro ao buscar templates:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao buscar templates' },
      { status: 500 }
    );
  }
}

// POST - Criar novo template
export async function POST(request: NextRequest) {
  try {
    // Por enquanto, templates são lidos do backend (GET /newsletters/templates).
    // CRUD de templates ainda não foi exposto no backend NestJS.
    const _body: CreateTemplateRequest = await request.json();
    return NextResponse.json(
      { error: 'Criação de templates não disponível neste ambiente (apenas leitura).' },
      { status: 501 },
    );

  } catch (error) {
    console.error('Erro ao criar template:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor ao criar template' },
      { status: 500 }
    );
  }
}
