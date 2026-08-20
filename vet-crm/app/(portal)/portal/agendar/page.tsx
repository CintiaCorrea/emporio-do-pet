/**
 * Agendar (Fatia 4B.3) — portada do mockup aprovado
 * (docs/portal-tutor/portal-agendar-mockup.html).
 *
 * Quatro passos: quem e o quê → dia e hora → conferir → pronto. Mais os estados
 * que a realidade exige: travado por desmarcações, serviço com regra, agenda
 * cheia e a tela de mexer no horário já marcado.
 *
 * Nada aqui decide regra: os horários vêm do servidor já filtrados (escala,
 * ocupação, pet bravo, antecedência, teto do dia) e a confirmação é conferida
 * de novo lá antes de valer.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  PtlCabecalho,
  PtlEstilos,
  SeletorDePet,
  dataBr,
  linkWhatsApp,
  usePetSelecionado,
} from '../ptl-ui';

// 🌿 Consulta integrativa: texto explicativo + terapias que o tutor pode escolher.
const INTEGRATIVA_INTRO =
  'A medicina integrativa não substitui a medicina convencional — ela a complementa. Em vez de tratar apenas o sintoma, buscamos a causa raiz, considerando o pet como um todo: rotina, comportamento, alimentação, ambiente e a relação com seu tutor.\n\nO objetivo é fortalecer os mecanismos naturais de cura do organismo, com terapias menos invasivas, geralmente indolores e com pouca ou nenhuma contraindicação — trazendo mais qualidade de vida, principalmente em casos crônicos e degenerativos.';
const INTEGRATIVA_RODAPE =
  'A consulta segue os mesmos princípios da medicina convencional: exame clínico completo e exames laboratoriais quando necessários.';
const TERAPIAS: { nome: string; desc: string }[] = [
  { nome: 'Acupuntura', desc: 'agulhas finas estimulam pontos que atuam no sistema nervoso' },
  { nome: 'Homeopatia', desc: 'tratamento individualizado por substâncias dinamizadas' },
  { nome: 'Fitoterapia', desc: 'uso de plantas medicinais' },
  { nome: 'Ozonioterapia', desc: 'ozônio no tratamento de feridas e infecções' },
  { nome: 'Aromaterapia', desc: 'óleos essenciais para saúde e bem-estar' },
  { nome: 'Florais', desc: 'essências de Bach e St. Germain' },
  { nome: 'Fisioterapia', desc: 'recuperação de disfunções motoras' },
  { nome: 'Nutrição', desc: 'o alimento como remédio, com plano personalizado' },
  { nome: 'Terapia Neural', desc: 'reequilíbrio do sistema nervoso' },
  { nome: 'Terapia Cannábica', desc: 'tratamento com óleos de Cannabis' },
];
const ehIntegrativa = (s: { tipo?: string; rotulo?: string } | null) =>
  !!s && /integrativ/i.test(`${s.rotulo || ''} ${s.tipo || ''}`);

type Passo = 'escolher' | 'profissional' | 'quando' | 'conferir' | 'pronto';

interface Servico {
  tipo: string;
  rotulo: string;
  duracaoMin: number;
  /** Profissionais que o cliente pode escolher (vazio = sala/fisio, sem escolha). */
  profissionais: { id: string; nome: string }[];
}

interface Bloqueio {
  travado: boolean;
  desmarcacoes: number;
  limite: number;
  taxaCentavos: number;
  mensagem: string | null;
}

interface Horario {
  hora: string;
  inicioUtc: string;
  agendaId: string;
  agendaNome: string;
}

interface Dia {
  data: string;
  horarios: Horario[];
}

interface Marcado {
  id: string;
  petNome: string;
  rotulo: string;
  inicio: string;
  duracaoMin: number;
  podeMexerAte: string;
  podeMexer: boolean;
}

