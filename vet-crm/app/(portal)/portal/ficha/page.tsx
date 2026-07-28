/**
 * Minha ficha (Fatia 2) — portada do protótipo (#ficha).
 *
 * O telefone fica travado: é ele que identifica o tutor no login. Trocar de
 * número passa pela recepção, senão a pessoa se tranca fora do portal.
 *
 * O que é editado aqui entra direto no cadastro (decisão da Cintia, 28/07), e
 * toda mudança fica registrada — inclusive o que for apagado.
 */
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PtlEstilos, linkWhatsApp } from '../ptl-ui';

interface TutorFicha {
  nome: string;
  email: string | null;
  telefone: string | null;
  endereco: {
    cep: string | null;
    rua: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
  };
}

interface PetFicha {
  id: string;
  nome: string;
  especie: string;
  raca: string | null;
  nascimento: string | null;
  alergias: string[];
}

const ESPECIES: Record<string, string> = {
  CANINE: 'Cão',
  FELINE: 'Gato',
  BIRD: 'Ave',
  EXOTIC: 'Exótico',
  REPTILE: 'Réptil',
  RODENT: 'Roedor',
};

/** (85) 98601-8111 — só para exibir; o campo é travado. */
function telefoneBonito(n?: string | null) {
  const d = (n || '').replace(/\D/g, '');
  if (d.length < 10) return n || '—';
  const s = d.length > 11 ? d.slice(-11) : d;
  return `(${s.slice(0, 2)}) ${s.slice(2, 7)}-${s.slice(7)}`;
}

