'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

/* ===================== tipos ===================== */
interface Unidade { id: string; nome: string; tipo: string; percentualNos: string | number | null; }
interface Conta { id: string; nome: string; }
interface Faturamento {
  id: string; unidadeId: string; data: string; competencia: string;
  brutoCentavos: number; taxaCartaoCentavos: number; parceiraCentavos: number; nosCentavos: number;
  lancamentoLiquidoId: string | null;
}
interface ListaFat {
  resumo: { brutoCentavos: number; taxaCentavos: number; parceiraCentavos: number; nosCentavos: number; registros: number };
  itens: Faturamento[];
}
interface Parcela { id: string; numero: number; vencimento: string; valorCentavos: number; pago: boolean; dataPagamento: string | null; }
interface Emprestimo {
  id: string; descricao: string; unidadeTomadoraId: string; valorCentavos: number; data: string;
  contaOrigemId: string | null; contaDestinoId: string | null;
  parcelas: Parcela[]; devolvidoCentavos: number; pagas: number; proxima: Parcela | null;
}
interface Candidato { id: string; data: string; descricao: string | null; valorCentavos: number; status: string; }

/* ===================== helpers ===================== */
const fmtNum = (c: number) => new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format((c || 0) / 100);
const fmtDia = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—');
const hojeISO = () => new Date().toISOString().slice(0, 10);
function reaisToCentavos(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return Math.round((isNaN(n) ? 0 : n) * 100);
}
async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro ao carregar');
  return d;
}
async function sendJSON(url: string, method: string, body?: any) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = await r.json().catch(() => null);
  if (!r.ok) {
    const m = d && (Array.isArray(d.message) ? d.message.join(', ') : d.message || d.error);
    throw new Error(m || 'Erro ao salvar');
  }
  return d;
}
function mesesRecentes(qtd = 12): { v: string; label: string }[] {
  const out: { v: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    out.push({
      v: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    });
  }
  return out;
}

const fatVazio = { id: '', data: hojeISO(), bruto: '', taxa: '', base: '', lancamentoLiquidoId: '' };
const empVazio = { descricao: '', valor: '', data: hojeISO(), numParcelas: '12', primeiraParcela: '', contaOrigemId: '', contaDestinoId: '' };

