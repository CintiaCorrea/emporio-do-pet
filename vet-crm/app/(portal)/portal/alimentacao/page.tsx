/**
 * Alimentação (Fatia 5) — portada do protótipo (#alimentacao).
 *
 * Só leitura: quem prescreve é a veterinária, na ficha do pet. As três caixas
 * do protótipo são o coração da tela — o que come, o que PODE variar (verde) e
 * o que EVITAR (vermelho) — porque é exatamente aí que o tutor erra sozinho em
 * casa por não saber.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  PtlCabecalho,
  PtlEstilos,
  SeletorDePet,
  dataBr,
  linkWhatsApp,
  usePetSelecionado,
} from '../ptl-ui';

interface ItemDieta {
  nome: string;
  detalhe: string | null;
}

interface Dieta {
  tem: boolean;
  prescritorNome?: string | null;
  data?: string;
  itens?: ItemDieta[];
  variacoes?: string[];
  evitar?: string[];
  observacao?: string | null;
  temAnexo?: boolean;
  anexoNome?: string | null;
}

export default function TelaAlimentacao() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [dieta, setDieta] = useState<Dieta | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/dieta`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) setDieta(r.ok ? d : { tem: false });
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [petId]);

  const ocupado = carregandoPets || carregando;
  const tem = !!dieta?.tem;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Alimentação" />
        <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />

        {ocupado && <div className="ptl-vazio">Carregando…</div>}

        {/* ------------------------------------------- sem dieta prescrita */}
        {!ocupado && !tem && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                {pet ? `O ${pet.nome} ainda não tem` : 'Ainda não há'} dieta prescrita por aqui. 🥣
                <br />
                Quando a veterinária montar uma, ela aparece nesta tela.
              </p>
            </div>
            <a
              className="ptl-btn wa"
              href={linkWhatsApp(
                `Oi! Queria orientação sobre a alimentação${pet ? ` do ${pet.nome}` : ''}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar sobre alimentação
            </a>
          </div>
        )}

        {/* ------------------------------------------- dieta ativa */}
        {!ocupado && tem && (
          <div className="ptl-stack" style={{ marginTop: 4 }}>
            <p style={{ fontSize: 11.5, color: 'var(--cinza)', display: 'flex', gap: 6 }}>
              <span aria-hidden="true">🩺</span>
              {dieta?.prescritorNome ? `prescrito por ${dieta.prescritorNome}` : 'prescrito pela equipe'}
              {dieta?.data ? ` · ${dataBr(dieta.data)}` : ''}
            </p>

            <div>
              <div className="ptl-label">dieta prescrita</div>
              <div className="ptl-card-lista">
                {(dieta?.itens || []).map((i, idx) => (
                  <div className="ptl-row" key={`${i.nome}-${idx}`}>
                    <span className="ico" aria-hidden="true">
                      🥣
                    </span>
                    <span className="grow">
                      <span className="rt" style={{ display: 'block' }}>
                        {i.nome}
                      </span>
                      {i.detalhe && <span className="rs">{i.detalhe}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {(dieta?.variacoes || []).length > 0 && (
              <div>
                <div className="ptl-label">variações que você pode fazer</div>
                <div
                  style={{
                    background: 'var(--verde-bg)',
                    borderRadius: 12,
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                  }}
                >
                  {dieta!.variacoes!.map((v, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8 }}>
                      <span style={{ color: '#0F6E56', fontSize: 14, lineHeight: 1.4 }} aria-hidden="true">
                        ✓
                      </span>
                      <p style={{ fontSize: 12, color: '#04342C', lineHeight: 1.5 }}>{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(dieta?.evitar || []).length > 0 && (
              <div
                style={{
                  background: '#FCEBEB',
                  borderRadius: 12,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {dieta!.evitar!.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8 }}>
                    <span style={{ color: '#A32D2D', fontSize: 14, lineHeight: 1.4 }} aria-hidden="true">
                      ✕
                    </span>
                    <p style={{ fontSize: 12, color: '#501313', lineHeight: 1.5 }}>
                      {i === 0 ? <b>Evitar: </b> : null}
                      {e}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {dieta?.observacao && (
              <div className="ptl-insight">
                <span aria-hidden="true">💡</span> {dieta.observacao}
              </div>
            )}

            {dieta?.temAnexo && (
              <div className="ptl-card-lista">
                <div className="ptl-row">
                  <span className="ico" aria-hidden="true">
                    📄
                  </span>
                  <span className="grow">
                    <span className="rt" style={{ display: 'block' }}>
                      {dieta.anexoNome || 'Receita anexada'}
                    </span>
                    <span className="rs">a equipe anexou um arquivo</span>
                  </span>
                  <span className="acao">em breve</span>
                </div>
              </div>
            )}

            <a
              className="ptl-btn wa"
              href={linkWhatsApp(
                `Oi! Tenho uma dúvida sobre a dieta${pet ? ` do ${pet.nome}` : ''}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Tirar dúvida sobre a dieta
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
