'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

/* ===================== tipos ===================== */
type Tipo = 'RECEITA' | 'DESPESA';
type Freq = 'MENSAL' | 'SEMANAL' | 'ANUAL';
interface Item {
  id: string; vencimento: string | null; descricao: string | null; numeroDocumento: string | null;
  tipo: Tipo; valorCentavos: number; categoriaId: string | null; unidadeId: string;
  recorrenciaId: string | null;
}
interface Kpi { valorCentavos: number; qtd: number; }
interface Agenda {
  resumo: { vencidas: Kpi; vencemHoje: Kpi; proximos7: Kpi; aReceber: Kpi };
  itens: Item[];
}
interface Recorrencia {
  id: string; descricao: string; tipo: Tipo; valorCentavos: number;
  frequencia: Freq; dia: number; mesReferencia: number | null;
  antecedenciaDias: number; terminaEm: string | null; maxOcorrencias: number | null;
  ativo: boolean; categoriaId: string | null; contaId: string; unidadeId: string;
  marcaId: string | null; linhaServicoId: string | null; ultimoVencimentoGerado: string | null;
}
interface Opt { id: string; nome: string; }

/* ===================== helpers ===================== */
const fmtDia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
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

const DIAS_SEMANA = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
function freqTxt(r: Recorrencia): string {
  if (r.frequencia === 'SEMANAL') return `semanal, toda ${DIAS_SEMANA[r.dia % 7]}`;
  if (r.frequencia === 'ANUAL') return `anual, dia ${r.dia}/${String(r.mesReferencia ?? 1).padStart(2, '0')}`;
  return `mensal, todo dia ${r.dia}`;
}

const recVazia = {
  id: '', descricao: '', tipo: 'DESPESA' as Tipo, valor: '',
  frequencia: 'MENSAL' as Freq, dia: 10, mesReferencia: 1,
  antecedenciaDias: 30, termina: 'NUNCA' as 'NUNCA' | 'VEZES' | 'DATA',
  maxOcorrencias: '', terminaEm: '',
  categoriaId: '', contaId: '', unidadeId: '', marcaId: '', linhaServicoId: '',
};
type RecForm = typeof recVazia;

