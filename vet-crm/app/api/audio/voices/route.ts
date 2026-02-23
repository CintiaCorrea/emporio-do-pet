import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { backendProxy } from "@/lib/backend-proxy";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const result = await backendProxy<{ id: string; name: string; description: string; gender: string }[]>(
    "/api/audio/voices",
    {
      method: "GET",
      session,
    }
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 500 }
    );
  }

  return NextResponse.json(result.data);
}
