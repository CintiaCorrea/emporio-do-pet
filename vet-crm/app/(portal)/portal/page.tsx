/**
 * Tela Início do Portal do Tutor (Fatia 2).
 * Portada do protótipo aprovado (docs/portal-tutor/portal-tutor-emporio.html, #inicio).
 *
 * Diferença consciente em relação ao protótipo: ele desenha UM pet ("Thor"), e no
 * cadastro real um tutor pode ter vários. A linha do pet vira uma por pet, com o
 * mesmo desenho — nada de conceito novo de tela.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PtlEstilos, emojiEspecie, linkWhatsApp } from './ptl-ui';
import { CartaoAvisos, DicaDeInstalar } from './ptl-pwa';

interface Pet {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  idadeAnos: number | null;
  foto: string | null;
  segundoResponsavel: boolean;
}

interface Internacao {
  petId: string;
  petNome: string;
  desde: string;
  previsaoAlta: string | null;
}

interface Home {
  tutor: { primeiroNome: string };
  pets: Pet[];
  internacoes: Internacao[];
}

/** Itens do menu, na ordem do protótipo. `rota: null` = ainda não construída. */
const MENU: Array<{ emoji: string; titulo: string; sub: string; rota: string | null }> = [
  { emoji: '💚', titulo: 'Saúde', sub: 'vacinas · exames · receitas', rota: '/portal/saude' },
  { emoji: '🍲', titulo: 'Alimentação', sub: 'dieta e variações', rota: '/portal/alimentacao' },
  { emoji: '⚖️', titulo: 'Peso', sub: 'evolução', rota: '/portal/peso' },
  { emoji: '🤸', titulo: 'Fisioterapia', sub: 'pacote e sessões', rota: '/portal/fisio' },
  { emoji: '🏥', titulo: 'Internação', sub: 'boletins do dia', rota: '/portal/internacao' },
  { emoji: '📅', titulo: 'Agendar', sub: 'marcar um horário', rota: '/portal/agendar' },
  { emoji: '🪪', titulo: 'Minha ficha', sub: 'manter dados em dia', rota: '/portal/ficha' },
];

/** 26/07 — data curta, do jeito que se fala. */
function dataCurta(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function descricaoPet(p: Pet) {
  const partes = [p.raca, p.idadeAnos != null ? `${p.idadeAnos} anos` : null].filter(Boolean);
  return partes.join(' · ') || 'ficha em dia';
}

export default function PortalInicio() {
  const router = useRouter();
  const [dados, setDados] = useState<Home | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [avisoFoto, setAvisoFoto] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/portal/inicio', { cache: 'no-store' });
        if (r.status === 401) {
          router.replace('/portal/entrar');
          return;
        }
        const d = await r.json();
        if (vivo) setDados(d);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [router]);

  const pets = dados?.pets || [];

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <div className="ptl-brand">
          <div className="ptl-mark" aria-hidden="true">
            🐾
          </div>
          <div className="ptl-bname">Empório do Pet</div>
          {dados?.tutor?.primeiroNome && (
            <div className="ptl-btag">Olá, {dados.tutor.primeiroNome}</div>
          )}
        </div>

        <div className="ptl-stack" style={{ marginTop: 14 }}>
          {carregando && <div className="ptl-vazio">Carregando…</div>}

          {/* --------------------------------------------- linha de cada pet */}
          {pets.map((p) => (
            <div key={p.id} className="ptl-pet-row">
              <span className="ptl-avatar-wrap">
                <span className="av" aria-hidden="true">
                  {p.foto ? <img src={p.foto} alt="" /> : emojiEspecie(p.especie)}
                </span>
                <button
                  className="ptl-avatar-cam"
                  aria-label={`Trocar a foto de ${p.nome}`}
                  onClick={() => setAvisoFoto(true)}
                >
                  📷
                </button>
              </span>
              <span>
                <b>{p.nome}</b>
                <small>
                  {descricaoPet(p)}
                  {p.segundoResponsavel ? ' · você é 2º responsável' : ''}
                </small>
              </span>
            </div>
          ))}

          <Link
            href="/portal/pets/novo"
            className="ptl-btn ghost"
            style={{ textDecoration: 'none' }}
          >
            + Adicionar um pet
          </Link>

          {avisoFoto && (
            <p className="ptl-aviso" style={{ textAlign: 'center' }}>
              A troca de foto entra junto com os exames em PDF, na próxima etapa.
            </p>
          )}

          {!carregando && pets.length === 0 && (
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '8px 0' }}>
                Ainda não há pet ativo no seu cadastro.
                <br />A recepção pode conferir isso pra você.
              </p>
            </div>
          )}

          {/* --------------------------------------------- alerta de internação */}
          {(dados?.internacoes || []).map((i) => (
            <Link
              key={i.petId}
              href="/portal/internacao"
              className="ptl-alerta"
              onClick={() => {
                try {
                  localStorage.setItem('ptl_pet', i.petId);
                } catch {
                  // aba anônima: a tela cai no primeiro pet
                }
              }}
            >
              <span className="lead" aria-hidden="true">
                🏥
              </span>
              <span>
                <span className="t" style={{ display: 'block' }}>
                  {i.petNome} está internado
                </span>
                <span className="s">desde {dataCurta(i.desde)} · ver boletim</span>
              </span>
              <span className="chev" aria-hidden="true">
                ›
              </span>
            </Link>
          ))}

          {/* --------------------------------------------- menu */}
          <div>
            <div className="ptl-label" style={{ marginLeft: 2 }}>
              menu
            </div>
            <div className="ptl-menu">
              {MENU.map((m) =>
                m.rota ? (
                  <Link key={m.titulo} href={m.rota} className="ptl-menu-item">
                    <em aria-hidden="true">{m.emoji}</em>
                    <span>{m.titulo}</span>
                    <small>{m.sub}</small>
                  </Link>
                ) : (
                  <div
                    key={m.titulo}
                    className="ptl-menu-item embreve"
                    aria-disabled="true"
                    title="Ainda em construção"
                  >
                    <em aria-hidden="true">{m.emoji}</em>
                    <span>{m.titulo}</span>
                    <small>{m.sub}</small>
                    <span className="ptl-tag-breve">em breve</span>
                  </div>
                ),
              )}

              <a
                className="ptl-menu-item contato"
                href={linkWhatsApp('Oi! Falo com vocês pelo Portal do Tutor.')}
                target="_blank"
                rel="noreferrer"
              >
                <em aria-hidden="true">💬</em>
                <span>Contato rápido</span>
              </a>
            </div>
          </div>

          {/* Fatia 6: instalar na tela inicial + avisos (somem se não der) */}
          <DicaDeInstalar />
          <CartaoAvisos />
        </div>
      </main>
    </div>
  );
}
