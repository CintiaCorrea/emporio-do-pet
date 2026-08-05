'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FinTabs } from './fin-ui';

/* ===================== tipos ===================== */
type Tipo = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
type Status = 'PENDENTE' | 'CONFIRMADO' | 'CONCILIADO';

interface Lancamento {
  id: string;
  data: string;
  competencia: string;
  vencimento: string | null;
  dataPagamento: string | null;
  dataEmissao: string | null;
  tipo: Tipo;
  status: Status;
  descricao: string | null;
  numeroDocumento: string | null;
  valorCentavos: number;
  jurosCentavos: number;
  multaCentavos: number;
  descontoCentavos: number;
  unidadeId: string;
  categoriaId: string | null;
  linhaServicoId: string | null;
  marcaId: string | null;
  contaId: string;
  contaDestinoId: string | null;
}
interface Unidade { id: string; nome: string; tipo: string; marcaPadraoId: string | null; }
interface Marca { id: string; nome: string; }
interface LinhaServico { id: string; nome: string; }
interface Categoria { id: string; nome: string; tipo: Tipo; grupo?: { nome: string; ordem: number } | null; }
interface Conta { id: string; nome: string; unidadeId: string | null; }
interface Resumo {
  receitasCentavos: number; despesasCentavos: number;
  aPagarCentavos: number; aPagarQtd: number;
  vencidosCentavos: number; vencidosQtd: number;
  aClassificarQtd: number;
}

/* ===================== helpers ===================== */
const fmtBRL = (c: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((c || 0) / 100);
const fmtBRLnum = (c: number) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format((c || 0) / 100);
const fmtDia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';

function reaisToCentavos(s: string): number {
  if (!s) return 0;
  const clean = s.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(clean);
  return Math.round((isNaN(n) ? 0 : n) * 100);
}
function estaVencido(l: Lancamento): boolean {
  return l.status === 'PENDENTE' && !!l.vencimento && new Date(l.vencimento) < new Date();
}
function diasVencido(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro ao carregar');
  return d;
}
async function sendJSON(url: string, method: string, body: any) {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => null);
  if (!r.ok) {
    const m = d && (Array.isArray(d.message) ? d.message.join(', ') : d.message || d.error);
    throw new Error(m || 'Erro ao salvar');
  }
  return d;
}

const SITUACOES = [
  { v: 'TODAS', label: 'Todas' },
  { v: 'A_PAGAR', label: 'A pagar (em aberto)' },
  { v: 'VENCIDAS', label: 'Vencidas' },
  { v: 'PAGAS', label: 'Pagas' },
  { v: 'CONCILIADAS', label: 'Conciliadas' },
  { v: 'A_CLASSIFICAR', label: 'A classificar' },
];

function mesesRecentes(qtd = 12): { v: string; label: string }[] {
  const out: { v: string; label: string }[] = [];
  const base = new Date();
  for (let i = 0; i < qtd; i++) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push({ v, label: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) });
  }
  return out;
}

/* ===================== estado do formulário ===================== */
const formVazio = {
  tipo: 'DESPESA' as Tipo,
  valor: '',
  vencimento: '',
  competencia: '',
  dataEmissao: '',
  descricao: '',
  numeroDocumento: '',
  categoriaId: '',
  contaId: '',
  contaDestinoId: '',
  unidadeId: '',
  marcaId: '',
  linhaServicoId: '',
  contatoId: '',
  formaPagamentoId: '',
  // baixa
  registrarPagamento: false,
  dataPagamento: '',
  juros: '',
  multa: '',
  desconto: '',
};
type FormState = typeof formVazio;

