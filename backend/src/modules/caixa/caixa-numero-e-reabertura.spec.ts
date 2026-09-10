import * as fs from 'fs';
import * as path from 'path';

// 🛡️ DUAS DECISÕES DE 10/09/2026, ambas nascidas do mesmo dia de investigação.
//
// A Cintia: "as baixas estão indo para o caixa de hoje mesmo o caixa da Gabriela estando
// aberto." Ao ler o banco para responder, dois defeitos apareceram de lambuja:
//
//   1. Havia DOIS caixas nº 11. O número era `count + 1`, e nove caixas zerados tinham sido
//      apagados no dia anterior — a contagem voltou atrás e reentregou números já usados.
//   2. Caixas ABERTOS carregavam por dentro a frase "Encerrado automaticamente à meia-noite",
//      porque `reabrir` limpava a data do fechamento e deixava a observação. Foi essa
//      contradição que me fez suspeitar, por horas, que o cron da meia-noite tinha parado de
//      rodar. Ele não tinha: os caixas de 01 a 04/09 haviam sido REABERTOS para lançar baixas
//      atrasadas. Dado que se contradiz custa mais caro do que dado que falta.
//
// Nenhuma das duas quebra o build. Por isso a trava lê o arquivo.

const codigo = (p: string) =>
  fs.readFileSync(path.resolve(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('número de caixa é identidade — nunca se repete', () => {
  const src = codigo('caixa.service.ts');

  it('o próximo número vem do maior já usado, não da contagem de linhas', () => {
    expect(src).toContain('numeroDoProximoCaixa(');
    expect(src).not.toMatch(/numero:\s*count\s*\+\s*1/);
  });

  it('a regra mora no núcleo, com teste próprio', () => {
    expect(codigo('caixa.regras.ts')).toContain('export function numeroDoProximoCaixa');
    expect(fs.existsSync(path.resolve(__dirname, 'numeroDoCaixa.spec.ts'))).toBe(true);
  });
});

describe('reabrir desfaz o fechamento inteiro', () => {
  const src = codigo('caixa.service.ts');
  const corpo = src.slice(src.indexOf('async reabrir('), src.indexOf('async reabrir(') + 500);

  it('limpa a observação — caixa aberto não pode dizer que foi encerrado', () => {
    expect(corpo).toContain('obsFechamento: null');
  });

  it('limpa a conferência de gaveta do fechamento desfeito', () => {
    expect(corpo).toContain('valorContado: null');
    expect(corpo).toContain('diferenca: null');
  });

  it('e continua zerando a data e devolvendo o caixa a ABERTO', () => {
    expect(corpo).toContain("status: 'ABERTO'");
    expect(corpo).toContain('fechamento: null');
  });
});
