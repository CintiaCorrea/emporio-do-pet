import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyToBackend(request, `/appointments/${id}`, { method: 'GET' });
}

export async function PATCH(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await request.text();
  return proxyToBackend(request, `/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body,
  });
}

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  return proxyToBackend(request, `/appointments/${id}`, { method: 'DELETE' });
}