/* ===================== página ===================== */
export default function ParceriaPage() {
  const meses = useMemo(() => mesesRecentes(), []);
  const [competencia, setCompetencia] = useState(meses[0]?.v ?? '');
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [unidadeId, setUnidadeId] = useState('');
  const [unidadeImport, setUnidadeImport] = useState(''); // unidade destino do import de vendas (''=Sede padrão)

  const [lista, setLista] = useState<ListaFat | null>(null);
  const [emprestimos, setEmprestimos] = useState<Emprestimo[]>([]);
  const [candidatos, setCandidatos] = useState<Candidato[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});

  const [modalFat, setModalFat] = useState(false);
  const [fat, setFat] = useState(fatVazio);
  const [modalEmp, setModalEmp] = useState(false);
  const [emp, setEmp] = useState(empVazio);
  const [salvando, setSalvando] = useState(false);

  const parcerias = useMemo(() => unidades.filter((u) => u.tipo === 'PARCERIA'), [unidades]);
  const unidadeSel = unidades.find((u) => u.id === unidadeId);
  const perc = unidadeSel?.percentualNos ? Number(unidadeSel.percentualNos) : 0.65;
  const uById = useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);

  useEffect(() => {
    (async () => {
      try {
        const [u, c] = await Promise.all([
          getJSON('/api/financeiro/unidades'),
          getJSON('/api/financeiro/contas'),
        ]);
        setUnidades(u || []);
        setContas(c || []);
        const p = (u || []).find((x: Unidade) => x.tipo === 'PARCERIA');
        if (p) setUnidadeId(p.id);
      } catch (e: any) {
        toast.error(e.message || 'Falha ao carregar cadastros');
      }
    })();
  }, []);

  const carregar = useCallback(async () => {
    if (!unidadeId) return;
    setCarregando(true);
    try {
      const [f, e, cand] = await Promise.all([
        getJSON(`/api/financeiro/parceria/faturamentos?unidadeId=${unidadeId}&competencia=${competencia}`),
        getJSON('/api/financeiro/emprestimos'),
        getJSON(`/api/financeiro/parceria/candidatos?unidadeId=${unidadeId}&competencia=${competencia}`),
      ]);
      setLista(f);
      setEmprestimos(e || []);
      setCandidatos(cand || []);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }, [unidadeId, competencia]);

  useEffect(() => { carregar(); }, [carregar]);

  /* split ao vivo no modal (regra confirmada: base = bruto − taxa; nosso = % × base) */
  const brutoC = reaisToCentavos(fat.bruto);
  const baseC = fat.base ? reaisToCentavos(fat.base) : Math.max(0, brutoC - reaisToCentavos(fat.taxa));
  const taxaC = Math.max(0, brutoC - baseC);
  const nosC = Math.round(baseC * perc);
  const parceiraC = baseC - nosC;

  function abrirNovoFat() { setFat({ ...fatVazio, data: hojeISO() }); setModalFat(true); }
  function abrirEdicaoFat(f: Faturamento) {
    setFat({
      id: f.id,
      data: f.data.slice(0, 10),
      bruto: (f.brutoCentavos / 100).toFixed(2).replace('.', ','),
      taxa: (f.taxaCartaoCentavos / 100).toFixed(2).replace('.', ','),
      base: '',
      lancamentoLiquidoId: f.lancamentoLiquidoId || '',
    });
    setModalFat(true);
  }

  async function salvarFat() {
    if (brutoC <= 0) return toast.error('Informe o bruto.');
    if (baseC <= 0) return toast.error('Informe a taxa ou a base.');
    setSalvando(true);
    try {
      const body: any = {
        unidadeId,
        data: fat.data,
        competencia: `${competencia}-01`,
        brutoCentavos: brutoC,
        taxaCartaoCentavos: taxaC,
        lancamentoLiquidoId: fat.lancamentoLiquidoId || null,
      };
      if (fat.id) await sendJSON(`/api/financeiro/parceria/faturamentos/${fat.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/parceria/faturamentos', 'POST', body);
      toast.success('Faturamento registrado');
      setModalFat(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }
  async function excluirFat(f: Faturamento) {
    if (!confirm('Excluir este registro de faturamento?')) return;
    try {
      const r = await fetch(`/api/financeiro/parceria/faturamentos/${f.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
      toast.success('Excluído');
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  function abrirNovoEmp() {
    setEmp({ ...empVazio, data: hojeISO(), primeiraParcela: '' });
    setModalEmp(true);
  }
  async function salvarEmp() {
    if (!emp.descricao.trim()) return toast.error('Informe a descrição.');
    if (reaisToCentavos(emp.valor) <= 0) return toast.error('Informe o valor.');
    if (!emp.primeiraParcela) return toast.error('Informe a 1ª parcela.');
    setSalvando(true);
    try {
      await sendJSON('/api/financeiro/emprestimos', 'POST', {
        descricao: emp.descricao.trim(),
        unidadeTomadoraId: unidadeId,
        valorCentavos: reaisToCentavos(emp.valor),
        data: emp.data,
        numParcelas: Number(emp.numParcelas) || 1,
        primeiraParcela: emp.primeiraParcela,
        contaOrigemId: emp.contaOrigemId || undefined,
        contaDestinoId: emp.contaDestinoId || undefined,
      });
      toast.success('Empréstimo criado com as parcelas');
      setModalEmp(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }
  async function devolverParcela(e: Emprestimo, p: Parcela) {
    if (!confirm(`Registrar a devolução da parcela ${p.numero} (${fmtBRL(p.valorCentavos)}) hoje?\nIsso cria a transferência neutra (unidade → sede).`)) return;
    try {
      await sendJSON(`/api/financeiro/emprestimos/parcelas/${p.id}/pagar`, 'POST', { dataPagamento: hojeISO() });
      toast.success('Devolução registrada');
      carregar();
    } catch (er: any) { toast.error(er.message || 'Erro'); }
  }
  async function excluirEmp(e: Emprestimo) {
    if (!confirm(`Excluir o empréstimo "${e.descricao}"? As transferências já geradas são mantidas.`)) return;
    try {
      const r = await fetch(`/api/financeiro/emprestimos/${e.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
      toast.success('Excluído');
      carregar();
    } catch (er: any) { toast.error(er.message || 'Erro'); }
  }

  const res = lista?.resumo;

  const mapFileRef = useRef<HTMLInputElement>(null);
  const [importandoMap, setImportandoMap] = useState(false);
  async function importarMapCsv(file: File) {
    setImportandoMap(true);
    try {
      const csv = await file.text();
      const r = await fetch('/api/financeiro/mapvendas/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ csv, unidadeId: unidadeImport || undefined }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.message || 'Falha na importação');
      toast.success(`${d.unidade || 'Vendas'} importada: ${d.lancamentos} nova(s)${d.atualizados ? `, ${d.atualizados} reclassificada(s)` : ''} · ${d.vendas} venda(s) · total ${fmtBRL(d.total || 0)}${d.semDepara ? ` · ${d.semDepara} sem departamento` : ''}`, { duration: 6000 });
    } catch (e: any) { toast.error(e.message || 'Erro ao importar'); }
    finally { setImportandoMap(false); }
  }

  return (
    <div className="fin-root">
      <input ref={mapFileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) importarMapCsv(f); }} />
      <FinTabs
        active="parceria"
        right={<>
          <select value={unidadeImport} onChange={(e) => setUnidadeImport(e.target.value)} className="fin-ctl" title="Unidade destino do import" style={{ marginRight: 6 }}>
            <option value="">Sede (padrão)</option>
            {parcerias.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <button className="fin-btn" onClick={() => mapFileRef.current?.click()} disabled={importandoMap} title="Importar o relatório de vendas (CSV) do SimplesVet — escolha a unidade ao lado (Sede ou MAP HVG)">
            {importandoMap ? 'Importando…' : '📥 Importar vendas (CSV)'}
          </button>{' '}
          <button className="fin-btn primary" onClick={abrirNovoFat} disabled={!unidadeId}>+ Registrar faturamento</button>
        </>}
      />

      {parcerias.length === 0 && !carregando && (
        <div className="par-aviso">Nenhuma unidade do tipo <b style={{ fontWeight: 500 }}>parceria</b> cadastrada.</div>
      )}

      {/* KPIs */}
      <div className="par-kpis">
        <div className="par-kpi"><small>Bruto na maquineta</small><b>{fmtBRL(res?.brutoCentavos ?? 0)}</b><div className="d">{uById.get(unidadeId) || '—'} · {res?.registros ?? 0} registro(s)</div></div>
        <div className="par-kpi alert"><small>Taxa de cartão</small><b>{fmtBRL(res?.taxaCentavos ?? 0)}</b><div className="d">{res?.brutoCentavos ? ((res.taxaCentavos / res.brutoCentavos) * 100).toFixed(1).replace('.', ',') + '% do bruto' : ' '}</div></div>
        <div className="par-kpi info"><small>Parceira ({Math.round((1 - perc) * 100)}%)</small><b>{fmtBRL(res?.parceiraCentavos ?? 0)}</b><div className="d">fica com a clínica parceira</div></div>
        <div className="par-kpi ok"><small>Nosso ({Math.round(perc * 100)}%)</small><b>{fmtBRL(res?.nosCentavos ?? 0)}</b><div className="d">é a receita da unidade no DRE</div></div>
      </div>

      {/* filtros */}
      <div className="par-filters">
        <select className="fin-ctl" value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}>
          {parcerias.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <select className="fin-ctl" value={competencia} onChange={(e) => setCompetencia(e.target.value)}>
          {meses.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
        <span className="pill">repasse: todo dia 5 do lote</span>
      </div>

      {/* faturamentos */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Faturamento bruto — Finpet</h2>
          <span className="pill">{lista?.itens.length ?? 0} registro(s)</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Data</th><th className="num">Bruto</th><th className="num">Taxa</th>
                <th className="num">Parceira</th><th className="num">Nosso</th><th>Caixa</th><th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={7} className="fin-empty">Carregando…</td></tr>}
              {!carregando && (lista?.itens.length ?? 0) === 0 && (
                <tr><td colSpan={7} className="fin-empty">Nenhum faturamento registrado neste mês. Use “+ Registrar faturamento”.</td></tr>
              )}
              {!carregando && lista?.itens.map((f) => (
                <tr key={f.id}>
                  <td className="par-dt">{fmtDia(f.data)}</td>
                  <td className="num">{fmtNum(f.brutoCentavos)}</td>
                  <td className="num desp">− {fmtNum(f.taxaCartaoCentavos)}</td>
                  <td className="num">{fmtNum(f.parceiraCentavos)}</td>
                  <td className="num rec">{fmtNum(f.nosCentavos)}</td>
                  <td>{f.lancamentoLiquidoId
                    ? <span className="pill okp">✓ conciliado</span>
                    : <span className="pill warnp">aguardando repasse</span>}</td>
                  <td className="par-acao">
                    <button className="fin-btn sm" onClick={() => abrirEdicaoFat(f)}>Editar</button>{' '}
                    <button className="fin-btn sm ghost" onClick={() => excluirFat(f)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* empréstimos */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Empréstimos internos (sede → unidade)</h2>
          <span className="pill forap">fora do resultado</span>
          <span className="fin-spacer" />
          <button className="fin-btn primary sm" onClick={abrirNovoEmp} disabled={!unidadeId}>+ Novo empréstimo</button>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <tbody>
              {emprestimos.length === 0 && (
                <tr><td className="fin-empty">Nenhum empréstimo registrado.</td></tr>
              )}
              {emprestimos.map((e) => (
                <FragEmprestimo key={e.id} e={e} uNome={uById.get(e.unidadeTomadoraId) || '—'}
                  aberto={!!abertos[e.id]}
                  onToggle={() => setAbertos((s) => ({ ...s, [e.id]: !s[e.id] }))}
                  onDevolver={(p) => devolverParcela(e, p)}
                  onExcluir={() => excluirEmp(e)} />
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text3)', padding: '10px 16px' }}>
          “Devolver” cria sozinho a <b style={{ fontWeight: 500 }}>transferência neutra</b> (conta da unidade → conta da sede) e marca a parcela paga.
          Nada entra no EBITDA — aparece no DRE em “Fora do resultado”.
        </p>
      </div>

      {/* modal faturamento */}
      {modalFat && (
        <div className="fin-overlay" onClick={() => !salvando && setModalFat(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head">
              <h3>{fat.id ? 'Editar faturamento' : 'Registrar faturamento — Finpet'}</h3>
              <span className="fin-spacer" />
              <span className="pill">{uById.get(unidadeId)} · {Math.round(perc * 100)}/{Math.round((1 - perc) * 100)}</span>
            </div>
            <div className="fin-modal-body">
              <div className="row2">
                <div className="f"><label>Data</label><input type="date" className="fin-ctl" value={fat.data} onChange={(e) => setFat((s) => ({ ...s, data: e.target.value }))} /></div>
                <div className="f"><label>Competência</label><input className="fin-ctl" value={meses.find((m) => m.v === competencia)?.label || competencia} readOnly /></div>
              </div>
              <div className="row3">
                <div className="f">
                  <label>Bruto <span style={{ color: 'var(--coral)' }}>*</span></label>
                  <input className="fin-ctl" value={fat.bruto} onChange={(e) => setFat((s) => ({ ...s, bruto: e.target.value }))} placeholder="0,00" />
                </div>
                <div className="f">
                  <label>Taxa de cartão</label>
                  <input className="fin-ctl" value={fat.taxa} onChange={(e) => setFat((s) => ({ ...s, taxa: e.target.value, base: '' }))} placeholder="0,00" />
                </div>
                <div className="f">
                  <label>…ou a Base (do relatório)</label>
                  <input className="fin-ctl" value={fat.base} onChange={(e) => setFat((s) => ({ ...s, base: e.target.value, taxa: '' }))} placeholder="0,00" />
                  <div className="hint">coluna “Base” — a taxa sai sozinha</div>
                </div>
              </div>

              <div className="par-split">
                <div className="linha"><span>Base do split (bruto − taxa)</span><span className="num">{fmtBRL(baseC)}</span></div>
                <div className="linha"><span>Parceira · {Math.round((1 - perc) * 100)}%</span><span className="num">{fmtBRL(parceiraC)}</span></div>
                <div className="linha total"><span>Nosso · {Math.round(perc * 100)}% <span className="pill okp">vira a receita no DRE</span></span><span className="num rec">{fmtBRL(nosC)}</span></div>
                <div className="hint" style={{ color: 'var(--primary)' }}>regra confirmada: primeiro desconta a taxa, depois divide</div>
              </div>

              <div className="f">
                <label>Conciliar com o caixa (repasse)</label>
                <select className="fin-ctl" value={fat.lancamentoLiquidoId} onChange={(e) => setFat((s) => ({ ...s, lancamentoLiquidoId: e.target.value }))}>
                  <option value="">— quando o repasse cair, casar aqui —</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {fmtDia(c.data)} · {(c.descricao || 'receita').slice(0, 40)} · {fmtBRL(c.valorCentavos)}
                    </option>
                  ))}
                </select>
                <div className="hint">o líquido é o que aparece na conta; o bruto e a parte da parceira nunca somam na receita</div>
              </div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModalFat(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvarFat} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* modal empréstimo */}
      {modalEmp && (
        <div className="fin-overlay" onClick={() => !salvando && setModalEmp(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head"><h3>Novo empréstimo — Sede → {uById.get(unidadeId)}</h3></div>
            <div className="fin-modal-body">
              <div className="f"><label>Descrição</label>
                <input className="fin-ctl" value={emp.descricao} onChange={(e) => setEmp((s) => ({ ...s, descricao: e.target.value }))} placeholder="ex.: Reforma + equipamentos" /></div>
              <div className="row3">
                <div className="f"><label>Valor total</label><input className="fin-ctl" value={emp.valor} onChange={(e) => setEmp((s) => ({ ...s, valor: e.target.value }))} placeholder="0,00" /></div>
                <div className="f"><label>Data do empréstimo</label><input type="date" className="fin-ctl" value={emp.data} onChange={(e) => setEmp((s) => ({ ...s, data: e.target.value }))} /></div>
                <div className="f"><label>Nº de parcelas</label><input type="number" min={1} max={120} className="fin-ctl" value={emp.numParcelas} onChange={(e) => setEmp((s) => ({ ...s, numParcelas: e.target.value }))} /></div>
              </div>
              <div className="row3">
                <div className="f"><label>1ª parcela vence em</label><input type="date" className="fin-ctl" value={emp.primeiraParcela} onChange={(e) => setEmp((s) => ({ ...s, primeiraParcela: e.target.value }))} /></div>
                <div className="f"><label>Conta da sede (emprestou)</label>
                  <select className="fin-ctl" value={emp.contaOrigemId} onChange={(e) => setEmp((s) => ({ ...s, contaOrigemId: e.target.value }))}>
                    <option value="">— escolher —</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select></div>
                <div className="f"><label>Conta da unidade (recebeu)</label>
                  <select className="fin-ctl" value={emp.contaDestinoId} onChange={(e) => setEmp((s) => ({ ...s, contaDestinoId: e.target.value }))}>
                    <option value="">— escolher —</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select></div>
              </div>
              <div className="f"><div className="hint" style={{ color: 'var(--primary)' }}>
                {reaisToCentavos(emp.valor) > 0 && Number(emp.numParcelas) > 0
                  ? `parcelas de ~${fmtBRL(Math.floor(reaisToCentavos(emp.valor) / Number(emp.numParcelas)))} (a última fecha o total)`
                  : 'as parcelas são calculadas sozinhas'}
              </div></div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModalEmp(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvarEmp} disabled={salvando}>{salvando ? 'Salvando…' : 'Criar empréstimo'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{PAR_CSS}</style>
    </div>
  );
}

/* linha do empréstimo + parcelas expansíveis */
function FragEmprestimo({ e, uNome, aberto, onToggle, onDevolver, onExcluir }: {
  e: Emprestimo; uNome: string; aberto: boolean;
  onToggle: () => void; onDevolver: (p: Parcela) => void; onExcluir: () => void;
}) {
  return (
    <>
      <tr>
        <td>
          <div style={{ fontWeight: 500 }}>{e.descricao}</div>
          <div style={{ fontSize: 11.5, color: 'var(--text3)', marginTop: 2 }}>Sede → {uNome} · {fmtDia(e.data)}</div>
        </td>
        <td className="num">{fmtNum(e.valorCentavos)}</td>
        <td className="num rec">{e.devolvidoCentavos ? fmtNum(e.devolvidoCentavos) : '—'}</td>
        <td>
          <span className="pill okp">{e.pagas}/{e.parcelas.length} pagas</span>{' '}
          {e.proxima && <span className="pill">próxima: {fmtDia(e.proxima.vencimento)} · {fmtBRL(e.proxima.valorCentavos)}</span>}
        </td>
        <td className="par-acao">
          <button className="fin-btn sm" onClick={onToggle}>{aberto ? '▾' : '▸'} parcelas</button>{' '}
          <button className="fin-btn sm ghost" onClick={onExcluir}>Excluir</button>
        </td>
      </tr>
      {aberto && e.parcelas.map((p) => (
        <tr key={p.id} className="par-filho">
          <td>Parcela {p.numero}/{e.parcelas.length} · vence {fmtDia(p.vencimento)}</td>
          <td className="num">{fmtNum(p.valorCentavos)}</td>
          <td className="num rec">{p.pago ? `✓ paga em ${fmtDia(p.dataPagamento)}` : ''}</td>
          <td></td>
          <td className="par-acao">
            {!p.pago && <button className="fin-btn primary sm" onClick={() => onDevolver(p)}>Devolver</button>}
          </td>
        </tr>
      ))}
    </>
  );
}

/* ===================== CSS (escopado em .fin-root) ===================== */
const PAR_CSS = `
.fin-root .par-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-root .par-kpi{ border:1px solid var(--line); border-radius:12px; padding:14px 16px; background:#fff; box-shadow:0 1px 2px rgba(52,50,46,.04); }
.fin-root .par-kpi small{ font-size:12px; color:var(--text2); }
.fin-root .par-kpi b{ display:block; margin-top:4px; font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-root .par-kpi .d{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-root .par-kpi.alert{ border-color:#E7D4A8; background:var(--gold-bg); }
.fin-root .par-kpi.alert b,.fin-root .par-kpi.alert small{ color:var(--gold); } .fin-root .par-kpi.alert .d{ color:#93701a; }
.fin-root .par-kpi.info{ border-color:#CFE9EC; background:var(--tint); }
.fin-root .par-kpi.info b,.fin-root .par-kpi.info small{ color:var(--navy); } .fin-root .par-kpi.info .d{ color:#3E7A85; }
.fin-root .par-kpi.ok{ border-color:#BFE6CF; background:var(--green-bg); }
.fin-root .par-kpi.ok b,.fin-root .par-kpi.ok small{ color:var(--green); } .fin-root .par-kpi.ok .d{ color:#2c6b47; }
.fin-root .par-filters{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:12px 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.fin-root .par-aviso{ background:var(--gold-bg); border:1px solid #E7D4A8; border-radius:12px; padding:10px 14px; font-size:12.5px; color:var(--gold); }
.fin-root .par-dt{ white-space:nowrap; color:var(--text2); font-variant-numeric:tabular-nums; width:64px; }
.fin-root .par-acao{ text-align:right; white-space:nowrap; }
.fin-root .fin-tbl .rec{ color:var(--green); } .fin-root .fin-tbl .desp{ color:var(--coral); }
.fin-root .pill.okp{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.warnp{ background:var(--gold-bg); color:var(--gold); }
.fin-root .pill.forap{ background:#EDEAF3; color:#5B4C86; }
.fin-root tr.par-filho td{ background:#FBF9F4; font-size:12.5px; color:var(--text2); padding-top:7px; padding-bottom:7px; }
.fin-root tr.par-filho td:first-child{ padding-left:38px; }
.fin-root .par-split{ border:1px solid var(--line); border-radius:12px; background:#FBF9F4; padding:14px; display:flex; flex-direction:column; gap:8px; }
.fin-root .par-split .linha{ display:flex; justify-content:space-between; align-items:center; font-size:13px; }
.fin-root .par-split .linha .num{ font-variant-numeric:tabular-nums; }
.fin-root .par-split .total{ border-top:1px solid var(--line); padding-top:8px; font-weight:500; }
.fin-root .par-split .rec{ color:var(--green); }
.fin-root .par-split .hint{ font-size:11px; margin-top:2px; }
@media (max-width:900px){ .fin-root .par-kpis{ grid-template-columns:repeat(2,1fr); } }
`;
