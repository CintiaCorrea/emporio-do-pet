import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Usa o proxy padrão (que RENOVA o token quando expira). Antes era um proxy
// customizado sem renovação — quando o token do login expirava, a tela de
// templates ficava vazia ("templates sumiram") mesmo com tudo certo na Meta.

export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/whatsapp-templates${search}`, { method: "GET" });
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  return proxyToBackend(request, `/whatsapp-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
