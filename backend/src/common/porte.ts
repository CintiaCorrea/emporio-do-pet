// NUCLEO UNICO do PRECO POR PORTE — "quanto custa este item para um animal deste peso?"
//
// Espelho de vet-crm/lib/porte.ts. Mudou la, muda aqui — e vice-versa.
// O backend e quem DECIDE: a tela sugere o preco, o servidor confere antes de gravar.
//
// POR QUE ISTO EXISTE. Hoje cada faixa de peso e um ITEM SEPARADO no catalogo: "ACEPRAN -
// 11 A 20 KG", "ACEPRAN ATE 10KG", e assim por diante. Sao 93 cadastros que deveriam ser 30.
// A recepcao digita "acepran", vem cinco linhas quase iguais, e ela escolhe pelo NOME em vez
// de pelo peso do animal — que e como se erra a cobranca sem ninguem perceber.
//
// O recurso junta os cinco num item so, com um preco por faixa, e o peso do pet escolhe.
//
// AS FAIXAS NAO SAO FIXAS, e essa foi a descoberta que mudou o desenho (05/09/2026). A Cintia
// fechou cinco faixas (Pequeno/Medio/Grande/GG/Extra GG), mas o catalogo REAL nao cabe nelas:
//
//     CERENIA         7 faixas (11-15, 16-20, 21-25, 26-30 separadas)
//     TARTARECTOMIA   ate 5 kg e ate 10 kg
//     FLUIDOTERAPIA   comeca em 10 kg, nao tem "ate 10" nem "acima de 40"
//     ANESTESIA       so P e M
//
// Forcar as cinco obrigaria a RE-PRECIFICAR esses itens — decisao de dinheiro que nao cabe a
// um programador tomar. Entao: as cinco sao o PADRAO que aparece preenchido, e cada item pode
// ter as suas. Quem cadastra nao decide nada na maioria dos casos, e quem precisa, consegue.

export type FaixaPorte = {
  /** Limite superior em kg, INCLUSIVE. `null` = a ultima faixa, sem teto ("acima de..."). */
  ate: number | null;
  /** Nome que a recepcao le: "Pequeno", "Medio", "11 a 15 kg"... */
  rotulo: string;
  /** Preco de venda nesta faixa. `null` = nao vendemos este item para este porte. */
  preco: number | null;
  /** Custo nesta faixa. Um cao de 40 kg gasta mais mL que um de 8 — sem isto a margem sai errada. */
  custo?: number | null;
};

/**
 * As cinco faixas fechadas pela Cintia em 04/09/2026.
 *
 * Ela escreveu "0 a 10 / 11 a 20 / 21 a 30 / 31 a 40 / acima de 40". Os limites foram
 * ENCOSTADOS porque o peso tem decimal: escrito ao pe da letra, um cao de 10,5 kg nao cairia
 * em faixa nenhuma. 10,0 e Pequeno; 10,1 ja e Medio.
 *
 * Gato NAO tem preco proprio — entra na faixa pelo peso, como os caes (confirmado em 04/09).
 */
export const FAIXAS_PADRAO: FaixaPorte[] = [
  { ate: 10, rotulo: 'Pequeno', preco: null },
  { ate: 20, rotulo: 'Médio', preco: null },
  { ate: 30, rotulo: 'Grande', preco: null },
  { ate: 40, rotulo: 'GG', preco: null },
  { ate: null, rotulo: 'Extra GG', preco: null },
];

/** Como a faixa aparece escrita pra quem cadastra e pra quem vende. */
export function rotuloDaFaixa(f: FaixaPorte, anterior?: FaixaPorte): string {
  const de = anterior?.ate ?? null;
  const kg = (n: number) => String(n).replace('.', ',');
  if (f.ate == null) return de == null ? f.rotulo : `${f.rotulo} · acima de ${kg(de)} kg`;
  if (de == null) return `${f.rotulo} · até ${kg(f.ate)} kg`;
  return `${f.rotulo} · ${kg(de)} a ${kg(f.ate)} kg`;
}

/** Ordena as faixas e joga a sem-teto pro fim — de onde ela nunca pode sair. */
export function ordenarFaixas(faixas: FaixaPorte[]): FaixaPorte[] {
  return [...(faixas || [])].sort((a, b) => {
    if (a.ate == null) return 1;
    if (b.ate == null) return -1;
    return a.ate - b.ate;
  });
}

