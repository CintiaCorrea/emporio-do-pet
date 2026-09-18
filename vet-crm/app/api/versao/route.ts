// QUAL VERSÃO ESTÁ NO AR (17/09/2026). Responde o carimbo do programa que ESTE servidor está
// rodando. A tela aberta compara com o carimbo dela e descobre se está velha.
import { NextResponse } from "next/server";
import { VERSAO_PUBLICADA } from "@/lib/versao-publicada";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { versao: VERSAO_PUBLICADA },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
  );
}
