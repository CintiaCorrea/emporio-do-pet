"use client";
/**
 * Configurações › Agenda › Agendamento online (Fatia 4B.1).
 * Portada do mockup aprovado (mockups-base44/agenda-online-regras-mockup.html).
 *
 * Aqui a equipe manda nas regras do que o cliente pode marcar sozinho pelo
 * Portal do Tutor. Nenhum número fica preso no código.
 *
 * A lista de serviços vem dos Tipos de atendimento (Configurações › Atendimento):
 * tipo novo aparece aqui sozinho, sempre DESLIGADO — nada nasce aberto ao cliente.
 */
import { useEffect, useRef, useState } from "react";
import { usePageTitle } from "@/lib/ui/PageHeaderContext";
import { B44, Card, Btn, Input, Select } from "@/components/ui/base44";

type Restricao = "TODOS" | "JA_CLIENTE" | "TEM_PACOTE";

interface Config {
  ativo: boolean;
  antecedenciaMinHoras: number;
  janelaDias: number;
  prazoCancelarHoras: number;
  maxPorDia: number;
  desmarcacoesParaTaxa: number;
  taxaCentavos: number;
  mensagemTravado: string | null;
}

interface Servico {
  tipo: string;
  rotulo: string;
  ativo: boolean;
  duracaoMin: number;
  agendas: string[];
  restricao: Restricao;
  responsavelUserId: string | null;
  responsavelPorDia?: Record<string, string> | null;
}

interface OpcaoAgenda {
  id: string;
  nome: string;
  origem: "profissional" | "sala";
  grupo: string | null;
  permiteSobreposicao?: boolean;
  sobDemanda?: boolean;
}

interface Responsavel {
  userId: string;
  nome: string;
}

interface Travado {
  tutorId: string;
  nome: string;
  desmarcacoes: number;
}

const RESTRICOES: { v: Restricao; l: string }[] = [
  { v: "TODOS", l: "todos" },
  { v: "JA_CLIENTE", l: "já é cliente" },
  { v: "TEM_PACOTE", l: "tem pacote ativo" },
];

/** Interruptor no visual do kit (o kit não tem um). */
function Chave({
  ligado,
  onToggle,
  rotulo,
  pequeno = false,
}: {
  ligado: boolean;
  onToggle: () => void;
  rotulo: string;
  pequeno?: boolean;
}) {
  const w = pequeno ? 38 : 44;
  const h = pequeno ? 21 : 25;
  const bola = pequeno ? 15 : 19;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      onClick={onToggle}
      style={{
        width: w,
        height: h,
        borderRadius: 20,
        background: ligado ? B44.primary : "#D9D3C6",
        position: "relative",
        flex: "none",
        transition: "background .15s",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 3,
          left: ligado ? w - bola - 3 : 3,
          width: bola,
          height: bola,
          borderRadius: "50%",
          background: "#fff",
          transition: "left .15s",
        }}
      />
    </button>
  );
}

