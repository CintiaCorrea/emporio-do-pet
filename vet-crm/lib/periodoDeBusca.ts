// O PERÍODO DA CONSULTA — núcleo puro, com os atalhos que a Cintia pediu.
//
// Ela, em 08/09/2026, lendo a tela de Movimento de caixa do SimplesVet: o botão de data abre
// "Hoje, Ontem, Últimos 7 dias, Este mês, Mês anterior, Selecionar período", e o navegador de
// dia (❮ Dia anterior · data · Próximo dia ❯) "some quando o filtro é um período".
//
// Conta de data é onde erro passa despercebido: "este mês" no dia 1º, "mês anterior" em março
// (que aponta para fevereiro, de 28 ou 29 dias), e o fuso — o dia da casa é o de Fortaleza
// (UTC−3), não o do servidor. Por isso mora aqui, com teste, e não espalhado pela tela.

export type ChaveDePreset = 'HOJE' | 'ONTEM' | 'D7' | 'MES' | 'MES_ANTERIOR' | 'PERSONALIZADO';

export type Faixa = { de: string; ate: string };

export const PRESETS: { chave: ChaveDePreset; rotulo: string }[] = [
  { chave: 'HOJE', rotulo: 'Hoje' },
  { chave: 'ONTEM', rotulo: 'Ontem' },
  { chave: 'D7', rotulo: 'Últimos 7 dias' },
  { chave: 'MES', rotulo: 'Este mês' },
  { chave: 'MES_ANTERIOR', rotulo: 'Mês anterior' },
  { chave: 'PERSONALIZADO', rotulo: 'Escolher período' },
];

const FUSO_CASA = 'America/Fortaleza';

/** O dia de hoje NA CASA (AAAA-MM-DD). Às 22h em Fortaleza o servidor em UTC já virou o dia. */
export function hojeNaCasa(agora: Date = new Date()): string {
  return agora.toLocaleDateString('en-CA', { timeZone: FUSO_CASA });
}

const partes = (dia: string) => dia.split('-').map(Number) as [number, number, number];
const monta = (a: number, m: number, d: number) =>
  `${a}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Soma dias a uma data AAAA-MM-DD sem passar por fuso nenhum (UTC puro, só aritmética). */
export function somarDias(dia: string, n: number): string {
  const [a, m, d] = partes(dia);
  const t = new Date(Date.UTC(a, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  return monta(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
}

/** O último dia do mês de uma data — 28, 29, 30 ou 31, sem tabela decorada. */
export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/**
 * A faixa de um atalho. `PERSONALIZADO` devolve a faixa que já estava — quem escolhe é a pessoa.
 */
export function faixaDoPreset(chave: ChaveDePreset, hoje: string = hojeNaCasa(), atual?: Faixa): Faixa {
  const [a, m] = partes(hoje);
  switch (chave) {
    case 'HOJE': return { de: hoje, ate: hoje };
    case 'ONTEM': { const o = somarDias(hoje, -1); return { de: o, ate: o }; }
    // 7 dias CONTANDO HOJE: de segunda a domingo dá uma semana, não oito dias.
    case 'D7': return { de: somarDias(hoje, -6), ate: hoje };
    case 'MES': return { de: monta(a, m, 1), ate: monta(a, m, ultimoDiaDoMes(a, m)) };
    case 'MES_ANTERIOR': {
      const ant = m === 1 ? { a: a - 1, m: 12 } : { a, m: m - 1 };
      return { de: monta(ant.a, ant.m, 1), ate: monta(ant.a, ant.m, ultimoDiaDoMes(ant.a, ant.m)) };
    }
    default: return atual || { de: hoje, ate: hoje };
  }
}

/** O atalho que corresponde a uma faixa, se houver — para o botão mostrar "Hoje" em vez da data. */
export function presetDaFaixa(f: Faixa, hoje: string = hojeNaCasa()): ChaveDePreset {
  for (const p of PRESETS) {
    if (p.chave === 'PERSONALIZADO') continue;
    const r = faixaDoPreset(p.chave, hoje);
    if (r.de === f.de && r.ate === f.ate) return p.chave;
  }
  return 'PERSONALIZADO';
}

const br = (dia: string) => (dia ? dia.split('-').reverse().join('/') : '');

/**
 * O rótulo do botão de período. Um dia só mostra a data; o resto mostra "de … até …" — e o
 * atalho vence quando bate, porque "Hoje" se lê mais rápido que "08/09/2026".
 */
export function rotuloDoPeriodo(f: Faixa, hoje: string = hojeNaCasa()): string {
  const p = presetDaFaixa(f, hoje);
  if (p !== 'PERSONALIZADO') return PRESETS.find((x) => x.chave === p)!.rotulo;
  if (f.de === f.ate) return br(f.de);
  return `${br(f.de)} até ${br(f.ate)}`;
}

/** O navegador de dia só existe quando o período é UM dia — foi assim que ela descreveu. */
export function ehDiaUnico(f: Faixa): boolean {
  return !!f.de && f.de === f.ate;
}

/** Ordena a faixa: quem escolhe "de" depois de "até" não deveria receber lista vazia. */
export function ordenar(f: Faixa): Faixa {
  if (f.de && f.ate && f.de > f.ate) return { de: f.ate, ate: f.de };
  return f;
}
