import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/campaigns/[id] - Get campaign
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp-campaigns/${id}`);
}

// PATCH /api/whatsapp/campaigns/[id] - Update campaign
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.text();
  return backendProxy(request, `/whatsapp-campaigns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

// DELETE /api/whatsapp/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp-campaigns/${id}`, {
    method: 'DELETE',
  });
}