function Linha({
  titulo,
  ajuda,
  children,
}: {
  titulo: string;
  ajuda?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2.5"
      style={{ borderBottom: `1px solid ${B44.lineSoft}` }}
    >
      <div className="flex-1">
        <div className="text-[13.5px]" style={{ color: B44.text1 }}>
          {titulo}
        </div>
        {ajuda && (
          <div className="text-[11.5px] mt-0.5" style={{ color: B44.text2 }}>
            {ajuda}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/** Campo numérico curto, com sufixo ("horas", "dias"...). */
function Numero({
  valor,
  onChange,
  sufixo,
  min = 0,
}: {
  valor: number;
  onChange: (n: number) => void;
  sufixo?: string;
  min?: number;
}) {
  return (
    <span className="flex items-center gap-1.5" style={{ flex: "none" }}>
      <Input
        type="number"
        min={min}
        value={String(valor)}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: 78, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
      />
      {sufixo && (
        <span className="text-[12.5px]" style={{ color: B44.text2, minWidth: 42 }}>
          {sufixo}
        </span>
      )}
    </span>
  );
}

export default function AgendamentoOnlinePage() {
  usePageTitle("Agendamento online", "O que o cliente pode marcar pelo Portal do Tutor");

  const [cfg, setCfg] = useState<Config | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [agendas, setAgendas] = useState<OpcaoAgenda[]>([]);
  const [responsaveis, setResponsaveis] = useState<Responsavel[]>([]);
  const [travados, setTravados] = useState<Travado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const jaCarregou = useRef(false);

  useEffect(() => {
    if (jaCarregou.current) return;
    jaCarregou.current = true;
    (async () => {
      try {
        const r = await fetch("/api/portal-admin/agenda/regras", { cache: "no-store" });
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Não consegui carregar as regras");
        setCfg(d.config);
        setServicos(d.servicos || []);
        setAgendas(d.agendas || []);
        setResponsaveis(d.responsaveis || []);
        const t = await fetch("/api/portal-admin/agenda/travados", { cache: "no-store" })
          .then((x) => x.json())
          .catch(() => null);
        setTravados(t?.travados || []);
      } catch (e: any) {
        setAviso({ tipo: "erro", texto: e?.message || "Não consegui carregar as regras" });
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  function mudarCfg<K extends keyof Config>(campo: K, valor: Config[K]) {
    setAviso(null);
    setCfg((c) => (c ? { ...c, [campo]: valor } : c));
  }

  function mudarServico(tipo: string, campo: keyof Servico, valor: any) {
    setAviso(null);
    setServicos((lista) =>
      lista.map((s) => (s.tipo === tipo ? { ...s, [campo]: valor } : s)),
    );
  }

  // Responsável por dia da semana (sala/fisio): dow "1".."6" (seg..sáb) → userId. Vazio remove o dia.
  function mudarRespDia(tipo: string, dow: string, userId: string) {
    setAviso(null);
    setServicos((lista) =>
      lista.map((s) => {
        if (s.tipo !== tipo) return s;
        const m: Record<string, string> = { ...(s.responsavelPorDia || {}) };
        if (userId) m[dow] = userId; else delete m[dow];
        return { ...s, responsavelPorDia: Object.keys(m).length ? m : null };
      }),
    );
  }

  function alternarAgenda(tipo: string, agendaId: string) {
    setAviso(null);
    setServicos((lista) =>
      lista.map((s) =>
        s.tipo !== tipo
          ? s
          : {
              ...s,
              agendas: s.agendas.includes(agendaId)
                ? s.agendas.filter((a) => a !== agendaId)
                : [...s.agendas, agendaId],
            },
      ),
    );
  }

  async function liberar(t: Travado) {
    setSalvando(true);
    setAviso(null);
    try {
      const r = await fetch(`/api/portal-admin/agenda/travados/${t.tutorId}/liberar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: "liberado na tela de regras" }),
      });
      if (!r.ok) throw new Error("Não consegui liberar");
      setTravados((lista) => lista.filter((x) => x.tutorId !== t.tutorId));
      setAviso({ tipo: "ok", texto: `${t.nome} liberado ✓` });
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e?.message || "Não consegui liberar" });
    } finally {
      setSalvando(false);
    }
  }

  async function salvar() {
    if (!cfg) return;
    setSalvando(true);
    setAviso(null);
    try {
      const r = await fetch("/api/portal-admin/agenda/regras", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: cfg, servicos }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.message || d?.error || "Não consegui salvar");
      setAviso({ tipo: "ok", texto: "Regras salvas ✓" });
    } catch (e: any) {
      setAviso({ tipo: "erro", texto: e?.message || "Não consegui salvar" });
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="p-4 text-[13px]" style={{ color: B44.text2 }}>
        Carregando as regras…
      </div>
    );
  }

  if (!cfg) {
    return (
      <div className="p-4 text-[13px]" style={{ color: "#b23b39" }}>
        {aviso?.texto || "Não consegui carregar as regras."}
      </div>
    );
  }

  const reais = (cfg.taxaCentavos / 100).toFixed(2).replace(".", ",");

  return (
    <div className="p-4 flex flex-col gap-3" style={{ maxWidth: 900 }}>
      {/* CHAVE GERAL */}
      <Card>
        <div className="flex items-center gap-3.5">
          <div className="flex-1">
            <div className="text-[15px] font-semibold" style={{ color: B44.navy }}>
              Deixar o cliente agendar pelo portal
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: B44.text2 }}>
              Desligando aqui, o portal volta a só mostrar o botão de falar no WhatsApp.
            </div>
          </div>
          <Chave
            ligado={cfg.ativo}
            onToggle={() => mudarCfg("ativo", !cfg.ativo)}
            rotulo="Agendamento online"
          />
        </div>
      </Card>

      {/* REGRAS GERAIS */}
      <Card title="Regras que valem para todos os serviços" emoji="⏱️">
        <Linha
          titulo="Antecedência mínima"
          ajuda="quanto antes ele precisa marcar — evita cliente pegando horário daqui a 10 minutos"
        >
          <Numero
            valor={cfg.antecedenciaMinHoras}
            onChange={(n) => mudarCfg("antecedenciaMinHoras", n)}
            sufixo="horas"
          />
        </Linha>
        <Linha titulo="Pode marcar até" ajuda="quão longe no futuro a agenda fica aberta">
          <Numero valor={cfg.janelaDias} onChange={(n) => mudarCfg("janelaDias", n)} sufixo="dias" min={1} />
        </Linha>
        <Linha
          titulo="Desmarcar ou remarcar até"
          ajuda="depois desse prazo, só falando com a recepção"
        >
          <Numero
            valor={cfg.prazoCancelarHoras}
            onChange={(n) => mudarCfg("prazoCancelarHoras", n)}
            sufixo="horas antes"
          />
        </Linha>
        <div className="flex items-center gap-3 py-2.5">
          <div className="flex-1">
            <div className="text-[13.5px]" style={{ color: B44.text1 }}>
              Máximo por cliente por dia
            </div>
            <div className="text-[11.5px] mt-0.5" style={{ color: B44.text2 }}>
              segura marcação em excesso sem querer
            </div>
          </div>
          <Numero valor={cfg.maxPorDia} onChange={(n) => mudarCfg("maxPorDia", n)} sufixo="horários" min={1} />
        </div>
      </Card>

      {/* TAXA */}
      <Card title="Quando o cliente desmarca demais" emoji="💸">
        <div className="text-[12.5px] -mt-1 mb-1" style={{ color: B44.text2 }}>
          A conta zera sempre que ele comparece. Só desmarcações seguidas contam.
        </div>
        <Linha
          titulo="Trava o agendamento online depois de"
          ajuda='a partir daí ele vê "fale com a recepção" em vez dos horários'
        >
          <Numero
            valor={cfg.desmarcacoesParaTaxa}
            onChange={(n) => mudarCfg("desmarcacoesParaTaxa", n)}
            sufixo="desmarcações"
            min={1}
          />
        </Linha>
        <Linha titulo="Taxa de agendamento" ajuda="valor que a recepção cobra para liberar de novo">
          <span className="flex items-center gap-1.5">
            <span className="text-[12.5px]" style={{ color: B44.text2 }}>
              R$
            </span>
            <Input
              value={reais}
              onChange={(e) => {
                const digitos = e.target.value.replace(/\D/g, "");
                mudarCfg("taxaCentavos", Number(digitos || 0));
              }}
              style={{ width: 92, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
            />
          </span>
        </Linha>
        <div className="py-2.5">
          <div className="text-[13.5px]" style={{ color: B44.text1 }}>
            Mensagem que o cliente vê
          </div>
          <div className="text-[11.5px] mt-0.5 mb-1.5" style={{ color: B44.text2 }}>
            aparece no lugar dos horários
          </div>
          <Input
            value={cfg.mensagemTravado || ""}
            onChange={(e) => mudarCfg("mensagemTravado", e.target.value)}
            placeholder="Fale com a nossa recepção 💬"
            style={{ width: "100%" }}
          />
        </div>

        <div
          className="flex gap-2.5 mt-2 p-3"
          style={{ background: "#FBF3E3", borderRadius: 11 }}
        >
          <span className="text-[15px] leading-tight">💳</span>
          <div>
            <div className="text-[13px] font-semibold" style={{ color: "#8a6400" }}>
              A cobrança ainda é feita por vocês
            </div>
            <div className="text-[12.5px] mt-0.5" style={{ color: "#6b5200" }}>
              O portal trava o cliente e manda falar com a recepção — quem cobra a taxa é você, na
              hora de remarcar. Cobrar automático por link de pagamento é um passo seguinte.
            </div>
          </div>
        </div>
      </Card>

      {/* SERVIÇOS */}
      <Card title="Serviço por serviço" emoji="🩺" count={servicos.filter((s) => s.ativo).length}>
        <div className="text-[12.5px] -mt-1 mb-2" style={{ color: B44.text2 }}>
          Só o que estiver ligado aparece pro cliente. O resto continua sendo marcado por vocês.
          A lista vem dos Tipos de atendimento — tipo novo aparece aqui sozinho, desligado.
          Dica: você também liga cada profissional/sala pela ficha dele (Equipe · Config da agenda) — é a mesma agenda.
        </div>

        {servicos.length === 0 && (
          <div className="text-[13px] py-4 text-center" style={{ color: B44.text2 }}>
            Nenhum tipo de atendimento cadastrado ainda.
            <br />
            Cadastre em Configurações › Atendimento.
          </div>
        )}

        <div className="flex flex-col">
          {servicos.map((s) => (
            <div
              key={s.tipo}
              className="py-3"
              style={{ borderBottom: `1px solid ${B44.lineSoft}` }}
            >
              <div className="flex items-center gap-3">
                <Chave
                  pequeno
                  ligado={s.ativo}
                  onToggle={() => mudarServico(s.tipo, "ativo", !s.ativo)}
                  rotulo={`Cliente pode marcar ${s.rotulo}`}
                />
                <div className="flex-1 text-[13.5px] font-semibold" style={{ color: B44.navy }}>
                  {s.rotulo}
                </div>

                <span className="flex items-center gap-1.5">
                  <Input
                    type="number"
                    min={5}
                    value={String(s.duracaoMin)}
                    onChange={(e) => mudarServico(s.tipo, "duracaoMin", Number(e.target.value))}
                    style={{ width: 68, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                  />
                  <span className="text-[12px]" style={{ color: B44.text2 }}>
                    min
                  </span>
                </span>

                <Select
                  value={s.restricao}
                  onChange={(e) => mudarServico(s.tipo, "restricao", e.target.value as Restricao)}
                  style={{ width: 150 }}
                >
                  {RESTRICOES.map((r) => (
                    <option key={r.v} value={r.v}>
                      {r.l}
                    </option>
                  ))}
                </Select>
              </div>

              {/* agendas — só interessam quando o serviço está ligado */}
              {s.ativo && (
                <div className="mt-2.5 pl-[50px]">
                  <div className="text-[11.5px] mb-1.5" style={{ color: B44.text2 }}>
                    em quais agendas
                  </div>
                  {agendas.length === 0 ? (
                    <div className="text-[12px]" style={{ color: "#b23b39" }}>
                      Nenhum profissional ativo ou sala cadastrada.
                    </div>
                  ) : (
                    <div className="flex gap-1.5 flex-wrap">
                      {agendas.map((a) => {
                        const marcado = s.agendas.includes(a.id);
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => alternarAgenda(s.tipo, a.id)}
                            className="text-[11.5px] font-medium"
                            style={{
                              borderRadius: 20,
                              padding: "4px 12px",
                              background: marcado ? B44.tint : "#fff",
                              color: marcado ? B44.navy : B44.text2,
                              border: `1px solid ${marcado ? B44.primary : B44.line}`,
                            }}
                          >
                            {a.origem === "sala" ? "🏠 " : ""}
                            {a.nome}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Sala escolhida: o CRM exige um responsável. Aqui você define por DIA da semana
                      (ex.: fisio Victoria seg-qua / Nayana qui-sáb) + um padrão de fallback. */}
                  {s.agendas.some(
                    (id) => agendas.find((a) => a.id === id)?.origem === "sala",
                  ) && (
                    <div className="mt-2.5">
                      <div className="text-[11.5px] mb-1.5" style={{ color: B44.text2 }}>
                        quem assina na sala, por dia da semana
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {([["1", "Seg"], ["2", "Ter"], ["3", "Qua"], ["4", "Qui"], ["5", "Sex"], ["6", "Sáb"]] as [string, string][]).map(([dow, lbl]) => (
                          <label key={dow} className="flex flex-col gap-0.5">
                            <span className="text-[10.5px] font-semibold text-center" style={{ color: B44.text2 }}>{lbl}</span>
                            <Select
                              value={(s.responsavelPorDia || {})[dow] || ""}
                              onChange={(e) => mudarRespDia(s.tipo, dow, e.target.value)}
                              style={{ width: 116, fontSize: 11.5 }}
                            >
                              <option value="">— padrão —</option>
                              {responsaveis.map((r) => (
                                <option key={r.userId} value={r.userId}>{r.nome}</option>
                              ))}
                            </Select>
                          </label>
                        ))}
                      </div>
                      <div className="text-[11.5px] mt-2 mb-1" style={{ color: B44.text2 }}>
                        padrão (para os dias marcados como “— padrão —” acima)
                      </div>
                      <Select
                        value={s.responsavelUserId || ""}
                        onChange={(e) => mudarServico(s.tipo, "responsavelUserId", e.target.value || null)}
                        style={{ width: 220 }}
                      >
                        <option value="">— escolher profissional —</option>
                        {responsaveis.map((r) => (
                          <option key={r.userId} value={r.userId}>{r.nome}</option>
                        ))}
                      </Select>
                      {(!s.responsavelUserId && Object.keys(s.responsavelPorDia || {}).length === 0) && (
                        <div className="text-[11.5px] mt-1" style={{ color: "#b23b39" }}>
                          Sem responsável (por dia nem padrão), a sala não é oferecida ao cliente.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* CLIENTES TRAVADOS */}
      <Card title="Clientes travados agora" emoji="🚫" count={travados.length}>
        <div className="text-[12.5px] -mt-1 mb-2" style={{ color: B44.text2 }}>
          Desmarcaram demais e não conseguem marcar pelo portal. A conta zera sozinha quando o
          cliente comparece — ou você libera aqui, depois de cobrar a taxa.
        </div>

        {travados.length === 0 ? (
          <div className="text-[13px] py-3 text-center" style={{ color: B44.text2 }}>
            Ninguém travado. 🌿
          </div>
        ) : (
          <div className="flex flex-col">
            {travados.map((t) => (
              <div
                key={t.tutorId}
                className="flex items-center gap-3 py-2.5"
                style={{ borderBottom: `1px solid ${B44.lineSoft}` }}
              >
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold" style={{ color: B44.navy }}>
                    {t.nome}
                  </div>
                  <div className="text-[11.5px] mt-0.5" style={{ color: B44.text2 }}>
                    {t.desmarcacoes} desmarcações seguidas
                  </div>
                </div>
                <Btn variant="ghost" disabled={salvando} onClick={() => liberar(t)}>
                  Liberar
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* TRAVAS */}
      <Card title="Travas de segurança" emoji="🔒">
        <div className="text-[12.5px] -mt-1 mb-2" style={{ color: B44.text2 }}>
          Valem sempre — inclusive para quem marca pelo portal.
        </div>
        <div className="flex flex-col gap-2.5">
          {[
            {
              ico: "🐕‍🦺",
              t: "Pet bravo ocupa a sala inteira",
              p: "Um pet com temperamento que trava bloqueia as duas MAPs no mesmo horário — o portal não oferece esse horário para mais ninguém. A lista de temperamentos fica em Configurações › Agenda.",
            },
            {
              ico: "📅",
              t: "Escala de quem atende",
              p: "O portal só oferece horário dentro da escala cadastrada. Sem escala, o profissional não aparece.",
            },
            {
              ico: "🔒",
              t: "Dois clientes, o mesmo horário",
              p: "Se duas pessoas tentarem o mesmo horário ao mesmo tempo, só a primeira conclui — a outra vê o horário sumir e escolhe outro.",
            },
          ].map((x) => (
            <div key={x.t} className="flex gap-3 p-3" style={{ background: B44.soft, borderRadius: 11 }}>
              <span className="text-[16px] leading-tight">{x.ico}</span>
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: B44.navy }}>
                  {x.t}
                </div>
                <div className="text-[12.5px] mt-0.5" style={{ color: B44.text2 }}>
                  {x.p}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-end gap-2.5">
        {aviso && (
          <span
            className="text-[12.5px] font-semibold mr-auto"
            style={{ color: aviso.tipo === "ok" ? "#1c7a47" : "#b23b39" }}
          >
            {aviso.texto}
          </span>
        )}
        <Btn variant="primary" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar regras"}
        </Btn>
      </div>
    </div>
  );
}
