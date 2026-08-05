"use client";

// Impressão de DOCUMENTO com o CABEÇALHO da clínica (logo + dados) no topo.
// Decisão 28/07: usamos SÓ o cabeçalho gerado (logo + dados da clínica) — não usamos
// mais a imagem de "papel timbrado" de fundo (ela ficava num bucket privado e não
// carregava na impressão). O cabeçalho é montado a partir dos Dados da clínica
// (Configurações › Dados da clínica) e vale pra QUALQUER documento.
import { montarTimbradoHtml } from "./documentos/timbrado";

let clinicaCache: { dados: any; at: number } | null = null;

async function getClinica(): Promise<any> {
  if (clinicaCache && Date.now() - clinicaCache.at < 60_000) return clinicaCache.dados;
  try {
    const r = await fetch("/api/listas?lista=dadosclinica", { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d.itens || d.data || []);
    let dados: any = {};
    try { dados = arr[0]?.valor ? JSON.parse(arr[0].valor) : {}; } catch { dados = {}; }
    clinicaCache = { dados, at: Date.now() };
    return dados;
  } catch {
    return {};
  }
}

/**
 * Abre a janela de impressão A4 com o cabeçalho da clínica no topo e o `corpoHtml`
 * no miolo. Se o chamador já mandou um `cabecalhoHtml` pronto (ex.: a ficha do pet,
 * que inclui o quadro de dados do animal), usa esse; senão gera um cabeçalho padrão
 * (logo + dados da clínica).
 */
export async function imprimirDocumento(titulo: string, corpoHtml: string, cabecalhoHtml?: string, dados?: { pet?: any; tutor?: any }): Promise<void> {
  let cab = cabecalhoHtml || "";
  if (!cab) {
    const clinica = await getClinica();
    // Passa pet/tutor (quando o chamador tem) pra sair o QUADRO DE DADOS do animal no cabeçalho.
    cab = montarTimbradoHtml({ titulo, clinica, pet: dados?.pet, tutor: dados?.tutor });
  }

  const w = window.open("", "_blank", "width=840,height=1000");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }

  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${titulo}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #14253a; font-size: 13px; line-height: 1.5; }
      .conteudo { padding: 16mm 16mm 18mm; }
      h1, h2, h3 { color: #014D5E; margin: 0 0 8px; }
      pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
      table { width: 100%; border-collapse: collapse; }
    </style></head>
    <body><div class="conteudo">${cab}<div style="height:18px"></div>${corpoHtml}</div></body></html>`,
  );
  w.document.close();
  w.focus();
  // dá um tempinho pra a LOGO (imagem externa) carregar antes de mandar imprimir
  setTimeout(() => { try { w.print(); } catch { /* usuário fecha */ } }, 600);
}
