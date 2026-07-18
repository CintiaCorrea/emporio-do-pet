"use client";

// Impressão de DOCUMENTO com o papel timbrado da clínica de fundo.
// O timbrado (imagem A4) é configurado em Configurações › Papel timbrado e guardado
// na lista `config_timbrado`. Usamos position:fixed pra ele imprimir em TODA página,
// com o conteúdo no miolo (margem pra não encostar no logo/rodapé).

let timbradoCache: { url: string; at: number } | null = null;

async function getTimbrado(): Promise<string> {
  if (timbradoCache && Date.now() - timbradoCache.at < 60_000) return timbradoCache.url;
  try {
    const r = await fetch("/api/listas?lista=config_timbrado", { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
    const url = (arr[0]?.valor || "").trim();
    timbradoCache = { url, at: Date.now() };
    return url;
  } catch {
    return "";
  }
}

/**
 * Abre a janela de impressão A4 com o timbrado de fundo (se configurado) e o
 * `corpoHtml` no miolo. Se não houver timbrado, imprime igual, só sem o fundo.
 */
export async function imprimirDocumento(titulo: string, corpoHtml: string): Promise<void> {
  const timbrado = await getTimbrado();
  const w = window.open("", "_blank", "width=840,height=1000");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }

  const fundo = timbrado ? `<div class="timbrado"><img src="${timbrado}" alt="" /></div>` : "";
  // Com timbrado: margem grande pro logo (topo) e rodapé. Sem: margem normal.
  const pad = timbrado ? "55mm 22mm 42mm 22mm" : "22mm";

  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${titulo}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #14253a; font-size: 13px; line-height: 1.5; }
      .timbrado { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; }
      .timbrado img { width: 100%; height: 100%; object-fit: fill; display: block; }
      .conteudo { padding: ${pad}; }
      h1, h2, h3 { color: #014D5E; margin: 0 0 8px; }
      pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
      table { width: 100%; border-collapse: collapse; }
      @media print { .timbrado { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style></head>
    <body>${fundo}<div class="conteudo">${corpoHtml}</div></body></html>`,
  );
  w.document.close();
  w.focus();
  // Espera a imagem do timbrado carregar antes de mandar imprimir.
  setTimeout(() => { try { w.print(); } catch { /* usuário fecha */ } }, timbrado ? 800 : 350);
}