export default function MinhaFicha() {
  const router = useRouter();
  const [tutor, setTutor] = useState<TutorFicha | null>(null);
  const [pets, setPets] = useState<PetFicha[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const r = await fetch('/api/portal/ficha', { cache: 'no-store' });
        if (r.status === 401) {
          router.replace('/portal/entrar');
          return;
        }
        const d = await r.json();
        if (!vivo) return;
        setTutor(d.tutor);
        setPets(d.pets || []);
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [router]);

  function mudarTutor(campo: keyof TutorFicha | keyof TutorFicha['endereco'], valor: string) {
    setSalvo(false);
    setTutor((t) => {
      if (!t) return t;
      if (campo === 'nome' || campo === 'email') return { ...t, [campo]: valor };
      return { ...t, endereco: { ...t.endereco, [campo]: valor } };
    });
  }

  function mudarPet(id: string, campo: keyof PetFicha, valor: string) {
    setSalvo(false);
    setPets((lista) =>
      lista.map((p) =>
        p.id !== id
          ? p
          : campo === 'alergias'
            ? { ...p, alergias: valor.split(/[,;]/).map((x) => x.trim()).filter(Boolean) }
            : { ...p, [campo]: valor },
      ),
    );
  }

  async function salvar() {
    if (!tutor) return;
    setSalvando(true);
    setErro('');
    try {
      const r = await fetch('/api/portal/ficha', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutor: {
            nome: tutor.nome,
            email: tutor.email,
            cep: tutor.endereco.cep,
            rua: tutor.endereco.rua,
            numero: tutor.endereco.numero,
            complemento: tutor.endereco.complemento,
            bairro: tutor.endereco.bairro,
            cidade: tutor.endereco.cidade,
            estado: tutor.endereco.estado,
          },
          pets: pets.map((p) => ({
            id: p.id,
            raca: p.raca,
            nascimento: p.nascimento,
            alergias: p.alergias,
          })),
        }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d?.message || d?.error || 'Não consegui salvar agora.');
        return;
      }
      setSalvo(true);
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setSalvando(false);
    }
  }

  async function sair() {
    await fetch('/api/portal/auth/sair', { method: 'POST' });
    router.replace('/portal/entrar');
  }

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <div className="ptl-head">
          <Link href="/portal" className="ptl-back" aria-label="Voltar ao início">
            ‹
          </Link>
          Minha ficha
        </div>

        {carregando && <div className="ptl-vazio">Carregando…</div>}

        {!carregando && tutor && (
          <div className="ptl-stack" style={{ marginTop: 4 }}>
            <div>
              <div className="ptl-label">seus dados</div>
              <div className="ptl-form">
                <div className="ptl-linha">
                  <label htmlFor="f-nome">Nome</label>
                  <input
                    id="f-nome"
                    value={tutor.nome || ''}
                    onChange={(e) => mudarTutor('nome', e.target.value)}
                  />
                </div>
                <div className="ptl-linha">
                  <label>Telefone</label>
                  <span className="trava">
                    <input value={telefoneBonito(tutor.telefone)} disabled />
                    <span aria-hidden="true">🔒</span>
                  </span>
                </div>
                <div className="ptl-linha">
                  <label htmlFor="f-email">E-mail</label>
                  <input
                    id="f-email"
                    type="email"
                    inputMode="email"
                    placeholder="—"
                    value={tutor.email || ''}
                    onChange={(e) => mudarTutor('email', e.target.value)}
                  />
                </div>
              </div>
              <p className="ptl-aviso" style={{ margin: '7px 2px 0' }}>
                Para trocar de telefone, fale com a recepção — é ele que abre o portal pra você.
              </p>
            </div>

            <div>
              <div className="ptl-label">endereço</div>
              <div className="ptl-form">
                {(
                  [
                    ['cep', 'CEP'],
                    ['rua', 'Rua'],
                    ['numero', 'Número'],
                    ['complemento', 'Complemento'],
                    ['bairro', 'Bairro'],
                    ['cidade', 'Cidade'],
                    ['estado', 'Estado'],
                  ] as const
                ).map(([campo, rotulo]) => (
                  <div className="ptl-linha" key={campo}>
                    <label htmlFor={`f-${campo}`}>{rotulo}</label>
                    <input
                      id={`f-${campo}`}
                      placeholder="—"
                      value={tutor.endereco[campo] || ''}
                      onChange={(e) => mudarTutor(campo, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {pets.map((p) => (
              <div key={p.id}>
                <div className="ptl-label">dados do {p.nome}</div>
                <div className="ptl-form">
                  <div className="ptl-linha">
                    <label>Espécie</label>
                    <span className="trava">
                      <input value={ESPECIES[p.especie] || p.especie} disabled />
                      <span aria-hidden="true">🔒</span>
                    </span>
                  </div>
                  <div className="ptl-linha">
                    <label htmlFor={`p-raca-${p.id}`}>Raça</label>
                    <input
                      id={`p-raca-${p.id}`}
                      placeholder="—"
                      value={p.raca || ''}
                      onChange={(e) => mudarPet(p.id, 'raca', e.target.value)}
                    />
                  </div>
                  <div className="ptl-linha">
                    <label htmlFor={`p-nasc-${p.id}`}>Nascimento</label>
                    <input
                      id={`p-nasc-${p.id}`}
                      type="date"
                      value={p.nascimento || ''}
                      onChange={(e) => mudarPet(p.id, 'nascimento', e.target.value)}
                    />
                  </div>
                  <div className="ptl-linha">
                    <label htmlFor={`p-alerg-${p.id}`}>Alergias</label>
                    <input
                      id={`p-alerg-${p.id}`}
                      placeholder="nenhuma conhecida"
                      value={p.alergias.join(', ')}
                      onChange={(e) => mudarPet(p.id, 'alergias', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            ))}

            {pets.length === 0 && (
              <p className="ptl-vazio">Nenhum pet ativo no seu cadastro.</p>
            )}

            {erro && <p className="ptl-erro">{erro}</p>}
            {salvo && <p className="ptl-salvo">Pronto, ficha atualizada ✓</p>}

            <button className="ptl-btn" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : 'Salvar alterações'}
            </button>

            <p className="ptl-aviso" style={{ textAlign: 'center' }}>
              Viu algo errado que você não consegue corrigir?{' '}
              <a
                href={linkWhatsApp('Oi! Preciso corrigir um dado na minha ficha do portal.')}
                target="_blank"
                rel="noreferrer"
                style={{ color: 'var(--turquesa)', fontWeight: 700 }}
              >
                Fale com a recepção
              </a>
              .
            </p>

            <button className="ptl-btn quiet" onClick={sair}>
              Sair do portal
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
