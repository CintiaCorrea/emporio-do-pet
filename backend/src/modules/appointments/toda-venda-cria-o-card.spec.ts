
// Cintia, 17/09/2026 (venda da Pam, pelo carrinho da ficha): "items.2.property tipoItem should not
// exist". O carrinho manda tipoItem/catalogoExameId quando a linha é exame — é o que leva o exame
// para o Kanban — e o servidor recusava a venda inteira.
describe('a venda com exame entra por esta porta', () => {
  const dto = require('fs').readFileSync(require('path').join(__dirname, 'dto', 'create-appointment.dto.ts'), 'utf8');
  it('o item aceita tipoItem e catalogoExameId', () => {
    expect(dto).toContain('tipoItem?: string;');
    expect(dto).toContain('catalogoExameId?: string;');
  });
  it('e continua aceitando o id da linha (edição)', () => {
    expect(dto).toContain('id?: string;');
  });
});
