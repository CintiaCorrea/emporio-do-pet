'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

type Tipo = 'RECEITA' | 'DESPESA';
type Sugestao = 'CONCILIAR' | 'CRIAR' | 'JA_IMPORTADA';
interface Conta { id: string; nome: string; }
interface Linha { data: string; descricao?: string; valorCentavos: number; tipo: Tipo; documento?: string; externalId?: string; }
interface Match { id: string; tipo: Tipo; valorCentavos: number; vencimento: string | null; descricao: string | null; }
interface LinhaPreview { linha: Linha; eid: string; sugestao: Sugestao; match: Match | null; diferencaCentavos: number; }
interface Preview { resumo: { total: number; conciliar: number; criar: number; jaImportadas: number }; linhas: LinhaPreview[]; }

async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro');
  return d;
}
async function sendJSON(url: string, body: any) {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (Array.isArray(d.message) ? d.message.join(', ') : d.message || d.error)) || 'Erro');
  return d;
}

/* ---- parser de CSV (formato: Data ; Descrição ; Valor  — valor negativo = saída) ---- */
function parseData(s: string): string | null {
  s = (s || '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
}
function parseValorCent(s: string): number | null {
  if (!s) return null;
  const neg = /-/.test(s) || /\(/.test(s);
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(clean);
  if (isNaN(n)) return null;
  return Math.round(Math.abs(n) * 100) * (neg ? -1 : 1);
}
function parseExtrato(texto: string): { linhas: Linha[]; erros: number } {
  const linhasTxt = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (!linhasTxt.length) return { linhas: [], erros: 0 };
  const delim = linhasTxt[0].includes(';') ? ';' : linhasTxt[0].includes('\t') ? '\t' : ',';
  const header = linhasTxt[0].toLowerCase().split(delim);
  const idx = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  let iData = idx(['data', 'dt ', 'dt']);
  let iDesc = idx(['descri', 'histor', 'lança', 'lanca', 'memo']);
  let iVal = idx(['valor', 'montante', 'amount']);
  let iDoc = idx(['docum', 'nº', 'numero', 'número']);
  const temHeader = iData >= 0 && iVal >= 0;
  const dataRows = temHeader ? linhasTxt.slice(1) : linhasTxt;
  if (!temHeader) { iData = 0; iDesc = 1; iVal = 2; iDoc = 3; }

  const linhas: Linha[] = [];
  let erros = 0;
  for (const row of dataRows) {
    const cols = row.split(delim);
    const data = parseData(cols[iData] ?? '');
    const cent = parseValorCent(cols[iVal] ?? '');
    if (!data || cent === null || cent === 0) { erros++; continue; }
    linhas.push({
      data,
      descricao: (cols[iDesc] ?? '').trim() || undefined,
      documento: iDoc >= 0 ? (cols[iDoc] ?? '').trim() || undefined : undefined,
      valorCentavos: Math.abs(cent),
      tipo: cent < 0 ? 'DESPESA' : 'RECEITA',
    });
  }
  return { linhas, erros };
}

/* ---- parser de OFX (Nubank, InfinitePay…) — testado contra extratos reais ---- */
function parseOFX(texto: string): { linhas: Linha[]; erros: number; conta: string } {
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const acct = (texto.match(/<ACCTID>([^<\r\n]+)/i) || [])[1]?.trim() || '';
  const linhas: Linha[] = [];
  let erros = 0;
  const campo = (b: string, tag: string) => {
    const m = b.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i'));
    return m ? m[1].trim() : '';
  };
  for (const b of blocos) {
    const amt = parseFloat(campo(b, 'TRNAMT'));
    const dt = campo(b, 'DTPOSTED');
    if (!dt || isNaN(amt) || amt === 0) { erros++; continue; }
    const data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) { erros++; continue; }
    const trntype = campo(b, 'TRNTYPE').toUpperCase();
    const tipo: Tipo = amt < 0 || trntype === 'DEBIT' ? 'DESPESA' : 'RECEITA';
    const fitid = campo(b, 'FITID');
    linhas.push({
      data,
      descricao: [campo(b, 'NAME'), campo(b, 'MEMO')].filter(Boolean).join(' — ').slice(0, 400) || undefined,
      valorCentavos: Math.round(Math.abs(amt) * 100),
      tipo,
      // FITID = id único do banco → deduplicação perfeita
      externalId: fitid ? `OFX:${acct ? acct + ':' : ''}${fitid}` : undefined,
    });
  }
  return { linhas, erros, conta: acct };
}

const fmtDia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';

export default function ConciliacaoPage() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [contaId, setContaId] = useState('');
  const [texto, setTexto] = useState('');
  const [desde, setDesde] = useState(() => new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [preview, setPreview] = useState<Preview | null>(null);
  const [incluir, setIncluir] = useState<Record<number, boolean>>({});
  const [analisando, setAnalisando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  useEffect(() => {
    getJSON('/api/financeiro/contas').then((c) => setContas(c || [])).catch(() => {});
  }, []);

  function lerArquivo(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const t = String(reader.result || '');
      // OFX antigo (InfinitePay) vem em Windows-1252 — relê com a codificação certa
      if (/CHARSET:1252/i.test(t)) {
        const r2 = new FileReader();
        r2.onload = () => setTexto(String(r2.result || ''));
        r2.readAsText(file, 'windows-1252');
      } else {
        setTexto(t);
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  async function analisar() {
    const ehOFX = /OFXHEADER|<OFX>/i.test(texto);
    const parsed = ehOFX ? parseOFX(texto) : parseExtrato(texto);
    let { linhas } = parsed;
    const { erros } = parsed;
    if (desde) linhas = linhas.filter((l) => l.data >= desde);
    if (!linhas.length) {
      return toast.error(
        ehOFX
          ? 'Nenhuma transação no período — ajuste o campo "importar a partir de".'
          : 'Não consegui ler nenhuma linha. Confira o formato (Data ; Descrição ; Valor) ou use um arquivo OFX.',
      );
    }
    if (erros) toast(`${erros} linha(s) ignorada(s) por formato.`);
    if (ehOFX) toast.success(`OFX lido: ${linhas.length} transação(ões) no período`);
    setAnalisando(true);
    try {
      const res: Preview = await sendJSON('/api/financeiro/conciliacao/preview', { contaId: contaId || undefined, linhas });
      setPreview(res);
      const inc: Record<number, boolean> = {};
      res.linhas.forEach((l, i) => { inc[i] = l.sugestao !== 'JA_IMPORTADA'; });
      setIncluir(inc);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao analisar');
    } finally {
      setAnalisando(false);
    }
  }

  const selecionadas = useMemo(
    () => (preview ? preview.linhas.filter((_, i) => incluir[i]).length : 0),
    [preview, incluir],
  );

  async function confirmar() {
    if (!preview) return;
    if (!contaId) return toast.error('Escolha a conta do extrato.');
    const acoes = preview.linhas
      .map((l, i) => ({ l, i }))
      .filter(({ l, i }) => incluir[i] && l.sugestao !== 'JA_IMPORTADA')
      .map(({ l }) => {
        if (l.sugestao === 'CONCILIAR' && l.match) {
          const diff = l.diferencaCentavos;
          const ehReceita = l.match.tipo === 'RECEITA';
          return {
            tipo: 'CONCILIAR' as const,
            lancamentoId: l.match.id,
            dataPagamento: l.linha.data,
            multaCentavos: diff > 0 ? diff : undefined,
            // receita que caiu líquida (link/cartão) → diferença vira Taxa de Cartão (dedução);
            // despesa paga a menor → desconto obtido
            taxaCartaoCentavos: diff < 0 && ehReceita ? -diff : undefined,
            descontoCentavos: diff < 0 && !ehReceita ? -diff : undefined,
          };
        }
        return { tipo: 'CRIAR' as const, contaId, linha: l.linha, externalId: l.eid };
      });
    if (!acoes.length) return toast.error('Nada selecionado.');
    setConfirmando(true);
    try {
      const res = await sendJSON('/api/financeiro/conciliacao/confirmar', { acoes });
      toast.success(`${res.conciliados} conciliado(s) · ${res.criados} criado(s)`);
      setPreview(null);
      setTexto('');
    } catch (e: any) {
      toast.error(e.message || 'Erro ao confirmar');
    } finally {
      setConfirmando(false);
    }
  }

  const simbolo = (l: LinhaPreview) => {
    if (l.sugestao === 'JA_IMPORTADA') return <span className="pill dash">já importada</span>;
    if (l.sugestao === 'CRIAR') return <span className="fin-sit q" title="sem par — será criado">?</span>;
    if (l.diferencaCentavos !== 0) return <span className="fin-sit warn" title="diferença — juros/multa/desconto">!</span>;
    return <span className="fin-sit ok" title="bate exato">✓</span>;
  };

  return (
    <div className="fin-root">
      <FinTabs active="conciliacao" />

      <div style={{ fontSize: 12.5, color: 'var(--text2)', padding: '0 2px' }}>
        Suba o extrato do banco. Cada linha procura um lançamento pendente que combine (mesmo tipo, valor próximo, data
        na janela). O que bate <b style={{ fontWeight: 500 }}>vem conciliado</b>; o sem par é <b style={{ fontWeight: 500 }}>criado</b>; o repetido é ignorado.
      </div>

      {/* upload */}
      <div className="fin-card">
        <div className="fin-card-head"><h2>1. Extrato</h2></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row3">
            <div className="f">
              <label>Conta do extrato <span style={{ color: 'var(--coral)' }}>*</span></label>
              <select className="fin-ctl" value={contaId} onChange={(e) => setContaId(e.target.value)}>
                <option value="">— escolher —</option>
                {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="f">
              <label>Arquivo OFX ou CSV</label>
              <input type="file" accept=".ofx,.csv,.txt" className="fin-ctl" onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])} />
              <div className="hint">OFX = o export padrão do banco (Nubank, InfinitePay)</div>
            </div>
            <div className="f">
              <label>Importar a partir de</label>
              <input type="date" className="fin-ctl" value={desde} onChange={(e) => setDesde(e.target.value)} />
              <div className="hint">ignora transações antes desta data</div>
            </div>
          </div>
          <div className="f">
            <label>…ou cole as linhas (Data ; Descrição ; Valor — valor negativo = saída)</label>
            <textarea className="fin-ctl" rows={4} value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={'Data;Descrição;Valor\n22/07/2026;ENEL;-2032,00\n22/07/2026;INFINITEPAY RECEB;4820,00'} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button className="fin-btn primary" onClick={analisar} disabled={analisando || !texto.trim()}>
              {analisando ? 'Analisando…' : 'Analisar extrato'}
            </button>
          </div>
        </div>
      </div>

      {/* preview */}
      {preview && (
        <div className="fin-card">
          <div className="fin-card-head">
            <h2>2. Conferir e confirmar</h2>
            <span className="pill">{preview.resumo.conciliar} conciliar</span>
            <span className="pill">{preview.resumo.criar} criar</span>
            {preview.resumo.jaImportadas > 0 && <span className="pill dash">{preview.resumo.jaImportadas} já importadas</span>}
            <span className="fin-spacer" />
            <button className="fin-btn primary" onClick={confirmar} disabled={confirmando || selecionadas === 0}>
              {confirmando ? 'Aplicando…' : `Confirmar (${selecionadas})`}
            </button>
          </div>
          <div className="fin-tbl-scroll">
            <table className="fin-tbl">
              <thead>
                <tr>
                  <th style={{ width: 34 }}></th>
                  <th>Situação</th><th>Data</th><th>Linha do banco</th><th>Nº doc</th>
                  <th>Vencimento</th><th className="num">Valor lançado</th>
                  <th className="num">Valor no banco</th><th className="num">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {preview.linhas.map((l, i) => {
                  const jaImp = l.sugestao === 'JA_IMPORTADA';
                  const ehDesp = l.linha.tipo === 'DESPESA';
                  return (
                    <tr key={i} style={{ opacity: jaImp ? 0.5 : 1 }}>
                      <td>
                        <input type="checkbox" disabled={jaImp} checked={!!incluir[i]}
                          onChange={(e) => setIncluir((s) => ({ ...s, [i]: e.target.checked }))} />
                      </td>
                      <td>{simbolo(l)}</td>
                      <td className="dt">{fmtDia(l.linha.data)}</td>
                      <td>
                        <div className="desc">{l.linha.descricao || '—'}</div>
                        {l.match?.descricao && <div className="sub">↔ {l.match.descricao}</div>}
                      </td>
                      <td>{l.linha.documento || '—'}</td>
                      <td className="dt">{fmtDia(l.match?.vencimento ?? null)}</td>
                      <td className="num">{l.match ? fmtBRL(l.match.valorCentavos) : '—'}</td>
                      <td className={`num ${ehDesp ? 'desp' : 'rec'}`}>{ehDesp ? '− ' : '+ '}{fmtBRL(l.linha.valorCentavos).replace('R$', '').trim()}</td>
                      <td className={`num ${l.diferencaCentavos ? 'desp' : ''}`}>
                        {l.diferencaCentavos ? (l.diferencaCentavos > 0 ? '+ ' : '− ') + fmtBRL(Math.abs(l.diferencaCentavos)).replace('R$', '').trim() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 16px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <span><span className="fin-sit ok">✓</span> bate exato</span>
            <span><span className="fin-sit warn">!</span> diferença — em despesa: juros/multa (a maior) ou desconto (a menor); em receita a menor (link/cartão): vira <b style={{ fontWeight: 500 }}>Taxa de Cartão</b></span>
            <span><span className="fin-sit q">?</span> sem par — será criado</span>
          </p>
        </div>
      )}

      <style>{FIN_CSS}</style>
    </div>
  );
}
