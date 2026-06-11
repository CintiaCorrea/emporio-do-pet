import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  return proxyToBackend(request, `/leads/${id}/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body || '{}',
  });
}
