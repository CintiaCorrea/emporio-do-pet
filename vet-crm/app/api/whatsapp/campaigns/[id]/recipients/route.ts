import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/campaigns/[id]/recipients - Get recipients
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const searchParams = request.nextUrl.searchParams;
  const urlParams = new URLSearchParams();

  if (searchParams.get('status')) urlParams.set('status', searchParams.get('status')!);
  if (searchParams.get('page')) urlParams.set('page', searchParams.get('page')!);
  if (searchParams.get('limit')) urlParams.set('limit', searchParams.get('limit')!);

  const queryString = urlParams.toString();
  const url = queryString 
    ? `/whatsapp-campaigns/${id}/recipients?${queryString}` 
    : `/whatsapp-campaigns/${id}/recipients`;

  return backendProxy(request, url);
}

// POST /api/whatsapp/campaigns/[id]/recipients - Add recipients
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp-campaigns/${id}/recipients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// DELETE /api/whatsapp/campaigns/[id]/recipients - Remove recipients
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp-campaigns/${id}/recipients`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}
