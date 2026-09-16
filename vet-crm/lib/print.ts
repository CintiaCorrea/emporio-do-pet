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
export async function imprimirDocumento(titulo: string, corpoHtml: string, cabecalhoHtml?: string, dados?: { pet?: any; tutor?: any }, opts?: { compacto?: boolean; preview?: boolean }): Promise<void> {
  let cab = cabecalhoHtml || "";
  if (!cab) {
    const clinica = await getClinica();
    // Passa pet/tutor (quando o chamador tem) pra sair o QUADRO DE DADOS do animal no cabeçalho.
    cab = montarTimbradoHtml({ titulo, clinica, pet: dados?.pet, tutor: dados?.tutor });
  }

  const w = window.open("", "_blank", "width=840,height=1000");
  if (!w) { alert("Permita pop-ups para imprimir."); return; }

  // compacto = documentos longos (ex.: receituário de controle especial) que precisam caber em 1 página A4
  const pad = opts?.compacto ? '8mm 12mm 8mm' : '16mm 16mm 18mm';
  const fs = opts?.compacto ? '10.5px' : '13px';
  const lh = opts?.compacto ? '1.32' : '1.5';
  w.document.write(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8" /><title>${titulo}</title>
    <style>
      @page { size: A4; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color: #14253a; font-size: ${fs}; line-height: ${lh}; }
      .conteudo { padding: ${pad}; }
      h1, h2, h3 { color: #014D5E; margin: 0 0 8px; }
      pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
      table { width: 100%; border-collapse: collapse; }
    </style></head>
    <body><div class="conteudo">${cab}<div style="height:18px"></div>${corpoHtml}</div></body></html>`,
  );
  w.document.close();
  w.focus();
  // preview = só VISUALIZAR (olhinho): abre o documento sem disparar a impressão (ela pode imprimir por Ctrl+P).
  if (!opts?.preview) {
    // ESPERA AS IMAGENS (logo e ASSINATURA) antes de imprimir. Era um tempo fixo de 0,6 s: a
    // assinatura da Dra. Victoria tem 1,4 MB e vem por um proxy autenticado — com a internet lenta
    // o papel saía antes dela chegar, sem assinatura e sem aviso (Cintia, 16/09/2026). Agora espera
    // todas carregarem (ou falharem), com teto de 5 s para nunca prender a impressão.
    const imprimir = () => { try { w.print(); } catch { /* usuário fecha */ } };
    setTimeout(() => {
      const imgs = Array.from(w.document.images || []).filter((i) => !i.complete);
      if (!imgs.length) { imprimir(); return; }
      let feito = false;
      const uma = () => { if (feito) return; if (Array.from(w.document.images).every((i) => i.complete)) { feito = true; imprimir(); } };
      imgs.forEach((i) => { i.addEventListener("load", uma); i.addEventListener("error", uma); });
      setTimeout(() => { if (!feito) { feito = true; imprimir(); } }, 5000);
    }, 300);
  }
}
