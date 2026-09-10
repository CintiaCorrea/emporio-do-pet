// NÚCLEO ÚNICO — "em QUAL dos meus caixas esta baixa entra?"
//
// O BUG QUE ISTO CONSERTA (Cintia, 10/09/2026): "as baixas estão indo para o caixa de hoje
// mesmo o caixa da Gabriela estando aberto."
//
// Os dados contaram a história inteira. A venda #1177 (Josiane · Cueia) é do dia 03/09, foi
// recebida no dia 10 às 16:33 — e foi gravada no caixa de 10/09. Não houve clique errado: a
// regra de então dizia, em uma linha, "se a pessoa tiver mais de um caixa aberto, vale o mais
// recente" (caixa.regras.escolherMeuCaixa), e o mais recente é sempre o de hoje. A Maria
// Gabriela estava com CINCO caixas abertos — os dias 01, 02, 03 e 04 tinham sido reabertos
// justamente para lançar as baixas atrasadas. Tudo caiu em hoje.
//
// A escolha não pode ser adivinhada, porque as duas respostas são legítimas: um recebimento
// atrasado que foi lançado hoje entra no caixa de hoje; um recebimento que ACONTECEU no dia 3
// e só está sendo registrado agora entra no caixa do dia 3. Quem sabe qual é o caso é quem
// está com o cliente na frente. Então o sistema para de decidir e passa a perguntar — mas só
// quando há de fato o que escolher.
import { diaNaClinicaISO, hojeNaClinicaISO } from "@/lib/datas";

export type CaixaAbertoRef = {
  id: string;
  numero: number;
  abertura: string;
};

export type OpcaoDeCaixa = {
  id: string;
  numero: number;
  /** Dia da clínica (AAAA-MM-DD) a que este caixa pertence. */
  dia: string;
  /** "nº 8 · 03/09" — o que aparece no botão. */
  rotulo: string;
  ehDeHoje: boolean;
  /** Este caixa é do mesmo dia da venda que está sendo recebida. */
  ehDoDiaDaVenda: boolean;
};

export type Escolha = {
  /** Meus caixas abertos, o mais recente primeiro. */
  opcoes: OpcaoDeCaixa[];
  /** Onde a baixa entra se ninguém tocar em nada. */
  sugeridoId: string | null;
  /** Só há o que perguntar quando existe mais de uma opção. */
  precisaEscolher: boolean;
  /**
   * Frase curta quando a venda é de outro dia E existe caixa meu naquele dia. É o único caso
   * em que o palpite do sistema tem chance real de estar errado, então é o único que fala.
   */
  aviso: string | null;
};

const ddmm = (dia: string) => {
  const [, m, d] = dia.split("-");
  return d && m ? `${d}/${m}` : dia;
};

const VAZIA: Escolha = { opcoes: [], sugeridoId: null, precisaEscolher: false, aviso: null };

/**
 * @param meusAbertos caixas ABERTOS da pessoa logada (de qualquer dia)
 * @param dataDaVenda data da venda que está sendo recebida — só serve para o aviso
 * @param hoje dia da clínica; injetável para o teste não depender do relógio da máquina
 */
export function escolhaDoCaixa(
  meusAbertos: CaixaAbertoRef[],
  dataDaVenda?: string | Date | null,
  hoje: string = hojeNaClinicaISO(),
): Escolha {
  const lista = (meusAbertos || []).filter((c) => c && c.id);
  if (!lista.length) return VAZIA;

  const diaDaVenda = dataDaVenda ? diaNaClinicaISO(dataDaVenda) : null;

  const opcoes: OpcaoDeCaixa[] = lista
    .map((c) => {
      const dia = diaNaClinicaISO(c.abertura);
      return {
        id: c.id,
        numero: Number(c.numero) || 0,
        dia,
        rotulo: `nº ${Number(c.numero) || 0} · ${dia === hoje ? "hoje" : ddmm(dia)}`,
        ehDeHoje: dia === hoje,
        ehDoDiaDaVenda: !!diaDaVenda && dia === diaDaVenda,
      };
    })
    .sort((a, b) => (a.dia < b.dia ? 1 : a.dia > b.dia ? -1 : b.numero - a.numero));

  // O SUGERIDO É SEMPRE O DE HOJE, mesmo quando a venda é de outro dia. O dinheiro que entra
  // agora é dinheiro de hoje — esse é o caso comum, e o caso comum não pode exigir atenção.
  // O caso incomum ganha o aviso logo abaixo, e um clique resolve.
  const deHoje = opcoes.find((o) => o.ehDeHoje);
  const sugeridoId = (deHoje || opcoes[0]).id;

  const doDiaDaVenda = opcoes.find((o) => o.ehDoDiaDaVenda);
  const aviso =
    doDiaDaVenda && doDiaDaVenda.id !== sugeridoId && diaDaVenda
      ? `Esta venda é de ${ddmm(diaDaVenda)} e você tem o caixa nº ${doDiaDaVenda.numero} aberto naquele dia.`
      : null;

  return { opcoes, sugeridoId, precisaEscolher: opcoes.length > 1, aviso };
}
