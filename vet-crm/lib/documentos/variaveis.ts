// =============================================================================
// Motor de variáveis de documentos (migração SimplesVet)
// -----------------------------------------------------------------------------
// Substitui as variáveis @GRUPO_CAMPO@ dos modelos de documento/receita pelos
// dados reais do pet, tutor, profissional, clínica e data.
//
// Uso:
//   import { preencherVariaveis } from "@/lib/documentos/variaveis";
//   const texto = preencherVariaveis(modelo.corpo, { pet, tutor, vet, clinica });
//
// Regras:
//  - Variável conhecida e SEM valor  → string vazia (o SimplesVet deixa em branco).
//  - Variável desconhecida            → mantém o @TEXTO@ intacto (não apaga o que
//    não sabemos preencher — evita sumir com placeholders legítimos do texto).
//  - Case-insensitive no nome da variável.
// =============================================================================

export interface VarContext {
  pet?: any; // ficha do Pet (name, species, breed, gender, birthDate, weight, microchip, coatColor, sterilization, codigo)
  tutor?: any; // Tutor completo (name, cpf, rg, email, city, state, cep, address..., contacts, codigo)
  vet?: any; // profissional selecionado (name/nomeExibicao, crmv, especialidade, telefone, cargo/tipo)
  clinica?: any; // JSON de dadosclinica (nomeFantasia, razaoSocial, cnpj, telefone, whatsapp, email, site, cep, rua...)
  data?: Date; // data de referência (padrão: agora)
  vacinas?: { aplicadas?: string; aplicadasResumo?: string; programadas?: string }; // best-effort (opcional)
}

// ---------- Formatadores ------------------------------------------------------

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function toDate(v: any): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

// Datas de calendário (nascimento etc.) são guardadas em UTC meia-noite.
// Formatar com componentes UTC evita o "voltar um dia" no fuso do Brasil (UTC-3).
function fmtData(v: any): string {
  const d = toDate(v);
  if (!d) return "";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
}

