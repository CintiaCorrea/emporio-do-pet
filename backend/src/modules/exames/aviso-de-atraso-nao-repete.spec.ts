import * as fs from 'fs';
import * as path from 'path';

// 🛡️ O AVISO DE ATRASO NÃO PODE VIRAR O QUE ELA MANDOU PARAR.
//
// Cintia, 12/09/2026, sobre o lembrete: "NÃO É PARA REPETIR SE O EXAME ESTIVER EM OUTRA COLUNA".
// O aviso de atraso nasceu no mesmo dia, e é fácil ele virar a mesma praga: um cron diário que
// toca pelo mesmo laudo todo dia até alguém resolver.
//
// A trava é `atrasoAvisadoEm`, gravado no card na primeira vez. O exame continua vermelho no
// quadro — a cor não incomoda, a mensagem incomoda.

const src = fs.readFileSync(path.resolve(__dirname, 'exames.service.ts'), 'utf8');
const corpo = src.slice(src.indexOf('async avisarAtrasosDoLaboratorio('), src.indexOf('async lembrarRecepcaoDaSolicitacao('));
const cron = fs.readFileSync(path.resolve(__dirname, 'exames.scheduler.ts'), 'utf8');

describe('aviso de atraso', () => {
  it('pula o exame que já foi avisado', () => {
    expect(corpo).toContain('if (d.atrasoAvisadoEm) continue;');
  });

  it('grava a marca DEPOIS de avisar, não antes', () => {
    // Se gravasse antes e a notificação falhasse, o aviso se perderia calado — e "calado" é o
    // pior defeito de um alerta.
    const posAviso = corpo.indexOf('notification.createMany');
    const posMarca = corpo.indexOf('atrasoAvisadoEm: agora');
    expect(posAviso).toBeGreaterThan(0);
    expect(posMarca).toBeGreaterThan(posAviso);
  });

  it('vai para os veterinários — e não só para o responsável', () => {
    // "mesmo que o veterinário responsável não esteja os outros podem checar"
    expect(corpo).toMatch(/role: \{ in: \['VETERINARIAN', 'ADMIN'\] \}/);
  });

  it('usa o MESMO cálculo que colore o card', () => {
    // Duas contas de atraso dariam duas verdades sobre o mesmo exame.
    expect(corpo).toContain('atrasoDoExame(');
    expect(src.slice(src.indexOf('async listarFila('))).toContain('atrasoDoExame(');
  });

  it('não avisa de exame que nem aparece no quadro', () => {
    // Mesmo filtro do quadro: exame sem nome não está na tela. Era essa diferença que fazia o
    // lembrete tocar por coisa que ninguém achava.
    expect(corpo).toContain("if (!String(d?.nome || '').trim()) continue;");
  });

  it('quando o prazo é palpite, a mensagem diz que é palpite', () => {
    expect(corpo).toContain('sem prazo cadastrado');
  });

  it('roda uma vez por dia, de manhã', () => {
    expect(cron).toMatch(/@Cron\('30 10 \* \* \*'/);
    // e o lembrete da recepção continua UMA vez, às 10h
    expect(cron).toMatch(/@Cron\('0 10 \* \* \*'/);
    // as três de antes não podem voltar
    expect(cron).not.toMatch(/11,15,17/);
  });
});
