/**
 * Internação (Fatia 4A) — portada do protótipo (#internacao).
 *
 * Mostra só o que a equipe JÁ ENVIOU ao tutor: o boletim mais recente em
 * destaque e os anteriores na lista. Nada de anotação interna, conta ou
 * prescrição.
 *
 * Estado vazio importa aqui: pet que não está internado não pode cair numa
 * tela em branco (é o que diz o briefing).
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

interface Boletim {
  id: string;
  quando: string;
  turno: string | null;
  texto: string;
  porQuem: string | null;
}

interface Internacao {
  internado: boolean;
  desde: string | null;
  baia: string | null;
  previsaoAlta: string | null;
  boletins: Boletim[];
}

const ICONE_TURNO: Record<string, string> = { manha: '🌅', tarde: '☀️', noite: '🌙' };
const NOME_TURNO: Record<string, string> = { manha: 'manhã', tarde: 'tarde', noite: 'noite' };

function quando(b: Boletim) {
  const dia = dataBr(b.quando);
  const turno = b.turno ? NOME_TURNO[b.turno] || b.turno : null;
  return turno ? `${dia} · ${turno}` : dia;
}

export default function TelaInternacao() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [dados, setDados] = useState<Internacao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/internacao`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) setDados(r.ok ? d : null);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [petId]);

  const ocupado = carregandoPets || carregando;
  const boletins = dados?.boletins || [];
  const [maisRecente, ...anteriores] = boletins;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Internação" />
        <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />

        {ocupado && <div className="ptl-vazio">Carregando…</div>}

        {/* ----------------------------------------- não está internado */}
        {!ocupado && !dados?.internado && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                {pet ? `O ${pet.nome} não está` : 'Este pet não está'} internado. 🌿
                <br />
                Se um dia precisar, os boletins da equipe aparecem aqui.
              </p>
            </div>
          </div>
        )}

        {/* ----------------------------------------- internado */}
        {!ocupado && dados?.internado && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 11,
                  background: 'var(--chiclete)',
                  color: 'var(--rosa-txt)',
                  borderRadius: 20,
                  padding: '3px 11px',
                  fontWeight: 700,
                }}
              >
                internado
              </span>
              <span style={{ fontSize: 11, color: 'var(--cinza)' }}>
                desde {dataBr(dados.desde)}
                {dados.baia ? ` · baia ${dados.baia}` : ''}
              </span>
            </div>

            {maisRecente ? (
              <div
                style={{
                  background: '#fff',
                  border: '1px solid var(--turquesa)',
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 8,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Último boletim</span>
                  <span style={{ fontSize: 11, color: 'var(--cinza)' }}>{quando(maisRecente)}</span>
                </div>
                <p style={{ fontSize: 12.5, color: '#444441', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {maisRecente.texto}
                </p>
                {maisRecente.porQuem && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#0F6E56' }}>
                    ✍️ {maisRecente.porQuem}
                  </div>
                )}
              </div>
            ) : (
              <div className="ptl-card">
                <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                  Ainda não há boletim enviado.
                  <br />O primeiro chega assim que a equipe passar as novidades.
                </p>
              </div>
            )}

            {anteriores.length > 0 && (
              <div>
                <div className="ptl-label">boletins anteriores</div>
                <div className="ptl-card-lista">
                  {anteriores.map((b) => (
                    <div className="ptl-row" key={b.id}>
                      <span className="ico" aria-hidden="true">
                        {b.turno ? ICONE_TURNO[b.turno] || '📋' : '📋'}
                      </span>
                      <span className="grow">
                        <span className="rt" style={{ display: 'block' }}>
                          {quando(b)}
                        </span>
                        <span
                          className="rs"
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {b.texto}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <a
              className="ptl-btn wa"
              href={linkWhatsApp(
                `Oi! Queria falar sobre a internação${pet ? ` do ${pet.nome}` : ''}.`,
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a equipe de plantão
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
