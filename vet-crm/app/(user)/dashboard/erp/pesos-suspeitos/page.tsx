'use client';

// Pesos implausiveis no cadastro — varredura pedida pela Cintia em 04/09/2026, depois de
// achar o Snoopy (#7974) com 8100 kg.
//
// A tela NAO corrige nada sozinha, de proposito: 8100 pode ser 8,1 kg ou 81 kg, e o sistema
// nao tem como saber. Quem sabe o peso do animal e quem esta com ele na frente. Aqui a gente
// mostra as leituras possiveis e leva pra ficha, onde a pessoa decide.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

const TEAL = '#009AAC';
const TEAL_DARK = '#014D5E';
const LINE = '#E8E2D6';
const AMBAR = '#8A5A0B';

interface Item {
  id: string;
  codigo: number | null;
  nome: string;
  especie: string | null;
  tutor: string | null;
  tutorId: string | null;
  pesoAtual: number | null;
  leiturasPossiveis: number[];
}

const kg = (v?: number | null) =>
  v == null ? '—' : `${String(v).replace('.', ',')} kg`;

const th: React.CSSProperties = { color: '#5C6B70', fontWeight: 500, padding: '9px 10px', borderBottom: `1px solid ${LINE}`, textAlign: 'left', fontSize: 12.5, whiteSpace: 'nowrap' };
const td: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #F0EBE0', fontSize: 13 };

export default function PesosSuspeitosPage() {
  usePageTitle('Pesos a revisar', 'Cadastros com peso impossível para um cão ou gato');
  const [itens, setItens] = useState<Item[]>([]);
  const [limite, setLimite] = useState<number>(100);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/pets/peso-suspeito', { cache: 'no-store' });
      if (!r.ok) throw new Error('Não consegui carregar a lista.');
      const d = await r.json();
      setItens(Array.isArray(d?.itens) ? d.itens : []);
      if (d?.limiteKg) setLimite(Number(d.limiteKg));
    } catch (e: any) {
      toast.error(e?.message || 'Não consegui carregar a lista.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="p-4 md:p-6">
      <div className="rounded-2xl border bg-white" style={{ borderColor: LINE }}>

        <div className="px-5 py-4 border-b" style={{ borderColor: LINE }}>
          <div className="text-[13.5px]" style={{ color: '#374151' }}>
            Cada linha aqui é uma <b>cobrança errada esperando acontecer</b>: diária de internação,
            medicação e caução são cobradas por faixa de peso. Um pet com peso errado cai na faixa errada.
          </div>
          <div className="text-[12.5px] mt-1" style={{ color: '#7A8B91' }}>
            Mostra peso acima de {limite} kg ou menor que 50 gramas. Novos cadastros já são barrados na hora.
          </div>
        </div>

        {loading ? (
          <div className="px-5 py-10 text-center text-[13px]" style={{ color: '#5C6B70' }}>Carregando…</div>
        ) : itens.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <div className="text-[15px] font-medium" style={{ color: TEAL_DARK }}>Nenhum peso suspeito 🎉</div>
            <div className="text-[13px] mt-1" style={{ color: '#5C6B70' }}>Todos os cadastros têm peso possível.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>Pet</th>
                  <th style={th}>Tutor</th>
                  <th style={{ ...th, textAlign: 'right' }}>Peso cadastrado</th>
                  <th style={th}>Pode ser</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {itens.map((p) => (
                  <tr key={p.id}>
                    <td style={td}>
                      <span className="font-medium" style={{ color: TEAL_DARK }}>{p.nome}</span>
                      {p.codigo != null && <span className="ml-1.5 text-[11.5px]" style={{ color: '#9AA7AC' }}>#{p.codigo}</span>}
                    </td>
                    <td style={td}>{p.tutor || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: AMBAR, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {kg(p.pesoAtual)}
                    </td>
                    <td style={td}>
                      {p.leiturasPossiveis?.length ? (
                        <span style={{ color: '#374151' }}>{p.leiturasPossiveis.map(kg).join(' ou ')}</span>
                      ) : (
                        <span style={{ color: '#9AA7AC' }}>não consigo sugerir</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'right' }}>
                      <Link
                        href={`/dashboard/erp/pets/${p.id}/editar`}
                        className="text-[12.5px] px-3 py-1.5 rounded-lg border inline-block"
                        style={{ borderColor: TEAL, color: TEAL }}
                      >
                        Corrigir na ficha
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
