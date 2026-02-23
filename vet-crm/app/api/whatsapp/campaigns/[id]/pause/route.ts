import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

// POST /api/whatsapp/campaigns/[id]/pause - Pause campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return backendProxy(request, `/whatsapp-campaigns/${id}/pause`, {
    method: 'POST',
  });
}
