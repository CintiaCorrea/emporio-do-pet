'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

/* ===================== tipos ===================== */
type Status = 'CONFORME' | 'DIVERGENTE' | 'A_CONFERIR';
interface Venda {
  id: string; data: string; brutoCentavos: number; liquidoCentavos: number;
  taxaCentavos: number; taxaBps: number; planoExtrato: string | null;
  bandeira: string | null; forma: string | null; parcelas: number | null; plano: string | null;
  esperadaBps: number | null; esperadaCentavos: number | null; diferencaCentavos: number | null; status: Status;
}
interface Resumo {
  vendas: number; brutoCentavos: number; taxaCentavos: number; taxaMediaBps: number;
  aMaiorCentavos: number; conformes: number; divergentes: number; aConferir: number;
}
interface Taxa { id: string; adquirente?: string; bandeira: string; plano: string; forma: string; parcelas: number; aliquotaBps: number; vigenciaInicio: string; }
const ADQUIRENTES_PADRAO = ['InfinityPay', 'Nubank'];
interface VendaImport {
  data: string; brutoCentavos: number; liquidoCentavos: number; taxaBps?: number;
  planoExtrato?: string; bandeira?: string; forma?: string; parcelas?: number; externalId?: string;
}

/* ===================== helpers ===================== */
const fmtNum = (c: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Math.abs(c || 0) / 100);
const pctBps = (bps: number | null) => (bps === null ? '—' : `${(bps / 100).toFixed(2).replace('.', ',')}%`);
const fmtDH = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro');
  return d;
}
async function sendJSON(url: string, method: string, body?: any) {
  const r = await fetch(url, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (Array.isArray(d.message) ? d.message.join(', ') : d.message || d.error)) || 'Erro');
  return d;
}
function parseValorCent(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return Math.round(Math.abs(isNaN(n) ? 0 : n) * 100);
}

/** OFX da maquineta InfinitePay: bruto=TRNAMT; MEMO traz líquido, taxa e plano. */
function parseOFXMaquineta(texto: string): { vendas: VendaImport[]; erros: number } {
  const blocos = texto.split(/<STMTTRN>/i).slice(1);
  const vendas: VendaImport[] = [];
  let erros = 0;
  const campo = (b: string, tag: string) => {
    const m = b.match(new RegExp('<' + tag + '>([^<\\r\\n]*)', 'i'));
    return m ? m[1].trim() : '';
  };
  for (const b of blocos) {
    const dt = campo(b, 'DTPOSTED');
    const bruto = parseValorCent(campo(b, 'TRNAMT'));
    if (!dt || bruto === 0) { erros++; continue; }
    const data = `${dt.slice(0, 4)}-${dt.slice(4, 6)}-${dt.slice(6, 8)}`;
    const memo = campo(b, 'MEMO');
    const liq = memo.match(/L[ií]quido\s*\(R\$\):\s*\+?\s*([\d.,]+)/i);
    const pct = memo.match(/Aplicad[ao]\s*\(%\):\s*([\d.]+)/i);
    const plano = memo.match(/Plano:\s*([^,<]+)/i);
    const liquido = liq ? parseValorCent(liq[1]) : bruto;
    vendas.push({
      data,
      brutoCentavos: bruto,
      liquidoCentavos: liquido,
      taxaBps: pct ? Math.round(parseFloat(pct[1]) * 100) : undefined,
      planoExtrato: plano ? plano[1].trim() : undefined,
      externalId: campo(b, 'FITID') ? `MAQ:${campo(b, 'FITID')}` : undefined,
    });
  }
  return { vendas, erros };
}

