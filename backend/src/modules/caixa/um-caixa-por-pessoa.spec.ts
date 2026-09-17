import * as fs from 'fs';
import * as path from 'path';

// 🛡️ DOIS DEFEITOS QUE SE ALIMENTAVAM, encontrados em 11/09/2026.
//
// 1. TRÊS CAIXAS NO MESMO DIA. A trava "um caixa por pessoa" existia, mas só rodava quando o
//    campo de data ficava VAZIO (`if (!abertura)`). Escolhendo a data — mesmo escolhendo HOJE —
//    ela era pulada e nascia um caixa novo. Os três caixas de 11/09 tinham abertura às 12:00,
//    a marca de data digitada à mão: a prova de que passaram pelo desvio.
//    Cintia: "não posso ter 3 caixas no mesmo dia da mesma pessoa? Por que isso está
//    acontecendo?"
//
// 2. A BAIXA QUE NÃO ACONTECIA. Com vários caixas e nenhum "aberto na tela", registrarRecebimento
//    caía num `if (!detail || !vendaSel) return` — silencioso. O modal abria, a pessoa preenchia,
//    clicava em Confirmar e NADA acontecia. Nenhum recebimento foi gravado no sistema entre
//    10/09 15:00 e 11/09. Cintia: "o caixa não está conseguindo registrar a baixa de nenhuma venda."
//
// Nenhum dos dois quebra o build — por isso a trava lê o arquivo.

const arq = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

describe('um caixa por pessoa por dia', () => {
  it('a trava olha o DIA do caixa, não se a data foi digitada', () => {
    const src = arq('./caixa.service.ts');
    expect(src).toContain('const diaDoCaixa =');
    expect(src).toContain('if (diaDoCaixa === hojeNaCasa)');
    // O desvio antigo não pode voltar: `if (!abertura)` abraçando a trava era o bug.
    expect(src).not.toContain('if (!abertura) {\n      // ...MAS SO O CAIXA DE HOJE CONTA.');
  });

  it('dia PASSADO continua escapando — backfill é intencional', () => {
    const src = arq('./caixa.service.ts');
    expect(src).toContain('So\' dia PASSADO (backfill de verdade) escapa');
  });
});

describe('registrar recebimento nunca falha calado', () => {
  // Desde 16/09/2026 toda tela recebe venda pela GAVETA ÚNICA (vet-crm ReceberEmLoteModal); a gaveta
  // própria do Movimento de caixa saiu. O cuidado de 10-11/09 (um `return` mudo deixou o caixa 24h
  // sem registrar baixa) passa a valer para ela.
  const ler = (rel: string) => fs.readFileSync(path.resolve(__dirname, '../../../../vet-crm', rel), 'utf8');

  it('sem caixa aberto, a gaveta abre o caixa da pessoa ali mesmo em vez de desistir', () => {
    const src = ler('components/caixa/ReceberEmLoteModal.tsx');
    expect(src).toContain('if (!caixaAberto) { setAbrirCaixaMotivo(');
    expect(src).toContain('<AbrirMeuCaixaModal');
  });

  it('o Movimento de caixa não tem mais um caminho próprio que possa falhar calado', () => {
    const src = ler('app/(user)/dashboard/erp/caixa/page.tsx');
    expect(src).not.toContain("if (!detail || !vendaSel) return;");
    expect(src).toContain('<ReceberEmLoteModal');
  });
});
