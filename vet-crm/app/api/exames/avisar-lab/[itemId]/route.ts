import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  return proxyToBackend(request, `/exames/avisar-lab/${encodeURIComponent(itemId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
}
