import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

// GET /api/consultation-recordings/:id
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/consultation-recordings/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });
}

// PUT /api/consultation-recordings/:id - Upload transcription / update
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { action, ...data } = body;

    let path = `/consultation-recordings/${id}`;
    if (action === 'transcription') {
      path = `/consultation-recordings/${id}/transcription`;
    } else if (action === 'complete') {
      path = `/consultation-recordings/${id}/complete`;
    }

    return proxyToBackend(request, path, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}

// POST /api/consultation-recordings/:id - Transcribe or Analyze
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { action, ...data } = body;

    let path = `/consultation-recordings/${id}`;
    if (action === 'transcribe') {
      path = `/consultation-recordings/${id}/transcribe`;
    } else if (action === 'analyze') {
      path = `/consultation-recordings/${id}/analyze`;
    }

    return proxyToBackend(request, path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
}

// DELETE /api/consultation-recordings/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return proxyToBackend(request, `/consultation-recordings/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
}
