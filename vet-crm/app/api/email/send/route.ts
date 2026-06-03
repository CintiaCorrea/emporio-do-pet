import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl, buildApiBase } from "@/lib/backend-proxy";

export async function POST(request: NextRequest) {
  const backendBase = getBackendBaseUrl();
  if (!backendBase) {
    return NextResponse.json({ ok: false, error: "Backend nao configurado" }, { status: 500 });
  }
  const apiBase = buildApiBase(backendBase);
  const body = await request.text();
  const auth = request.headers.get("authorization") || "";
  try {
    const res = await fetch(`${apiBase}/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
      body,
    });
    const txt = await res.text();
    let parsed: any = null;
    try { parsed = JSON.parse(txt); } catch { parsed = { ok: res.ok, raw: txt.slice(0, 500) }; }
    return NextResponse.json(parsed, { status: res.status });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 502 });
  }
}
