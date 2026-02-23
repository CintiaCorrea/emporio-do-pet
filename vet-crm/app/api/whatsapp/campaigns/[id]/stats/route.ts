import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// GET /api/whatsapp/campaigns/[id]/stats - Get campaign stats
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp-campaigns/${id}/stats`);
}