/* ===================== página ===================== */
export default function FinanceiroPage() {
  const meses = useMemo(() => mesesRecentes(), []);
  const [competencia, setCompetencia] = useState(meses[0]?.v ?? '');
  const [fUnidade, setFUnidade] = useState('');
  const [fMarca, setFMarca] = useState('');
  const [fLinha, setFLinha] = useState('');
  const [fSituacao, setFSituacao] = useState('TODAS');
  const [busca, setBusca] = useState('');

  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [linhas, setLinhas] = useState<LinhaServico[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [contatos, setContatos] = useState<{ id: string; nome: string }[]>([]);
  const [formas, setFormas] = useState<{ id: string; nome: string }[]>([]);

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [jaCarregou, setJaCarregou] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState<FormState>(formVazio);
  const [salvando, setSalvando] = useState(false);
  const [dimsOpen, setDimsOpen] = useState(true);
  const [baixaOpen, setBaixaOpen] = useState(false);
  const [repetirOpen, setRepetirOpen] = useState(false);
  const [repetir, setRepetir] = useState<'UNICA' | 'RECORRENTE' | 'PARCELADA'>('UNICA');
  const repVazio = { parcelas: '2', freq: 'MENSAL' as 'MENSAL' | 'SEMANAL' | 'ANUAL', dia: 1, termina: 'NUNCA' as 'NUNCA' | 'VEZES' | 'DATA', maxVezes: '', terminaEm: '' };
  const [repForm, setRepForm] = useState(repVazio);

  const uById = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const mById = useMemo(() => new Map(marcas.map((m) => [m.id, m])), [marcas]);
  const lById = useMemo(() => new Map(linhas.map((l) => [l.id, l])), [linhas]);
  const cById = useMemo(() => new Map(categorias.map((c) => [c.id, c])), [categorias]);
  const contaById = useMemo(() => new Map(contas.map((c) => [c.id, c])), [contas]);

  /* cadastros — uma vez */
  useEffect(() => {
    (async () => {
      try {
        const [u, m, l, c, ct, ctt, fp] = await Promise.all([
          getJSON('/api/financeiro/unidades'),
          getJSON('/api/financeiro/marcas'),
          getJSON('/api/financeiro/linhas-servico'),
          getJSON('/api/financeiro/categorias'),
          getJSON('/api/financeiro/contas'),
          getJSON('/api/financeiro/contatos'),
          getJSON('/api/financeiro/formas-pagamento'),
        ]);
        setUnidades(u || []); setMarcas(m || []); setLinhas(l || []);
        setCategorias(c || []); setContas(ct || []);
        setContatos((ctt || []).filter((x: any) => x.ativo)); setFormas((fp || []).filter((x: any) => x.ativo));
      } catch (e: any) {
        toast.error(e.message || 'Falha ao carregar cadastros');
      }
    })();
  }, []);

  /* lista + resumo — quando muda filtro */
  const carregar = useCallback(async () => {
    if (!jaCarregou) setCarregando(true);
    try {
      const qs = new URLSearchParams();
      if (competencia) qs.set('competencia', competencia);
      if (fUnidade) qs.set('unidadeId', fUnidade);
      if (fMarca) qs.set('marcaId', fMarca);
      if (fLinha) qs.set('linhaServicoId', fLinha);
      if (fSituacao && fSituacao !== 'TODAS') qs.set('situacao', fSituacao);
      if (busca.trim()) qs.set('busca', busca.trim());
      const [lista, res] = await Promise.all([
        getJSON(`/api/financeiro/lancamentos?${qs.toString()}`),
        getJSON(`/api/financeiro/lancamentos/resumo?competencia=${competencia}`),
      ]);
      setLancamentos(lista || []);
      setResumo(res || null);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar lançamentos');
    } finally {
      setCarregando(false);
      setJaCarregou(true);
    }
  }, [competencia, fUnidade, fMarca, fLinha, fSituacao, busca, jaCarregou]);

  useEffect(() => { carregar(); }, [carregar]);

  /* ações */
  function abrirNovo() {
    setForm({ ...formVazio, competencia });
    setDimsOpen(true);
    setBaixaOpen(false);
    setRepetirOpen(false);
    setRepetir('UNICA');
    setRepForm(repVazio);
    setModalAberto(true);
  }
  function setF<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  // ao trocar conta, sugere a unidade da conta (se ainda não escolheu)
  function onTrocaConta(contaId: string) {
    setForm((f) => {
      const conta = contaById.get(contaId);
      const unidadeId = f.unidadeId || conta?.unidadeId || '';
      return { ...f, contaId, unidadeId };
    });
  }

  async function salvar() {
    if (!form.valor || reaisToCentavos(form.valor) <= 0) return toast.error('Informe o valor.');
    if (!form.contaId) return toast.error('Escolha a conta.');
    if (form.tipo === 'TRANSFERENCIA') {
      if (!form.contaDestinoId) return toast.error('Escolha a conta de destino.');
      if (form.contaDestinoId === form.contaId) return toast.error('Origem e destino não podem ser a mesma conta.');
    }
    if (repetir === 'PARCELADA') {
      if ((Number(repForm.parcelas) || 0) < 2) return toast.error('Informe o nº de parcelas (2 ou mais).');
      if (!form.vencimento) return toast.error('Parcelamento precisa do vencimento da 1ª parcela.');
    }
    if (repetir === 'RECORRENTE' && !form.descricao.trim()) {
      return toast.error('Recorrência precisa de uma descrição.');
    }
    setSalvando(true);
    try {
      if (repetir === 'RECORRENTE') {
        // vira uma RECORRÊNCIA — as contas nascem sozinhas na agenda
        const diaRec =
          repForm.freq === 'SEMANAL'
            ? Number(repForm.dia) || 1
            : form.vencimento
              ? Number(form.vencimento.slice(8, 10))
              : Number(repForm.dia) || 1;
        const unidadeId = form.unidadeId || contaById.get(form.contaId)?.unidadeId || '';
        if (!unidadeId) throw new Error('Escolha a unidade (ou vincule a conta a uma unidade).');
        await sendJSON('/api/financeiro/recorrencias', 'POST', {
          descricao: form.descricao.trim(),
          tipo: form.tipo,
          valorCentavos: reaisToCentavos(form.valor),
          frequencia: repForm.freq,
          dia: diaRec,
          antecedenciaDias: 30,
          maxOcorrencias: repForm.termina === 'VEZES' ? Number(repForm.maxVezes) || undefined : undefined,
          terminaEm: repForm.termina === 'DATA' && repForm.terminaEm ? repForm.terminaEm : undefined,
          categoriaId: form.categoriaId || undefined,
          contaId: form.contaId,
          unidadeId,
          marcaId: form.marcaId || undefined,
          linhaServicoId: form.linhaServicoId || undefined,
        });
        await fetch('/api/financeiro/agenda?filtro=TODAS').catch(() => null); // materializa a 1ª conta
        toast.success('Recorrência criada — as próximas contas nascem sozinhas na agenda');
      } else {
        const body: any = {
          tipo: form.tipo,
          valorCentavos: reaisToCentavos(form.valor),
          descricao: form.descricao || undefined,
          numeroDocumento: form.numeroDocumento || undefined,
          categoriaId: form.categoriaId || undefined,
          contaId: form.contaId,
          unidadeId: form.unidadeId || undefined,
          marcaId: form.marcaId || undefined,
          linhaServicoId: form.linhaServicoId || undefined,
          contatoId: form.contatoId || undefined,
          formaPagamentoId: form.formaPagamentoId || undefined,
          vencimento: form.vencimento || undefined,
          competencia: form.competencia ? `${form.competencia}-01` : undefined,
          dataEmissao: form.dataEmissao || undefined,
        };
        if (repetir === 'PARCELADA') body.parcelas = Number(repForm.parcelas);
        if (form.tipo === 'TRANSFERENCIA') {
          // transferência: sai de uma conta e entra na outra na data informada (já confirmada)
          const dia = form.vencimento || new Date().toISOString().slice(0, 10);
          body.contaDestinoId = form.contaDestinoId;
          body.data = dia;
          body.dataPagamento = dia;
          body.vencimento = undefined;
          body.competencia = undefined;
          body.categoriaId = undefined;
        } else if (baixaOpen && form.dataPagamento) {
          body.dataPagamento = form.dataPagamento;
          body.jurosCentavos = reaisToCentavos(form.juros);
          body.multaCentavos = reaisToCentavos(form.multa);
          body.descontoCentavos = reaisToCentavos(form.desconto);
        }
        await sendJSON('/api/financeiro/lancamentos', 'POST', body);
        toast.success(form.tipo === 'TRANSFERENCIA' ? 'Transferência registrada' : repetir === 'PARCELADA' ? `${repForm.parcelas} parcelas criadas` : 'Lançamento salvo');
      }
      setModalAberto(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function baixar(l: Lancamento) {
    const hoje = new Date().toISOString().slice(0, 10);
    try {
      await sendJSON(`/api/financeiro/lancamentos/${l.id}/baixar`, 'POST', { dataPagamento: hoje });
      toast.success('Baixa registrada');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro na baixa');
    }
  }
  async function excluir(l: Lancamento) {
    if (!confirm(`Excluir o lançamento "${l.descricao || fmtBRL(l.valorCentavos)}"?`)) return;
    try {
      const r = await fetch(`/api/financeiro/lancamentos/${l.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro');
      toast.success('Excluído');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  }

  const categoriasFiltradas = categorias.filter(
    (c) => form.tipo === 'TRANSFERENCIA' || c.tipo === form.tipo || c.tipo === ('TRANSFERENCIA' as Tipo),
  );

  /* ===================== render ===================== */
  return (
    <div className="fin-root">
      {/* cabeçalho */}
      <FinTabs
        active="lancamentos"
        right={<button className="fin-btn primary" onClick={abrirNovo}>+ Novo lançamento</button>}
      />

      {/* KPIs */}
      <div className="fin-kpis">
        <div className="fin-kpi">
          <small>Receitas do mês</small>
          <b className="rec">{fmtBRL(resumo?.receitasCentavos ?? 0)}</b>
        </div>
        <div className="fin-kpi">
          <small>Despesas do mês</small>
          <b className="desp">{fmtBRL(resumo?.despesasCentavos ?? 0)}</b>
        </div>
        <div className="fin-kpi">
          <small>A pagar (em aberto)</small>
          <b className="desp">{fmtBRL(resumo?.aPagarCentavos ?? 0)}</b>
          <div className="d">{resumo?.aPagarQtd ?? 0} conta(s)</div>
        </div>
        <div className="fin-kpi danger">
          <small>Vencidos</small>
          <b>{fmtBRL(resumo?.vencidosCentavos ?? 0)}</b>
          <div className="d">{resumo?.vencidosQtd ?? 0} conta(s)</div>
        </div>
      </div>

      {/* filtros */}
      <div className="fin-filters">
        <div className="fin-fld">
          <label>Período</label>
          <select className="fin-ctl" value={competencia} onChange={(e) => setCompetencia(e.target.value)}>
            {meses.map((m) => <option key={m.v} value={m.v}>{m.label}</option>)}
          </select>
        </div>
        <div className="fin-fld">
          <label>Unidade</label>
          <select className="fin-ctl" value={fUnidade} onChange={(e) => setFUnidade(e.target.value)}>
            <option value="">Todas</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
        </div>
        <div className="fin-fld">
          <label>Marca</label>
          <select className="fin-ctl" value={fMarca} onChange={(e) => setFMarca(e.target.value)}>
            <option value="">Todas</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </div>
        <div className="fin-fld">
          <label>Linha de serviço</label>
          <select className="fin-ctl" value={fLinha} onChange={(e) => setFLinha(e.target.value)}>
            <option value="">Todas</option>
            {linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </div>
        <div className="fin-fld">
          <label>Situação</label>
          <select className="fin-ctl" value={fSituacao} onChange={(e) => setFSituacao(e.target.value)}>
            {SITUACOES.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
        <div className="fin-fld grow">
          <label>Buscar</label>
          <input className="fin-ctl" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="descrição, fornecedor, nº doc…" />
        </div>
        {(resumo?.aClassificarQtd ?? 0) > 0 && (
          <div className="fin-fld">
            <label>&nbsp;</label>
            <button
              className={`fin-chip ${fSituacao === 'A_CLASSIFICAR' ? 'on' : ''}`}
              onClick={() => setFSituacao(fSituacao === 'A_CLASSIFICAR' ? 'TODAS' : 'A_CLASSIFICAR')}
            >
              ● Só os {resumo?.aClassificarQtd} a classificar
            </button>
          </div>
        )}
      </div>

      {/* tabela */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Lançamentos</h2>
          <span className="fin-pill">{lancamentos.length} registro(s)</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Data</th><th>Descrição</th><th>Categoria</th><th>Unidade</th>
                <th>Marca</th><th>Linha de serviço</th><th>Conta</th>
                <th className="num">Valor</th><th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && (
                <tr><td colSpan={9} className="fin-empty">Carregando…</td></tr>
              )}
              {!carregando && lancamentos.length === 0 && (
                <tr><td colSpan={9} className="fin-empty">Nenhum lançamento no período. Clique em “+ Novo lançamento”.</td></tr>
              )}
              {!carregando && lancamentos.map((l) => {
                const venc = estaVencido(l);
                const cat = l.categoriaId ? cById.get(l.categoriaId) : null;
                const marca = l.marcaId ? mById.get(l.marcaId) : null;
                const linha = l.linhaServicoId ? lById.get(l.linhaServicoId) : null;
                const conta = contaById.get(l.contaId);
                const uni = uById.get(l.unidadeId);
                const ehDesp = l.tipo === 'DESPESA';
                const ehTransf = l.tipo === 'TRANSFERENCIA';
                const contaDest = l.contaDestinoId ? contaById.get(l.contaDestinoId) : null;
                return (
                  <tr key={l.id} className={venc || !l.categoriaId ? 'pend' : ''}>
                    <td className="dt">{fmtDia(l.data)}</td>
                    <td>
                      <div className="desc">{l.descricao || '—'}</div>
                      <div className="sub">
                        {l.numeroDocumento && <span className="pill">{l.numeroDocumento}</span>}{' '}
                        {venc && <span className="pill vencido">⚠️ vencido há {diasVencido(l.vencimento!)}d</span>}
                        {!venc && l.status === 'PENDENTE' && <span className="pill apagar">⏳ a pagar</span>}
                        {l.status === 'CONFIRMADO' && <span className="pill pago">✓ pago</span>}
                        {l.status === 'CONCILIADO' && <span className="pill conc">✓ conciliado</span>}
                      </div>
                    </td>
                    <td>{ehTransf ? <span className="pill">⇄ Transferência</span> : cat ? cat.nome : <span className="fin-def">definir categoria</span>}</td>
                    <td>{uni?.nome || '—'}</td>
                    <td>{marca ? <span className="pill marca">{marca.nome}</span> : <span className="pill dash">—</span>}</td>
                    <td>{linha ? linha.nome : <span className="pill dash">—</span>}</td>
                    <td>{ehTransf ? <span>{conta?.nome || '—'} <b style={{ color: 'var(--text2)' }}>→</b> {contaDest?.nome || '—'}</span> : (conta?.nome || '—')}</td>
                    <td className={`num ${ehTransf ? '' : ehDesp ? 'desp' : 'rec'}`}>
                      {ehTransf ? '⇄ ' : ehDesp ? '− ' : '+ '}{fmtBRLnum(l.valorCentavos)}
                    </td>
                    <td className="acoes">
                      {l.status === 'PENDENTE' && (
                        <button className="fin-btn sm" onClick={() => baixar(l)}>Baixar</button>
                      )}
                      <button className="fin-btn sm ghost" onClick={() => excluir(l)}>Excluir</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* modal novo lançamento */}
      {modalAberto && (
        <div className="fin-overlay" onClick={() => !salvando && setModalAberto(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head">
              <h3>Novo lançamento</h3>
              <span className="fin-spacer" />
              <div className="fin-seg">
                {(['RECEITA', 'DESPESA', 'TRANSFERENCIA'] as Tipo[]).map((t) => (
                  <button key={t} className={form.tipo === t ? 'on' : ''} onClick={() => setF('tipo', t)}>
                    {t === 'RECEITA' ? 'Receita' : t === 'DESPESA' ? 'Despesa' : 'Transferência'}
                  </button>
                ))}
              </div>
            </div>

            <div className="fin-modal-body">
              <div className="row2">
                <div className="f">
                  <label>{form.tipo === 'TRANSFERENCIA' ? 'Data da transferência' : 'Vencimento'}</label>
                  <input type="date" className="fin-ctl" value={form.vencimento} onChange={(e) => setF('vencimento', e.target.value)} />
                  <div className="hint">{form.tipo === 'TRANSFERENCIA' ? 'dia em que o dinheiro saiu/entrou' : 'a conta nasce “a pagar”; o pagamento entra na baixa'}</div>
                </div>
                <div className="f">
                  <label>Valor <span className="req">*</span></label>
                  <input className="fin-ctl" value={form.valor} onChange={(e) => setF('valor', e.target.value)} placeholder="0,00" />
                </div>
              </div>

              <div className="row2">
                <div className="f">
                  <label>Descrição</label>
                  <input className="fin-ctl" value={form.descricao} onChange={(e) => setF('descricao', e.target.value)} placeholder="ex.: Enel — energia" />
                  <div className="hint">é neste texto que as regras procuram o termo</div>
                </div>
                <div className="f">
                  <label>Nº documento</label>
                  <input className="fin-ctl" value={form.numeroDocumento} onChange={(e) => setF('numeroDocumento', e.target.value)} placeholder="NF / boleto" />
                </div>
              </div>

              {form.tipo === 'TRANSFERENCIA' ? (
                <div className="row2">
                  <div className="f">
                    <label>De (conta origem) <span className="req">*</span></label>
                    <select className="fin-ctl" value={form.contaId} onChange={(e) => onTrocaConta(e.target.value)}>
                      <option value="">— escolher —</option>
                      {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <div className="hint">sai desta conta</div>
                  </div>
                  <div className="f">
                    <label>Para (conta destino) <span className="req">*</span></label>
                    <select className="fin-ctl" value={form.contaDestinoId} onChange={(e) => setF('contaDestinoId', e.target.value)}>
                      <option value="">— escolher —</option>
                      {contas.filter((c) => c.id !== form.contaId).map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                    <div className="hint">entra nesta conta</div>
                  </div>
                </div>
              ) : (
                <div className="row2">
                  <div className="f">
                    <label>Categoria</label>
                    <select className="fin-ctl" value={form.categoriaId} onChange={(e) => setF('categoriaId', e.target.value)}>
                      <option value="">— definir —</option>
                      {categoriasFiltradas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <label>Conta <span className="req">*</span></label>
                    <select className="fin-ctl" value={form.contaId} onChange={(e) => onTrocaConta(e.target.value)}>
                      <option value="">— escolher —</option>
                      {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.tipo !== 'TRANSFERENCIA' && (contatos.length > 0 || formas.length > 0) && (
                <div className="row2">
                  <div className="f">
                    <label>Fornecedor / cliente</label>
                    <select className="fin-ctl" value={form.contatoId} onChange={(e) => setF('contatoId', e.target.value)}>
                      <option value="">— nenhum —</option>
                      {contatos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </select>
                  </div>
                  <div className="f">
                    <label>Forma de pagamento</label>
                    <select className="fin-ctl" value={form.formaPagamentoId} onChange={(e) => setF('formaPagamentoId', e.target.value)}>
                      <option value="">— nenhuma —</option>
                      {formas.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {form.tipo !== 'TRANSFERENCIA' && (<>
              {/* dimensões — recolhível */}
              <details className="fin-fold" open={dimsOpen} onToggle={(e) => setDimsOpen((e.target as HTMLDetailsElement).open)}>
                <summary>As três dimensões — unidade, marca e linha de serviço</summary>
                <div className="fin-fold-body">
                  <div className="row3">
                    <div className="f">
                      <label>Unidade <span className="req">*</span></label>
                      <select className="fin-ctl auto" value={form.unidadeId} onChange={(e) => setF('unidadeId', e.target.value)}>
                        <option value="">— pela conta —</option>
                        {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                      </select>
                      <div className="hint auto">preenchida pela conta — pode trocar</div>
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
              </details>

              {/* repetir — recolhível */}
              <details className="fin-fold" open={repetirOpen} onToggle={(e) => setRepetirOpen((e.target as HTMLDetailsElement).open)}>
                <summary>Repetir — deixe recolhido se for conta única</summary>
                <div className="fin-fold-body">
                  <div className="fin-seg" style={{ alignSelf: 'flex-start' }}>
                    {(['UNICA', 'RECORRENTE', 'PARCELADA'] as const).map((r) => (
                      <button key={r} className={repetir === r ? 'on' : ''} onClick={(e) => { e.preventDefault(); setRepetir(r); }}>
                        {r === 'UNICA' ? 'Única' : r === 'RECORRENTE' ? 'Recorrente' : 'Parcelada'}
                      </button>
                    ))}
                  </div>

                  {repetir === 'RECORRENTE' && (
                    <>
                      <div className="row3">
                        <div className="f">
                          <label>Frequência</label>
                          <select className="fin-ctl" value={repForm.freq} onChange={(e) => setRepForm((s) => ({ ...s, freq: e.target.value as any }))}>
                            <option value="MENSAL">Mensal</option>
                            <option value="SEMANAL">Semanal</option>
                            <option value="ANUAL">Anual</option>
                          </select>
                        </div>
                        <div className="f">
                          <label>{repForm.freq === 'SEMANAL' ? 'Dia da semana (0=dom)' : 'Todo dia'}</label>
                          <input type="number" min={0} max={31} className="fin-ctl"
                            value={form.vencimento && repForm.freq !== 'SEMANAL' ? Number(form.vencimento.slice(8, 10)) : repForm.dia}
                            onChange={(e) => setRepForm((s) => ({ ...s, dia: Number(e.target.value) }))} />
                          <div className="hint">{form.vencimento && repForm.freq !== 'SEMANAL' ? 'puxado do vencimento' : ''}</div>
                        </div>
                        <div className="f">
                          <label>Termina</label>
                          <select className="fin-ctl" value={repForm.termina} onChange={(e) => setRepForm((s) => ({ ...s, termina: e.target.value as any }))}>
                            <option value="NUNCA">Nunca</option>
                            <option value="VEZES">Após N vezes</option>
                            <option value="DATA">Em uma data</option>
                          </select>
                        </div>
                      </div>
                      {repForm.termina === 'VEZES' && (
                        <div className="f">
                          <label>Quantas vezes</label>
                          <input type="number" min={1} className="fin-ctl" value={repForm.maxVezes} onChange={(e) => setRepForm((s) => ({ ...s, maxVezes: e.target.value }))} />
                        </div>
                      )}
                      {repForm.termina === 'DATA' && (
                        <div className="f">
                          <label>Última data</label>
                          <input type="date" className="fin-ctl" value={repForm.terminaEm} onChange={(e) => setRepForm((s) => ({ ...s, terminaEm: e.target.value }))} />
                        </div>
                      )}
                      <div className="f"><div className="hint auto">a próxima conta nasce sozinha como “a pagar”, 30 dias antes do vencimento — e aparece na agenda</div></div>
                    </>
                  )}

                  {repetir === 'PARCELADA' && (
                    <>
                      <div className="row2">
                        <div className="f">
                          <label>Número de parcelas</label>
                          <input type="number" min={2} max={48} className="fin-ctl" value={repForm.parcelas} onChange={(e) => setRepForm((s) => ({ ...s, parcelas: e.target.value }))} />
                        </div>
                        <div className="f">
                          <label>&nbsp;</label>
                          <div className="hint">o valor informado é o de <b style={{ fontWeight: 500 }}>cada parcela</b>; vencimentos mensais a partir do vencimento</div>
                        </div>
                      </div>
                      <div className="f"><div className="hint auto">cria todas de uma vez — (1/{repForm.parcelas || 'N'}), (2/{repForm.parcelas || 'N'})… — e todas aparecem na agenda</div></div>
                    </>
                  )}
                </div>
              </details>

              {/* baixa — recolhível */}
              <details className="fin-fold" style={repetir === 'RECORRENTE' ? { display: 'none' } : undefined} open={baixaOpen} onToggle={(e) => setBaixaOpen((e.target as HTMLDetailsElement).open)}>
                <summary>Registrar pagamento agora (baixa) — deixe recolhido enquanto é “a pagar”</summary>
                <div className="fin-fold-body">
                  <div className="row3">
                    <div className="f">
                      <label>Data do pagamento</label>
                      <input type="date" className="fin-ctl" value={form.dataPagamento} onChange={(e) => setF('dataPagamento', e.target.value)} />
                    </div>
                    <div className="f">
                      <label>Juros</label>
                      <input className="fin-ctl" value={form.juros} onChange={(e) => setF('juros', e.target.value)} placeholder="0,00" />
                    </div>
                    <div className="f">
                      <label>Multa</label>
                      <input className="fin-ctl" value={form.multa} onChange={(e) => setF('multa', e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
                  <div className="hint auto">principal na categoria · juros/multa → Financeiras · desconto → Desc. obtido</div>
                </div>
              </details>
              </>)}

              {form.tipo === 'TRANSFERENCIA' && (
                <div className="hint auto" style={{ marginTop: 4 }}>
                  A transferência sai da conta origem e entra na de destino na data informada. Não entra na DRE (não é receita nem despesa).
                </div>
              )}
            </div>

            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModalAberto(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{CSS}</style>
    </div>
  );
}

/* ===================== CSS (portado do mockup, prefixo fin-) ===================== */
const CSS = `
.fin-root { --primary:#009AAC; --navy:#014D5E; --coral:#D85A30; --green:#1c7a47; --green-bg:#E7F6EE;
  --gold:#B8860B; --gold-bg:#FAF1DC; --coral-bg:#FBEDE6; --text1:#1F2A2E; --text2:#5C6B70; --text3:#8A989D;
  --line:#E8E2D6; --lineSoft:#F0EBE0; --tint:#E0F4F6;
  color:var(--text1); font-size:14px; padding:20px; display:flex; flex-direction:column; gap:14px; }
.fin-root h1,.fin-root h2,.fin-root h3,.fin-root p{ margin:0; }
.fin-head{ display:flex; align-items:center; gap:16px; border-bottom:1px solid var(--line); padding:0 2px 10px; }
.fin-head h1{ font-size:16px; font-weight:500; }
.fin-tab{ font-size:13.5px; color:var(--text2); padding-bottom:10px; margin-bottom:-11px; }
.fin-tab.on{ color:var(--navy); border-bottom:2px solid var(--primary); }
.fin-tab.soon{ color:var(--text3); }
.fin-spacer{ flex:1; }
.fin-btn{ font-size:13px; font-weight:500; border-radius:9px; padding:8px 14px; border:1px solid var(--line);
  background:#fff; color:var(--navy); cursor:pointer; }
.fin-btn.primary{ background:var(--primary); border-color:var(--primary); color:#fff; }
.fin-btn.sm{ font-size:12px; padding:5px 10px; }
.fin-btn.ghost{ color:var(--coral); border-color:var(--line); }
.fin-btn:disabled{ opacity:.6; cursor:default; }
.fin-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-kpi{ background:#fff; border:1px solid var(--line); border-radius:12px; padding:14px 16px; box-shadow:0 1px 2px rgba(52,50,46,.04); }
.fin-kpi small{ font-size:12px; color:var(--text2); }
.fin-kpi b{ display:block; margin-top:4px; font-size:24px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-kpi .d{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-kpi b.rec{ color:var(--green); } .fin-kpi b.desp{ color:var(--coral); }
.fin-kpi.danger{ border-color:#E8BBAA; background:var(--coral-bg); }
.fin-kpi.danger b,.fin-kpi.danger small{ color:var(--coral); } .fin-kpi.danger .d{ color:#a5482a; }
.fin-filters{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:12px 14px; display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end; }
.fin-fld{ display:flex; flex-direction:column; gap:3px; } .fin-fld.grow{ flex:1; min-width:180px; }
.fin-fld label{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); font-weight:500; }
.fin-ctl{ font-size:13px; border:1px solid var(--line); border-radius:9px; padding:6px 10px; background:#fff; color:var(--text1); min-width:130px; }
.fin-fld.grow .fin-ctl{ width:100%; }
.fin-ctl.auto{ background:var(--tint); border-color:#CFE9EC; color:var(--navy); }
.fin-chip{ font-size:12px; border-radius:999px; padding:6px 12px; border:1px solid #E7D4A8; background:var(--gold-bg); color:var(--gold); font-weight:500; cursor:pointer; }
.fin-chip.on{ background:var(--gold); color:#fff; border-color:var(--gold); }
.fin-card{ background:#fff; border:1px solid var(--line); border-radius:13px; box-shadow:0 1px 2px rgba(52,50,46,.04); overflow:hidden; }
.fin-card-head{ display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid var(--lineSoft); }
.fin-card-head h2{ font-size:13px; font-weight:500; color:var(--text2); }
.fin-tbl-scroll{ overflow-x:auto; }
.fin-tbl{ width:100%; border-collapse:collapse; font-size:13px; min-width:960px; }
.fin-tbl th{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); font-weight:500; text-align:left; padding:10px 12px; border-bottom:1px solid var(--line); white-space:nowrap; }
.fin-tbl td{ padding:11px 12px; border-bottom:1px solid var(--lineSoft); color:var(--text1); vertical-align:middle; }
.fin-tbl tr:last-child td{ border-bottom:none; }
.fin-tbl tr.pend{ background:#FDFAF2; }
.fin-tbl .num{ text-align:right; font-variant-numeric:tabular-nums; white-space:nowrap; }
.fin-tbl .rec{ color:var(--green); } .fin-tbl .desp{ color:var(--coral); }
.fin-tbl .desc{ font-weight:500; } .fin-tbl .sub{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-tbl .dt{ white-space:nowrap; color:var(--text2); font-variant-numeric:tabular-nums; }
.fin-tbl .acoes{ white-space:nowrap; display:flex; gap:6px; justify-content:flex-end; }
.fin-empty{ text-align:center; color:var(--text3); padding:26px 0 !important; }
.fin-root .pill{ display:inline-block; font-size:11px; padding:3px 9px; border-radius:999px; background:#F3F1EC; color:var(--text2); white-space:nowrap; }
.fin-root .pill.marca{ background:var(--tint); color:var(--navy); }
.fin-root .pill.vencido{ background:var(--coral-bg); color:var(--coral); }
.fin-root .pill.apagar{ background:var(--gold-bg); color:var(--gold); }
.fin-root .pill.pago{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.conc{ background:var(--tint); color:var(--navy); }
.fin-root .pill.dash{ color:var(--text3); background:transparent; padding-left:0; }
.fin-def{ font-size:11px; padding:3px 9px; border-radius:999px; border:1px dashed #DCC58A; background:var(--gold-bg); color:var(--gold); font-weight:500; }
/* modal */
.fin-overlay{ position:fixed; inset:0; background:rgba(20,25,28,.35); display:flex; align-items:flex-start; justify-content:center; padding:40px 16px; z-index:50; overflow:auto; }
.fin-modal{ width:100%; max-width:560px; background:#fff; border:1px solid var(--line); border-radius:16px; box-shadow:0 12px 40px rgba(20,25,28,.18); overflow:hidden; }
.fin-modal-head{ padding:16px 20px; border-bottom:1px solid var(--lineSoft); display:flex; align-items:center; }
.fin-modal-head h3{ font-size:14px; font-weight:500; }
.fin-modal-body{ padding:18px 20px; display:flex; flex-direction:column; gap:14px; }
.fin-modal-foot{ padding:14px 20px; border-top:1px solid var(--lineSoft); display:flex; gap:8px; justify-content:flex-end; }
.fin-seg{ display:flex; border:1px solid var(--line); border-radius:9px; overflow:hidden; }
.fin-seg button{ font-size:12.5px; padding:6px 12px; background:#fff; border:none; color:var(--text2); cursor:pointer; }
.fin-seg button.on{ background:var(--primary); color:#fff; }
.fin-root .row2{ display:grid; grid-template-columns:1fr 1fr; gap:12px; }
.fin-root .row3{ display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; }
.fin-root .f label{ display:block; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); font-weight:500; margin-bottom:4px; }
.fin-root .f .fin-ctl{ width:100%; }
.fin-root .f .hint{ font-size:11px; color:var(--text3); margin-top:4px; } .fin-root .f .hint.auto{ color:var(--primary); }
.fin-root .req{ color:var(--coral); }
.fin-fold{ border:1px solid var(--line); border-radius:12px; background:#FBF9F4; overflow:hidden; }
.fin-fold>summary{ list-style:none; cursor:pointer; padding:12px 14px; font-size:13px; font-weight:500; color:var(--navy); display:flex; align-items:center; gap:8px; }
.fin-fold>summary::-webkit-details-marker{ display:none; }
.fin-fold>summary::before{ content:"▸"; color:var(--primary); }
.fin-fold[open]>summary::before{ content:"▾"; }
.fin-fold[open]>summary{ border-bottom:1px solid var(--lineSoft); }
.fin-fold .fin-fold-body{ padding:14px; display:flex; flex-direction:column; gap:12px; }
.fin-fold-body .hint.auto{ font-size:11px; color:var(--primary); }
@media (max-width:900px){ .fin-root .fin-kpis{ grid-template-columns:repeat(2,1fr); } .fin-root .row2,.fin-root .row3{ grid-template-columns:1fr; } }
`;