const MOTIVOS: Record<string, string> = {
  AGENDAMENTO_DESLIGADO: 'O agendamento pelo portal está desligado no momento.',
  SERVICO_NAO_LIBERADO: 'Esse atendimento é marcado pela recepção.',
  SEM_AGENDA_CONFIGURADA: 'Esse atendimento ainda não tem agenda aberta no portal.',
  PRECISA_SER_CLIENTE: 'Esse atendimento é para quem já foi atendido aqui. Fala com a gente!',
  PRECISA_TER_PACOTE: 'Esse atendimento é marcado dentro de um pacote, e não há pacote ativo agora.',
  LIMITE_DO_DIA: 'Você já tem o máximo de horários marcados para esse dia.',
};

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diaCurto(ymd: string) {
  const [a, m, d] = ymd.split('-').map(Number);
  const data = new Date(Date.UTC(a, m - 1, d));
  return { numero: String(d).padStart(2, '0'), semana: DIAS_SEMANA[data.getUTCDay()] };
}

function diaLongo(ymd: string) {
  const { semana } = diaCurto(ymd);
  const [a, m, d] = ymd.split('-').map(Number);
  return `${semana}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
}

function horaDe(iso: string) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function reais(centavos: number) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

export default function TelaAgendar() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();

  const [passo, setPasso] = useState<Passo>('escolher');
  const [ativo, setAtivo] = useState(true);
  const [bloqueio, setBloqueio] = useState<Bloqueio | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servico, setServico] = useState<Servico | null>(null);
  const [agendaSel, setAgendaSel] = useState<string | null>(null); // profissional escolhido (null = tanto faz)
  const [modalIntegrativa, setModalIntegrativa] = useState<Servico | null>(null); // pop-up da consulta integrativa
  const [terapias, setTerapias] = useState<string[]>([]); // terapias que o tutor marcou
  const [dias, setDias] = useState<Dia[]>([]);
  const [motivo, setMotivo] = useState<string | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [horaSel, setHoraSel] = useState<Horario | null>(null);
  const [meus, setMeus] = useState<Marcado[]>([]);
  const [remarcando, setRemarcando] = useState<Marcado | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');

  const carregarBase = useCallback(async () => {
    const [o, m] = await Promise.all([
      fetch('/api/portal/agendar/opcoes', { cache: 'no-store' }).then((r) => r.json()),
      fetch('/api/portal/agendamentos', { cache: 'no-store' }).then((r) => r.json()),
    ]);
    setAtivo(o?.ativo !== false);
    setBloqueio(o?.bloqueio || null);
    setServicos(o?.servicos || []);
    setMeus(m?.agendamentos || []);
  }, []);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        await carregarBase();
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [carregarBase]);

  /** Do passo "escolher": se o serviço tem 2+ profissionais, pergunta com quem; senão vai direto. */
  function escolherServico(s: Servico) {
    setServico(s);
    setAgendaSel(null);
    setErro('');
    // 🌿 Consulta integrativa: abre o pop-up (explicação + terapias) ANTES de seguir.
    if (ehIntegrativa(s)) {
      setTerapias([]);
      setModalIntegrativa(s);
      return;
    }
    prosseguir(s);
  }
  /** Continua o fluxo do serviço escolhido (com quem, ou direto pros horários). */
  function prosseguir(s: Servico) {
    if ((s.profissionais?.length ?? 0) >= 2) {
      setPasso('profissional');
    } else {
      verHorarios(s, null);
    }
  }

  async function verHorarios(s: Servico, agenda: string | null = agendaSel) {
    if (!petId) return;
    setServico(s);
    setErro('');
    setMotivo(null);
    setOcupado(true);
    try {
      const qs =
        `petId=${petId}&tipo=${encodeURIComponent(s.tipo)}` +
        (agenda ? `&agenda=${encodeURIComponent(agenda)}` : '');
      const r = await fetch(`/api/portal/agendar/dias?${qs}`, { cache: 'no-store' });
      const d = await r.json();
      setDias(d?.dias || []);
      setMotivo(d?.motivo || null);
      setDiaSel(d?.dias?.[0]?.data || null);
      setHoraSel(null);
      setPasso('quando');
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!petId || !servico || !horaSel) return;
    setOcupado(true);
    setErro('');
    try {
      const alvo = remarcando
        ? `/api/portal/agendamentos/${remarcando.id}/remarcar`
        : '/api/portal/agendar';
      const r = await fetch(alvo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          remarcando
            ? { inicio: horaSel.inicioUtc }
            : { petId, tipo: servico.tipo, inicio: horaSel.inicioUtc, agenda: agendaSel || undefined, terapias: terapias.length ? terapias : undefined },
        ),
      });
      const d = await r.json();
      if (!r.ok) {
        setErro(d?.message || d?.error || 'Não consegui marcar agora.');
        // O horário pode ter sido pego por outra pessoa: recarrega a lista.
        if (r.status === 409) {
          setPasso('quando');
          await verHorarios(servico);
        }
        return;
      }
      setRemarcando(null);
      await carregarBase();
      setPasso('pronto');
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setOcupado(false);
    }
  }

  async function desmarcar(m: Marcado) {
    setOcupado(true);
    setErro('');
    try {
      const r = await fetch(`/api/portal/agendamentos/${m.id}/desmarcar`, { method: 'POST' });
      const d = await r.json();
      if (!r.ok) {
        setErro(d?.message || 'Não consegui desmarcar.');
        return;
      }
      await carregarBase();
    } finally {
      setOcupado(false);
    }
  }

  const horariosDoDia = dias.find((d) => d.data === diaSel)?.horarios || [];
  const travado = !!bloqueio?.travado;

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo={passo === 'conferir' ? 'Confirmar' : 'Agendar'} />

        {carregando && <div className="ptl-vazio">Carregando…</div>}

        {/* ----------------------------------------- portal desligado */}
        {!carregando && !ativo && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-card">
              <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                Por aqui a agenda está fechada no momento.
                <br />A gente marca pra você num instante. 💚
              </p>
            </div>
            <a
              className="ptl-btn wa"
              href={linkWhatsApp('Oi! Quero marcar um horário.')}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a recepção
            </a>
          </div>
        )}

        {/* ----------------------------------------- travado por desmarcações */}
        {!carregando && ativo && travado && (
          <div className="ptl-stack" style={{ marginTop: 6 }}>
            <div className="ptl-warn">
              <b>Vamos combinar por aqui</b>
              <small>
                {bloqueio?.mensagem ||
                  'Os últimos horários foram desmarcados, então este a gente marca junto.'}
                {bloqueio && bloqueio.taxaCentavos > 0 && (
                  <> Há uma taxa de agendamento de R$ {reais(bloqueio.taxaCentavos)}.</>
                )}
              </small>
            </div>
            <a
              className="ptl-btn wa"
              href={linkWhatsApp('Oi! Quero marcar um horário para o meu pet.')}
              target="_blank"
              rel="noreferrer"
            >
              Falar com a recepção
            </a>
            <p className="ptl-aviso" style={{ textAlign: 'center' }}>
              A conta zera quando você comparece. 💚
            </p>
          </div>
        )}

        {!carregando && ativo && !travado && (
          <>
            {/* ------------------------------------- meus horários */}
            {meus.length > 0 && passo === 'escolher' && (
              <div className="ptl-stack" style={{ marginTop: 2, marginBottom: 4 }}>
                <div className="ptl-label">seus próximos horários</div>
                {meus.map((m) => (
                  <div key={m.id} className="ptl-card" style={{ padding: 13 }}>
                    <div style={{ fontSize: 14, fontWeight: 800 }}>
                      {m.rotulo} · {m.petNome}
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--cinza)', marginTop: 2 }}>
                      {diaLongo(m.inicio.slice(0, 10))} às {horaDe(m.inicio)}
                    </div>
                    {m.podeMexer ? (
                      <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
                        <button
                          className="ptl-btn ghost"
                          disabled={ocupado}
                          onClick={() => {
                            setRemarcando(m);
                            setAgendaSel(null);
                            const s = servicos.find((x) => x.rotulo === m.rotulo);
                            if (s) verHorarios(s, null);
                          }}
                        >
                          Remarcar
                        </button>
                        <button
                          className="ptl-btn ghost"
                          style={{ color: '#993556', borderColor: 'var(--chiclete)' }}
                          disabled={ocupado}
                          onClick={() => desmarcar(m)}
                        >
                          Desmarcar
                        </button>
                      </div>
                    ) : (
                      <p className="ptl-aviso" style={{ marginTop: 8 }}>
                        Para mexer nesse horário, fale com a gente — está perto da hora.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* ------------------------------------- 1. quem e o quê */}
            {passo === 'escolher' && (
              <div className="ptl-stack" style={{ marginTop: 4 }}>
                <div className="ptl-alerta" style={{ cursor: 'default' }}>
                  <span className="lead" aria-hidden="true">
                    ⭐
                  </span>
                  <span className="s">Você marca direto, sem esperar confirmação.</span>
                </div>

                {pets.length > 1 && (
                  <div>
                    <div className="ptl-label">para quem</div>
                    <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />
                  </div>
                )}

                <div>
                  <div className="ptl-label">tipo de atendimento</div>
                  {servicos.length === 0 ? (
                    <div className="ptl-card">
                      <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                        Nenhum atendimento liberado para marcar por aqui ainda.
                      </p>
                    </div>
                  ) : (
                    <div className="ptl-menu">
                      {servicos.map((s) => (
                        <button
                          key={s.tipo}
                          className="ptl-menu-item"
                          disabled={ocupado || !petId}
                          onClick={() => escolherServico(s)}
                          style={{ minHeight: 0 }}
                        >
                          <span>{s.rotulo}</span>
                          <small>{s.duracaoMin} min</small>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ------------------------------------- 1b. com qual profissional */}
            {passo === 'profissional' && servico && (
              <div className="ptl-stack" style={{ marginTop: 4 }}>
                <div className="ptl-label">
                  {servico.rotulo}
                  {pet ? ` do ${pet.nome}` : ''} · com qual profissional?
                </div>
                <div className="ptl-menu">
                  {servico.profissionais.map((p) => (
                    <button
                      key={p.id}
                      className="ptl-menu-item"
                      disabled={ocupado}
                      onClick={() => {
                        setAgendaSel(p.id);
                        verHorarios(servico, p.id);
                      }}
                      style={{ minHeight: 0 }}
                    >
                      <span>{p.nome}</span>
                    </button>
                  ))}
                </div>
                <button
                  className="ptl-btn ghost"
                  disabled={ocupado}
                  onClick={() => {
                    setAgendaSel(null);
                    verHorarios(servico, null);
                  }}
                >
                  Tanto faz — primeiro horário livre
                </button>
                <button
                  className="ptl-btn ghost"
                  disabled={ocupado}
                  style={{ opacity: 0.7 }}
                  onClick={() => {
                    setPasso('escolher');
                    setServico(null);
                  }}
                >
                  ‹ voltar
                </button>
              </div>
            )}

            {/* ------------------------------------- 2. dia e hora */}
            {passo === 'quando' && servico && (
              <div className="ptl-stack" style={{ marginTop: 4 }}>
                <div className="ptl-label">
                  {remarcando ? 'remarcar · ' : ''}
                  {servico.rotulo}
                  {pet ? ` do ${pet.nome}` : ''} · {servico.duracaoMin} min
                  {agendaSel &&
                    ` · com ${servico.profissionais.find((p) => p.id === agendaSel)?.nome ?? ''}`}
                </div>

                {motivo && (
                  <div className="ptl-card">
                    <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                      {MOTIVOS[motivo] || 'Não há horário disponível agora.'}
                    </p>
                  </div>
                )}

                {!motivo && dias.length === 0 && (
                  <div className="ptl-card">
                    <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                      Não encontrei horário livre nos próximos dias. 😕
                      <br />
                      Fala com a gente que a recepção dá um jeito.
                    </p>
                  </div>
                )}

                {dias.length > 0 && (
                  <>
                    <div className="ptl-chips">
                      {dias.map((d) => {
                        const { numero, semana } = diaCurto(d.data);
                        const sel = d.data === diaSel;
                        return (
                          <button
                            key={d.data}
                            className={`ptl-chip${sel ? ' sel' : ''}`}
                            onClick={() => {
                              setDiaSel(d.data);
                              setHoraSel(null);
                            }}
                            style={{ textAlign: 'center', lineHeight: 1.15 }}
                          >
                            {numero}
                            <br />
                            <span style={{ fontSize: 9.5, fontWeight: 600 }}>{semana}</span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="ptl-label">
                      horários de {diaSel ? diaLongo(diaSel) : ''}
                    </div>
                    <div className="ptl-chips" style={{ flexWrap: 'wrap' }}>
                      {horariosDoDia.map((h) => (
                        <button
                          key={h.inicioUtc}
                          className={`ptl-chip${horaSel?.inicioUtc === h.inicioUtc ? ' sel' : ''}`}
                          style={{ borderColor: 'var(--turquesa)' }}
                          onClick={() => setHoraSel(h)}
                        >
                          {h.hora}
                        </button>
                      ))}
                    </div>

                    {erro && <p className="ptl-erro">{erro}</p>}

                    <button
                      className="ptl-btn"
                      disabled={!horaSel || ocupado}
                      onClick={() => setPasso('conferir')}
                    >
                      Continuar
                    </button>
                    <p className="ptl-aviso" style={{ textAlign: 'center' }}>
                      Horário some da lista se alguém pegar antes. 😉
                    </p>
                  </>
                )}

                {(motivo || dias.length === 0) && (
                  <>
                    <a
                      className="ptl-btn wa"
                      href={linkWhatsApp(
                        `Oi! Queria marcar ${servico.rotulo}${pet ? ` para o ${pet.nome}` : ''}.`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Falar com a recepção
                    </a>
                    <button
                      className="ptl-btn quiet"
                      onClick={() => {
                        setPasso('escolher');
                        setRemarcando(null);
                      }}
                    >
                      Escolher outro atendimento
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ------------------------------------- 3. conferir */}
            {passo === 'conferir' && servico && horaSel && (
              <div className="ptl-stack" style={{ marginTop: 4 }}>
                <div className="ptl-form">
                  <div className="ptl-linha">
                    <label>Pet</label>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{pet?.nome}</span>
                  </div>
                  <div className="ptl-linha">
                    <label>Atendimento</label>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{servico.rotulo}</span>
                  </div>
                  <div className="ptl-linha">
                    <label>Quando</label>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
                      {diaSel ? diaLongo(diaSel) : ''} · {horaSel.hora}
                    </span>
                  </div>
                  <div className="ptl-linha">
                    <label>Duração</label>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{servico.duracaoMin} minutos</span>
                  </div>
                </div>

                {erro && <p className="ptl-erro">{erro}</p>}

                <button className="ptl-btn" disabled={ocupado} onClick={confirmar}>
                  {ocupado
                    ? 'Marcando…'
                    : remarcando
                      ? 'Confirmar novo horário'
                      : 'Confirmar agendamento'}
                </button>
                <button className="ptl-btn quiet" onClick={() => setPasso('quando')}>
                  Voltar
                </button>
                <p className="ptl-aviso" style={{ textAlign: 'center' }}>
                  Chegue com <b>10 minutos de folga</b>. 🐾
                </p>
              </div>
            )}

            {/* ------------------------------------- 4. pronto */}
            {passo === 'pronto' && (
              <div className="ptl-stack" style={{ marginTop: 4 }}>
                <div className="ptl-salvo" style={{ padding: '18px 14px', fontSize: 14 }}>
                  Agendado! ✓
                  <br />
                  <span style={{ fontWeight: 400, fontSize: 12.5 }}>
                    {meus[0]
                      ? `${meus[0].rotulo} · ${diaLongo(meus[0].inicio.slice(0, 10))} às ${horaDe(meus[0].inicio)}`
                      : 'Seu horário está confirmado.'}
                  </span>
                </div>
                {meus[0] && (
                  <div className="ptl-form">
                    <div className="ptl-linha">
                      <label>Chegue com</label>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>10 min de folga</span>
                    </div>
                    <div className="ptl-linha">
                      <label>Pode mexer até</label>
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        {dataBr(meus[0].podeMexerAte)} · {horaDe(meus[0].podeMexerAte)}
                      </span>
                    </div>
                  </div>
                )}
                <button className="ptl-btn quiet" onClick={() => setPasso('escolher')}>
                  Voltar
                </button>
              </div>
            )}
          </>
        )}

        {/* 🌿 Pop-up da consulta integrativa: explica + deixa o tutor marcar as terapias */}
        {modalIntegrativa && (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(3,20,30,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
            onClick={() => setModalIntegrativa(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', width: '100%', maxWidth: 480, maxHeight: '85vh', overflowY: 'auto', borderRadius: 16, padding: '18px 16px 16px', boxShadow: '0 12px 40px rgba(1,77,94,0.25)' }}
            >
              <div style={{ fontSize: 17, fontWeight: 800, color: '#014D5E', marginBottom: 8 }}>🌿 Medicina Veterinária Integrativa</div>
              <p style={{ whiteSpace: 'pre-wrap', fontSize: 13.5, lineHeight: 1.55, color: '#374151', margin: '0 0 14px' }}>{INTEGRATIVA_INTRO}</p>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#014D5E', margin: '2px 0 7px' }}>Marque as terapias que te interessam (opcional):</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {TERAPIAS.map((t) => {
                  const on = terapias.includes(t.nome);
                  return (
                    <button
                      key={t.nome}
                      type="button"
                      onClick={() => setTerapias((cur) => (cur.includes(t.nome) ? cur.filter((x) => x !== t.nome) : [...cur, t.nome]))}
                      style={{ textAlign: 'left', display: 'flex', gap: 9, alignItems: 'flex-start', border: `1.5px solid ${on ? '#00A1AE' : '#E3ECEC'}`, background: on ? '#F0FBFC' : '#fff', borderRadius: 12, padding: '9px 11px', cursor: 'pointer' }}
                    >
                      <span style={{ marginTop: 1, fontSize: 15 }} aria-hidden="true">{on ? '✅' : '⬜'}</span>
                      <span>
                        <span style={{ fontWeight: 700, color: '#0E2244', fontSize: 13.5 }}>{t.nome}</span>
                        <span style={{ display: 'block', color: '#6B7B7E', fontSize: 12 }}>{t.desc}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p style={{ fontSize: 12, color: '#6B7B7E', fontStyle: 'italic', margin: '0 0 15px' }}>{INTEGRATIVA_RODAPE}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ptl-btn quiet" style={{ flex: '0 0 auto' }} onClick={() => setModalIntegrativa(null)}>Cancelar</button>
                <button
                  className="ptl-btn"
                  style={{ flex: 1 }}
                  onClick={() => { const s = modalIntegrativa; setModalIntegrativa(null); if (s) prosseguir(s); }}
                >
                  Continuar{terapias.length ? ` · ${terapias.length}` : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
