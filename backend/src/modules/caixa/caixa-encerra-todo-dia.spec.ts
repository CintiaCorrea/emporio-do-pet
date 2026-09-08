import * as fs from 'fs';
import * as path from 'path';

// 🛡️ O CAIXA ENCERRA TODO DIA À MEIA-NOITE — e isso não é configurável.
//
// A Cintia, em 08/09/2026: "os caixas DEVEM ser encerrados às 00:00 TODOS OS DIAS. Eles não
// devem permanecer abertos."
//
// O fechamento automático já existia, mas atrás do interruptor `fecharCaixaMeiaNoite` da
// Configuração de Vendas — desligado. Nada fechava, e caixa aberto atravessando o dia é a
// origem da confusão toda: a tela lista o caixa do DIA, o caixa esquecido de ontem some dela,
// e a pessoa acha que não tem caixa (ou abre um segundo).
//
// Nenhuma dessas duas coisas quebra o build. Por isso a trava lê o arquivo.

const arq = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');
// Sem os comentarios: o texto que EXPLICA o interruptor que morreu nao pode reprovar o arquivo.
const codigo = (p: string) =>
  arq(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('o encerramento da meia-noite é regra, não opção', () => {
  const src = codigo('caixa-fechamento.scheduler.ts');

  it('não depende mais de nenhum interruptor da configuração', () => {
    expect(src).not.toContain('fecharCaixaMeiaNoite');
    expect(src).not.toContain('configvendas');
  });

  it('roda à meia-noite, no fuso da casa', () => {
    expect(src).toContain("@Cron('0 0 * * *', { timeZone: 'America/Fortaleza' })");
  });

  it('fecha TODOS os caixas abertos, não só os de hoje', () => {
    // Sem isso, um caixa esquecido em agosto ficaria aberto para sempre.
    expect(src).toContain("where: { status: 'ABERTO' }");
  });

  it('o caixa fechado sozinho diz que não teve conferência de gaveta', () => {
    // Fechar sem contar o dinheiro é aceitável; fechar sem AVISAR que não se contou, não.
    expect(src).toMatch(/Encerrado automaticamente.*sem confer/i);
  });

  it('o scheduler continua ligado no módulo do caixa', () => {
    expect(arq('caixa.module.ts')).toContain('CaixaFechamentoScheduler');
  });
});
