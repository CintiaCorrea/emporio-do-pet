/**
 * A ASSINATURA DO VETERINÁRIO NA RECEITA — UMA SÓ, PARA TODO LUGAR QUE IMPRIME RECEITA.
 *
 * Cintia, 16/09/2026: "você não está conseguindo consertar a porra da assinatura em um documento,
 * uma coisa que já estava pronta e funcionando".
 *
 * A assinatura existia em UM botão só — o Imprimir de dentro da receita, na ficha do pet. A receita
 * também é impressa pelo ícone da LINHA DO TEMPO, pelo visualizador de documentos clínicos e pelo
 * novo atendimento; os dois primeiros nunca assinaram, e o terceiro usava o link direto da imagem
 * (o armazenamento é privado: dá 403). A receita do Kiss saiu pela linha do tempo. Cada tela com o
 * seu jeito de imprimir é como a assinatura "some do nada": basta a equipe mudar de botão.
 *
 * Aqui mora o bloco inteiro: tirar o rodapé que o MODELO já escreve ("Fortaleza, CE, data … Nome
 * CRMV") e montar UM bloco à direita com local e data, a imagem da assinatura, a linha, o nome e o
 * CRMV — o padrão combinado em 17/08.
 */

export type VeterinarioDaReceita = { nome: string; crmv: string; signatureUrl: string };

const esc = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** O que a receita precisa saber de um usuário da lista de profissionais. */
export function veterinarioDoUsuario(u: any): VeterinarioDaReceita | null {
  if (!u) return null;
  return {
    // O MESMO nome e CRMV que o botão da ficha sempre imprimiu — nada muda no papel de quem já assinava.
    nome: String(u.nomeExibicao || u.name || "").trim(),
    crmv: String(u.crmv || u.profissional?.crmv || "").trim(),
    signatureUrl: String(u.signatureUrl || "").trim(),
  };
}

/**
 * Tira o rodapé que o modelo já imprimiu, para não sair assinatura em dobro. Procura a ÚLTIMA
 * ocorrência de "Cidade, UF," — é assim que o rodapé do modelo começa.
 */
export function semRodapeDoModelo(corpoHtml: string, cidade?: string, uf?: string): string {
  const corpo = String(corpoHtml || "");
  if (!cidade || !uf) return corpo;
  const idx = corpo.lastIndexOf(`${cidade}, ${uf},`);
  if (idx < 0) return corpo;
  return corpo.slice(0, idx).replace(/(?:\s|&nbsp;|<br\s*\/?>|<div>\s*<\/div>)+$/gi, "");
}

/** A imagem vem pelo proxy autenticado: o link direto do armazenamento privado dá 403. */
export const srcDaAssinatura = (signatureUrl: string) =>
  signatureUrl ? `/api/media/ver?u=${encodeURIComponent(signatureUrl)}` : "";

export function blocoDeAssinatura(vet: VeterinarioDaReceita, cidade?: string, uf?: string, quando: Date = new Date()): string {
  const d = `${String(quando.getDate()).padStart(2, "0")}/${String(quando.getMonth() + 1).padStart(2, "0")}/${quando.getFullYear()}`;
  const lugar = cidade && uf ? `${cidade}, ${uf}` : (cidade || uf || "");
  const local = [lugar, d].filter(Boolean).join(", ");
  const src = srcDaAssinatura(vet.signatureUrl);
  const img = src
    ? `<div style="margin-bottom:-6px"><img src="${src}" alt="assinatura" style="max-height:72px;max-width:260px;object-fit:contain;mix-blend-mode:multiply" /></div>`
    : "";
  return `<div style="margin-top:${src ? 40 : 56}px;text-align:right;page-break-inside:avoid">`
    + `<div style="font-size:13px;color:#334155;margin-bottom:${src ? 4 : 34}px">${esc(local)}</div>`
    + img
    + `<div style="display:inline-block;min-width:260px;border-top:1px solid #14253a;padding-top:6px;font-size:13px;text-align:center"><b>${esc(vet.nome)}</b>`
    + (vet.crmv ? `<div style="font-size:12px;color:#475569;margin-top:2px">${esc(vet.crmv)}</div>` : "")
    + `</div></div>`;
}

/** A receita pronta para imprimir: sem o rodapé do modelo e com o bloco de assinatura. */
export function receitaAssinada(corpoHtml: string, vet: VeterinarioDaReceita, cidade?: string, uf?: string, quando?: Date): string {
  return semRodapeDoModelo(corpoHtml, cidade, uf) + blocoDeAssinatura(vet, cidade, uf, quando);
}

/** Busca o veterinário e a cidade da clínica na hora — para as telas que não os têm carregados. */
export async function carregarParaAssinar(vetId?: string | null): Promise<{ vet: VeterinarioDaReceita | null; cidade: string; uf: string }> {
  let vet: VeterinarioDaReceita | null = null;
  let cidade = "", uf = "";
  if (vetId) {
    try {
      const r = await fetch(`/api/users`, { cache: "no-store" });
      const d = await r.json();
      const arr = Array.isArray(d) ? d : (d?.users || d?.data || []);
      vet = veterinarioDoUsuario(arr.find((u: any) => u.id === vetId));
    } catch { /* devolve sem veterinário: quem chama avisa */ }
  }
  try {
    const r = await fetch(`/api/listas?lista=dadosclinica`, { cache: "no-store" });
    const d = await r.json();
    const arr = Array.isArray(d) ? d : (d?.itens || d?.data || []);
    const c = arr[0]?.valor ? JSON.parse(arr[0].valor) : {};
    cidade = String(c?.cidade || ""); uf = String(c?.uf || "");
  } catch { /* sem cidade: o bloco sai só com a data */ }
  return { vet, cidade, uf };
}
