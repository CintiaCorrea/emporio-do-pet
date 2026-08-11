'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

/* ===================== tipos (espelho do backend) ===================== */
interface Detalhe { nome: string; valorCentavos: number; }
interface Dre {
  competencia: string;
  receitaBruta: number; deducoes: number; receitaLiquida: number;
  custosVariaveis: number; margemContribuicao: number;
  fixas: number; ebitda: number;
  financeiras: number; naoOperacionais: number; resultado: number;
  fora: { investimentos: number; financiamento: number; distribuicao: number; transferencias: number };
  aClassificar: { qtd: number; valorCentavos: number };
  detalhes: Record<string, Detalhe[]>;
}
interface RespConsolidado { modo: 'CONSOLIDADO'; atual: Dre; comparacao: Dre | null; }
interface RespPorUnidade {
  modo: 'POR_UNIDADE';
  porUnidade: { unidade: { id: string; nome: string }; dre: Dre }[];
  consolidado: Dre;
}
interface RespPorLinha {
  modo: 'POR_LINHA';
  porLinha: { linha: { id: string; nome: string }; dre: Dre }[];
  consolidado: Dre;
}
interface Opt { id: string; nome: string; }

/* ===================== helpers ===================== */
const fmtNum = (c: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(Math.abs(c || 0) / 100);
const pct = (v: number, base: number) =>
  base ? `${((Math.abs(v) / Math.abs(base)) * 100).toFixed(1).replace('.', ',')}%` : '—';
const delta = (atual: number, anterior: number): { txt: string; up: boolean } | null => {
  if (!anterior) return null;
  const d = ((atual - anterior) / Math.abs(anterior)) * 100;
  if (!isFinite(d)) return null;
  return { txt: `${d >= 0 ? '+' : ''}${d.toFixed(1).replace('.', ',')}%`, up: d >= 0 };
};

async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro ao carregar');
  return d;
}

