/**
 * Entrada do Portal do Tutor — telefone -> codigo no WhatsApp -> (desempate) -> dentro.
 * Fiel ao mockup aprovado (docs/portal-tutor/portal-login-mockup.html).
 */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PtlEstilos, emojiEspecie, linkWhatsApp } from '../ptl-ui';

type Passo = 'telefone' | 'codigo' | 'escolher' | 'sem_cadastro' | 'bloqueado';

interface OpcaoCadastro {
  tutorId: string;
  primeiroNome: string;
  pets: Array<{ nome: string; especie: string; raca: string | null; idadeAnos: number | null }>;
}

/** (85) 98601-8111 enquanto digita. */
function mascarar(valor: string) {
  const d = valor.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function resumoPet(p: OpcaoCadastro['pets'][number]) {
  const partes = [p.raca || null, p.idadeAnos != null ? `${p.idadeAnos} anos` : null];
  return partes.filter(Boolean).join(' · ');
}

export default function EntrarNoPortal() {
  const router = useRouter();

  const [passo, setPasso] = useState<Passo>('telefone');
  const [telefone, setTelefone] = useState('');
  const [mascarado, setMascarado] = useState('');
  const [digitos, setDigitos] = useState<string[]>(Array(6).fill(''));
  const [opcoes, setOpcoes] = useState<OpcaoCadastro[]>([]);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [desempateToken, setDesempateToken] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);

  const caixas = useRef<Array<HTMLInputElement | null>>([]);
  const codigo = useMemo(() => digitos.join(''), [digitos]);
  const telefoneOk = telefone.replace(/\D/g, '').length >= 10;

  // Contagem para liberar o reenvio.
  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  useEffect(() => {
    if (passo === 'codigo') caixas.current[0]?.focus();
  }, [passo]);

  async function pedirCodigo(reenvio = false) {
    setErro('');
    setOcupado(true);
    try {
      const r = await fetch('/api/portal/auth/codigo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone }),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d?.message || d?.error || 'Não foi possível enviar o código agora.');
        return;
      }
      setMascarado(d.telefoneMascarado || '');
      setEspera(d.reenviarEmSegundos || 60);
      if (!reenvio) {
        setDigitos(Array(6).fill(''));
        setPasso('codigo');
      }
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function conferir(codigoInformado: string) {
    setErro('');
    setOcupado(true);
    try {
      const r = await fetch('/api/portal/auth/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefone, codigo: codigoInformado }),
      });
      const d = await r.json();

      if (d?.status === 'ok') {
        router.replace('/portal');
        return;
      }
      if (d?.status === 'escolher') {
        setOpcoes(d.opcoes || []);
        setDesempateToken(d.desempateToken || '');
        setPasso('escolher');
        return;
      }
      if (d?.status === 'sem_cadastro') {
        setPasso('sem_cadastro');
        return;
      }
      if (d?.status === 'bloqueado') {
        setPasso('bloqueado');
        return;
      }

      const restam = d?.tentativasRestantes ?? 0;
      setErro(
        restam > 0
          ? `Código incorreto. ${restam === 1 ? 'Resta 1 tentativa' : `Restam ${restam} tentativas`}.`
          : 'Código incorreto ou vencido. Peça um novo.',
      );
      setDigitos(Array(6).fill(''));
      caixas.current[0]?.focus();
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarEscolha() {
    if (!escolhido) return;
    setErro('');
    setOcupado(true);
    try {
      const r = await fetch('/api/portal/auth/escolher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desempateToken, tutorId: escolhido }),
      });
      const d = await r.json();
      if (d?.status === 'ok') {
        router.replace('/portal');
        return;
      }
      setErro('Essa escolha venceu. Vamos começar de novo.');
      setPasso('telefone');
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  function digitar(i: number, valor: string) {
    const limpo = valor.replace(/\D/g, '');

    // Colar o código inteiro de uma vez.
    if (limpo.length > 1) {
      const novos = limpo.slice(0, 6).split('');
      const preenchido = Array(6)
        .fill('')
        .map((_, k) => novos[k] || '');
      setDigitos(preenchido);
      if (preenchido.every(Boolean)) conferir(preenchido.join(''));
      else caixas.current[Math.min(novos.length, 5)]?.focus();
      return;
    }

    const novos = [...digitos];
    novos[i] = limpo;
    setDigitos(novos);
    if (limpo && i < 5) caixas.current[i + 1]?.focus();
    if (novos.every(Boolean)) conferir(novos.join(''));
  }

  function teclou(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digitos[i] && i > 0) caixas.current[i - 1]?.focus();
  }

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <div className="ptl-brand">
          <div className="ptl-mark" aria-hidden="true">
            <img src="/images/logo.png" alt="" />
          </div>
          <div className="ptl-bname">Empório do Pet</div>
          <div className="ptl-btag">Portal do Tutor</div>
        </div>

        {/* ------------------------------------------------ 1. telefone */}
        {passo === 'telefone' && (
          <form
            className="ptl-stack"
            onSubmit={(e) => {
              e.preventDefault();
              if (telefoneOk && !ocupado) pedirCodigo();
            }}
          >
            <div className="ptl-field">
              <label htmlFor="ptl-tel">Seu celular com WhatsApp</label>
              <input
                id="ptl-tel"
                className="ptl-input"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="(00) 00000-0000"
                value={mascarar(telefone)}
                onChange={(e) => setTelefone(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            {erro && <p className="ptl-erro">{erro}</p>}
            <button className="ptl-btn wa" type="submit" disabled={!telefoneOk || ocupado}>
              {ocupado ? 'Enviando…' : 'Receber código no WhatsApp'}
            </button>
            <p className="ptl-hint">
              Use o <b>mesmo número</b> que você deixou na clínica.
            </p>
          </form>
        )}

        {/* ------------------------------------------------ 2. código */}
        {passo === 'codigo' && (
          <div className="ptl-stack">
            <div>
              <h1 className="ptl-h">Digite o código que te mandamos</h1>
              <p className="ptl-p" style={{ marginTop: 6 }}>
                Enviado no WhatsApp do número {mascarado}.
              </p>
            </div>

            <div className="ptl-otp">
              {digitos.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    caixas.current[i] = el;
                  }}
                  value={d}
                  inputMode="numeric"
                  autoComplete={i === 0 ? 'one-time-code' : 'off'}
                  maxLength={6}
                  aria-label={`Dígito ${i + 1} de 6`}
                  onChange={(e) => digitar(i, e.target.value)}
                  onKeyDown={(e) => teclou(i, e)}
                />
              ))}
            </div>

            {erro && <p className="ptl-erro">{erro}</p>}

            <button
              className="ptl-btn"
              disabled={codigo.length < 6 || ocupado}
              onClick={() => conferir(codigo)}
            >
              {ocupado ? 'Conferindo…' : 'Entrar'}
            </button>

            <button
              className="ptl-btn quiet"
              disabled={espera > 0 || ocupado}
              onClick={() => pedirCodigo(true)}
            >
              {espera > 0 ? `Reenviar código em 0:${String(espera).padStart(2, '0')}` : 'Reenviar código'}
            </button>

            <p className="ptl-hint">
              Número errado?{' '}
              <button
                className="ptl-link"
                onClick={() => {
                  setPasso('telefone');
                  setErro('');
                }}
              >
                Voltar e corrigir
              </button>
            </p>
          </div>
        )}

        {/* ------------------------------------------------ 3. desempate */}
        {passo === 'escolher' && (
          <div className="ptl-stack">
            <div>
              <h1 className="ptl-h">Encontramos mais de um cadastro com esse número</h1>
              <p className="ptl-p" style={{ marginTop: 6 }}>
                Pra te mostrar as informações certas, qual desses pets é seu?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {opcoes.map((o) => {
                const pet = o.pets[0];
                const outros = o.pets.length - 1;
                return (
                  <button
                    key={o.tutorId}
                    type="button"
                    className={`ptl-pick${escolhido === o.tutorId ? ' sel' : ''}`}
                    onClick={() => setEscolhido(o.tutorId)}
                  >
                    <span className="av" aria-hidden="true">
                      {emojiEspecie(pet?.especie)}
                    </span>
                    <span>
                      <b>{pet ? pet.nome : o.primeiroNome}</b>
                      <small>
                        {pet ? resumoPet(pet) : 'cadastro sem pet ativo'}
                        {outros > 0 ? ` · e mais ${outros}` : ''}
                      </small>
                    </span>
                    <span className="radio" />
                  </button>
                );
              })}

              <a
                className="ptl-pick none"
                href={linkWhatsApp(
                  'Oi! Tentei entrar no Portal do Tutor e nenhum dos pets que apareceram é meu.',
                )}
                target="_blank"
                rel="noreferrer"
              >
                <span className="av" aria-hidden="true">
                  ?
                </span>
                <span>
                  <b>Nenhum deles é meu</b>
                  <small>Falar com a recepção</small>
                </span>
                <span className="radio" />
              </a>
            </div>

            {erro && <p className="ptl-erro">{erro}</p>}

            <button className="ptl-btn" disabled={!escolhido || ocupado} onClick={confirmarEscolha}>
              {ocupado ? 'Entrando…' : 'Continuar'}
            </button>
          </div>
        )}

        {/* ------------------------------------------------ sem cadastro */}
        {passo === 'sem_cadastro' && (
          <div className="ptl-stack">
            <div className="ptl-warn">
              <b>Não encontramos esse número</b>
              <small>
                Talvez seu cadastro esteja com outro telefone. A recepção resolve num minutinho.
              </small>
            </div>
            <a
              className="ptl-btn wa"
              href={linkWhatsApp(
                'Oi! Tentei entrar no Portal do Tutor e meu número não foi encontrado.',
              )}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a recepção
            </a>
            <button
              className="ptl-btn ghost"
              onClick={() => {
                setTelefone('');
                setPasso('telefone');
              }}
            >
              Tentar outro número
            </button>
          </div>
        )}

        {/* ------------------------------------------------ bloqueado */}
        {passo === 'bloqueado' && (
          <div className="ptl-stack">
            <div className="ptl-warn">
              <b>Vamos dar uma pausa</b>
              <small>
                Foram tentativas demais com o código errado. Por segurança, tente de novo daqui a 15
                minutos.
              </small>
            </div>
            <a
              className="ptl-btn wa"
              href={linkWhatsApp('Oi! Não estou conseguindo entrar no Portal do Tutor.')}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a recepção
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
