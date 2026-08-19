/**
 * Saúde (Fatia 3) — portada do protótipo (#saude): carteirinha de vacinas,
 * receitas e exames. Só leitura.
 *
 * Diferença consciente do protótipo: ele mostra "receitas ativas" com validade.
 * O cadastro não guarda validade de receita, então aqui elas aparecem por data,
 * da mais recente para a mais antiga — em vez de inventar um prazo que ninguém
 * registrou.
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

interface Vacina {
  nome: string;
  aplicadaEm: string | null;
  reforcoEm: string | null;
  situacao: 'aplicada' | 'agendada' | 'atrasada';
}

interface Documento {
  id: string;
  titulo: string;
  data: string;
  detalhe: string | null;
  temArquivo: boolean;
  /** Conteúdo escrito da receita/exame (quando não há PDF) — abre aqui mesmo. */
  texto?: string | null;
}

interface Saude {
  vacinas: Vacina[];
  receitas: Documento[];
  exames: Documento[];
  documentos?: Documento[];
}

const ICONE_SITUACAO = { aplicada: '✅', agendada: '🗓️', atrasada: '⚠️' } as const;

function linhaVacina(v: Vacina) {
  const partes: string[] = [];
  if (v.aplicadaEm) partes.push(`aplicada ${dataBr(v.aplicadaEm)}`);
  if (v.reforcoEm) partes.push(`reforço ${dataBr(v.reforcoEm)}`);
  return partes.join(' · ') || 'sem data registrada';
}

/**
 * Linha de receita/exame. Se tem PDF, abre o arquivo ("abrir"). Se não tem PDF mas tem
 * o texto escrito, o tutor lê aqui mesmo tocando ("ver"). Se não tem nada, é só o registro.
 */
// Abre uma janela limpa com o texto da receita/exame e chama a impressão do navegador
// (que também permite "Salvar como PDF"). Tutor consegue imprimir a receita.
function imprimirDoc(titulo: string, data: string, texto: string) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  const esc = (s: string) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title>` +
    `<style>body{font-family:system-ui,-apple-system,Arial,sans-serif;padding:36px;color:#1f2a2e;line-height:1.6}` +
    `h1{font-size:19px;margin:0 0 2px;color:#014D5E}.data{color:#6b7280;font-size:13px;margin:0 0 20px}` +
    `pre{white-space:pre-wrap;word-break:break-word;font-family:inherit;font-size:14px;margin:0}</style></head>` +
    `<body><h1>${esc(titulo)}</h1><div class="data">${esc(dataBr(data))}</div><pre>${esc(texto)}</pre>` +
    `<script>window.onload=function(){setTimeout(function(){window.print();},150);};<\/script></body></html>`,
  );
  w.document.close();
}

function DocRow({ doc, icone }: { doc: Documento; icone: string }) {
  const [aberto, setAberto] = useState(false);
  const podeVerTexto = !doc.temArquivo && !!doc.texto;
  return (
    <div>
      <div
        className="ptl-row"
        style={podeVerTexto ? { cursor: 'pointer' } : undefined}
        onClick={podeVerTexto ? () => setAberto((v) => !v) : undefined}
        role={podeVerTexto ? 'button' : undefined}
      >
        <span className="ico" aria-hidden="true">
          {icone}
        </span>
        <span className="grow">
          <span className="rt" style={{ display: 'block' }}>
            {doc.titulo}
          </span>
          <span className="rs">
            {dataBr(doc.data)}
            {doc.detalhe ? ` · ${doc.detalhe}` : ''}
          </span>
        </span>
        <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
          {podeVerTexto && (
            <button
              className="acao"
              onClick={(e) => { e.stopPropagation(); imprimirDoc(doc.titulo, doc.data, doc.texto!); }}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              imprimir
            </button>
          )}
          {doc.temArquivo ? (
            <a
              className="acao"
              href={`/api/portal/documento/${doc.id}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
            >
              abrir
            </a>
          ) : podeVerTexto ? (
            <span className="acao">{aberto ? 'fechar' : 'ver'}</span>
          ) : null}
        </span>
      </div>
      {aberto && doc.texto && (
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'inherit',
            fontSize: 13.5,
            lineHeight: 1.55,
            margin: '2px 6px 8px',
            padding: '11px 13px',
            background: 'rgba(0,0,0,0.035)',
            borderRadius: 12,
            color: '#374151',
          }}
        >
          {doc.texto}
        </pre>
      )}
    </div>
  );
}

export default function TelaSaude() {
  const { pets, petId, selecionar, carregando: carregandoPets } = usePetSelecionado();
  const [dados, setDados] = useState<Saude | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!petId) return;
    let vivo = true;
    setCarregando(true);
    (async () => {
      try {
        const r = await fetch(`/api/portal/pets/${petId}/saude`, { cache: 'no-store' });
        const d = await r.json();
        if (vivo) setDados(r.ok ? d : { vacinas: [], receitas: [], exames: [] });
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
        <PtlCabecalho titulo="Saúde" />
        <SeletorDePet pets={pets} petId={petId} onSelecionar={selecionar} />

        {ocupado && <div className="ptl-vazio">Carregando…</div>}

        {!ocupado && dados && (
          <div className="ptl-stack" style={{ marginTop: 4 }}>
            <div>
              <div className="ptl-label">carteirinha de vacinas</div>
              {dados.vacinas.length === 0 ? (
                <div className="ptl-card">
                  <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                    Nenhuma vacina registrada ainda.
                  </p>
                </div>
              ) : (
                <div className="ptl-card-lista">
                  {dados.vacinas.map((v, i) => (
                    <div className="ptl-row" key={`${v.nome}-${i}`}>
                      <span className="ico" aria-hidden="true">
                        {ICONE_SITUACAO[v.situacao]}
                      </span>
                      <span className="grow">
                        <span className="rt" style={{ display: 'block' }}>
                          {v.nome}
                        </span>
                        <span className={`rs${v.situacao === 'atrasada' ? ' alerta' : ''}`}>
                          {v.situacao === 'atrasada'
                            ? `reforço venceu em ${dataBr(v.reforcoEm)}`
                            : linhaVacina(v)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="ptl-label">receitas</div>
              {dados.receitas.length === 0 ? (
                <div className="ptl-card">
                  <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                    Nenhuma receita registrada ainda.
                  </p>
                </div>
              ) : (
                <div className="ptl-card-lista">
                  {dados.receitas.map((r) => (
                    <DocRow key={r.id} doc={r} icone="💊" />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="ptl-label">exames</div>
              {dados.exames.length === 0 ? (
                <div className="ptl-card">
                  <p className="ptl-vazio" style={{ padding: '6px 0' }}>
                    Nenhum exame registrado ainda.
                  </p>
                </div>
              ) : (
                <div className="ptl-card-lista">
                  {dados.exames.map((e) => (
                    <DocRow key={e.id} doc={e} icone="🔬" />
                  ))}
                </div>
              )}
            </div>

            {dados.documentos && dados.documentos.length > 0 && (
              <div>
                <div className="ptl-label">documentos</div>
                <div className="ptl-card-lista">
                  {dados.documentos.map((d) => (
                    <DocRow key={d.id} doc={d} icone="📎" />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