function mesesRecentes(qtd = 18): { v: string; label: string }[] {
  const out: { v: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ v, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) });
  }
  return out;
}
const mesAnterior = (v: string) => {
  const [y, m] = v.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

/* Linhas da DRE, na ordem aprovada no mockup. */
const LINHAS: {
  chave: keyof Dre | string; titulo: string;
  tipo: 'grupo' | 'sub' | 'total';
  negativa?: boolean;   // exibe com "−"
  detalhe?: string;     // chave em dre.detalhes (expande)
  selo?: string;
}[] = [
  { chave: 'receitaBruta', titulo: 'Receita Bruta', tipo: 'grupo', detalhe: 'receitaBruta' },
  { chave: 'deducoes', titulo: '(−) Deduções de Vendas', tipo: 'grupo', negativa: true, detalhe: 'deducoes' },
  { chave: 'receitaLiquida', titulo: '= Receita Líquida', tipo: 'sub' },
  { chave: 'custosVariaveis', titulo: '(−) Custos Variáveis', tipo: 'grupo', negativa: true, detalhe: 'custosVariaveis' },
  { chave: 'margemContribuicao', titulo: '= Margem de Contribuição', tipo: 'sub' },
  { chave: 'fixas', titulo: '(−) Custos e Despesas Fixas', tipo: 'grupo', negativa: true, detalhe: 'fixas' },
  { chave: 'ebitda', titulo: '= EBITDA (resultado operacional)', tipo: 'sub' },
  { chave: 'financeiras', titulo: '(−) Despesas Financeiras', tipo: 'grupo', negativa: true, detalhe: 'financeiras', selo: 'inclui juros/multa das baixas' },
  { chave: 'naoOperacionais', titulo: '(±) Não operacionais', tipo: 'grupo', detalhe: 'naoOperacionais' },
  { chave: 'resultado', titulo: '= Resultado do mês', tipo: 'total' },
];

const val = (d: Dre, chave: string): number => (d as any)[chave] as number;

/* ===================== página ===================== */
export default function DrePage() {
  const meses = useMemo(() => mesesRecentes(), []);
  const [competencia, setCompetencia] = useState(meses[0]?.v ?? '');
  const [comparar, setComparar] = useState(mesAnterior(meses[0]?.v ?? '2026-01'));
  const [regime, setRegime] = useState<'CAIXA' | 'COMPETENCIA'>('COMPETENCIA'); // lente do DRE
  const [unidadeSel, setUnidadeSel] = useState(''); // '' consolidado · 'LADO' · unidadeId
  const [fMarca, setFMarca] = useState('');
  const [fLinha, setFLinha] = useState('');

  const [unidades, setUnidades] = useState<Opt[]>([]);
  const [marcas, setMarcas] = useState<Opt[]>([]);
  const [linhas, setLinhas] = useState<Opt[]>([]);

  const [resp, setResp] = useState<RespConsolidado | RespPorUnidade | RespPorLinha | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const [u, m, l] = await Promise.all([
          getJSON('/api/financeiro/unidades'),
          getJSON('/api/financeiro/marcas'),
          getJSON('/api/financeiro/linhas-servico'),
        ]);
        setUnidades(u || []); setMarcas(m || []); setLinhas(l || []);
      } catch { /* filtros ficam vazios */ }
    })();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ competencia, regime });
      const ladoUnid = unidadeSel === 'LADO';
      const ladoLinha = !ladoUnid && fLinha === 'LADO'; // unidade lado a lado tem precedência
      if (ladoUnid) qs.set('modo', 'POR_UNIDADE');
      else if (ladoLinha) qs.set('modo', 'POR_LINHA');
      else if (unidadeSel) qs.set('unidadeId', unidadeSel);
      if (!ladoUnid && !ladoLinha && comparar) qs.set('comparar', comparar);
      if (fMarca) qs.set('marcaId', fMarca);
      if (fLinha && fLinha !== 'LADO') qs.set('linhaServicoId', fLinha);
      setResp(await getJSON(`/api/financeiro/dre?${qs.toString()}`));
    } catch (e: any) {
      toast.error(e.message || 'Falha ao calcular a DRE');
    } finally {
      setCarregando(false);
    }
  }, [competencia, comparar, unidadeSel, fMarca, fLinha, regime]);

  useEffect(() => { carregar(); }, [carregar]);

  const atual: Dre | null =
    resp?.modo === 'CONSOLIDADO' ? resp.atual
    : resp?.modo === 'POR_UNIDADE' ? resp.consolidado
    : resp?.modo === 'POR_LINHA' ? resp.consolidado
    : null;
  const comp: Dre | null = resp?.modo === 'CONSOLIDADO' ? resp.comparacao : null;

  function exportarCSV() {
    if (!atual) return;
    const linhasCsv = [['Linha', 'Valor (R$)', '% receita']];
    for (const l of LINHAS) {
      const v = val(atual, l.chave as string);
      linhasCsv.push([l.titulo, (v / 100).toFixed(2).replace('.', ','), pct(v, atual.receitaBruta)]);
      if (l.detalhe) for (const d of atual.detalhes[l.detalhe] || []) {
        linhasCsv.push([`  ${d.nome}`, (d.valorCentavos / 100).toFixed(2).replace('.', ','), pct(d.valorCentavos, atual.receitaBruta)]);
      }
    }
    linhasCsv.push(['Investimentos (capex) — fora', (atual.fora.investimentos / 100).toFixed(2).replace('.', ','), '']);
    linhasCsv.push(['Financiamento — fora', (atual.fora.financiamento / 100).toFixed(2).replace('.', ','), '']);
    const csv = linhasCsv.map((r) => r.map((c) => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `dre-${competencia}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const tituloCard =
    unidadeSel === 'LADO'
      ? 'DRE por unidade'
      : unidadeSel
        ? `DRE — ${unidades.find((u) => u.id === unidadeSel)?.nome ?? ''}`
        : 'DRE gerencial — consolidado';

  return (
    <div className="fin-root">
      <FinTabs
        active="dre"
        right={
          <span style={{ display: 'flex', gap: 8 }}>
            <button className="fin-btn" onClick={() => window.print()}>Imprimir</button>
            <button className="fin-btn" onClick={exportarCSV} disabled={!atual}>Exportar CSV</button>
          </span>
        }
      />

      {/* KPIs */}
      <div className="dre-kpis">
        <div className="fin-card kpi"><small>Receita bruta</small><b className="rec">{atual ? fmtBRL(atual.receitaBruta) : '—'}</b>
          <div className="d">{comp && delta(atual!.receitaBruta, comp.receitaBruta) ? `${delta(atual!.receitaBruta, comp.receitaBruta)!.txt} vs mês comparado` : ' '}</div></div>
        <div className="fin-card kpi"><small>Margem de contribuição</small><b className="navy">{atual ? pct(atual.margemContribuicao, atual.receitaBruta) : '—'}</b>
          <div className="d">{atual ? fmtBRL(atual.margemContribuicao) : ''}</div></div>
        <div className="fin-card kpi"><small>EBITDA</small><b className="navy">{atual ? pct(atual.ebitda, atual.receitaBruta) : '—'}</b>
          <div className="d">{atual ? fmtBRL(atual.ebitda) : ''}</div></div>
        <div className="fin-card kpi"><small>Resultado do mês</small><b className={atual && atual.resultado < 0 ? 'despk' : 'rec'}>{atual ? fmtBRL(atual.resultado) : '—'}</b>
          <div className="d">{atual ? `${pct(atual.resultado, atual.receitaBruta)} da receita` : ''}</div></div>
      </div>

      {/* filtros */}
      <div className="dre-filters">
        <div className="f"><label>Regime</label>
          <div style={{ display: 'inline-flex', border: '1px solid var(--line, #E8E2D6)', borderRadius: 9, overflow: 'hidden' }}>
            {(['CAIXA', 'COMPETENCIA'] as const).map((r) => (
              <button key={r} type="button" onClick={() => setRegime(r)} title={r === 'CAIXA' ? 'Receita/despesa quando o dinheiro entrou/saiu (sua gestão)' : 'Receita/despesa quando foi ganho/incorrido (contábil)'}
                style={{ border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, padding: '8px 14px', background: regime === r ? '#009AAC' : '#fff', color: regime === r ? '#fff' : '#5C6B70' }}>
                {r === 'CAIXA' ? '💵 Caixa' : '📅 Competência'}
              </button>
            ))}
          </div></div>
        <div className="f"><label>Período</label>
          <select className="fin-ctl" value={competencia} onChange={(e) => { setCompetencia(e.target.value); setComparar(mesAnterior(e.target.value)); }}>
            {meses.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select></div>
        <div className="f"><label>Comparar com</label>
          <select className="fin-ctl" value={comparar} onChange={(e) => setComparar(e.target.value)} disabled={unidadeSel === 'LADO'}>
            <option value="">— nada —</option>
            {meses.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select></div>
        <div className="f"><label>Unidade</label>
          <select className="fin-ctl" value={unidadeSel} onChange={(e) => setUnidadeSel(e.target.value)}>
            <option value="">Todas (consolidado)</option>
            <option value="LADO">Comparar lado a lado</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select></div>
        <div className="f"><label>Marca</label>
          <select className="fin-ctl" value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
            <option value="">Todas</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select></div>
        <div className="f"><label>Linha de serviço</label>
          <select className="fin-ctl" value={fLinha} onChange={(e) => setFLinha(e.target.value)}>
            <option value="">Todas</option>
            <option value="LADO">Comparar lado a lado (departamentos)</option>
            {linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select></div>
      </div>

      {/* aviso a classificar */}
      {atual && atual.aClassificar.qtd > 0 && (
        <div className="dre-aviso">
          ⚠️ <b style={{ fontWeight: 500 }}>{atual.aClassificar.qtd} lançamento(s)</b> sem categoria
          ({fmtBRL(atual.aClassificar.valorCentavos)}) ficaram <b style={{ fontWeight: 500 }}>fora</b> desta DRE —
          classifique-os na aba Lançamentos.
        </div>
      )}

      {/* ===== tabela ===== */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>{tituloCard} — {meses.find((m) => m.v === competencia)?.label}</h2>
          <span className="pill">{regime === 'CAIXA' ? '💵 por caixa (dinheiro que entrou/saiu)' : '📅 por competência (quando foi ganho/incorrido)'}</span>
        </div>
        <div className="fin-tbl-scroll">
          {carregando && <div className="dre-loading">Calculando…</div>}

          {!carregando && resp?.modo === 'CONSOLIDADO' && atual && (
            <table className="fin-tbl dre-tbl">
              <thead>
                <tr>
                  <th>Linha</th>
                  <th className="num">{meses.find((m) => m.v === competencia)?.label?.split(' ')[0]}</th>
                  <th className="num">% receita</th>
                  {comp && <th className="num">{meses.find((m) => m.v === comparar)?.label?.split(' ')[0] ?? 'Comparação'}</th>}
                  {comp && <th className="num">Δ</th>}
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => {
                  const v = val(atual, l.chave as string);
                  const vc = comp ? val(comp, l.chave as string) : null;
                  const dl = vc !== null && vc !== undefined ? delta(v, vc) : null;
                  const aberto = !!abertos[l.chave as string];
                  const filhos = l.detalhe ? atual.detalhes[l.detalhe] || [] : [];
                  const boaSubida = !l.negativa; // em linha de custo, subir é ruim
                  return (
                    <FragmentoLinha key={l.chave as string}
                      l={l} v={v} vc={vc} dl={dl} boaSubida={boaSubida}
                      receita={atual.receitaBruta} aberto={aberto} filhos={filhos}
                      onToggle={() => l.detalhe && filhos.length > 0 &&
                        setAbertos((s) => ({ ...s, [l.chave as string]: !s[l.chave as string] }))}
                    />
                  );
                })}
              </tbody>
            </table>
          )}

          {!carregando && resp?.modo === 'POR_UNIDADE' && (
            <table className="fin-tbl dre-tbl">
              <thead>
                <tr>
                  <th>Linha</th>
                  {resp.porUnidade.map((p) => <th key={p.unidade.id} className="num">{p.unidade.nome}</th>)}
                  <th className="num">Consolidado</th>
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => {
                  const cls = l.tipo === 'sub' ? 'sub' : l.tipo === 'total' ? 'total' : '';
                  const mostraPct = ['margemContribuicao', 'ebitda', 'resultado'].includes(l.chave as string);
                  const celula = (d: Dre, key: string) => {
                    const v = val(d, l.chave as string);
                    return (
                      <td key={key} className="num">
                        {l.negativa && v !== 0 ? '− ' : ''}{fmtNum(v)}
                        {mostraPct && <span className="pctline"> {pct(v, d.receitaBruta)}</span>}
                      </td>
                    );
                  };
                  return (
                    <tr key={l.chave as string} className={cls}>
                      <td>{l.titulo}</td>
                      {resp.porUnidade.map((p) => celula(p.dre, p.unidade.id))}
                      {celula(resp.consolidado, '_cons')}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {!carregando && resp?.modo === 'POR_LINHA' && (
            <table className="fin-tbl dre-tbl">
              <thead>
                <tr>
                  <th>Linha</th>
                  {resp.porLinha.map((p) => <th key={p.linha.id} className="num">{p.linha.nome}</th>)}
                  <th className="num">Consolidado</th>
                </tr>
              </thead>
              <tbody>
                {LINHAS.map((l) => {
                  const cls = l.tipo === 'sub' ? 'sub' : l.tipo === 'total' ? 'total' : '';
                  const mostraPct = ['margemContribuicao', 'ebitda', 'resultado'].includes(l.chave as string);
                  const celula = (d: Dre, key: string) => {
                    const v = val(d, l.chave as string);
                    return (
                      <td key={key} className="num">
                        {l.negativa && v !== 0 ? '− ' : ''}{fmtNum(v)}
                        {mostraPct && <span className="pctline"> {pct(v, d.receitaBruta)}</span>}
                      </td>
                    );
                  };
                  return (
                    <tr key={l.chave as string} className={cls}>
                      <td>{l.titulo}</td>
                      {resp.porLinha.map((p) => celula(p.dre, p.linha.id))}
                      {celula(resp.consolidado, '_cons')}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* fora do resultado */}
      {atual && (
        <div className="fin-card">
          <div className="fin-card-head">
            <h2>Fora do resultado</h2>
            <span className="pill fora">não entram no EBITDA</span>
          </div>
          <div className="fin-tbl-scroll">
            <table className="fin-tbl">
              <tbody>
                <tr><td>Investimentos (capex)</td><td className="num desp">{atual.fora.investimentos ? `− ${fmtNum(atual.fora.investimentos)}` : '—'}</td><td className="foralbl">investimento</td></tr>
                <tr><td>Financiamento (empréstimos)</td><td className="num">{atual.fora.financiamento ? fmtNum(atual.fora.financiamento) : '—'}</td><td className="foralbl">financiamento</td></tr>
                <tr><td>Distribuição de lucros</td><td className="num">{atual.fora.distribuicao ? `− ${fmtNum(atual.fora.distribuicao)}` : '—'}</td><td className="foralbl">não operacional</td></tr>
                <tr><td>Transferências entre contas</td><td className="num">{atual.fora.transferencias ? fmtNum(atual.fora.transferencias) : '—'}</td><td className="foralbl">neutro</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{DRE_CSS}</style>
    </div>
  );
}

/* linha da tabela consolidada (grupo/sub/total + filhos expandidos) */
function FragmentoLinha({ l, v, vc, dl, boaSubida, receita, aberto, filhos, onToggle }: {
  l: (typeof LINHAS)[number]; v: number; vc: number | null; dl: { txt: string; up: boolean } | null;
  boaSubida: boolean; receita: number; aberto: boolean; filhos: Detalhe[]; onToggle: () => void;
}) {
  const cls = l.tipo === 'sub' ? 'sub' : l.tipo === 'total' ? 'total' : 'grupo';
  const podeAbrir = l.tipo === 'grupo' && filhos.length > 0;
  const deltaBom = dl ? (dl.up ? boaSubida : !boaSubida) : true;
  return (
    <>
      <tr className={cls} onClick={onToggle} style={podeAbrir ? { cursor: 'pointer' } : undefined}>
        <td>
          {podeAbrir && <span className="toggle">{aberto ? '▾' : '▸'}</span>}
          {l.titulo}{' '}
          {l.selo && <span className="pill">{l.selo}</span>}
        </td>
        <td className={`num ${l.negativa && v !== 0 ? 'desp' : ''}`}>
          {l.negativa && v !== 0 ? '− ' : ''}{fmtNum(v)}
        </td>
        <td className="num pctcol">{pct(v, receita)}</td>
        {vc !== null && vc !== undefined && (
          <td className="num">{l.negativa && vc !== 0 ? '− ' : ''}{fmtNum(vc)}</td>
        )}
        {vc !== null && vc !== undefined && (
          <td className="num">{dl && <span className={`delta ${deltaBom ? 'up' : 'down'}`}>{dl.txt}</span>}</td>
        )}
      </tr>
      {aberto && filhos.map((f) => (
        <tr key={f.nome} className="filho">
          <td>{f.nome}</td>
          <td className="num">{l.negativa && f.valorCentavos !== 0 ? '− ' : ''}{fmtNum(f.valorCentavos)}</td>
          <td className="num pctcol">{pct(f.valorCentavos, receita)}</td>
          {vc !== null && vc !== undefined && <td className="num"></td>}
          {vc !== null && vc !== undefined && <td className="num"></td>}
        </tr>
      ))}
    </>
  );
}

/* ===================== CSS específico da DRE (escopado em .fin-root) ===================== */
const DRE_CSS = `
.fin-root .dre-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-root .dre-kpis .kpi{ padding:14px 16px; }
.fin-root .dre-kpis small{ font-size:12px; color:var(--text2); }
.fin-root .dre-kpis b{ display:block; margin-top:4px; font-size:24px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-root .dre-kpis b.rec{ color:var(--green); } .fin-root .dre-kpis b.navy{ color:var(--navy); } .fin-root .dre-kpis b.despk{ color:var(--coral); }
.fin-root .dre-kpis .d{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-root .dre-filters{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:12px 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; }
.fin-root .dre-aviso{ background:var(--gold-bg); border:1px solid #E7D4A8; border-radius:12px; padding:10px 14px; font-size:12.5px; color:var(--gold); }
.fin-root .dre-loading{ text-align:center; color:var(--text3); padding:30px 0; font-size:13px; }
.fin-root .dre-tbl td{ padding:9px 14px; }
.fin-root .dre-tbl .toggle{ color:var(--primary); font-size:11px; margin-right:6px; }
.fin-root .dre-tbl tr.filho td{ background:#FBF9F4; font-size:12.5px; color:var(--text2); padding-top:7px; padding-bottom:7px; }
.fin-root .dre-tbl tr.filho td:first-child{ padding-left:38px; }
.fin-root .dre-tbl tr.sub td{ background:var(--tint); font-weight:500; color:var(--navy); border-top:1px solid #CFE9EC; border-bottom:1px solid #CFE9EC; }
.fin-root .dre-tbl tr.total td{ background:var(--navy); color:#fff; font-weight:500; font-size:14px; }
.fin-root .dre-tbl .pctcol{ color:var(--text3); font-size:12px; }
.fin-root .dre-tbl tr.total .pctcol{ color:#BFE3E8; }
.fin-root .dre-tbl .pctline{ color:var(--text3); font-size:11.5px; }
.fin-root .dre-tbl tr.total .pctline{ color:#BFE3E8; }
.fin-root .dre-tbl .delta{ font-size:11.5px; }
.fin-root .dre-tbl .delta.up{ color:var(--green); } .fin-root .dre-tbl .delta.down{ color:var(--coral); }
.fin-root .foralbl{ text-align:right; color:var(--text3); font-size:12px; white-space:nowrap; width:130px; }
.fin-root .pill.fora{ background:#EDEAF3; color:#5B4C86; }
@media (max-width:900px){ .fin-root .dre-kpis{ grid-template-columns:repeat(2,1fr); } }
@media print {
  .fin-root .fin-head, .fin-root .dre-filters, .fin-root .dre-kpis{ display:none; }
}
`;
