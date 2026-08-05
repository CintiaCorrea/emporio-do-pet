import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Proxy padrão (renova o token quando expira) — ver route.ts pai.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/whatsapp-templates/${encodeURIComponent(id)}`, { method: "GET" });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.text();
  return proxyToBackend(request, `/whatsapp-templates/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(request, `/whatsapp-templates/${encodeURIComponent(id)}`, { method: "DELETE" });
}