/** Uma linha de CSV (vírgula, campos entre aspas com "" escapado). */
function parseCsvLine(linha: string): string[] {
  const out: string[] = []; let cur = '', q = false;
  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') { if (q && linha[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (c === ',' && !q) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

/** CSV do "Histórico" da InfinitePay: já traz bandeira + parcelas + taxa + NSU → auditoria 100% automática. */
function parseCsvHistorico(texto: string): { vendas: VendaImport[]; erros: number } {
  const linhas = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter((l) => l.trim() !== '');
  if (linhas.length < 2) return { vendas: [], erros: 0 };
  const header = parseCsvLine(linhas[0]).map((h) => h.toLowerCase());
  const idx = (kw: string) => header.findIndex((h) => h.includes(kw));
  const iData = idx('data'), iMeio = idx('meio - meio'), iBand = idx('bandeira'), iParc = idx('parcelas'),
    iStatus = idx('status'), iValor = idx('valor (r$)'), iLiq = idx('quido'),
    iTaxaP = idx('aplicada(%)'), iPlano = idx('plano'), iNsu = header.findIndex((h) => h.trim() === 'nsu');
  const vendas: VendaImport[] = [];
  let erros = 0;
  for (let r = 1; r < linhas.length; r++) {
    const row = parseCsvLine(linhas[r]);
    const status = iStatus >= 0 ? row[iStatus] : '';
    if (!/aprovad/i.test(status)) continue; // ignora Negada
    const bruto = parseValorCent(iValor >= 0 ? row[iValor] : '');
    if (bruto === 0) { erros++; continue; }
    const meio = (iMeio >= 0 ? row[iMeio] : '').toLowerCase();
    const bandRaw = (iBand >= 0 ? row[iBand] : '').toLowerCase();
    const parcStr = iParc >= 0 ? row[iParc] : '';
    const parcelas = /vista/i.test(parcStr) ? 1 : (parseInt(parcStr, 10) || 1);
    const forma = /pix/.test(meio) ? 'Pix'
      : /d[eé]bito|debito/.test(meio) ? 'Debito'
      : parcelas > 1 ? 'Credito parcelado' : 'Credito a vista';
    const bandeira = /visa|master/.test(bandRaw) ? 'Visa/Mastercard'
      : /elo|amex/.test(bandRaw) ? 'Elo/Amex' : undefined;
    const dm = String(iData >= 0 ? row[iData] : '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    const data = dm ? `${dm[3]}-${dm[2]}-${dm[1]}` : '';
    if (!data) { erros++; continue; }
    const nsu = iNsu >= 0 ? row[iNsu] : '';
    vendas.push({
      data,
      brutoCentavos: bruto,
      liquidoCentavos: parseValorCent(iLiq >= 0 ? row[iLiq] : ''),
      taxaBps: iTaxaP >= 0 ? Math.round((parseFloat(String(row[iTaxaP]).replace(',', '.')) || 0) * 100) : undefined,
      planoExtrato: iPlano >= 0 ? row[iPlano] : undefined,
      bandeira,
      forma,
      parcelas,
      externalId: nsu ? `MAQ:${nsu}` : undefined,
    });
  }
  return { vendas, erros };
}

const BANDEIRAS = ['Visa/Mastercard', 'Elo/Amex'];
const FORMAS: { v: string; label: string }[] = [
  { v: 'Pix|1', label: 'Pix' },
  { v: 'Debito|1', label: 'Débito' },
  { v: 'Credito a vista|1', label: 'Crédito à vista' },
  ...Array.from({ length: 11 }, (_, i) => ({ v: `Credito parcelado|${i + 2}`, label: `Crédito ${i + 2}x` })),
];
function mesesRecentes(qtd = 12) {
  const out: { v: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push({ v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) });
  }
  return out;
}

/* ===================== página ===================== */
export default function TaxasPage() {
  const meses = useMemo(() => mesesRecentes(), []);
  const [competencia, setCompetencia] = useState(meses[0]?.v ?? '');
  const [filtro, setFiltro] = useState<'' | Status>('');
  const [adqSel, setAdqSel] = useState('InfinityPay');
  const [extraAdqs, setExtraAdqs] = useState<string[]>([]);
  const [dados, setDados] = useState<{ resumo: Resumo; itens: Venda[] } | null>(null);
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [importando, setImportando] = useState(false);
  const [verTaxas, setVerTaxas] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    // taxas e vendas carregam INDEPENDENTES: se as vendas falharem, as taxas não somem
    const qs = new URLSearchParams({ competencia, adquirente: adqSel });
    if (filtro) qs.set('status', filtro);
    const [a, t] = await Promise.allSettled([
      getJSON(`/api/financeiro/auditoria?${qs.toString()}`),
      getJSON('/api/financeiro/auditoria/taxas'),
    ]);
    if (a.status === 'fulfilled') setDados(a.value);
    else toast.error(a.reason?.message || 'Falha ao carregar as vendas');
    if (t.status === 'fulfilled') setTaxas(t.value || []);
    else toast.error(t.reason?.message || 'Falha ao carregar as taxas');
    setCarregando(false);
  }, [competencia, filtro, adqSel]);

  useEffect(() => { carregar(); }, [carregar]);

  // lista de abas = padrão ∪ as que já têm taxa ∪ as adicionadas na mão
  const adquirentes = useMemo(
    () => [...new Set([...ADQUIRENTES_PADRAO, ...taxas.map((t) => t.adquirente || 'InfinityPay'), ...extraAdqs])],
    [taxas, extraAdqs],
  );
  // taxas e KPIs da adquirente selecionada
  const taxasDaAdq = useMemo(
    () => taxas.filter((t) => (t.adquirente || 'InfinityPay') === adqSel),
    [taxas, adqSel],
  );
  function adicionarAdquirente() {
    const nome = prompt('Nome da nova adquirente (ex.: PagSeguro, Cielo, Stone):')?.trim();
    if (!nome) return;
    if (!adquirentes.includes(nome)) setExtraAdqs((s) => [...s, nome]);
    setAdqSel(nome);
  }

  function lerArquivo(file: File) {
    const ehCsv = /\.csv$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      let t = String(reader.result || '');
      if (!ehCsv && /CHARSET:1252/i.test(t)) {
        await new Promise<void>((res) => {
          const r2 = new FileReader();
          r2.onload = () => { t = String(r2.result || ''); res(); };
          r2.readAsText(file, 'windows-1252');
        });
      }
      importar(t);
    };
    // CSV do Histórico da InfinitePay vem em windows-1252 (acentos); OFX em utf-8.
    reader.readAsText(file, ehCsv ? 'windows-1252' : 'utf-8');
  }

  async function importar(texto: string) {
    const ehOfx = /OFXHEADER|<OFX>/i.test(texto);
    const ehCsv = !ehOfx && /identificador|taxa aplicada|\bnsu\b/i.test(texto);
    if (!ehOfx && !ehCsv) {
      return toast.error('Arquivo não reconhecido. Suba o OFX da maquineta ou o CSV do Histórico da InfinitePay.');
    }
    const { vendas, erros } = ehOfx ? parseOFXMaquineta(texto) : parseCsvHistorico(texto);
    if (!vendas.length) return toast.error('Nenhuma venda encontrada no arquivo.');
    setImportando(true);
    try {
      const r = await sendJSON('/api/financeiro/auditoria/vendas', 'POST', { vendas, adquirente: adqSel });
      toast.success(`${r.criadas} venda(s) importada(s)${r.ignoradas ? ` · ${r.ignoradas} já existiam` : ''}${erros ? ` · ${erros} ignorada(s)` : ''}`);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao importar');
    } finally {
      setImportando(false);
    }
  }

  async function atribuir(v: Venda, campo: 'bandeira' | 'formaParcela' | 'plano', valor: string) {
    const body: any = {};
    if (campo === 'bandeira') body.bandeira = valor;
    else if (campo === 'plano') body.plano = valor;
    else { const [forma, parc] = valor.split('|'); body.forma = forma; body.parcelas = Number(parc); }
    try {
      await sendJSON(`/api/financeiro/auditoria/vendas/${v.id}`, 'PATCH', body);
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(v: Venda) {
    try {
      await fetch(`/api/financeiro/auditoria/vendas/${v.id}`, { method: 'DELETE' });
      carregar();
    } catch { /* ignore */ }
  }

  const r = dados?.resumo;
  const badge = (s: Status) =>
    s === 'CONFORME' ? <span className="pill okp">✓ conforme</span>
      : s === 'DIVERGENTE' ? <span className="pill divp">divergente</span>
        : <span className="pill confp">a conferir</span>;

  return (
    <div className="fin-root">
      <FinTabs
        active="taxas"
        right={
          <label className="fin-btn primary" style={{ cursor: 'pointer' }}>
            {importando ? 'Importando…' : `Importar vendas — ${adqSel} (OFX/CSV)`}
            <input type="file" accept=".ofx,.csv" style={{ display: 'none' }} disabled={importando}
              onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])} />
          </label>
        }
      />

      {/* abas por adquirente */}
      <div className="tx-adq">
        {adquirentes.map((a) => (
          <button key={a} className={adqSel === a ? 'on' : ''} onClick={() => setAdqSel(a)}>{a}</button>
        ))}
        <button className="add" onClick={adicionarAdquirente}>+ adquirente</button>
      </div>

      <div className="tx-nota">
        ⚠️ O extrato OFX da maquineta traz a <b style={{ fontWeight: 500 }}>taxa cobrada</b> e o plano, mas <b style={{ fontWeight: 500 }}>não</b> a bandeira/parcelas.
        Pix (0%) já sai conforme; nas demais, escolha <b style={{ fontWeight: 500 }}>bandeira + parcelas</b> para calcular a esperada.
        <b style={{ fontWeight: 500 }}> Dica:</b> importe o <b style={{ fontWeight: 500 }}>CSV do Histórico</b> da InfinitePay — ele já traz bandeira + parcelas + NSU, e a auditoria fica <b style={{ fontWeight: 500 }}>automática</b>.
        (O relatório “Histórico” da InfinitePay traz bandeira e parcelamento — quando importarmos ele, vira automático.)
      </div>

      {/* KPIs */}
      <div className="tx-kpis">
        <div className="tx-kpi"><small>Vendas na maquineta</small><b>{fmtBRL(r?.brutoCentavos ?? 0)}</b><div className="d">{r?.vendas ?? 0} transações</div></div>
        <div className="tx-kpi alert"><small>Taxa cobrada</small><b>{fmtBRL(r?.taxaCentavos ?? 0)}</b><div className="d">{pctBps(r?.taxaMediaBps ?? 0)} médio</div></div>
        <div className="tx-kpi danger"><small>Cobrado a maior</small><b>{fmtBRL(r?.aMaiorCentavos ?? 0)}</b><div className="d">{r?.divergentes ?? 0} divergente(s)</div></div>
        <div className="tx-kpi ok"><small>Conformes</small><b>{r?.conformes ?? 0}</b><div className="d">de {r?.vendas ?? 0} · {r?.aConferir ?? 0} a conferir</div></div>
      </div>

      {/* filtros */}
      <div className="tx-filters">
        <div className="tx-seg">
          {([['', 'Todas'], ['DIVERGENTE', 'Divergentes'], ['A_CONFERIR', 'A conferir'], ['CONFORME', 'Conformes']] as const).map(([v, l]) => (
            <button key={v} className={filtro === v ? 'on' : ''} onClick={() => setFiltro(v as any)}>{l}</button>
          ))}
        </div>
        <select className="fin-ctl" value={competencia} onChange={(e) => setCompetencia(e.target.value)}>
          {meses.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
        <span className="pill">tolerância 0,05 p.p.</span>
        <span className="fin-spacer" />
        <button className="fin-btn sm" onClick={() => setVerTaxas((s) => !s)}>{verTaxas ? 'Ocultar' : 'Ver'} tabela de taxas ({taxasDaAdq.length})</button>
      </div>

      {/* vendas */}
      <div className="fin-card">
        <div className="fin-card-head"><h2>Vendas — taxa cobrada × esperada</h2><span className="pill">{dados?.itens.length ?? 0}</span></div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Data</th><th className="num">Bruto</th><th className="num">Líquido</th>
                <th className="num">Taxa cobrada</th><th>Plano</th>
                <th>Bandeira</th><th>Forma / parcelas</th><th className="num">Esperada</th><th className="num">Diferença</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={11} className="fin-empty">Carregando…</td></tr>}
              {!carregando && (dados?.itens.length ?? 0) === 0 && (
                <tr><td colSpan={11} className="fin-empty">Nenhuma venda. Clique em “Importar vendas (OFX)” e escolha o extrato da maquineta.</td></tr>
              )}
              {!carregando && dados?.itens.map((v) => {
                const ehPix = v.taxaBps === 0;
                return (
                  <tr key={v.id} className={v.status === 'DIVERGENTE' ? 'divrow' : ''}>
                    <td className="tx-dt">{fmtDH(v.data)}</td>
                    <td className="num">{fmtNum(v.brutoCentavos)}</td>
                    <td className="num">{fmtNum(v.liquidoCentavos)}</td>
                    <td className="num desp">{v.taxaCentavos ? `− ${fmtNum(v.taxaCentavos)}` : '0,00'} <span className="pill">{pctBps(v.taxaBps)}</span></td>
                    <td className="tx-plano">{v.planoExtrato || '—'}</td>
                    <td>
                      {ehPix ? <span className="pill">Pix</span> : (
                        <select className="tx-mini" value={v.bandeira || ''} onChange={(e) => atribuir(v, 'bandeira', e.target.value)}>
                          <option value="">—</option>
                          {BANDEIRAS.map((b) => <option key={b} value={b}>{b}</option>)}
                        </select>
                      )}
                    </td>
                    <td>
                      {ehPix ? '—' : (
                        <select className="tx-mini" value={v.forma ? `${v.forma}|${v.parcelas ?? 1}` : ''} onChange={(e) => atribuir(v, 'formaParcela', e.target.value)}>
                          <option value="">—</option>
                          {FORMAS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="num">{v.esperadaCentavos === null ? '—' : <>{fmtNum(v.esperadaCentavos)} <span className="pill">{pctBps(v.esperadaBps)}</span></>}</td>
                    <td className={`num ${v.diferencaCentavos && v.diferencaCentavos > 0 ? 'maior' : v.diferencaCentavos ? 'rec' : ''}`}>
                      {v.diferencaCentavos ? (v.diferencaCentavos > 0 ? '+ ' : '− ') + fmtNum(v.diferencaCentavos) : '—'}
                    </td>
                    <td>{badge(v.status)}</td>
                    <td className="num"><button className="fin-btn sm ghost" onClick={() => excluir(v)}>×</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 16px' }}>
          <span className="maior">Diferença +</span> = a InfinitePay cobrou <b style={{ fontWeight: 500 }}>a mais</b> que o contratado (recuperável) ·
          − (verde) = cobrou a menos.
        </p>
      </div>

      {/* tabela de taxas */}
      {verTaxas && (
        <div className="fin-card">
          <div className="fin-card-head"><h2>Tabela de taxas contratadas — {adqSel}</h2><span className="pill">{taxasDaAdq.length} linhas</span></div>
          <div className="fin-tbl-scroll">
            <table className="fin-tbl">
              <thead><tr><th>Bandeira</th><th>Plano</th><th>Forma</th><th className="num">Parcelas</th><th className="num">Alíquota</th><th>Vigência</th></tr></thead>
              <tbody>
                {taxasDaAdq.length === 0 && <tr><td colSpan={6} className="fin-empty">Sem taxas da {adqSel}. Cadastre em Cadastros › Taxas.</td></tr>}
                {taxasDaAdq.map((t) => (
                  <tr key={t.id}>
                    <td>{t.bandeira}</td><td>{t.plano}</td><td>{t.forma}</td>
                    <td className="num">{t.parcelas}x</td><td className="num">{pctBps(t.aliquotaBps)}</td>
                    <td className="tx-dt">{new Date(t.vigenciaInicio).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{TX_CSS}</style>
    </div>
  );
}

/* ===================== CSS (escopado em .fin-root) ===================== */
const TX_CSS = `
.fin-root .tx-adq{ display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:2px 0 12px; border-bottom:1px solid var(--line); padding-bottom:0; }
.fin-root .tx-adq button{ border:1px solid transparent; background:transparent; color:var(--text2); font-size:13.5px; font-weight:500; padding:8px 14px; border-radius:9px 9px 0 0; cursor:pointer; margin-bottom:-1px; }
.fin-root .tx-adq button:hover{ background:var(--soft,#FBF9F4); }
.fin-root .tx-adq button.on{ color:var(--navy); border-color:var(--line); border-bottom-color:#fff; background:#fff; font-weight:600; }
.fin-root .tx-adq button.add{ color:var(--primary); font-weight:500; margin-left:4px; }
.fin-root .tx-nota{ background:var(--gold-bg); border:1px solid #E7D4A8; border-radius:12px; padding:10px 14px; font-size:12.5px; color:#93701a; }
.fin-root .tx-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-root .tx-kpi{ border:1px solid var(--line); border-radius:12px; padding:14px 16px; background:#fff; box-shadow:0 1px 2px rgba(52,50,46,.04); }
.fin-root .tx-kpi small{ font-size:12px; color:var(--text2); }
.fin-root .tx-kpi b{ display:block; margin-top:4px; font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-root .tx-kpi .d{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-root .tx-kpi.alert{ border-color:#E7D4A8; background:var(--gold-bg); } .fin-root .tx-kpi.alert b,.fin-root .tx-kpi.alert small{ color:var(--gold); } .fin-root .tx-kpi.alert .d{ color:#93701a; }
.fin-root .tx-kpi.danger{ border-color:#E8BBAA; background:var(--coral-bg); } .fin-root .tx-kpi.danger b,.fin-root .tx-kpi.danger small{ color:var(--coral); } .fin-root .tx-kpi.danger .d{ color:#a5482a; }
.fin-root .tx-kpi.ok{ border-color:#BFE6CF; background:var(--green-bg); } .fin-root .tx-kpi.ok b,.fin-root .tx-kpi.ok small{ color:var(--green); } .fin-root .tx-kpi.ok .d{ color:#2c6b47; }
.fin-root .tx-filters{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:12px 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.fin-root .tx-seg{ display:flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; }
.fin-root .tx-seg button{ font-size:12.5px; padding:7px 12px; background:#fff; border:none; color:var(--text2); cursor:pointer; }
.fin-root .tx-seg button.on{ background:var(--primary); color:#fff; }
.fin-root .tx-dt{ white-space:nowrap; color:var(--text2); font-variant-numeric:tabular-nums; }
.fin-root .tx-plano{ font-size:12px; color:var(--text3); white-space:nowrap; }
.fin-root .tx-mini{ font-size:12px; border:1px solid var(--line); border-radius:7px; padding:3px 6px; background:#fff; color:var(--text1); max-width:130px; }
.fin-root .fin-tbl .desp{ color:var(--coral); } .fin-root .fin-tbl .rec{ color:var(--green); }
.fin-root .fin-tbl .maior{ color:var(--coral); font-weight:500; }
.fin-root tr.divrow td{ background:#FDF3EF; }
.fin-root .pill.okp{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.divp{ background:var(--coral-bg); color:var(--coral); }
.fin-root .pill.confp{ background:var(--gold-bg); color:var(--gold); }
@media (max-width:900px){ .fin-root .tx-kpis{ grid-template-columns:repeat(2,1fr); } }
`;
