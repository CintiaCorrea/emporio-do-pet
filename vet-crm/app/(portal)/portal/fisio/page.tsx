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

const ROTULO_STATUS: Record<string, string> = {
  ATIVO: '',
  CONCLUIDO: 'pacote concluído',
  CANCELADO: 'pacote cancelado',
  EXPIRADO: 'pacote vencido',
};

export default function TelaFisio() {
  const { pets, petId, pet, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/fisio`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) setPacotes(r.ok ? d.pacotes || [] : []);
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

        {!ocupado && pacotes.length === 0 && (
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
            const porcento = p.totalSessoes
              ? Math.min(100, Math.round((p.sessaoAtual / p.totalSessoes) * 100))
              : 0;
            const rotulo = ROTULO_STATUS[p.status] ?? '';

            return (
              <div className="ptl-stack" key={p.id} style={{ marginTop: 6 }}>
                <div className="ptl-fisio">
                  <div className="cat">{p.descricao || p.servico}</div>
                  <div className="big">
                    sessão {p.sessaoAtual} <small>de {p.totalSessoes}</small>
                  </div>
                  <div className="ptl-barra">
                    <div style={{ width: `${porcento}%` }} />
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
      </main>
    </div>
  );
}