/* ===================== página ===================== */
export default function AgendaPage() {
  const [filtro, setFiltro] = useState<'TODAS' | 'A_PAGAR' | 'A_RECEBER'>('TODAS');
  const [periodo, setPeriodo] = useState<'30D' | 'MES' | 'TUDO'>('30D');
  const [fUnidade, setFUnidade] = useState('');

  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [recs, setRecs] = useState<Recorrencia[]>([]);
  // P2.1: vendas não pagas (a receber de clientes) — leitura, via /api/credito/saldos.
  const [aRecCli, setARecCli] = useState<{ total: number; qtd: number }>({ total: 0, qtd: 0 });
  const [carregando, setCarregando] = useState(true);

  const [unidades, setUnidades] = useState<Opt[]>([]);
  const [marcas, setMarcas] = useState<Opt[]>([]);
  const [linhas, setLinhas] = useState<Opt[]>([]);
  const [categorias, setCategorias] = useState<(Opt & { tipo: string })[]>([]);
  const [contas, setContas] = useState<(Opt & { unidadeId: string | null })[]>([]);

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<RecForm>(recVazia);
  const [salvando, setSalvando] = useState(false);

  const uById = useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);
  const cById = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);

  useEffect(() => {
    (async () => {
      try {
        const [u, m, l, c, ct] = await Promise.all([
          getJSON('/api/financeiro/unidades'),
          getJSON('/api/financeiro/marcas'),
          getJSON('/api/financeiro/linhas-servico'),
          getJSON('/api/financeiro/categorias'),
          getJSON('/api/financeiro/contas'),
        ]);
        setUnidades(u || []); setMarcas(m || []); setLinhas(l || []);
        setCategorias(c || []); setContas(ct || []);
      } catch { /* segue sem cadastros */ }
      // A receber de clientes (vendas não pagas) — saldo negativo = cliente deve.
      try {
        const saldos = await getJSON('/api/credito/saldos');
        const devem = (Array.isArray(saldos) ? saldos : []).filter((s: any) => Number(s.saldo) < 0);
        setARecCli({ total: devem.reduce((acc: number, s: any) => acc + Math.abs(Number(s.saldo) || 0), 0), qtd: devem.length });
      } catch { /* segue sem o a-receber de clientes */ }
    })();
  }, []);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const qs = new URLSearchParams({ filtro });
      if (periodo === '30D') {
        qs.set('ate', new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
      } else if (periodo === 'MES') {
        const n = new Date();
        qs.set('ate', new Date(n.getFullYear(), n.getMonth() + 1, 0).toISOString().slice(0, 10));
      }
      if (fUnidade) qs.set('unidadeId', fUnidade);
      const [ag, rc] = await Promise.all([
        getJSON(`/api/financeiro/agenda?${qs.toString()}`),
        getJSON('/api/financeiro/recorrencias'),
      ]);
      setAgenda(ag);
      setRecs(rc || []);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar a agenda');
    } finally {
      setCarregando(false);
    }
  }, [filtro, periodo, fUnidade]);

  useEffect(() => { carregar(); }, [carregar]);

  /* grupos por urgência */
  const grupos = useMemo(() => {
    const hoje = new Date(hojeISO());
    const amanha = new Date(hoje.getTime() + 86400000);
    const sete = new Date(hoje.getTime() + 8 * 86400000);
    const g = { vencidas: [] as Item[], hoje: [] as Item[], sete: [] as Item[], depois: [] as Item[] };
    for (const i of agenda?.itens ?? []) {
      const v = i.vencimento ? new Date(i.vencimento) : null;
      if (!v) { g.depois.push(i); continue; }
      if (v < hoje) g.vencidas.push(i);
      else if (v < amanha) g.hoje.push(i);
      else if (v < sete) g.sete.push(i);
      else g.depois.push(i);
    }
    return g;
  }, [agenda]);

  async function baixar(i: Item) {
    try {
      await sendJSON(`/api/financeiro/lancamentos/${i.id}/baixar`, 'POST', { dataPagamento: hojeISO() });
      toast.success(i.tipo === 'DESPESA' ? 'Baixa registrada' : 'Recebimento registrado');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro na baixa');
    }
  }

  /* recorrências */
  function abrirNova() { setForm(recVazia); setModal(true); }
  function abrirEdicao(r: Recorrencia) {
    setForm({
      id: r.id, descricao: r.descricao, tipo: r.tipo,
      valor: (r.valorCentavos / 100).toFixed(2).replace('.', ','),
      frequencia: r.frequencia, dia: r.dia, mesReferencia: r.mesReferencia ?? 1,
      antecedenciaDias: r.antecedenciaDias,
      termina: r.maxOcorrencias ? 'VEZES' : r.terminaEm ? 'DATA' : 'NUNCA',
      maxOcorrencias: r.maxOcorrencias ? String(r.maxOcorrencias) : '',
      terminaEm: r.terminaEm ? r.terminaEm.slice(0, 10) : '',
      categoriaId: r.categoriaId || '', contaId: r.contaId, unidadeId: r.unidadeId,
      marcaId: r.marcaId || '', linhaServicoId: r.linhaServicoId || '',
    });
    setModal(true);
  }
  function setF<K extends keyof RecForm>(k: K, v: RecForm[K]) { setForm((f) => ({ ...f, [k]: v })); }
  function onTrocaConta(contaId: string) {
    setForm((f) => ({ ...f, contaId, unidadeId: f.unidadeId || contas.find((c) => c.id === contaId)?.unidadeId || '' }));
  }

  async function salvarRec() {
    if (!form.descricao.trim()) return toast.error('Informe a descrição.');
    if (reaisToCentavos(form.valor) <= 0) return toast.error('Informe o valor.');
    if (!form.contaId) return toast.error('Escolha a conta.');
    if (!form.unidadeId) return toast.error('Escolha a unidade.');
    setSalvando(true);
    try {
      const body: any = {
        descricao: form.descricao.trim(), tipo: form.tipo,
        valorCentavos: reaisToCentavos(form.valor),
        frequencia: form.frequencia, dia: Number(form.dia) || 1,
        mesReferencia: form.frequencia === 'ANUAL' ? Number(form.mesReferencia) || 1 : undefined,
        antecedenciaDias: Number(form.antecedenciaDias) || 30,
        maxOcorrencias: form.termina === 'VEZES' ? Number(form.maxOcorrencias) || undefined : undefined,
        terminaEm: form.termina === 'DATA' && form.terminaEm ? form.terminaEm : undefined,
        categoriaId: form.categoriaId || undefined,
        contaId: form.contaId, unidadeId: form.unidadeId,
        marcaId: form.marcaId || undefined, linhaServicoId: form.linhaServicoId || undefined,
      };
      if (form.id) await sendJSON(`/api/financeiro/recorrencias/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/recorrencias', 'POST', body);
      toast.success('Recorrência salva');
      setModal(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }
  async function alternarAtivo(r: Recorrencia) {
    try {
      await sendJSON(`/api/financeiro/recorrencias/${r.id}`, 'PATCH', { ativo: !r.ativo });
      toast.success(r.ativo ? 'Recorrência pausada' : 'Recorrência reativada');
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluirRec(r: Recorrencia) {
    if (!confirm(`Excluir a recorrência "${r.descricao}"? Os lançamentos já gerados são mantidos.`)) return;
    try {
      const rr = await fetch(`/api/financeiro/recorrencias/${r.id}`, { method: 'DELETE' });
      if (!rr.ok) throw new Error((await rr.json().catch(() => ({}))).error || 'Erro');
      toast.success('Excluída');
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  const linhaItem = (i: Item, vencida: boolean, hoje: boolean) => (
    <tr key={i.id}>
      <td className={`agd-dt ${vencida ? 'venc' : ''}`}>{fmtDia(i.vencimento)}</td>
      <td>
        <div className="agd-desc">
          {i.descricao || '—'}{' '}
          {i.recorrenciaId && <span className="pill recb">↻</span>}
          {i.tipo === 'RECEITA' && <span className="pill receber">a receber</span>}
        </div>
        <div className="agd-sub">
          {i.categoriaId ? cById.get(i.categoriaId) : 'sem categoria'} · {uById.get(i.unidadeId) || '—'}
          {i.numeroDocumento ? ` · ${i.numeroDocumento}` : ''}
        </div>
      </td>
      <td className={`num ${i.tipo === 'DESPESA' ? 'desp' : 'rec'}`}>
        {i.tipo === 'DESPESA' ? '− ' : '+ '}
        {fmtBRL(i.valorCentavos).replace('R$', '').trim()}{' '}
        {vencida && <span className="pill vencido">vencida</span>}
        {hoje && <span className="pill hj">vence hoje</span>}
      </td>
      <td className="agd-acao">
        <button className={`fin-btn sm ${vencida || hoje ? 'primary' : ''}`} onClick={() => baixar(i)}>
          {i.tipo === 'DESPESA' ? 'Baixar' : 'Receber'}
        </button>
      </td>
    </tr>
  );

  const secao = (rotulo: string, cls: string, itens: Item[], vencida = false, hoje = false) =>
    itens.length > 0 && (
      <>
        <tr className={`agd-secao ${cls}`}><td colSpan={4}>{rotulo}</td></tr>
        {itens.map((i) => linhaItem(i, vencida, hoje))}
      </>
    );

  const r = agenda?.resumo;

  return (
    <div className="fin-root">
      <FinTabs
        active="agenda"
        right={<Link href="/dashboard/financeiro" className="fin-btn primary" style={{ textDecoration: 'none' }}>+ Novo lançamento</Link>}
      />

      {/* aviso */}
      {r && (r.vencidas.qtd > 0 || r.vencemHoje.qtd > 0) && (
        <div className="agd-aviso">
          ⚠️{' '}
          {r.vencidas.qtd > 0 && (<><b style={{ fontWeight: 500 }}>{r.vencidas.qtd} conta(s) vencida(s)</b> ({fmtBRL(r.vencidas.valorCentavos)})</>)}
          {r.vencidas.qtd > 0 && r.vencemHoje.qtd > 0 && ' · '}
          {r.vencemHoje.qtd > 0 && (<><b style={{ fontWeight: 500 }}>{r.vencemHoje.qtd} vence(m) hoje</b> ({fmtBRL(r.vencemHoje.valorCentavos)})</>)}
        </div>
      )}

      {/* KPIs coloridos */}
      <div className="agd-kpis">
        <div className="agd-kpi danger"><small>Vencidas</small><b>{fmtBRL(r?.vencidas.valorCentavos ?? 0)}</b><div className="d">{r?.vencidas.qtd ?? 0} conta(s)</div></div>
        <div className="agd-kpi alert"><small>Vencem hoje</small><b>{fmtBRL(r?.vencemHoje.valorCentavos ?? 0)}</b><div className="d">{r?.vencemHoje.qtd ?? 0} conta(s)</div></div>
        <div className="agd-kpi info"><small>Próximos 7 dias</small><b>{fmtBRL(r?.proximos7.valorCentavos ?? 0)}</b><div className="d">{r?.proximos7.qtd ?? 0} conta(s) a pagar</div></div>
        <div className="agd-kpi ok"><small>A receber em aberto</small><b>{fmtBRL(r?.aReceber.valorCentavos ?? 0)}</b><div className="d">{r?.aReceber.qtd ?? 0} recebimento(s)</div></div>
        <Link href="/dashboard/erp/saldo-clientes" className="agd-kpi ok" style={{ textDecoration: 'none', cursor: 'pointer' }} title="Ver detalhe por cliente"><small>A receber de clientes</small><b>{fmtBRL(Math.round(aRecCli.total * 100))}</b><div className="d">{aRecCli.qtd} cliente(s) devendo · ver detalhe →</div></Link>
      </div>

      {/* filtros */}
      <div className="agd-filters">
        <div className="agd-seg">
          {(['TODAS', 'A_PAGAR', 'A_RECEBER'] as const).map((f) => (
            <button key={f} className={filtro === f ? 'on' : ''} onClick={() => setFiltro(f)}>
              {f === 'TODAS' ? 'Todas' : f === 'A_PAGAR' ? 'A pagar' : 'A receber'}
            </button>
          ))}
        </div>
        <select className="fin-ctl" value={periodo} onChange={(e) => setPeriodo(e.target.value as any)}>
          <option value="30D">Próximos 30 dias</option>
          <option value="MES">Este mês</option>
          <option value="TUDO">Tudo em aberto</option>
        </select>
        <select className="fin-ctl" value={fUnidade} onChange={(e) => setFUnidade(e.target.value)}>
          <option value="">Unidade: Todas</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
      </div>

      {/* agenda */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Agenda de vencimentos</h2>
          <span className="pill">{agenda?.itens.length ?? 0} em aberto</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <tbody>
              {carregando && <tr><td colSpan={4} className="fin-empty">Carregando…</td></tr>}
              {!carregando && (agenda?.itens.length ?? 0) === 0 && (
                <tr><td colSpan={4} className="fin-empty">Nada em aberto no período. 🎉</td></tr>
              )}
              {!carregando && (
                <>
                  {secao('Vencidas', 'venc', grupos.vencidas, true, false)}
                  {secao(`Hoje · ${fmtDia(hojeISO())}`, 'hoje', grupos.hoje, false, true)}
                  {secao('Próximos 7 dias', '', grupos.sete)}
                  {secao('Depois', '', grupos.depois)}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* recorrências */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Recorrências</h2>
          <span className="pill recb">↻ {recs.filter((x) => x.ativo).length} ativa(s)</span>
          <span className="fin-spacer" />
          <button className="fin-btn primary sm" onClick={abrirNova}>+ Nova recorrência</button>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <tbody>
              {recs.length === 0 && (
                <tr><td className="fin-empty">Nenhuma recorrência ainda — crie a primeira (ex.: aluguel, salários).</td></tr>
              )}
              {recs.map((rc) => (
                <tr key={rc.id} style={{ opacity: rc.ativo ? 1 : 0.5 }}>
                  <td>
                    <div className="agd-desc">{rc.descricao} {!rc.ativo && <span className="pill">pausada</span>}</div>
                    <div className="agd-sub">
                      {rc.categoriaId ? cById.get(rc.categoriaId) : 'sem categoria'} · {uById.get(rc.unidadeId) || '—'} · {freqTxt(rc)}
                    </div>
                  </td>
                  <td className={`num ${rc.tipo === 'DESPESA' ? 'desp' : 'rec'}`}>
                    {rc.tipo === 'DESPESA' ? '− ' : '+ '}{fmtBRL(rc.valorCentavos).replace('R$', '').trim()}
                  </td>
                  <td className="agd-dt" style={{ width: 170 }}>
                    {rc.ultimoVencimentoGerado ? `última gerada: ${fmtDia(rc.ultimoVencimentoGerado)}` : 'nenhuma gerada ainda'}
                  </td>
                  <td className="agd-acao" style={{ width: 210 }}>
                    <button className="fin-btn sm" onClick={() => abrirEdicao(rc)}>Editar</button>{' '}
                    <button className="fin-btn sm" onClick={() => alternarAtivo(rc)}>{rc.ativo ? 'Pausar' : 'Reativar'}</button>{' '}
                    <button className="fin-btn sm ghost" onClick={() => excluirRec(rc)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal recorrência */}
      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head">
              <h3>{form.id ? 'Editar recorrência' : 'Nova recorrência'}</h3>
              <span className="fin-spacer" />
              <div className="agd-seg">
                {(['DESPESA', 'RECEITA'] as Tipo[]).map((t) => (
                  <button key={t} className={form.tipo === t ? 'on' : ''} onClick={() => setF('tipo', t)}>
                    {t === 'DESPESA' ? 'Despesa' : 'Receita'}
                  </button>
                ))}
              </div>
            </div>
            <div className="fin-modal-body">
              <div className="row2" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
                <div className="f">
                  <label>Descrição</label>
                  <input className="fin-ctl" value={form.descricao} onChange={(e) => setF('descricao', e.target.value)} placeholder="ex.: Aluguel + IPTU" />
                </div>
                <div className="f">
                  <label>Valor (por ocorrência)</label>
                  <input className="fin-ctl" value={form.valor} onChange={(e) => setF('valor', e.target.value)} placeholder="0,00" />
                  <div className="hint">conta variável? use o último valor e ajuste na baixa</div>
                </div>
              </div>

              <div className="row3">
                <div className="f">
                  <label>Frequência</label>
                  <select className="fin-ctl" value={form.frequencia} onChange={(e) => setF('frequencia', e.target.value as Freq)}>
                    <option value="MENSAL">Mensal</option>
                    <option value="SEMANAL">Semanal</option>
                    <option value="ANUAL">Anual</option>
                  </select>
                </div>
                <div className="f">
                  <label>{form.frequencia === 'SEMANAL' ? 'Dia da semana' : 'Todo dia'}</label>
                  {form.frequencia === 'SEMANAL' ? (
                    <select className="fin-ctl" value={form.dia} onChange={(e) => setF('dia', Number(e.target.value))}>
                      {DIAS_SEMANA.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                    </select>
                  ) : (
                    <input type="number" min={1} max={31} className="fin-ctl" value={form.dia} onChange={(e) => setF('dia', Number(e.target.value))} />
                  )}
                </div>
                {form.frequencia === 'ANUAL' ? (
                  <div className="f">
                    <label>Mês</label>
                    <input type="number" min={1} max={12} className="fin-ctl" value={form.mesReferencia} onChange={(e) => setF('mesReferencia', Number(e.target.value))} />
                  </div>
                ) : (
                  <div className="f">
                    <label>Antecedência (dias)</label>
                    <input type="number" min={0} max={120} className="fin-ctl" value={form.antecedenciaDias} onChange={(e) => setF('antecedenciaDias', Number(e.target.value))} />
                    <div className="hint auto">a conta nasce N dias antes do vencimento</div>
                  </div>
                )}
              </div>

              <div className="row3">
                <div className="f">
                  <label>Termina</label>
                  <select className="fin-ctl" value={form.termina} onChange={(e) => setF('termina', e.target.value as any)}>
                    <option value="NUNCA">Nunca</option>
                    <option value="VEZES">Após N vezes</option>
                    <option value="DATA">Em uma data</option>
                  </select>
                </div>
                {form.termina === 'VEZES' && (
                  <div className="f">
                    <label>Quantas vezes</label>
                    <input type="number" min={1} className="fin-ctl" value={form.maxOcorrencias} onChange={(e) => setF('maxOcorrencias', e.target.value)} />
                  </div>
                )}
                {form.termina === 'DATA' && (
                  <div className="f">
                    <label>Última data</label>
                    <input type="date" className="fin-ctl" value={form.terminaEm} onChange={(e) => setF('terminaEm', e.target.value)} />
                  </div>
                )}
              </div>

              <div className="row2">
                <div className="f">
                  <label>Categoria</label>
                  <select className="fin-ctl" value={form.categoriaId} onChange={(e) => setF('categoriaId', e.target.value)}>
                    <option value="">— definir depois —</option>
                    {categorias.filter((c) => c.tipo === form.tipo).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Conta</label>
                  <select className="fin-ctl" value={form.contaId} onChange={(e) => onTrocaConta(e.target.value)}>
                    <option value="">— escolher —</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="row3">
                <div className="f">
                  <label>Unidade</label>
                  <select className="fin-ctl" value={form.unidadeId} onChange={(e) => setF('unidadeId', e.target.value)}>
                    <option value="">— pela conta —</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Marca</label>
                  <select className="fin-ctl" value={form.marcaId} onChange={(e) => setF('marcaId', e.target.value)}>
                    <option value="">— sem marca —</option>
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Linha de serviço</label>
                  <select className="fin-ctl" value={form.linhaServicoId} onChange={(e) => setF('linhaServicoId', e.target.value)}>
                    <option value="">— definir —</option>
                    {linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvarRec} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar recorrência'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{AGD_CSS}</style>
    </div>
  );
}

/* ===================== CSS da agenda (escopado em .fin-root) ===================== */
const AGD_CSS = `
.fin-root .agd-aviso{ background:var(--coral-bg); border:1px solid #E8BBAA; border-radius:12px; padding:10px 14px; font-size:13px; color:#a5482a; display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.fin-root .agd-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-root .agd-kpi{ border:1px solid var(--line); border-radius:12px; padding:14px 16px; box-shadow:0 1px 2px rgba(52,50,46,.04); background:#fff; }
.fin-root .agd-kpi small{ font-size:12px; }
.fin-root .agd-kpi b{ display:block; margin-top:4px; font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-root .agd-kpi .d{ font-size:11.5px; margin-top:2px; }
.fin-root .agd-kpi.danger{ border-color:#E8BBAA; background:var(--coral-bg); }
.fin-root .agd-kpi.danger b,.fin-root .agd-kpi.danger small{ color:var(--coral); } .fin-root .agd-kpi.danger .d{ color:#a5482a; }
.fin-root .agd-kpi.alert{ border-color:#E7D4A8; background:var(--gold-bg); }
.fin-root .agd-kpi.alert b,.fin-root .agd-kpi.alert small{ color:var(--gold); } .fin-root .agd-kpi.alert .d{ color:#93701a; }
.fin-root .agd-kpi.info{ border-color:#CFE9EC; background:var(--tint); }
.fin-root .agd-kpi.info b,.fin-root .agd-kpi.info small{ color:var(--navy); } .fin-root .agd-kpi.info .d{ color:#3E7A85; }
.fin-root .agd-kpi.ok{ border-color:#BFE6CF; background:var(--green-bg); }
.fin-root .agd-kpi.ok b,.fin-root .agd-kpi.ok small{ color:var(--green); } .fin-root .agd-kpi.ok .d{ color:#2c6b47; }
.fin-root .agd-filters{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:12px 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:center; }
.fin-root .agd-seg{ display:flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; }
.fin-root .agd-seg button{ font-size:12.5px; padding:7px 14px; background:#fff; border:none; color:var(--text2); cursor:pointer; }
.fin-root .agd-seg button.on{ background:var(--primary); color:#fff; }
.fin-root .agd-dt{ white-space:nowrap; color:var(--text2); font-variant-numeric:tabular-nums; width:64px; }
.fin-root .agd-dt.venc{ color:var(--coral); font-weight:500; }
.fin-root .agd-desc{ font-weight:500; }
.fin-root .agd-sub{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-root .agd-acao{ text-align:right; white-space:nowrap; width:100px; }
.fin-root tr.agd-secao td{ background:#FBF9F4; font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:var(--text3); font-weight:500; padding:7px 16px; }
.fin-root tr.agd-secao.venc td{ background:var(--coral-bg); color:var(--coral); }
.fin-root tr.agd-secao.hoje td{ background:var(--gold-bg); color:var(--gold); }
.fin-root .pill.recb{ background:var(--tint); color:var(--navy); }
.fin-root .pill.receber{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.vencido{ background:var(--coral-bg); color:var(--coral); }
.fin-root .pill.hj{ background:var(--gold-bg); color:var(--gold); }
@media (max-width:900px){ .fin-root .agd-kpis{ grid-template-columns:repeat(2,1fr); } }
`;
