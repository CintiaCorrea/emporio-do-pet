import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function POST(request: NextRequest) {
  return backendProxy(request, '/notifications/read-all', { method: 'POST' });
}
