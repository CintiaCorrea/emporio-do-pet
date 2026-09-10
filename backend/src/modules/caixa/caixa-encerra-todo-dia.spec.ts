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

// 🛡️ A TRAVA "UM CAIXA POR PESSOA" É DO DIA — não da vida inteira.
//
// A Cintia, 09/09/2026: "as recepcionistas continuam tendo problema para abrir dois caixas
// simultaneamente (...) e não estão conseguindo dar baixa."
//
// A causa era esta trava, que eu escrevi em 08/09 olhando os caixas abertos de QUALQUER dia. A
// Maria Gabriela tinha um caixa aberto desde 04/09; ao clicar em "Abrir caixa" hoje, ela
// recebia aquele de volta em vez de um novo — e a tela, que lista o caixa do DIA, não mostrava
// nenhum. Ela ficava sem caixa para sempre e não conseguia receber.
describe('abrir caixa: a trava do duplicado olha só o dia de hoje', () => {
  const src = codigo('caixa.service.ts');

  it('a consulta dos abertos é limitada ao dia da casa', () => {
    expect(src).toContain('const { ini, fim } = faixaDoDia();');
    expect(src).toMatch(/status: 'ABERTO', abertura: \{ gte: ini, lte: fim \}/);
  });

  it('não existe mais consulta de abertos sem recorte de dia dentro do abrir()', () => {
    // A linha antiga (`where: { status: 'ABERTO' }` solta) continua valendo no RECEBIMENTO,
    // onde faz sentido: lá a pergunta é "qual caixa é o meu", e um caixa de ontem ainda é meu.
    // Aqui, em abrir(), ela criava o beco sem saída.
    const trecho = src.slice(src.indexOf('async abrir('), src.indexOf('async fechar('));
    expect(trecho).toContain('abertura: { gte: ini, lte: fim }');
  });
});
