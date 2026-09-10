'use client';

// EM QUAL CAIXA ESTA BAIXA ENTRA — a pergunta que o sistema não fazia.
//
// Cintia, 10/09/2026: "as baixas estão indo para o caixa de hoje mesmo o caixa da Gabriela
// estando aberto." A regra antiga escolhia sozinha o caixa mais recente da pessoa, e o mais
// recente é sempre o de hoje. Com os dias 01 a 04 reabertos para lançar as baixas atrasadas,
// tudo caía em hoje sem ninguém ser perguntado.
//
// Aparece SÓ quando há mais de um caixa meu aberto. Com um caixa só, esta faixa some por
// inteiro — o caso comum não pode ganhar uma pergunta a mais por causa do caso raro.
import { useEffect, useMemo } from 'react';
import { escolhaDoCaixa, type CaixaAbertoRef } from '@/lib/escolhaDoCaixa';

const TEAL = '#009AAC';
const NAVY = '#014D5E';
const MUT = '#6b7280';
const AVISO = '#8a5a00';
const AVISOB = '#FFF6E5';

type Props = {
  /** Meus caixas ABERTOS, de qualquer dia (lib/caixaAtual.carregarMeusCaixasAbertos). */
  meusAbertos: CaixaAbertoRef[];
  /** Data da venda que está sendo recebida — só alimenta o aviso. */
  dataDaVenda?: string | Date | null;
  /** Caixa escolhido agora. null enquanto a tela ainda não decidiu. */
  valor: string | null;
  onEscolher: (caixaId: string) => void;
};

export default function EscolhaDoCaixa({ meusAbertos, dataDaVenda, valor, onEscolher }: Props) {
  const e = useMemo(() => escolhaDoCaixa(meusAbertos, dataDaVenda), [meusAbertos, dataDaVenda]);

  // A tela abre já com uma resposta. Quem não quiser pensar no assunto não precisa: confirma
  // e o dinheiro entra no caixa de hoje, como sempre entrou.
  useEffect(() => {
    if (e.sugeridoId && !valor) onEscolher(e.sugeridoId);
  }, [e.sugeridoId, valor, onEscolher]);

  if (!e.precisaEscolher) return null;

  return (
    <div style={{ border: `1px solid ${e.aviso ? '#F0D9A8' : '#e5e7eb'}`, background: e.aviso ? AVISOB : '#fafafa', borderRadius: 10, padding: '8px 10px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11.5, color: MUT, fontWeight: 600, whiteSpace: 'nowrap' }}>Entra no caixa</span>
        {e.opcoes.map((o) => {
          const ativo = valor === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onEscolher(o.id)}
              title={o.ehDoDiaDaVenda ? 'Este é o caixa do dia desta venda' : undefined}
              style={{
                border: `1px solid ${ativo ? TEAL : '#d7dce0'}`,
                background: ativo ? TEAL : '#fff',
                color: ativo ? '#fff' : NAVY,
                borderRadius: 999,
                padding: '4px 11px',
                fontSize: 11.5,
                fontWeight: ativo ? 600 : 500,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {o.rotulo}
              {o.ehDoDiaDaVenda && !o.ehDeHoje ? ' ←' : ''}
            </button>
          );
        })}
      </div>
      {e.aviso && (
        <div style={{ fontSize: 11, color: AVISO, marginTop: 6, lineHeight: 1.35 }}>
          {e.aviso} Se o dinheiro entrou naquele dia, escolha esse caixa; se está entrando agora, deixe no de hoje.
        </div>
      )}
    </div>
  );
}
