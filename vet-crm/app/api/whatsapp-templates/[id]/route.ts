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

// GET - Obter template por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend não configurado" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const authHeader = await buildAuthHeader(request);

    const response = await fetch(`${buildApiBase(backendBaseUrl)}/whatsapp-templates/${id}`, {
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
        "Erro ao obter template";

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao obter template:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PATCH - Atualizar template
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend não configurado" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const authHeader = await buildAuthHeader(request);

    const response = await fetch(`${buildApiBase(backendBaseUrl)}/whatsapp-templates/${id}`, {
      method: "PATCH",
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
        "Erro ao atualizar template";

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao atualizar template:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Excluir template por nome (id é o nome do template)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const backendBaseUrl = getBackendBaseUrl();
    if (!backendBaseUrl) {
      return NextResponse.json(
        { error: "Backend não configurado" },
        { status: 500 }
      );
    }

    const { id } = await params;
    const authHeader = await buildAuthHeader(request);

    const response = await fetch(`${buildApiBase(backendBaseUrl)}/whatsapp-templates/${id}`, {
      method: "DELETE",
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
        "Erro ao excluir template";

      return NextResponse.json({ error: message }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao excluir template:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
