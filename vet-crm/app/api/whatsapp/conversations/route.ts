import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/conversations - List conversations
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const params = new URLSearchParams();

  if (searchParams.get('status')) params.set('status', searchParams.get('status')!);
  if (searchParams.get('search')) params.set('search', searchParams.get('search')!);
  if (searchParams.get('hasUnread')) params.set('hasUnread', searchParams.get('hasUnread')!);
  if (searchParams.get('assignedAgentId')) params.set('assignedAgentId', searchParams.get('assignedAgentId')!);
  if (searchParams.get('page')) params.set('page', searchParams.get('page')!);
  if (searchParams.get('limit')) params.set('limit', searchParams.get('limit')!);

  const queryString = params.toString();
  const url = queryString ? `/whatsapp/conversations?${queryString}` : '/whatsapp/conversations';

  return backendProxy(request, url);
}

// POST /api/whatsapp/conversations - Create or get conversation (for direct send)
export async function POST(request: NextRequest) {
  const body = await request.text();
  return backendProxy(request, '/whatsapp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
