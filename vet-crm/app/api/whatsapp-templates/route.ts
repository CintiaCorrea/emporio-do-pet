import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

function getBackendBaseUrl() {
  return (
    process.env.BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3333" : undefined)
  );
}

function buildApiBase(backendBaseUrl: string) {
  const normalized = backendBaseUrl.replace(/\/$/, "");
  return normalized.endsWith("/api") ? normalized : `${normalized}/api`;
}

async function buildAuthHeader(request: NextRequest) {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return {};

  let token: any = null;
  try {
    token = await getToken({
      req: request as any,
      secret,
    });
  } catch {
    return {};
  }

  if (token?.accessToken && typeof token.accessToken === "string") {
    return { Authorization: `Bearer ${token.accessToken}` };
  }

  return {};
}

// GET - Listar templates
export async function GET(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend não configurado" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const queryString = url.searchParams.toString();
    const upstreamUrl = `${buildApiBase(backendBaseUrl)}/whatsapp-templates${queryString ? `?${queryString}` : ""}`;

    const authHeader = await buildAuthHeader(request);

    const response = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        ...authHeader,
      },
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!response.ok) {
      const message =
        (data &&
          (data.error ||
            (Array.isArray(data.message) ? data.message.join(", ") : data.message))) ||
        "Erro ao listar templates";

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao listar templates:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Criar template
export async function POST(request: NextRequest) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend não configurado" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const authHeader = await buildAuthHeader(request);

    const response = await fetch(`${buildApiBase(backendBaseUrl)}/whatsapp-templates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeader,
      },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    let data: any = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!response.ok) {
      const message =
        (data &&
          (data.error ||
            (Array.isArray(data.message) ? data.message.join(", ") : data.message))) ||
        "Erro ao criar template";

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar template:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
