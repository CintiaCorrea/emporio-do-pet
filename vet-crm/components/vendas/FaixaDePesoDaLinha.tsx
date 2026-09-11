'use client';

// ⚖️ A FAIXA DE PESO DE UMA LINHA DE VENDA — o mesmo seletor nas telas que lançam item.
//
// A Cintia, 11/09/2026: "o sistema continua não lendo o peso quando vamos lançar na
// venda/orçamento."
//
// O ponto de venda lia o peso e escolhia a faixa; a comanda do cliente e o orçamento rápido
// não. E o preço-base de um item cobrado por faixa é justamente o da faixa MAIS BARATA — então
// ignorar o peso não dava erro, dava o preço do animal pequeno para todo mundo. Na Cerenia isso
// é R$ 77,92 no lugar de até R$ 385,99.
//
// Aparece só em item cobrado por porte. Item de preço único não vê nada disso.
import { ordenarFaixas, rotuloDaFaixa, type FaixaPorte } from '@/lib/porte';

const BRL = (n: any) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

type Props = {
  faixas?: FaixaPorte[] | null;
  faixaRotulo?: string | null;
  /** Quando preenchido, a caixa fica âmbar: o preço ainda não está resolvido. */
  aviso?: string | null;
  /** Peso que escolheu a faixa. Vazio = o cadastro não tem, e a pessoa escolhe na mão. */
  pesoKg?: number | null;
  petNome?: string | null;
  onTrocar: (rotulo: string) => void;
};

export default function FaixaDePesoDaLinha({ faixas, faixaRotulo, aviso, pesoKg, petNome, onTrocar }: Props) {
  const lista = ordenarFaixas(faixas || []);
  if (!lista.length) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
      <select
        value={faixaRotulo || ''}
        onChange={(e) => onTrocar(e.target.value)}
        title="Faixa de peso usada no preço deste item"
        style={{
          border: `1px solid ${aviso ? '#D9A62B' : '#E8E2D6'}`,
          background: aviso ? '#FFFBF0' : '#FAFAF7',
          borderRadius: 8, padding: '4px 7px', fontSize: 11.5, color: '#014D5E', cursor: 'pointer',
        }}
      >
        <option value="">— escolha a faixa —</option>
        {lista.map((f) => (
          <option key={f.rotulo} value={f.rotulo}>
            ⚖️ {rotuloDaFaixa(f)}{f.preco == null ? ' · sem preço' : ` · ${BRL(f.preco)}`}
          </option>
        ))}
      </select>
      {aviso ? (
        <span style={{ fontSize: 11, color: '#8a6400' }}>{aviso}</span>
      ) : (
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          pelo peso {petNome ? `do ${petNome}` : 'do pet'}
          {pesoKg ? ` · ${String(pesoKg).replace('.', ',')} kg` : ''}
        </span>
      )}
    </div>
  );
}
