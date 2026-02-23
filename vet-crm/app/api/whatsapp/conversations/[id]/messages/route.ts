import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/conversations/[id]/messages - Get messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const urlParams = new URLSearchParams();

  if (searchParams.get('page')) urlParams.set('page', searchParams.get('page')!);
  if (searchParams.get('limit')) urlParams.set('limit', searchParams.get('limit')!);

  const queryString = urlParams.toString();
  const url = queryString 
    ? `/whatsapp/conversations/${id}/messages?${queryString}` 
    : `/whatsapp/conversations/${id}/messages`;

  return backendProxy(request, url);
}

// POST /api/whatsapp/conversations/[id]/messages - Send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp/conversations/${id}/messages`, {
    method: 'POST',
  });
}
