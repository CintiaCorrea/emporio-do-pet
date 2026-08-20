/**
 * Fisioterapia (Fatia 3) — portada do protótipo (#fisio): cartão do pacote com
 * a barra de progresso + histórico de sessões. Só leitura.
 *
 * O protótipo mostra um pacote. Na prática o pet pode ter mais de um (um ativo
 * e os antigos), então o cartão se repete — mesmo desenho, sem conceito novo.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  PtlCabecalho,
  PtlEstilos,
  SeletorDePet,
  dataBr,
  dataCurta,
  usePetSelecionado,
} from '../ptl-ui';

interface Sessao {
  numero: number;
  data: string;
  profissional: string | null;
  observacao: string | null;
}

interface Pacote {
  id: string;
  servico: string;
  descricao: string | null;
  sessaoAtual: number;
  totalSessoes: number;
  restantes: number;
  validade: string | null;
  status: string;
  sessoes: Sessao[];
}

interface Boletim {
  id: string;
  data: string;
  texto: string;
}

// Patinha desenhada (SVG) na cor do app — turquesa = sessão feita, cinza claro = a fazer.
// (O emoji 🐾 sai marrom escuro e não dá pra recolorir.)
function Patinha({ feita }: { feita: boolean }) {
  const cor = feita ? '#00A1AE' : '#D4DEDF';
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill={cor} aria-hidden="true" style={{ flex: '0 0 auto' }}>
      <ellipse cx="6" cy="12.6" rx="2.1" ry="2.7" />
      <ellipse cx="10.3" cy="8.5" rx="2.1" ry="2.9" />
      <ellipse cx="14.7" cy="8.5" rx="2.1" ry="2.9" />
      <ellipse cx="19" cy="12.6" rx="2.1" ry="2.7" />
      <path d="M12.5 12.8c-3.1 0-5.4 2.2-5.4 4.5 0 1.7 1.3 2.5 2.8 2.1.9-.2 1.7-.6 2.6-.6s1.7.4 2.6.6c1.5.4 2.8-.4 2.8-2.1 0-2.3-2.3-4.5-5.4-4.5z" />
    </svg>
  );
}

const ROTULO_STATUS: Record<string, string> = {
  ATIVO: '',
  CONCLUIDO: 'pacote concluído',
  CANCELADO: 'pacote cancelado',
  EXPIRADO: 'pacote vencido',
};

export default function TelaFisio() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [boletins, setBoletins] = useState<Boletim[]>([]);
  const [boletimAberto, setBoletimAberto] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/fisio`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) {
          setPacotes(r.ok ? d.pacotes || [] : []);
          setBoletins(r.ok ? d.boletins || [] : []);
        }
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [petId]);

  const ocupado = carregandoPets || carregando;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Fisioterapia" />
        <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />

        {ocupado && <div className="ptl-vazio">Carregando…</div>}

        {!ocupado && pacotes.length === 0 && boletins.length === 0 && (
          <div className="ptl-card" style={{ marginTop: 8 }}>
            <p className="ptl-vazio" style={{ padding: '6px 0' }}>
              {pet ? `O ${pet.nome} não tem` : 'Não há'} pacote de fisioterapia.
              <br />
              Quando começar um, o acompanhamento aparece aqui.
            </p>
          </div>
        )}

        {!ocupado &&
          pacotes.map((p) => {
            const rotulo = ROTULO_STATUS[p.status] ?? '';

            return (
              <div className="ptl-stack" key={p.id} style={{ marginTop: 6 }}>
                <div className="ptl-fisio">
                  <div className="cat">{p.descricao || p.servico}</div>
                  <div className="big">
                    sessão {p.sessaoAtual} <small>de {p.totalSessoes}</small>
                  </div>
                  {/* Patinhas: 1 pata por sessão — cheia = feita, vazia = a fazer (igual ao sistema) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, margin: '9px 0 5px' }} aria-hidden="true">
                    {Array.from({ length: Math.min(p.totalSessoes || 0, 40) }).map((_, i) => (
                      <Patinha key={i} feita={i < p.sessaoAtual} />
                    ))}
                  </div>
                  <div className="meta">
                    {rotulo
                      ? rotulo
                      : p.restantes === 0
                        ? 'todas as sessões usadas'
                        : `${p.restantes} ${p.restantes === 1 ? 'sessão restante' : 'sessões restantes'}`}
                    {p.validade ? ` · válido até ${dataBr(p.validade)}` : ''}
                  </div>
                </div>

                {p.sessoes.length > 0 && (
                  <div>
                    <div className="ptl-label">histórico</div>
                    <div className="ptl-card-lista">
                      {p.sessoes.map((s) => (
                        <div className="ptl-row" key={`${p.id}-${s.numero}`}>
                          <span className="ico" aria-hidden="true">
                            🤸
                          </span>
                          <span className="grow">
                            <span className="rt" style={{ display: 'block' }}>
                              Sessão {s.numero}
                              {s.profissional ? ` · ${s.profissional}` : ''}
                            </span>
                            <span className="rs">
                              {dataCurta(s.data)}
                              {s.observacao ? ` · ${s.observacao}` : ''}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

        {!ocupado && boletins.length > 0 && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-label">boletins da fisioterapia</div>
            <div className="ptl-card-lista">
              {boletins.map((b) => {
                const aberto = boletimAberto === b.id;
                return (
                  <div key={b.id}>
                    <button
                      type="button"
                      className="ptl-row"
                      style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
                      onClick={() => setBoletimAberto(aberto ? null : b.id)}
                    >
                      <span className="ico" aria-hidden="true">🌿</span>
                      <span className="grow">
                        <span className="rt" style={{ display: 'block' }}>Boletim de {dataBr(b.data)}</span>
                        <span className="rs">{aberto ? 'toque pra fechar' : 'toque pra ler'}</span>
                      </span>
                      <span aria-hidden="true">{aberto ? '▲' : '▼'}</span>
                    </button>
                    {aberto && (
                      <pre
                        style={{
                          whiteSpace: 'pre-wrap',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          lineHeight: 1.5,
                          margin: '2px 6px 10px',
                          padding: '10px 12px',
                          background: '#F6FBFA',
                          border: '1px solid #DCECEA',
                          borderRadius: 10,
                          color: '#0E2244',
                        }}
                      >
                        {b.texto || 'Boletim sem texto salvo.'}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
