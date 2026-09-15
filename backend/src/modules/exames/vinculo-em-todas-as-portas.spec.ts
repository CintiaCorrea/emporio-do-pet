import * as fs from 'fs';
import * as path from 'path';

// 🛡️ TODO CARD DE EXAME NASCE LIGADO AO ITEM DA VENDA.
//
// Sem o vínculo, a conta a pagar do laboratório volta a esperar o cliente pagar — o oposto do
// que a Cintia decidiu em 07/09/2026. Em 12/09 havia 43 cards soltos de 46.
//
// ─── A FORMA MUDOU EM 15/09/2026, E O PORQUÊ IMPORTA ───────────────────────────────────────
//
// Este teste nasceu vigiando DUAS portas — o PDV e a conversão de orçamento —, porque uma
// ligava e a outra não. "Uma porta certa e outra errada é pior do que duas erradas, porque
// ninguém percebe", dizia a versão original, e estava certo.
//
// Em 15/09 a Cintia relatou que exames vendidos não viravam card (13 vendidos, 1 card em 10
// dias): editar uma comanda, a comanda da ficha e o atendimento gravavam o item e não avisavam
// ninguém. A resposta foi parar de contar portas e criar um PONTO ÚNICO — quem grava item emite
// um evento, e o módulo de exames escuta.
//
// Aí veio o efeito colateral, no mesmo dia: as portas antigas continuaram criando, e o quadro
// encheu de card duplicado. "Os cards dos exames estão sendo duplicados", com print. O conserto
// foi remover os criadores antigos.
//
// Então o que este arquivo vigia mudou de "toda porta liga" para "existe UMA porta, e ela liga".
// A intenção é a mesma; o que muda é que agora há um lugar só para acertar — e um lugar só para
// errar.

const src = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

describe('vínculo exame ↔ item da venda', () => {
  describe('existe UM criador', () => {
    const antigas: { nome: string; caminho: string }[] = [
      { nome: 'PDV (venda direta)', caminho: '../caixa/caixa.service.ts' },
      { nome: 'conversão de orçamento', caminho: '../orcamentos/orcamentos.service.ts' },
    ];

    for (const p of antigas) {
      it(`${p.nome} NÃO cria card por conta própria`, () => {
        // Foi exatamente isto que duplicou em 15/09: o criador central entrou e estes ficaram.
        expect(src(p.caminho)).not.toContain('iniciarExamesDaVenda');
      });
    }

    it('quem cria é o ouvinte do evento', () => {
      const s = src('exames.service.ts');
      expect(s).toContain("@OnEvent('venda.itens.gravados')");
      expect(s).toContain('async garantirCardsDaVenda(');
    });

    it('e quem grava item de venda EMITE o evento', () => {
      // Se a emissão sumir, nenhum card nasce — e o defeito volta calado, que é como ele veio.
      expect(src('../appointments/appointments.service.ts')).toContain("emit('venda.itens.gravados'");
    });
  });

  describe('e ele liga o card ao item', () => {
    it('pelo ID do item, não por casar nome', () => {
      // Casar por nome erra em cliente com dois exames iguais na mesma comanda. O ponto único
      // tem o id na mão porque lê os itens já gravados.
      const s = src('exames.service.ts');
      expect(s).toContain('appointmentItemId: i.id');
    });

    it('e RELIGA o que perdeu o vínculo, consumindo cada card órfão uma vez só', () => {
      // A sutileza que se perde numa segunda escrita — e que importa quando a comanda editada
      // recria todos os itens com ids novos.
      const s = src('exames.service.ts');
      expect(s).toContain('orfaos.splice(i, 1)');
    });
  });

  it('o núcleo do casamento por nome continua existindo, para a internação', () => {
    // A internação não passa por appointmentItem, então tem porta própria e ainda precisa dele.
    const nucleo = src('vincular-item-da-venda.ts');
    expect(nucleo).toContain('export function ligarAoItemDaVenda');
  });
});
