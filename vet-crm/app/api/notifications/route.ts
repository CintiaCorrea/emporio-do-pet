import { NextRequest, NextResponse } from 'next/server';
import { backendProxy } from '@/lib/backend-proxy';

export async function GET(request: NextRequest) {
  return backendProxy(request, '/notifications');
}
