/**
 * Peso (Fatia 3) — portada do protótipo (#peso).
 *
 * Diferença consciente: o protótipo mostra uma linha de META de peso. O cadastro
 * não tem esse campo em lugar nenhum, então em vez de inventar um número eu
 * mostro a variação real do acompanhamento. Se a Cintia quiser a meta, é um
 * campo novo na ficha do pet (do lado da equipe) — combinar antes.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  PtlCabecalho,
  PtlEstilos,
  SeletorDePet,
  dataBr,
  usePetSelecionado,
} from '../ptl-ui';

interface Ponto {
  data: string;
  kg: number;
}

interface Peso {
  pontos: Ponto[];
  atual: number | null;
  variacao: number | null;
}

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function kg(v: number) {
  return `${v.toFixed(1).replace('.', ',')} kg`;
}

/** Desenha a linha do peso do jeito do protótipo, com os dados reais. */
function Grafico({ pontos }: { pontos: Ponto[] }) {
  const L = 24;
  const R = 270;
  const TOPO = 30;
  const BASE = 120;

  const valores = pontos.map((p) => p.kg);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const vao = max - min || 1;

  const x = (i: number) =>
    pontos.length === 1 ? (L + R) / 2 : L + 16 + ((R - L - 26) * i) / (pontos.length - 1);
  const y = (v: number) => BASE - ((v - min) / vao) * (BASE - TOPO);

  const linha = pontos.map((p, i) => `${x(i)},${y(p.kg)}`).join(' ');

  // Marca no máximo 5 datas embaixo, senão vira borrão.
  const passo = Math.max(1, Math.ceil(pontos.length / 5));
  const marcas = pontos
    .map((p, i) => ({ p, i }))
    .filter(({ i }) => i % passo === 0 || i === pontos.length - 1);

  return (
    <svg
      viewBox="0 0 280 150"
      style={{ width: '100%', height: 'auto' }}
      role="img"
      aria-label={`Peso de ${kg(pontos[0].kg)} em ${dataBr(pontos[0].data)} a ${kg(
        pontos[pontos.length - 1].kg,
      )} em ${dataBr(pontos[pontos.length - 1].data)}`}
    >
      <line x1={L} y1={120} x2={R} y2={120} stroke="#F1EFE8" />
      <line x1={L} y1={80} x2={R} y2={80} stroke="#F1EFE8" />
      <line x1={L} y1={40} x2={R} y2={40} stroke="#F1EFE8" />

      {pontos.length > 1 && (
        <polyline points={linha} fill="none" stroke="#00A1AE" strokeWidth="2.5" />
      )}

      {pontos.map((p, i) => (
        <circle
          key={p.data}
          cx={x(i)}
          cy={y(p.kg)}
          r={i === pontos.length - 1 ? 5 : 4}
          fill={i === pontos.length - 1 ? '#0D2048' : '#00A1AE'}
        />
      ))}

      {marcas.map(({ p, i }) => (
        <text
          key={`m-${p.data}`}
          x={x(i)}
          y={140}
          fontSize="9"
          fill={i === pontos.length - 1 ? '#0D2048' : '#5F5E5A'}
          textAnchor="middle"
        >
          {i === pontos.length - 1 ? 'agora' : MESES[new Date(p.data).getUTCMonth()]}
        </text>
      ))}
    </svg>
  );
}

export default function TelaPeso() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [dados, setDados] = useState<Peso | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/peso`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) setDados(r.ok ? d : { pontos: [], atual: null, variacao: null });
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [petId]);

  const ocupado = carregandoPets || carregando;
  const pontos = dados?.pontos || [];
  const variacao = dados?.variacao ?? null;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Peso" />
        <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />

        {ocupado && <div className="ptl-vazio">Carregando…</div>}

        {!ocupado && (
          <div className="ptl-stack" style={{ marginTop: 4 }}>
            {pontos.length === 0 && (
              <div className="ptl-card">
                <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                  Ainda não há pesagem registrada{pet ? ` do ${pet.nome}` : ''}.
                  <br />
                  Toda consulta o peso é anotado — na próxima visita ele aparece aqui.
                </p>
              </div>
            )}

            {pontos.length > 0 && (
              <>
                <div>
                  <div className="ptl-label">
                    evolução do peso{dados?.atual ? ` · hoje ${kg(dados.atual)}` : ''}
                  </div>
                  <div className="ptl-grafico">
                    <Grafico pontos={pontos} />
                    <div className="ptl-grafico-legenda">
                      <span>
                        {kg(pontos[0].kg)} em {dataBr(pontos[0].data)}
                      </span>
                      <span>{pontos.length} pesagens</span>
                    </div>
                  </div>
                </div>

                {variacao !== null && (
                  <div className="ptl-insight">
                    {variacao === 0 ? (
                      <>⚖️ O peso está estável desde a primeira pesagem do acompanhamento.</>
                    ) : variacao < 0 ? (
                      <>📉 São {kg(Math.abs(variacao))} a menos desde o começo do acompanhamento.</>
                    ) : (
                      <>📈 São {kg(variacao)} a mais desde o começo do acompanhamento.</>
                    )}
                  </div>
                )}

                <div>
                  <div className="ptl-label">pesagens</div>
                  <div className="ptl-card-lista">
                    {[...pontos].reverse().slice(0, 12).map((p) => (
                      <div className="ptl-row" key={p.data}>
                        <span className="ico" aria-hidden="true">
                          ⚖️
                        </span>
                        <span className="grow">
                          <span className="rt" style={{ display: 'block' }}>
                            {kg(p.kg)}
                          </span>
                          <span className="rs">{dataBr(p.data)}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
