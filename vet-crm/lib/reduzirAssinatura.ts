/**
 * DEIXA A IMAGEM DA ASSINATURA LEVE ANTES DE ENVIAR.
 *
 * Cintia, 16/09/2026: "não pode deixar o arquivo das assinaturas mais leve para ser mais rápido e
 * mais prático?". No papel a assinatura sai com no máximo 260 × 72 pontos, e havia imagem de 1,4 MB
 * (foto de celular em resolução cheia) — que demora a chegar na hora de imprimir e pode ficar de
 * fora do papel.
 *
 * Reduz para no máximo LARGURA_MAX de largura (3× o tamanho impresso — continua nítida), mantendo a
 * proporção e o FUNDO TRANSPARENTE (sai PNG). Imagem que já é pequena volta como veio.
 */
export const LARGURA_MAX = 780;

/** O tamanho final, sem aumentar imagem pequena. */
export function tamanhoReduzido(largura: number, altura: number, max: number = LARGURA_MAX): { largura: number; altura: number } {
  if (!(largura > 0) || !(altura > 0) || largura <= max) return { largura, altura };
  return { largura: max, altura: Math.max(1, Math.round((altura * max) / largura)) };
}

/** Só no navegador. Em qualquer falha, devolve o arquivo original — melhor pesado do que nenhum. */
export async function reduzirAssinatura(arquivo: File): Promise<File> {
  try {
    if (typeof document === "undefined" || !arquivo.type.startsWith("image/")) return arquivo;
    const url = URL.createObjectURL(arquivo);
    const img = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const { largura, altura } = tamanhoReduzido(img.naturalWidth, img.naturalHeight);
    if (largura === img.naturalWidth && arquivo.size < 300 * 1024) return arquivo;
    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const ctx = canvas.getContext("2d");
    if (!ctx) return arquivo;
    ctx.drawImage(img, 0, 0, largura, altura);
    const blob: Blob | null = await new Promise((ok) => canvas.toBlob(ok, "image/png"));
    if (!blob || blob.size >= arquivo.size) return arquivo;
    return new File([blob], (arquivo.name || "assinatura").replace(/\.[^.]+$/, "") + ".png", { type: "image/png" });
  } catch {
    return arquivo;
  }
}
