/**
 * Chegada do portal (Fatia 1).
 *
 * Esta tela ainda NAO e a home do protótipo — ela e a prova de que o cofre
 * funciona: mostra o tutor da sessao e os pets DELE, vindos de /api/portal/eu,
 * sem que o navegador diga em momento nenhum quem ele e. A home completa
 * (menu, alerta de internação, contato rápido) e a Fatia 2.
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PtlEstilos, emojiEspecie } from './ptl-ui';

interface Eu {
  tutor: { id: string; nome: string; primeiroNome: string };
  pets: Array<{
    id: string;
    nome: string;
    especie: string;
    raca: string | null;
    idadeAnos: number | null;
    foto: string | null;
    segundoResponsavel: boolean;
  }>;
}

export default function PortalInicio() {
  const router = useRouter();
  const [eu, setEu] = useState<Eu | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/portal/eu', { cache: 'no-store' });
        if (r.status === 401) {
          router.replace('/portal/entrar');
          return;
        }
        const d = await r.json();
        if (vivo) setEu(d);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [router]);

  async function sair() {
    await fetch('/api/portal/auth/sair', { method: 'POST' });
    router.replace('/portal/entrar');
  }

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 22 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--cinza)' }}>
              {carregando ? 'Carregando…' : `Olá, ${eu?.tutor?.primeiroNome || ''}`}
            </div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Bem-vindo de volta</div>
          </div>
          <button className="ptl-link" onClick={sair}>
            Sair
          </button>
        </div>

        <div className="ptl-stack">
          {carregando && <div className="ptl-vazio">Buscando as informações do seu pet…</div>}

          {!carregando && (eu?.pets?.length ?? 0) === 0 && (
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '8px 0' }}>
                Ainda não há pet ativo no seu cadastro.
                <br />A recepção pode conferir isso pra você.
              </p>
            </div>
          )}

          {eu?.pets?.map((p) => (
            <div key={p.id} className="ptl-pet-row">
              <span className="av" aria-hidden="true">
                {p.foto ? <img src={p.foto} alt="" /> : emojiEspecie(p.especie)}
              </span>
              <span>
                <b>{p.nome}</b>
                <small>
                  {[p.raca, p.idadeAnos != null ? `${p.idadeAnos} anos` : null]
                    .filter(Boolean)
                    .join(' · ') || 'ficha em dia'}
                  {p.segundoResponsavel ? ' · você é 2º responsável' : ''}
                </small>
              </span>
            </div>
          ))}

          {!carregando && (eu?.pets?.length ?? 0) > 0 && (
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                🚧 Saúde, Alimentação, Peso, Fisioterapia, Internação, Agendar e Minha ficha
                entram nas próximas fatias.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
