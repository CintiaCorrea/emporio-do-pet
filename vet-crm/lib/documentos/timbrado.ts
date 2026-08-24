// Timbrado dos documentos: cabeçalho (logo + dados da clínica) + título + quadro
// de dados do animal/tutor. Montado a partir dos dados reais (reusa o motor de
// variáveis). Vale pra QUALQUER modelo de documento — impressão e PDF do WhatsApp.
// Layout fiel ao mockup aprovado (27/07): artifact 2bde9ef8-0d65-480f-9d3c-1a23d0b711a4.
import { construirMapa } from "./variaveis";

function esc(s: any): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Placeholder da logo (símbolo pata) — usado só enquanto a clínica não tem uma
// logoUrl própria cadastrada em Dados da clínica. O cabeçalho já escreve o nome ao
// lado, então a logo ideal é a versão SÓ SÍMBOLO (quadrada).
const LOGO_FALLBACK =
  '<svg viewBox="0 0 24 24" fill="none" stroke="#009AAC" stroke-width="1.4" width="66" height="66"><path d="M12 21s-7-4.4-9.2-8.6C1.3 9.4 2.6 6 6 6c2 0 3.2 1.2 4 2.4C10.8 7.2 12 6 14 6c3.4 0 4.7 3.4 3.2 6.4C19 16.6 12 21 12 21z"/><circle cx="8.5" cy="10" r="1"/><circle cx="15.5" cy="10" r="1"/></svg>';

/**
 * HTML do timbrado (cabeçalho + título + quadro de dados). Já traz seu próprio
 * <style>, então é só colar antes do corpo do documento na hora de imprimir/gerar PDF.
 */
export function montarTimbradoHtml(args: {
  titulo?: string;
  clinica?: any;
  pet?: any;
  tutor?: any;
}): string {
  const { titulo, clinica, pet, tutor } = args;
  const m = construirMapa({ pet, tutor, clinica });
  const v = (k: string) => esc(m[k] || "");
  // Se a clínica tem logo própria (que já traz o NOME), mostra a logo maior e NÃO
  // repete o nome ao lado. Sem logo, usa o símbolo placeholder + o nome escrito.
  const temLogo = !!clinica?.logoUrl;
  const logo = temLogo
    ? `<img src="${esc(clinica.logoUrl)}" alt="" style="height:52px;max-height:60px;width:auto;max-width:280px;object-fit:contain;display:block" />`
    : LOGO_FALLBACK;

  // Cabeçalho (a pedido da Cintia): 1ª linha = endereço + bairro; cidade/UF + CEP e telefones abaixo.
  // Monta dos campos crus (rua/numero/bairro/cidade/uf/cep) pra não repetir cidade/CEP.
  const rua = clinica?.rua ? `${esc(clinica.rua)}${clinica?.numero ? " " + esc(clinica.numero) : ""}` : v("CLINICA_ENDERECO");
  const enderecoLinha1 = [rua, clinica?.bairro ? esc(clinica.bairro) : ""].filter(Boolean).join(", ");
  const cidadeCep = [clinica?.cidade ? `${esc(clinica.cidade)}${clinica?.uf ? "/" + esc(clinica.uf) : ""}` : v("CLINICA_CIDADE"), clinica?.cep ? `CEP ${esc(clinica.cep)}` : ""].filter(Boolean).join(" — ");
  const tels = [clinica?.telefone ? esc(clinica.telefone) : v("CLINICA_TELEFONE"), clinica?.whatsapp ? esc(clinica.whatsapp) : v("CLINICA_TELEFONE2")].filter(Boolean).join(" · ");

  // linhas do quadro de dados (só mostra o que existir)
  // Padrão (Cintia): Tutor/Pet pelo NOME, sem o código da ficha na frente (ex.: "Nenem", não "4701 - Nenem").
  const animalNome = v("ANIMAL_NOME");
  const respNome = v("RESPONSAVEL_NOME");
  const linha = (rot: string, val: string) => (val ? `<div><b>${rot}:</b> <span>${val}</span></div>` : "");
  const linhaFull = (rot: string, val: string) => (val ? `<div class="tb-full"><b>${rot}:</b> <span>${val}</span></div>` : "");

  const temPet = !!(pet && (pet.name || pet.id));
  const quadro = temPet
    ? `<div class="tb-dados">
        ${linha("Animal", animalNome)}
        ${linha("Peso", v("ANIMAL_PESO") ? `${v("ANIMAL_PESO")} kg` : "")}
        ${linha("Espécie", v("ANIMAL_ESPECIE"))}
        ${linha("Sexo", v("ANIMAL_SEXO"))}
        ${linha("Raça", v("ANIMAL_RACA"))}
        ${linha("Idade", v("ANIMAL_IDADE"))}
        ${linha("Pelagem", v("ANIMAL_PELAGEM"))}
        ${linhaFull("Responsável", respNome + (v("RESPONSAVEL_CPF") ? ` · CPF: ${v("RESPONSAVEL_CPF")}` : ""))}
        ${linhaFull("Endereço", v("RESPONSAVEL_ENDERECO"))}
      </div>`
    : "";

  return `
  <style>
    .tb-cab{display:flex;align-items:center;gap:18px;border:1px solid #d9d4c8;border-radius:6px;padding:14px 18px}
    .tb-cab .tb-logo{flex-shrink:0;display:flex;align-items:center;justify-content:center}
    .tb-cab .tb-cl{flex:1;text-align:right}
    .tb-cab .tb-nm{font-weight:800;color:#014D5E;font-size:17px;letter-spacing:.01em}
    .tb-cab .tb-ln{font-size:12px;color:#3a4a4f;line-height:1.55}
    .tb-titulo{border:1px solid #d9d4c8;border-top:none;border-radius:0 0 6px 6px;text-align:center;font-weight:700;font-size:17px;color:#1f2a2e;padding:9px}
    .tb-dados{border:1px solid #d9d4c8;border-radius:6px;margin-top:14px;padding:12px 16px;display:grid;grid-template-columns:1fr 1fr;gap:3px 30px;font-size:12.5px}
    .tb-dados .tb-full{grid-column:1 / -1}
    .tb-dados b{color:#1f2a2e}.tb-dados span{color:#3a4a4f}
  </style>
  <div class="tb-cab">
    <div class="tb-logo">${logo}</div>
    <div class="tb-cl">
      ${temLogo ? "" : `<div class="tb-nm">${v("CLINICA_NOME") || "Empório do Pet"}</div>`}
      <div class="tb-ln">${enderecoLinha1}${cidadeCep ? "<br>" + cidadeCep : ""}${tels ? "<br>" + tels : ""}</div>
    </div>
  </div>
  ${titulo ? `<div class="tb-titulo">${esc(titulo)}</div>` : ""}
  ${quadro}`;
}
