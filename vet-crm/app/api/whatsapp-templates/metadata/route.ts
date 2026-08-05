import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Proxy padrão (renova o token quando expira) — ver route.ts pai.
export async function GET(request: NextRequest) {
  const { search } = new URL(request.url);
  return proxyToBackend(request, `/whatsapp-templates/metadata${search}`, { method: "GET" });
}
