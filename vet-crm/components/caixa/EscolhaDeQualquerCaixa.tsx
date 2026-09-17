'use client';

// O ADMINISTRATIVO ESCOLHE EM QUAL CAIXA ABERTO O RECEBIMENTO ENTRA — de qualquer pessoa, de
// qualquer dia (Cintia, 17/09/2026: "não quero abrir o caixa, quero lançar nos que já estão
// abertos"). A regra mora em lib/escolhaDoCaixa.escolhaDeQualquerCaixa, com teste.
//
// Lista nativa (select) de propósito: são mais de 20 caixas abertos, e lista desenhada dentro de
// janela corta por rolagem. A do navegador abre por cima de tudo. Os caixas do dia da venda
// ficam como botões logo acima — é o atalho, não a escolha automática.
import { useMemo } from 'react';
import { escolhaDeQualquerCaixa, type CaixaDeQualquerUm } from '@/lib/escolhaDoCaixa';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const MUT = '#5C6B70';

type Props = {
  abertos: CaixaDeQualquerUm[];
  dataDaVenda?: string | Date | null;
  valor: string | null;
  onEscolher: (caixaId: string) => void;
};

export default function EscolhaDeQualquerCaixa({ abertos, dataDaVenda, valor, onEscolher }: Props) {
  const e = useMemo(() => escolhaDeQualquerCaixa(abertos, dataDaVenda), [abertos, dataDaVenda]);

  if (!e.dias.length) {
    return <div style={{ fontSize: 12, color: MUT, marginBottom: 10 }}>Nenhum caixa aberto no momento.</div>;
  }

  return (
    <div style={{ border: `1px solid ${valor ? '#e5e7eb' : '#F0D9A8'}`, background: valor ? '#fafafa' : '#FFF6E5', borderRadius: 10, padding: '8px 10px', marginBottom: 10 }}>
      <label htmlFor="caixa-do-recebimento" style={{ display: 'block', fontSize: 11.5, color: MUT, fontWeight: 600, marginBottom: 6 }}>
        Em qual caixa este recebimento entra?
      </label>
      {e.doDiaDaVenda.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: MUT }}>Do dia da venda:</span>
          {e.doDiaDaVenda.map((o) => {
            const ativo = valor === o.id;
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => onEscolher(o.id)}
                style={{ border: `1px solid ${ativo ? TEAL : '#d7dce0'}`, background: ativo ? TEAL : '#fff', color: ativo ? '#fff' : NAVY, borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: ativo ? 600 : 500, cursor: 'pointer', whiteSpace: 'nowrap' }}
              >
                {o.rotulo}
              </button>
            );
          })}
        </div>
      )}
      <select
        id="caixa-do-recebimento"
        value={valor || ''}
        onChange={(ev) => ev.target.value && onEscolher(ev.target.value)}
        style={{ width: '100%', border: '1px solid #E8E2D6', borderRadius: 8, padding: '6px 8px', fontSize: 12.5, color: NAVY, background: '#fff' }}
      >
        <option value="">Escolha o caixa…</option>
        {e.dias.map((d) => (
          <optgroup key={d.dia} label={d.rotulo}>
            {d.opcoes.map((o) => (
              <option key={o.id} value={o.id}>{d.rotulo} · {o.rotulo}</option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
