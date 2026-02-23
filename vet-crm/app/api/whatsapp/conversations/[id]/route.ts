import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/conversations/[id] - Get single conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp/conversations/${id}`);
}

// PATCH /api/whatsapp/conversations/[id] - Update conversation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp/conversations/${id}`, {
    method: 'PATCH',
  });
}