/** Le as faixas gravadas no item (JSON). Qualquer defeito devolve lista vazia — nunca quebra. */
export function lerFaixas(json?: string | null): FaixaPorte[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (!Array.isArray(v)) return [];
    return ordenarFaixas(
      v
        .filter((f: any) => f && typeof f === 'object')
        .map((f: any) => ({
          ate: f.ate == null || f.ate === '' ? null : Number(f.ate),
          rotulo: String(f.rotulo || '').trim() || '—',
          preco: f.preco == null || f.preco === '' ? null : Number(f.preco),
          custo: f.custo == null || f.custo === '' ? null : Number(f.custo),
        }))
        .filter((f: FaixaPorte) => f.ate == null || Number.isFinite(f.ate)),
    );
  } catch {
    return [];
  }
}

/** Qual faixa cobre este peso? `null` quando nao ha faixa (ou o peso nao serve). */
export function faixaDoPeso(pesoKg: number | null | undefined, faixas: FaixaPorte[]): FaixaPorte | null {
  const kg = Number(pesoKg);
  if (!Number.isFinite(kg) || kg <= 0) return null;
  const ord = ordenarFaixas(faixas);
  for (const f of ord) {
    if (f.ate == null || kg <= f.ate) return f;
  }
  return null;
}

export type PrecoPorPorte = {
  /** O preco a usar. `null` quando nao da pra decidir sozinho. */
  preco: number | null;
  custo: number | null;
  faixa: FaixaPorte | null;
  /** Por que nao deu certo — texto pra mostrar na tela, ja em portugues de gente. */
  aviso: string | null;
  /** A pessoa precisa escolher a faixa na mao? */
  precisaEscolher: boolean;
};

/**
 * O preco deste item para este animal.
 *
 * As tres respostas possiveis, e a regra de cada uma:
 *
 *   1. Item sem faixas          -> preco unico, como sempre foi. A maioria dos itens.
 *   2. Peso faltando ou absurdo -> NAO trava a venda: pede pra escolher a faixa na mao.
 *      Barrar venda por dado faltando foi o erro do cartao em 04-05/09 — nao repetir.
 *   3. Faixa existe mas sem preco -> avisa que nao vendemos para esse porte, em vez de
 *      inventar o preco do vizinho. Preco inventado vira prejuizo silencioso.
 */
export function precoPorPorte(
  item: { preco?: number | null; custo?: number | null; faixas?: FaixaPorte[] | null },
  pesoKg: number | null | undefined,
): PrecoPorPorte {
  const faixas = ordenarFaixas(item?.faixas || []);
  if (faixas.length === 0) {
    return {
      preco: item?.preco ?? null,
      custo: item?.custo ?? null,
      faixa: null,
      aviso: null,
      precisaEscolher: false,
    };
  }
  const f = faixaDoPeso(pesoKg, faixas);
  if (!f) {
    return {
      preco: null, custo: null, faixa: null,
      aviso: 'Este item tem preço por porte e o peso do animal não está no cadastro. Escolha a faixa.',
      precisaEscolher: true,
    };
  }
  if (f.preco == null) {
    return {
      preco: null, custo: null, faixa: f,
      aviso: `Este item não tem preço para o porte ${f.rotulo}.`,
      precisaEscolher: true,
    };
  }
  return { preco: f.preco, custo: f.custo ?? null, faixa: f, aviso: null, precisaEscolher: false };
}

/** As faixas estao coerentes pra gravar? Devolve o problema, ou null quando esta tudo certo. */
export function erroDasFaixas(faixas: FaixaPorte[]): string | null {
  const f = ordenarFaixas(faixas);
  if (f.length === 0) return 'Marque ao menos uma faixa de peso ou desligue o preço por porte.';
  const semTeto = f.filter((x) => x.ate == null);
  if (semTeto.length > 1) return 'Só a última faixa pode ficar sem limite de peso.';
  if (semTeto.length === 0) return 'A última faixa precisa ficar sem limite — senão um animal muito pesado não cai em faixa nenhuma.';
  for (let i = 0; i < f.length - 1; i++) {
    const a = f[i], b = f[i + 1];
    if (a.ate != null && a.ate <= 0) return `A faixa "${a.rotulo}" precisa de um limite de peso maior que zero.`;
    if (a.ate != null && b.ate != null && a.ate === b.ate) return `Duas faixas terminam em ${a.ate} kg. Cada faixa precisa de um limite diferente.`;
  }
  if (f.every((x) => x.preco == null)) return 'Preencha ao menos um preço.';
  return null;
}
