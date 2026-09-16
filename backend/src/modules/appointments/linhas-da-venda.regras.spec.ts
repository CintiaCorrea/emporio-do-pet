import { casarLinhas, mesclarLinha, linhasSemCadastro, conferirPreco } from './linhas-da-venda.regras';

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


// Preço pelo cadastro e pelo peso (A2 bloco 2). Tartarectomia copiada de produção em 16/09/2026;
// diária com os preços de produção (150/175/200/225/250) na escada padrão da casa (FAIXAS_PADRAO).
const DIARIA = {
  id: 'cat-diaria', nome: 'Diária de internação', preco: 150,
  precosPorte: JSON.stringify([
    { ate: 10, rotulo: '0 a 10 kg', preco: 150 }, { ate: 20, rotulo: '11 a 20 kg', preco: 175 },
    { ate: 30, rotulo: '21 a 30 kg', preco: 200 }, { ate: 40, rotulo: '31 a 40 kg', preco: 225 },
    { ate: null, rotulo: '41 a 50+ kg', preco: 250 },
  ]),
};
const TARTARECTOMIA = {
  id: 'cat-tartarectomia', nome: 'Tartarectomia', preco: 360,
  precosPorte: JSON.stringify([
    { ate: 5, rotulo: '0 a 5 kg', preco: 360 }, { ate: 10, rotulo: '5 a 10 kg', preco: 620 },
    { ate: null, rotulo: 'acima de 10 kg', preco: null },
  ]),
};

describe('preço pelo cadastro e pelo peso (porteiro, modo aviso)', () => {
  it('a diária do Chico (13,1 kg) cobrada a R$ 150: o cadastro diz R$ 175 na faixa de 11 a 20 kg', () => {
    expect(conferirPreco(150, DIARIA, 13.1)).toEqual({ motivo: 'preco_diferente', cobrado: 150, cadastro: 175, faixa: '11 a 20 kg' });
  });

  it('preço certo para a faixa do peso não gera aviso', () => {
    expect(conferirPreco(150, DIARIA, 8.4)).toBeNull();
    expect(conferirPreco(175, DIARIA, 13.1)).toBeNull();
  });

  it('item com faixa e pet sem peso registrado: sem_peso ("peso tem que estar registrado")', () => {
    expect(conferirPreco(150, DIARIA, null)).toEqual({ motivo: 'sem_peso' });
    expect(conferirPreco(150, DIARIA, 0)).toEqual({ motivo: 'sem_peso' });
  });

  it('faixa sem preço no cadastro: a Tartarectomia não tem preço acima de 10 kg', () => {
    expect(conferirPreco(620, TARTARECTOMIA, 12)).toEqual({ motivo: 'sem_preco', faixa: 'acima de 10 kg' });
  });

  it('item de preço único: confere o preço do cadastro', () => {
    const LIMPEZA = { id: 'cat-limpeza', nome: 'Limpeza de ferida', preco: 35, precosPorte: null };
    expect(conferirPreco(35, LIMPEZA, null)).toBeNull();   // preço único não pede peso
    expect(conferirPreco(40, LIMPEZA, 9)).toEqual({ motivo: 'preco_diferente', cobrado: 40, cadastro: 35, faixa: null });
  });

  it('item do cadastro sem preço nenhum (eram 22 em 16/09/2026): sem_preco', () => {
    expect(conferirPreco(80, { id: 'x', nome: 'Sem preço', preco: null, precosPorte: null }, 10)).toEqual({ motivo: 'sem_preco', faixa: null });
    expect(conferirPreco(80, { id: 'x', nome: 'Preço zero', preco: 0, precosPorte: null }, 10)).toEqual({ motivo: 'sem_preco', faixa: null });
  });

  it('caução não tem preço fixo: é o valor que o cliente deixa', () => {
    expect(conferirPreco(600, { id: 'cat-caucao', nome: 'Caução', preco: 600, precosPorte: null, ehCaucao: true }, null)).toBeNull();
    expect(conferirPreco(1500, { id: 'cat-caucao', nome: 'Caução', preco: 600, precosPorte: null, ehCaucao: true }, null)).toBeNull();
  });

  it('diferença de centavo de arredondamento não é aviso', () => {
    expect(conferirPreco(175.004, DIARIA, 13.1)).toBeNull();
  });
});

describe('o porteiro está ligado nas duas gravações de venda', () => {
  // Se uma das chamadas sumir, a lista porteiro_vendas para de receber aviso em silêncio — e a
  // decisão de passar a recusar seria tomada olhando uma lista incompleta.
  const src = require('fs').readFileSync(require('path').join(__dirname, 'appointments.service.ts'), 'utf8');
  it('criar e editar anotam no porteiro', () => {
    expect(src).toContain("this.anotarNoPorteiro(result.id, linhasCriadas, 'criar'");
    expect(src).toContain("this.anotarNoPorteiro(id, [...linhasCriadas, ...linhasAlteradas], 'editar'");
  });
  it('e o porteiro confere o preço, não só o cadastro', () => {
    expect(src).toContain('conferirPreco(l.valorUnitario');
  });
});
