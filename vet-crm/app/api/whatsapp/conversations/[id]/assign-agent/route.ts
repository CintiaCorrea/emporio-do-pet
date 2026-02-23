import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// POST /api/whatsapp/conversations/[id]/assign-agent - Assign AI agent
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp/conversations/${id}/assign-agent`, {
    method: 'POST',
  });
}
