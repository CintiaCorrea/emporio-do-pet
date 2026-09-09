import * as fs from 'fs';
import * as path from 'path';

// 🛡️ EXCLUIR CADASTRO NÃO PODE APAGAR VENDA.
//
// Em 31/08/2026, "zerar o financeiro" levou 22 vendas junto. A porta é sempre a mesma:
// Appointment tem onDelete: Cascade em tutor, pet E user — então apagar qualquer um dos três
// apaga em cascata os atendimentos ligados a ele, e com eles as vendas.
//
// O caso do FUNCIONÁRIO é o mais destrutivo dos três: ele é o responsável por atendimentos de
// TODOS os clientes, então apagar uma veterinária que saiu levaria o histórico de vendas dela
// inteiro — de gente que nunca foi atendida por mais ninguém.
//
// A saída, nos três casos, é preservar o cadastro: arquivar (cliente/pet) ou bloquear o acesso
// (funcionário). Nada disso quebra o build, por isso a trava lê o arquivo.

const arq = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8');

describe('excluir cadastro com histórico é recusado', () => {
  const casos: { nome: string; caminho: string; contagem: string }[] = [
    { nome: 'cliente', caminho: '../tutors/tutors.service.ts', contagem: 'tutorId: id' },
    { nome: 'pet', caminho: '../pets/pets.service.ts', contagem: 'petId: id' },
    { nome: 'funcionário', caminho: '../users/users.service.ts', contagem: 'userId: id' },
  ];

  for (const c of casos) {
    it(`${c.nome}: o service conta o histórico e recusa a exclusão`, () => {
      const src = arq(c.caminho);
      expect(src).toContain('TEM_HISTORICO');
      expect(src).toContain('BadRequestException');
      expect(src).toContain(c.contagem);
    });
  }

  it('o DELETE dos três é restrito ao ADMIN', () => {
    for (const p of ['../tutors/tutors.controller.ts', '../pets/pets.controller.ts', '../users/users.controller.ts']) {
      const src = arq(p);
      expect(src).toContain("@Roles('ADMIN')");
      expect(src).toContain('RolesGuard');
    }
  });

  it('há um caminho reversível no lugar de excluir', () => {
    expect(arq('../tutors/tutors.service.ts')).toContain('async arquivar');
    expect(arq('../pets/pets.service.ts')).toContain('async arquivar');
    // Para o funcionário o reversível é bloquear o login — isBlocked já barra a entrada
    // em auth.service e o tira das listas de notificação.
    expect(arq('../users/users.service.ts')).toContain('async bloquear');
  });
});
