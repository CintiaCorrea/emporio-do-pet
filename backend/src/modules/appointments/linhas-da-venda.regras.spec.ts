import { casarLinhas, mesclarLinha, linhasSemCadastro } from './linhas-da-venda.regras';

// O caso real: a venda #1168 do Reginaldo (08/09/2026) tinha o hemograma ligado ao cadastro e ao
// laboratório. O ponto de venda, ao salvar uma edição, manda só nome, quantidade e preço — e a
// gravação antiga apagava a linha e recriava sem a ligação. Em 16/09/2026, 291 linhas de venda
// de setembro estavam sem ligação ao cadastro.
const HEMOGRAMA = {
  id: 'linha-hemo',
  descricao: 'HEMOGRAMA COMPLETO CANINO / FELINO / MAMÍFEROS',
  catalogoItemId: 'cat-hemo',
  fornecedorId: 'lab-1',
  custoUnitario: 32,
  executorUserId: 'vet-1',
  comissaoTipo: 'PERCENTUAL',
  comissaoValor: 10,
  comissaoCalculada: 8,
  quantidade: 1,
  valorUnitario: 80,
  desconto: 0,
};
const TRANSAMIN = { id: 'linha-transamin', descricao: 'TRANSAMIN', catalogoItemId: 'cat-transamin', quantidade: 1, valorUnitario: 44.53, desconto: 0 };

// O que a tela do ponto de venda manda ao salvar a edição (salvarEdicaoItens).
const daTela = (l: any) => ({ descricao: l.descricao, quantidade: l.quantidade, valorUnitario: l.valorUnitario, desconto: l.desconto });

describe('editar venda não estraga a linha que continua', () => {
  it('a linha que continua mantém o id e herda cadastro, laboratório, custo e comissão', () => {
    const r = casarLinhas([HEMOGRAMA, TRANSAMIN], [daTela(HEMOGRAMA), daTela(TRANSAMIN)]);
    expect(r.criar).toEqual([]);
    expect(r.apagar).toEqual([]);
    const hemo = r.manter.find((m) => m.id === 'linha-hemo')!;
    expect(hemo.recebida.catalogoItemId).toBe('cat-hemo');
    expect(hemo.recebida.fornecedorId).toBe('lab-1');
    expect(hemo.recebida.custoUnitario).toBe(32);
    expect(hemo.recebida.executorUserId).toBe('vet-1');
    expect(hemo.recebida.comissaoTipo).toBe('PERCENTUAL');
    expect(hemo.recebida.comissaoCalculada).toBe(8);
  });

  it('só é criada a linha nova e só é apagada a linha que saiu', () => {
    const novo = { descricao: 'ONDANSETRONA', catalogoItemId: 'cat-ond', quantidade: 1, valorUnitario: 37.57 };
    const r = casarLinhas([HEMOGRAMA, TRANSAMIN], [daTela(HEMOGRAMA), novo]);
    expect(r.manter.map((m) => m.id)).toEqual(['linha-hemo']);
    expect(r.criar).toEqual([novo]);
    expect(r.apagar).toEqual(['linha-transamin']);
  });

  it('o que a tela MANDA vale mais que o que estava gravado', () => {
    const r = casarLinhas([HEMOGRAMA], [{ ...daTela(HEMOGRAMA), quantidade: 2, fornecedorId: 'lab-2' }]);
    expect(r.manter[0].recebida.quantidade).toBe(2);
    expect(r.manter[0].recebida.fornecedorId).toBe('lab-2');
  });

  it('mudou quantidade, preço ou desconto: a comissão calculada é refeita, não herdada', () => {
    const m = mesclarLinha(HEMOGRAMA, { ...daTela(HEMOGRAMA), quantidade: 2 });
    expect(m.comissaoCalculada).toBeUndefined();
    expect(m.comissaoTipo).toBe('PERCENTUAL');   // a regra da comissão continua
  });

  it('pelo id, quando a tela manda o id', () => {
    const r = casarLinhas([HEMOGRAMA], [{ id: 'linha-hemo', descricao: 'Hemograma (nome editado)', quantidade: 1, valorUnitario: 80 }]);
    expect(r.manter[0].id).toBe('linha-hemo');
    expect(r.manter[0].recebida.catalogoItemId).toBe('cat-hemo');
  });

  it('dois exames iguais continuam sendo duas linhas, cada uma com o seu id', () => {
    // Citologia da Maya (#1233): dois pontos coletados, duas linhas iguais.
    const a = { id: 'cit-a', descricao: 'CITOLOGIA', catalogoItemId: 'cat-cit', quantidade: 1, valorUnitario: 167.5 };
    const b = { id: 'cit-b', descricao: 'CITOLOGIA', catalogoItemId: 'cat-cit', quantidade: 1, valorUnitario: 167.5 };
    const r = casarLinhas([a, b], [daTela(a), daTela(b)]);
    expect(r.manter.map((m) => m.id).sort()).toEqual(['cit-a', 'cit-b']);
    expect(r.criar).toEqual([]);
  });

  it('com preço diferente, casa primeiro a linha de mesmo preço', () => {
    const barata = { id: 'dip-1', descricao: 'DIPIRONA', catalogoItemId: 'cat-dip', quantidade: 1, valorUnitario: 37.57 };
    const cara = { id: 'dip-2', descricao: 'DIPIRONA', catalogoItemId: 'cat-dip', quantidade: 1, valorUnitario: 58.44 };
    const r = casarLinhas([barata, cara], [daTela(cara)]);
    expect(r.manter[0].id).toBe('dip-2');
    expect(r.apagar).toEqual(['dip-1']);
  });

  it('nome com acento ou espaço diferente é o mesmo item', () => {
    const r = casarLinhas([HEMOGRAMA], [{ descricao: 'HEMOGRAMA COMPLETO CANINO / FELINO / MAMIFEROS ', quantidade: 1, valorUnitario: 80 }]);
    expect(r.manter[0].id).toBe('linha-hemo');
  });

  it('venda sem linhas gravadas: tudo é linha nova', () => {
    const r = casarLinhas([], [daTela(HEMOGRAMA)]);
    expect(r.criar.length).toBe(1);
    expect(r.manter).toEqual([]);
  });

  it('a tela mandou lista vazia: todas as linhas saem', () => {
    expect(casarLinhas([HEMOGRAMA, TRANSAMIN], []).apagar).toEqual(['linha-hemo', 'linha-transamin']);
  });
});

describe('porteiro (modo aviso): linha de venda sem cadastro', () => {
  it('acha as linhas sem ligação — texto solto, como a "Cateterização" da internação', () => {
    const linhas = [
      { descricao: 'Fluidoterapia', catalogoItemId: 'cat-fluido' },
      { descricao: 'Cateterização', catalogoItemId: null },
      { descricao: 'Item', catalogoItemId: '' },
    ];
    expect(linhasSemCadastro(linhas).map((l) => l.descricao)).toEqual(['Cateterização', 'Item']);
  });
});