function fmtDiaMes(v: any): string {
  const d = toDate(v);
  if (!d) return "";
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// "Agora" (data corrente, no fuso de quem está usando) — usa componentes locais.
function fmtDataLocal(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function fmtDataExtensoLocal(d: Date): string {
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// Idade a partir da data de nascimento (ex.: "3 anos e 2 meses", "8 meses")
function calcIdade(v: any): string {
  const nasc = toDate(v);
  if (!nasc) return "";
  const hoje = new Date();
  // nascimento em UTC (data de calendário), hoje no fuso local
  const nAno = nasc.getUTCFullYear(), nMes = nasc.getUTCMonth(), nDia = nasc.getUTCDate();
  let anos = hoje.getFullYear() - nAno;
  let meses = hoje.getMonth() - nMes;
  if (hoje.getDate() < nDia) meses -= 1;
  if (meses < 0) { anos -= 1; meses += 12; }
  if (anos < 0) return "";
  const pAno = anos === 1 ? "1 ano" : anos > 1 ? `${anos} anos` : "";
  const pMes = meses === 1 ? "1 mês" : meses > 1 ? `${meses} meses` : "";
  if (pAno && pMes) return `${pAno} e ${pMes}`;
  return pAno || pMes || "recém-nascido";
}

function especieLabel(s: any): string {
  const map: Record<string, string> = {
    CANINE: "Canina", FELINE: "Felina", BIRD: "Ave", RODENT: "Roedor",
    REPTILE: "Réptil", RABBIT: "Coelho", FISH: "Peixe", OTHER: "Outro",
  };
  return map[String(s || "").toUpperCase()] || (s ? String(s) : "");
}

function sexoLabel(g: any): string {
  const v = String(g || "").toUpperCase();
  if (v === "MALE" || v === "M" || v === "MACHO") return "Macho";
  if (v === "FEMALE" || v === "F" || v === "FEMEA" || v === "FÊMEA") return "Fêmea";
  return "";
}

function esterilizacaoLabel(s: any): string {
  const v = String(s || "").toUpperCase();
  if (v === "STERILIZED" || v === "CASTRADO") return "Castrado(a)";
  if (v === "NOT_STERILIZED" || v === "NAO_CASTRADO") return "Não castrado(a)";
  return "";
}

// Só o número (ex.: "4,2"). Os modelos costumam escrever "Kg" logo após a variável.
function pesoLabel(w: any): string {
  if (w === null || w === undefined || w === "") return "";
  const n = typeof w === "number" ? w : parseFloat(String(w).replace(",", "."));
  if (isNaN(n)) return "";
  return String(n).replace(".", ",");
}

function primeiroNome(nome: any): string {
  return String(nome || "").trim().split(/\s+/)[0] || "";
}

function telefonePrincipal(tutor: any): string {
  const cs = tutor?.contacts;
  if (Array.isArray(cs) && cs.length) {
    const p = cs.find((c: any) => c?.isPrimary) || cs.find((c: any) => c?.isWhatsApp) || cs[0];
    return p?.number || "";
  }
  return tutor?.phone || "";
}

// Endereço do tutor em uma linha
function enderecoTutor(t: any): string {
  if (!t) return "";
  const linha1 = [t.address, t.addressNumber].filter(Boolean).join(", ");
  const comp = t.complement ? ` - ${t.complement}` : "";
  const bairro = t.neighborhood ? ` - ${t.neighborhood}` : "";
  const cidadeUf = [t.city, t.state].filter(Boolean).join("/");
  const cep = t.cep ? ` - CEP ${t.cep}` : "";
  return `${linha1}${comp}${bairro}${cidadeUf ? ` - ${cidadeUf}` : ""}${cep}`.trim();
}

// Endereço da clínica em uma linha
function enderecoClinica(c: any): string {
  if (!c) return "";
  const linha1 = [c.rua, c.numero].filter(Boolean).join(", ");
  const comp = c.complemento ? ` - ${c.complemento}` : "";
  const bairro = c.bairro ? ` - ${c.bairro}` : "";
  const cidadeUf = [c.cidade, c.uf].filter(Boolean).join("/");
  const cep = c.cep ? ` - CEP ${c.cep}` : "";
  return `${linha1}${comp}${bairro}${cidadeUf ? ` - ${cidadeUf}` : ""}${cep}`.trim();
}

// Separa o título (Dr./Dra.) do nome, já que o nomeExibicao guarda os dois juntos
// (ex.: "Dra. Vivian Corrêa"). Assim "@USUARIO_TRATAMENTO@ @USUARIO_NOMEPUBLICO@"
// não duplica o "Dra.".
function tituloENome(v: any): { titulo: string; nome: string } {
  const bruto = String(v?.nomeExibicao || v?.name || v?.nomeCompleto || "").trim();
  const m = bruto.match(/^(Dra?\.?)\s+/i);
  if (m) {
    let titulo = m[1];
    if (!titulo.endsWith(".")) titulo += ".";
    return { titulo, nome: bruto.slice(m[0].length).trim() };
  }
  return { titulo: v?.tratamento || "", nome: bruto };
}

// ---------- Motor -------------------------------------------------------------

export function construirMapa(ctx: VarContext): Record<string, string> {
  const pet = ctx.pet || {};
  const t = ctx.tutor || {};
  const vet = ctx.vet || {};
  const cl = ctx.clinica || {};
  const agora = ctx.data instanceof Date && !isNaN(ctx.data.getTime()) ? ctx.data : new Date();
  const vac = ctx.vacinas || {};
  const prof = tituloENome(vet);

  return {
    // --- Animal ---
    ANIMAL_NOME: pet.name || "",
    ANIMAL_FICHA: pet.codigo != null ? String(pet.codigo) : "",
    ANIMAL_SEXO: sexoLabel(pet.gender),
    ANIMAL_ESTERILIZACAO: esterilizacaoLabel(pet.sterilization),
    ANIMAL_IDADE: calcIdade(pet.birthDate),
    ANIMAL_NASCIMENTO: fmtData(pet.birthDate),
    ANIMAL_ANIVERSARIO: fmtDiaMes(pet.birthDate),
    ANIMAL_MICROCHIP: pet.microchip || "",
    ANIMAL_PELAGEM: pet.coatColor || "",
    ANIMAL_ESPECIE: especieLabel(pet.species),
    ANIMAL_RACA: pet.breed || "",
    ANIMAL_PESO: pesoLabel(pet.weight ?? pet.pesoAtual), // /api/pets/:id devolve o peso como `pesoAtual`
    ANIMAL_VACINAS_APLICADAS: vac.aplicadas || "",
    ANIMAL_VACINAS_APLICADAS_RESUMO: vac.aplicadasResumo || "",
    ANIMAL_VACINAS_PROGRAMADAS: vac.programadas || "",

    // --- Responsável (tutor) ---
    RESPONSAVEL_NOME: t.name || "",
    RESPONSAVEL_PRIMEIRONOME: primeiroNome(t.name),
    RESPONSAVEL_FICHA: t.codigo != null ? String(t.codigo) : "",
    RESPONSAVEL_ENDERECO: enderecoTutor(t),
    RESPONSAVEL_CIDADE: t.city || "",
    RESPONSAVEL_ESTADO: t.state || "",
    RESPONSAVEL_CEP: t.cep || "",
    RESPONSAVEL_RG: t.rg || "",
    RESPONSAVEL_CPF: t.cpf || "",
    RESPONSAVEL_DOCUMENTOS: [t.cpf ? `CPF ${t.cpf}` : "", t.rg ? `RG ${t.rg}` : ""].filter(Boolean).join(" · "),
    RESPONSAVEL_TELEFONE: telefonePrincipal(t),
    RESPONSAVEL_EMAIL: t.email || "",
    RESPONSAVEL_LISTA_ANIMAIS: Array.isArray(t.pets) ? t.pets.map((p: any) => p?.name).filter(Boolean).join(", ") : "",

    // --- Clínica ---
    CLINICA_NOME: cl.nomeFantasia || cl.nome || "",
    CLINICA_RAZAOSOCIAL: cl.razaoSocial || "",
    CLINICA_CNPJ: cl.cnpj || "",
    CLINICA_ENDERECO: enderecoClinica(cl),
    CLINICA_CIDADE: cl.cidade || "",
    CLINICA_ESTADO: cl.uf || "",
    CLINICA_EMAIL: cl.email || "",
    CLINICA_SITE: cl.site || "",
    CLINICA_TELEFONE: cl.telefone || "",
    CLINICA_TELEFONE2: cl.whatsapp || "",
    CLINICA_TELEFONE3: "",
    CLINICA_RESPONSAVEL: cl.responsavel || cl.responsavelTecnico || "",
    CLINICA_HORARIO: cl.horario || cl.horarioFuncionamento || "",

    // --- Geral ---
    GERAL_DATA: fmtDataLocal(agora),
    GERAL_DATA_EXT: fmtDataExtensoLocal(agora),
    GERAL_ANO: String(agora.getFullYear()),

    // --- Usuário / profissional ---
    USUARIO_NOMEPUBLICO: prof.nome,
    USUARIO_TRATAMENTO: prof.titulo,
    USUARIO_CELULAR: vet.telefone || vet.celular || "",
    USUARIO_CRMV: vet.crmv || "",
    USUARIO_MAPA: vet.mapa || "",
    USUARIO_CARGO: vet.cargo || vet.especialidade || "",
    USUARIO_ASSINATURA: "", // assinatura manual — deixa em branco
    USUARIO_NUMERACAO_SEQUENCIAL: "",
  };
}

/**
 * Formata os protocolos de vacina de um pet (retorno de /api/protocolos?petId=)
 * nas 3 variáveis de vacina. Passe o resultado em ctx.vacinas.
 *  - aplicadas: lista das doses já aplicadas (nome — data · lote), uma por linha
 *  - aplicadasResumo: nomes das vacinas aplicadas, separados por vírgula
 *  - programadas: doses pendentes com a data prevista, uma por linha
 */
export function formatarVacinas(protocolos: any[]): {
  aplicadas: string;
  aplicadasResumo: string;
  programadas: string;
} {
  const vacs = (protocolos || []).filter((p) => String(p?.tipo || "").toUpperCase() === "VACINA");
  const aplic: { label: string; key: number }[] = [];
  const prog: { label: string; key: number }[] = [];
  const resumo: string[] = [];
  for (const p of vacs) {
    const nome = p?.nomeProtocolo || p?.template?.nome || "Vacina";
    const doses = Array.isArray(p?.doses) ? p.doses : [];
    const multi = doses.length > 1;
    for (const d of doses) {
      const st = String(d?.status || "").toUpperCase();
      const rotulo = multi ? `${nome} (dose ${d?.numero ?? "?"})` : nome;
      if (st === "APLICADA") {
        const dt = fmtData(d?.dataAplicada || d?.dataPrevista);
        aplic.push({
          label: `• ${rotulo}${dt ? ` — ${dt}` : ""}${d?.lote ? ` · lote ${d.lote}` : ""}`,
          key: toDate(d?.dataAplicada || d?.dataPrevista)?.getTime() || 0,
        });
        if (!resumo.includes(nome)) resumo.push(nome);
      } else if (st === "PENDENTE" || st === "SEM_RESPOSTA") {
        const dt = fmtData(d?.dataPrevista);
        prog.push({
          label: `• ${rotulo}${dt ? ` — prevista ${dt}` : ""}`,
          key: toDate(d?.dataPrevista)?.getTime() || 0,
        });
      }
    }
  }
  aplic.sort((a, b) => a.key - b.key);
  prog.sort((a, b) => a.key - b.key);
  return {
    aplicadas: aplic.map((x) => x.label).join("\n"),
    aplicadasResumo: resumo.join(", "),
    programadas: prog.map((x) => x.label).join("\n"),
  };
}

function escapeHtml(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** true se o texto parece HTML (tem tags) — documentos ricos guardam HTML. */
export function ehHtmlDoc(s: string): boolean {
  return /<[a-z/!][^>]*>/i.test(s || "");
}

/** Reduz um documento (HTML ou texto) a uma linha de texto puro — para resumos/timeline. */
export function documentoResumo(s: string): string {
  if (!s) return "";
  if (!ehHtmlDoc(s)) return s;
  return s
    .replace(/<(br|\/p|\/div|\/li|\/tr)[^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Substitui todas as variáveis @GRUPO_CAMPO@ do texto pelos valores do contexto.
 * Variáveis desconhecidas são mantidas intactas.
 * opts.htmlSafe = true → escapa os valores e troca quebras de linha por <br>
 * (use quando o texto do modelo é HTML, pra um valor com "&"/"<" não quebrar).
 */
export function preencherVariaveis(texto: string, ctx: VarContext, opts?: { htmlSafe?: boolean }): string {
  if (!texto) return texto || "";
  const mapa = construirMapa(ctx);
  const htmlSafe = !!opts?.htmlSafe;
  return texto.replace(/@([A-Z0-9_]+)@/gi, (original, chave) => {
    const k = String(chave).toUpperCase();
    if (!Object.prototype.hasOwnProperty.call(mapa, k)) return original;
    const v = mapa[k];
    return htmlSafe ? escapeHtml(v).replace(/\n/g, "<br>") : v;
  });
}

// Catálogo de variáveis por categoria (rótulo amigável → código), pro painel clicável.
export const CATALOGO_VARIAVEIS: { grupo: string; itens: { rotulo: string; codigo: string }[] }[] = [
  { grupo: "Animal", itens: [
    { rotulo: "Nome", codigo: "ANIMAL_NOME" }, { rotulo: "Ficha", codigo: "ANIMAL_FICHA" },
    { rotulo: "Sexo", codigo: "ANIMAL_SEXO" }, { rotulo: "Castração", codigo: "ANIMAL_ESTERILIZACAO" },
    { rotulo: "Idade", codigo: "ANIMAL_IDADE" }, { rotulo: "Nascimento", codigo: "ANIMAL_NASCIMENTO" },
    { rotulo: "Aniversário", codigo: "ANIMAL_ANIVERSARIO" }, { rotulo: "Microchip", codigo: "ANIMAL_MICROCHIP" },
    { rotulo: "Pelagem", codigo: "ANIMAL_PELAGEM" }, { rotulo: "Espécie", codigo: "ANIMAL_ESPECIE" },
    { rotulo: "Raça", codigo: "ANIMAL_RACA" }, { rotulo: "Peso", codigo: "ANIMAL_PESO" },
    { rotulo: "Vacinas aplicadas", codigo: "ANIMAL_VACINAS_APLICADAS" },
    { rotulo: "Vacinas (resumo)", codigo: "ANIMAL_VACINAS_APLICADAS_RESUMO" },
    { rotulo: "Vacinas programadas", codigo: "ANIMAL_VACINAS_PROGRAMADAS" },
  ]},
  { grupo: "Responsável", itens: [
    { rotulo: "Nome", codigo: "RESPONSAVEL_NOME" }, { rotulo: "1º nome", codigo: "RESPONSAVEL_PRIMEIRONOME" },
    { rotulo: "Ficha", codigo: "RESPONSAVEL_FICHA" }, { rotulo: "Endereço", codigo: "RESPONSAVEL_ENDERECO" },
    { rotulo: "Cidade", codigo: "RESPONSAVEL_CIDADE" }, { rotulo: "Estado", codigo: "RESPONSAVEL_ESTADO" },
    { rotulo: "CEP", codigo: "RESPONSAVEL_CEP" }, { rotulo: "RG", codigo: "RESPONSAVEL_RG" },
    { rotulo: "CPF", codigo: "RESPONSAVEL_CPF" }, { rotulo: "Documentos", codigo: "RESPONSAVEL_DOCUMENTOS" },
    { rotulo: "Telefone", codigo: "RESPONSAVEL_TELEFONE" }, { rotulo: "E-mail", codigo: "RESPONSAVEL_EMAIL" },
  ]},
  { grupo: "Clínica", itens: [
    { rotulo: "Nome", codigo: "CLINICA_NOME" }, { rotulo: "Razão social", codigo: "CLINICA_RAZAOSOCIAL" },
    { rotulo: "CNPJ", codigo: "CLINICA_CNPJ" }, { rotulo: "Endereço", codigo: "CLINICA_ENDERECO" },
    { rotulo: "Cidade", codigo: "CLINICA_CIDADE" }, { rotulo: "Estado", codigo: "CLINICA_ESTADO" },
    { rotulo: "E-mail", codigo: "CLINICA_EMAIL" }, { rotulo: "Site", codigo: "CLINICA_SITE" },
    { rotulo: "Telefone", codigo: "CLINICA_TELEFONE" }, { rotulo: "WhatsApp", codigo: "CLINICA_TELEFONE2" },
  ]},
  { grupo: "Geral", itens: [
    { rotulo: "Data", codigo: "GERAL_DATA" }, { rotulo: "Data por extenso", codigo: "GERAL_DATA_EXT" },
    { rotulo: "Ano", codigo: "GERAL_ANO" },
  ]},
  { grupo: "Usuário", itens: [
    { rotulo: "Nome público", codigo: "USUARIO_NOMEPUBLICO" }, { rotulo: "Tratamento (Dr./Dra.)", codigo: "USUARIO_TRATAMENTO" },
    { rotulo: "CRMV", codigo: "USUARIO_CRMV" }, { rotulo: "Cargo", codigo: "USUARIO_CARGO" },
    { rotulo: "Celular", codigo: "USUARIO_CELULAR" },
  ]},
];

// Dados de exemplo pra pré-visualização dos modelos (pet "Garfield" fictício).
export const CTX_EXEMPLO: VarContext = {
  pet: { name: "Garfield", codigo: 123, species: "FELINE", breed: "Exótico", gender: "MALE", sterilization: "STERILIZED", birthDate: "2021-03-14T00:00:00.000Z", coatColor: "Amarelo-ouro", weight: 6, microchip: "12345678901234" },
  tutor: { name: "João da Silva", codigo: 123, rg: "2001234567", cpf: "123.456.789-90", address: "Rua das Pedrinhas", addressNumber: "5", neighborhood: "Sapiranga", city: "Fortaleza", state: "CE", cep: "60833-175", email: "joao@email.com", contacts: [{ number: "(85) 98888-1234", isPrimary: true }] },
  vet: { nomeExibicao: "Dra. Vivian Corrêa", crmv: "CRMV-CE 2076", especialidade: "Médica Veterinária" },
  clinica: { nomeFantasia: "Empório do Pet", razaoSocial: "Empório do Pet Comércio de Rações Ltda", cnpj: "13.310.475/0001-26", rua: "Av. Engenheiro Leal Lima Verde", numero: "205", bairro: "Sapiranga", cidade: "Fortaleza", uf: "CE", cep: "60833-175", email: "contato@emporiodopet.com.br", site: "emporiodopet.com.br", telefone: "(85) 3038-7887", whatsapp: "(85) 98890-7786" },
  vacinas: { aplicadas: "• V4 — 10/02/2025\n• Antirrábica — 12/03/2025", aplicadasResumo: "V4, Antirrábica", programadas: "• V4 (reforço) — prevista 10/02/2026" },
};

/** true se o texto contém alguma variável @...@ (útil pra avisar antes de imprimir). */
export function temVariaveis(texto: string): boolean {
  return /@[A-Z0-9_]+@/i.test(texto || "");
}
