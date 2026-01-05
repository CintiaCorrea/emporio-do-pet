import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backend-proxy';

export async function GET(request: NextRequest, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  return proxyToBackend(request, `/stock/movements/${encodeURIComponent(productId)}`, { method: 'GET' });
}

