/**
 * Sugestões e avaliações — o tutor avalia a clínica (estrelas → NPS do sistema)
 * e deixa uma sugestão (texto livre → lista lida pela equipe).
 */
'use client';

import { useState } from 'react';
import { PtlCabecalho, PtlEstilos } from '../ptl-ui';

export default function TelaAvaliar() {
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState('');
  const [texto, setTexto] = useState('');
  const [enviandoA, setEnviandoA] = useState(false);
  const [enviandoS, setEnviandoS] = useState(false);
  const [okA, setOkA] = useState(false);
  const [okS, setOkS] = useState(false);
  const [erro, setErro] = useState('');

  async function enviarAvaliacao() {
    if (estrelas < 1) { setErro('Toque nas estrelas pra dar sua nota.'); return; }
    setErro('');
    setEnviandoA(true);
    try {
      const r = await fetch('/api/portal/avaliacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estrelas, comentario }),
      });
      if (r.ok) setOkA(true);
      else setErro('Não consegui enviar sua avaliação. Tente de novo.');
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setEnviandoA(false);
    }
  }

  async function enviarSugestao() {
    if (!texto.trim()) { setErro('Escreva sua sugestão.'); return; }
    setErro('');
    setEnviandoS(true);
    try {
      const r = await fetch('/api/portal/sugestao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      if (r.ok) { setOkS(true); setTexto(''); }
      else setErro('Não consegui enviar sua sugestão. Tente de novo.');
    } catch {
      setErro('Sem conexão. Tente de novo.');
    } finally {
      setEnviandoS(false);
    }
  }

  const caixa: React.CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid #E3ECEC', borderRadius: 12,
    fontFamily: 'inherit', fontSize: 14, resize: 'vertical', boxSizing: 'border-box',
  };

  return (
    <div className="ptl-root">
      <PtlEstilos />
      <main className="ptl-app">
        <PtlCabecalho titulo="Sugestões e avaliações" />

        <div className="ptl-stack" style={{ marginTop: 4 }}>
          {/* ⭐ Avaliação */}
          <div className="ptl-card">
            <div className="ptl-label">avalie a clínica</div>
            {okA ? (
              <p style={{ padding: '10px 0', color: '#0F6E56', fontWeight: 600 }}>💚 Obrigado pela sua avaliação!</p>
            ) : (
              <>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', margin: '10px 0 8px' }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEstrelas(n)}
                      aria-label={`${n} ${n === 1 ? 'estrela' : 'estrelas'}`}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 36, lineHeight: 1, padding: '2px 4px', color: n <= estrelas ? '#F5A623' : '#D4DEDF' }}
                    >
                      {n <= estrelas ? '★' : '☆'}
                    </button>
                  ))}
                </div>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Quer comentar? (opcional)"
                  rows={3}
                  style={caixa}
                />
                <button className="ptl-btn" style={{ marginTop: 10 }} disabled={enviandoA} onClick={enviarAvaliacao}>
                  {enviandoA ? 'Enviando…' : 'Enviar avaliação'}
                </button>
              </>
            )}
          </div>

          {/* 💬 Sugestão */}
          <div className="ptl-card">
            <div className="ptl-label">deixe uma sugestão</div>
            {okS ? (
              <p style={{ padding: '10px 0', color: '#0F6E56', fontWeight: 600 }}>💚 Recebemos sua sugestão. Obrigado!</p>
            ) : (
              <>
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="O que a gente pode melhorar pro seu pet?"
                  rows={4}
                  style={{ ...caixa, marginTop: 8 }}
                />
                <button className="ptl-btn" style={{ marginTop: 10 }} disabled={enviandoS} onClick={enviarSugestao}>
                  {enviandoS ? 'Enviando…' : 'Enviar sugestão'}
                </button>
              </>
            )}
          </div>

          {erro && <p style={{ color: '#A32D2D', fontSize: 13, textAlign: 'center' }}>{erro}</p>}
        </div>
      </main>
    </div>
  );
}
