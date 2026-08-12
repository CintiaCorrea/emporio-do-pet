import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

// Dispara o LOTE de solicitação de coleta agora (mesmo que roda às 11:30 e 17:00).
export async function POST(request: NextRequest) {
  return proxyToBackend(request, `/exames/avisar-lab-rodar-agora`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
