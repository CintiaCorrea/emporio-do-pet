import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// POST /api/whatsapp/campaigns/[id]/build-audience - Build audience from filter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp-campaigns/${id}/build-audience`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
