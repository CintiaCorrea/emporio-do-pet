'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS } from '../fin-ui';

/* ===================== tipos ===================== */
type TipoConta =
  | 'DINHEIRO' | 'CONTA_CORRENTE' | 'CARTAO_CREDITO' | 'CONTAS_A_RECEBER'
  | 'APLICACAO_FINANCEIRA' | 'EMPRESTIMO_CONTRATADO' | 'IMOBILIZADO' | 'CAPITAL_SOCIAL';
interface Conta {
  id: string; nome: string; tipo: TipoConta; ativo: boolean; unidadeId: string | null; unidade?: { nome: string } | null;
  banco?: string | null; agencia?: string | null; numeroConta?: string | null; titular?: string | null; pixChave?: string | null;
  saldoInicialCentavos?: number | null; saldoInicialData?: string | null;
}
interface Unidade { id: string; nome: string; }

const TIPOS: { v: TipoConta; label: string }[] = [
  { v: 'DINHEIRO', label: 'Dinheiro (caixa)' },
  { v: 'CONTA_CORRENTE', label: 'Conta corrente' },
  { v: 'CARTAO_CREDITO', label: 'Cartão de crédito' },
  { v: 'CONTAS_A_RECEBER', label: 'Recebíveis (maquineta)' },
  { v: 'APLICACAO_FINANCEIRA', label: 'Aplicação financeira' },
  { v: 'EMPRESTIMO_CONTRATADO', label: 'Empréstimo contratado' },
  { v: 'IMOBILIZADO', label: 'Imobilizado' },
  { v: 'CAPITAL_SOCIAL', label: 'Capital social' },
];
const tipoLabel = (t: TipoConta) => TIPOS.find((x) => x.v === t)?.label ?? t;

/* ===================== menu ===================== */
type Secao = 'unidades' | 'marcas' | 'linhas' | 'plano' | 'contas' | 'taxas' | 'contatos' | 'formas';
const MENU: { grupo: string; itens: { v: Secao; ic: string; label: string; pronto: boolean }[] }[] = [
  { grupo: 'Dimensões', itens: [
    { v: 'unidades', ic: '🏢', label: 'Unidades', pronto: true },
    { v: 'marcas', ic: '🏷️', label: 'Marcas', pronto: true },
    { v: 'linhas', ic: '🩺', label: 'Linhas de serviço', pronto: true },
  ] },
  { grupo: 'Financeiro', itens: [
    { v: 'plano', ic: '📋', label: 'Plano de contas', pronto: true },
    { v: 'contas', ic: '🏦', label: 'Contas', pronto: true },
    { v: 'taxas', ic: '💳', label: 'Taxas de cartão', pronto: true },
  ] },
  { grupo: 'Apoios', itens: [
    { v: 'contatos', ic: '👥', label: 'Contatos', pronto: true },
    { v: 'formas', ic: '💰', label: 'Formas de pagamento', pronto: true },
  ] },
];

async function getJSON(url: string) {
  const r = await fetch(url);
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (d.error || d.message)) || 'Erro');
  return d;
}
async function sendJSON(url: string, method: string, body?: any) {
  const r = await fetch(url, { method, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined });
  const d = await r.json().catch(() => null);
  if (!r.ok) throw new Error((d && (Array.isArray(d.message) ? d.message.join(', ') : d.message || d.error)) || 'Erro');
  return d;
}

/* ===================== página ===================== */
export default function CadastrosPage() {
  const [secao, setSecao] = useState<Secao>('contas');
  return (
    <div className="fin-root">
      <FinTabs active="cadastros" />
      <div className="cad-painel">
        <nav className="cad-menu">
          {MENU.map((g) => (
            <div key={g.grupo}>
              <div className="cad-grp">{g.grupo}</div>
              {g.itens.map((it) => (
                <a key={it.v} className={secao === it.v ? 'on' : ''} onClick={() => setSecao(it.v)}>
                  <span className="ic">{it.ic}</span> {it.label}
                  {!it.pronto && <span className="cad-soon">em breve</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>
        <div className="cad-conteudo">
          {secao === 'contas' ? <SecaoContas />
            : secao === 'plano' ? <SecaoPlano />
              : secao === 'taxas' ? <SecaoTaxas />
                : secao === 'unidades' ? <SecaoUnidades />
                  : secao === 'marcas' ? <SecaoSimples titulo="Marcas" base="/api/financeiro/marcas" placeholder="ex.: Empório do Pet" />
                    : secao === 'linhas' ? <SecaoSimples titulo="Linhas de serviço" base="/api/financeiro/linhas-servico" placeholder="ex.: Fisioterapia" temOrdem />
                      : secao === 'contatos' ? <SecaoContatos />
                        : secao === 'formas' ? <SecaoSimples titulo="Formas de pagamento" base="/api/financeiro/formas-pagamento" placeholder="ex.: Pix" temOrdem />
                          : <EmBreve nome={MENU.flatMap((g) => g.itens).find((i) => i.v === secao)?.label ?? ''} />}
        </div>
      </div>
      <style>{FIN_CSS}</style>
      <style>{CAD_CSS}</style>
    </div>
  );
}

function EmBreve({ nome }: { nome: string }) {
  return (
    <div className="fin-card">
      <div className="fin-card-head"><h2>{nome}</h2></div>
      <div className="fin-empty" style={{ padding: '40px 0' }}>
        Esta tela de cadastro vem em seguida — estou construindo os cadastros um a um.
      </div>
    </div>
  );
}

/* ===================== Contas ===================== */
const contaVazia = {
  id: '', nome: '', tipo: 'CONTA_CORRENTE' as TipoConta, unidadeId: '', ativo: true,
  banco: '', agencia: '', numeroConta: '', titular: '', pixChave: '',
  saldoStr: '', saldoNeg: false, saldoInicialData: '',
};
type ContaForm = typeof contaVazia;

/** "1.234,56" -> 123456 centavos (sempre positivo; o sinal vem do toggle) */
function brlParaCentavos(s: string): number {
  const n = Number(String(s || '').replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(Math.abs(n) * 100) : 0;
}
/** 123456 -> "1.234,56" (valor absoluto) */
function centavosParaBRL(c: number): string {
  return (Math.abs(c) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SecaoContas() {
  const [contas, setContas] = useState<Conta[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<ContaForm>(contaVazia);
  const [salvando, setSalvando] = useState(false);

  const uById = useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);

  async function carregar() {
    setCarregando(true);
    try {
      const [c, u] = await Promise.all([
        getJSON('/api/financeiro/contas/gestao'),
        getJSON('/api/financeiro/unidades'),
      ]);
      setContas(c || []);
      setUnidades(u || []);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  function abrirNova() { setForm(contaVazia); setModal(true); }
  function abrirEdicao(c: Conta) {
    const cents = c.saldoInicialCentavos ?? 0;
    setForm({
      id: c.id, nome: c.nome, tipo: c.tipo, unidadeId: c.unidadeId || '', ativo: c.ativo,
      banco: c.banco || '', agencia: c.agencia || '', numeroConta: c.numeroConta || '',
      titular: c.titular || '', pixChave: c.pixChave || '',
      saldoStr: cents ? centavosParaBRL(cents) : '', saldoNeg: cents < 0,
      saldoInicialData: c.saldoInicialData ? String(c.saldoInicialData).slice(0, 10) : '',
    });
    setModal(true);
  }
  function setF<K extends keyof ContaForm>(k: K, v: ContaForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome da conta.');
    setSalvando(true);
    try {
      const abs = brlParaCentavos(form.saldoStr);
      const saldoInicialCentavos = form.saldoNeg ? -abs : abs;
      const body = {
        nome: form.nome.trim(), tipo: form.tipo, unidadeId: form.unidadeId || null, ativo: form.ativo,
        banco: form.banco.trim() || null, agencia: form.agencia.trim() || null,
        numeroConta: form.numeroConta.trim() || null, titular: form.titular.trim() || null,
        pixChave: form.pixChave.trim() || null,
        saldoInicialCentavos,
        saldoInicialData: form.saldoInicialData ? new Date(form.saldoInicialData + 'T12:00:00').toISOString() : null,
      };
      if (form.id) await sendJSON(`/api/financeiro/contas/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/contas', 'POST', body);
      toast.success('Conta salva');
      setModal(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }
  async function alternarAtivo(c: Conta) {
    try {
      await sendJSON(`/api/financeiro/contas/${c.id}`, 'PATCH', { ativo: !c.ativo });
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(c: Conta) {
    if (!confirm(`Excluir a conta "${c.nome}"?`)) return;
    try {
      const r = await fetch(`/api/financeiro/contas/${c.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || 'Erro');
      toast.success('Conta excluída');
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro ao excluir'); }
  }

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>Contas</h2>
        <span className="pill">{contas.filter((c) => c.ativo).length} ativas</span>
        <span className="fin-spacer" />
        <button className="fin-btn primary sm" onClick={abrirNova}>+ Nova conta</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 16px 0' }}>
        Banco, caixa e cartão de crédito. O <b style={{ fontWeight: 500 }}>tipo</b> define como entra no fluxo de caixa;
        a <b style={{ fontWeight: 500 }}>unidade</b> ajuda a classificar o lançamento sozinho.
      </div>
      <div className="fin-tbl-scroll">
        <table className="fin-tbl">
          <thead><tr><th>Conta</th><th>Tipo</th><th>Unidade</th><th style={{ textAlign: 'right' }}>Saldo inicial</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="fin-empty">Carregando…</td></tr>}
            {!carregando && contas.length === 0 && (
              <tr><td colSpan={6} className="fin-empty">Nenhuma conta. Clique em “+ Nova conta”.</td></tr>
            )}
            {!carregando && contas.map((c) => {
              const dados = [c.banco, c.agencia && `Ag ${c.agencia}`, c.numeroConta && `Cc ${c.numeroConta}`].filter(Boolean).join(' · ');
              const cents = c.saldoInicialCentavos ?? 0;
              return (
              <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>
                  {c.nome}
                  {dados && <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>{dados}</div>}
                </td>
                <td><span className="pill">{tipoLabel(c.tipo)}</span></td>
                <td>{c.unidade?.nome || (c.unidadeId ? uById.get(c.unidadeId) : '—') || '—'}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: cents < 0 ? '#c0392b' : 'inherit' }}>
                  {cents ? `${cents < 0 ? '-' : ''}R$ ${centavosParaBRL(cents)}` : '—'}
                </td>
                <td>{c.ativo ? <span className="pill okp">ativa</span> : <span className="pill">inativa</span>}</td>
                <td className="cad-acao">
                  <button className="fin-btn sm" onClick={() => abrirEdicao(c)}>Editar</button>{' '}
                  <button className="fin-btn sm" onClick={() => alternarAtivo(c)}>{c.ativo ? 'Desativar' : 'Ativar'}</button>{' '}
                  <button className="fin-btn sm ghost" onClick={() => excluir(c)}>Excluir</button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="fin-modal-head"><h3>{form.id ? 'Editar conta' : 'Nova conta'}</h3></div>
            <div className="fin-modal-body">
              <div className="f">
                <label>Nome</label>
                <input className="fin-ctl" value={form.nome} onChange={(e) => setF('nome', e.target.value)} placeholder="ex.: Conta Corrente PJ" />
              </div>
              <div className="row2">
                <div className="f">
                  <label>Tipo</label>
                  <select className="fin-ctl" value={form.tipo} onChange={(e) => setF('tipo', e.target.value as TipoConta)}>
                    {TIPOS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Unidade</label>
                  <select className="fin-ctl" value={form.unidadeId} onChange={(e) => setF('unidadeId', e.target.value)}>
                    <option value="">— sem unidade —</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* ---- dados bancários (opcionais) ---- */}
              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0 2px', paddingTop: 10, fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                Dados bancários <span style={{ fontWeight: 400 }}>(opcional)</span>
              </div>
              <div className="row2">
                <div className="f">
                  <label>Banco</label>
                  <input className="fin-ctl" value={form.banco} onChange={(e) => setF('banco', e.target.value)} placeholder="ex.: Nubank" />
                </div>
                <div className="f">
                  <label>Agência</label>
                  <input className="fin-ctl" value={form.agencia} onChange={(e) => setF('agencia', e.target.value)} placeholder="ex.: 0001" />
                </div>
              </div>
              <div className="row2">
                <div className="f">
                  <label>Número da conta</label>
                  <input className="fin-ctl" value={form.numeroConta} onChange={(e) => setF('numeroConta', e.target.value)} placeholder="ex.: 12345678-9" />
                </div>
                <div className="f">
                  <label>Titular</label>
                  <input className="fin-ctl" value={form.titular} onChange={(e) => setF('titular', e.target.value)} placeholder="ex.: Empório do Pet LTDA" />
                </div>
              </div>
              <div className="f">
                <label>Chave PIX</label>
                <input className="fin-ctl" value={form.pixChave} onChange={(e) => setF('pixChave', e.target.value)} placeholder="CNPJ, e-mail, telefone…" />
              </div>

              {/* ---- saldo de abertura ---- */}
              <div style={{ borderTop: '1px solid var(--line)', margin: '4px 0 2px', paddingTop: 10, fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>
                Saldo inicial <span style={{ fontWeight: 400 }}>(saldo de abertura — pode ser negativo)</span>
              </div>
              <div className="row2">
                <div className="f">
                  <label>Valor</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text2)' }}>R$</span>
                    <input className="fin-ctl" inputMode="decimal" value={form.saldoStr}
                      onChange={(e) => setF('saldoStr', e.target.value)} placeholder="0,00" style={{ textAlign: 'right' }} />
                  </div>
                </div>
                <div className="f">
                  <label>Data do saldo</label>
                  <input className="fin-ctl" type="date" value={form.saldoInicialData} onChange={(e) => setF('saldoInicialData', e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" name="saldoSinal" checked={!form.saldoNeg} onChange={() => setF('saldoNeg', false)} /> Positivo (a favor)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <input type="radio" name="saldoSinal" checked={form.saldoNeg} onChange={() => setF('saldoNeg', true)} />
                  <span style={{ color: '#c0392b' }}>Negativo (no vermelho)</span>
                </label>
              </div>

              <label className="fin-switch" style={{ borderTop: '1px solid var(--line)', marginTop: 8, paddingTop: 10 }}>
                <input type="checkbox" checked={form.ativo} onChange={(e) => setF('ativo', e.target.checked)} /> Conta ativa
              </label>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Plano de contas ===================== */
type TipoCat = 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
type Natureza = 'OPERACIONAL' | 'INVESTIMENTO' | 'FINANCIAMENTO' | 'NAO_OPERACIONAL';
type Comport = 'FIXO' | 'VARIAVEL' | 'NAO_APLICAVEL';
interface Categoria {
  id: string; nome: string; subgrupo: string | null; tipo: TipoCat; natureza: Natureza;
  comportamento: Comport; ordem: number; ativo: boolean; grupoId: string; usos: number;
}
interface Grupo { id: string; nome: string; ordem: number; tipo: TipoCat; categorias: Categoria[]; }

const NATUREZAS: { v: Natureza; label: string }[] = [
  { v: 'OPERACIONAL', label: 'Operacional' },
  { v: 'INVESTIMENTO', label: 'Investimento (capex)' },
  { v: 'FINANCIAMENTO', label: 'Financiamento' },
  { v: 'NAO_OPERACIONAL', label: 'Não operacional' },
];
const COMPORTS: { v: Comport; label: string }[] = [
  { v: 'FIXO', label: 'Fixo' },
  { v: 'VARIAVEL', label: 'Variável' },
  { v: 'NAO_APLICAVEL', label: 'N/A (receita)' },
];
const natLabel = (n: Natureza) => NATUREZAS.find((x) => x.v === n)?.label ?? n;

const catVazia = {
  id: '', nome: '', grupoId: '', tipo: 'DESPESA' as TipoCat, natureza: 'OPERACIONAL' as Natureza,
  comportamento: 'VARIAVEL' as Comport, subgrupo: '', ativo: true,
};
type CatForm = typeof catVazia;

function SecaoPlano() {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({});
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<CatForm>(catVazia);
  const [salvando, setSalvando] = useState(false);
  const [modalGrupo, setModalGrupo] = useState(false);
  const [grupoForm, setGrupoForm] = useState({ nome: '', tipo: 'DESPESA' as TipoCat, ordem: 99 });

  async function carregar() {
    setCarregando(true);
    try {
      const g = await getJSON('/api/financeiro/plano-de-contas');
      setGrupos(g || []);
      if (Object.keys(abertos).length === 0 && g?.length) {
        setAbertos(Object.fromEntries(g.map((x: Grupo) => [x.id, true])));
      }
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar o plano de contas');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  const totalCat = useMemo(() => grupos.reduce((s, g) => s + g.categorias.length, 0), [grupos]);

  function novaCategoria(grupoId?: string) {
    const g = grupos.find((x) => x.id === grupoId) || grupos[0];
    setForm({ ...catVazia, grupoId: g?.id || '', tipo: g?.tipo || 'DESPESA', comportamento: g?.tipo === 'RECEITA' ? 'NAO_APLICAVEL' : 'VARIAVEL' });
    setModal(true);
  }
  function editarCategoria(c: Categoria) {
    setForm({ id: c.id, nome: c.nome, grupoId: c.grupoId, tipo: c.tipo, natureza: c.natureza, comportamento: c.comportamento, subgrupo: c.subgrupo || '', ativo: c.ativo });
    setModal(true);
  }
  function setF<K extends keyof CatForm>(k: K, v: CatForm[K]) { setForm((f) => ({ ...f, [k]: v })); }

  async function salvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome da categoria.');
    if (!form.grupoId) return toast.error('Escolha o grupo.');
    setSalvando(true);
    try {
      const body = {
        nome: form.nome.trim(), grupoId: form.grupoId, tipo: form.tipo,
        natureza: form.natureza, comportamento: form.comportamento,
        subgrupo: form.subgrupo || null, ativo: form.ativo,
      };
      if (form.id) await sendJSON(`/api/financeiro/categorias/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/categorias', 'POST', body);
      toast.success('Categoria salva');
      setModal(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }
  async function alternarAtivo(c: Categoria) {
    try { await sendJSON(`/api/financeiro/categorias/${c.id}`, 'PATCH', { ativo: !c.ativo }); carregar(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluirCat(c: Categoria) {
    if (!confirm(`Excluir a categoria "${c.nome}"?`)) return;
    try {
      const r = await fetch(`/api/financeiro/categorias/${c.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || 'Erro');
      toast.success('Excluída'); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function salvarGrupo() {
    if (!grupoForm.nome.trim()) return toast.error('Informe o nome do grupo.');
    try {
      await sendJSON('/api/financeiro/grupos', 'POST', { nome: grupoForm.nome.trim(), tipo: grupoForm.tipo, ordem: Number(grupoForm.ordem) || 99 });
      toast.success('Grupo criado'); setModalGrupo(false); setGrupoForm({ nome: '', tipo: 'DESPESA', ordem: 99 }); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  const tipoPill = (t: TipoCat) =>
    t === 'RECEITA' ? <span className="pill okp">receita</span>
      : t === 'DESPESA' ? <span className="pill despp">despesa</span>
        : <span className="pill">transferência</span>;

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>Plano de contas</h2>
        <span className="pill">{grupos.length} grupos · {totalCat} categorias</span>
        <span className="fin-spacer" />
        <button className="fin-btn sm" onClick={() => setModalGrupo(true)}>+ Grupo</button>{' '}
        <button className="fin-btn primary sm" onClick={() => novaCategoria()}>+ Nova categoria</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 16px 0' }}>
        Estrutura da DRE. A <b style={{ fontWeight: 500 }}>natureza</b> separa o que fica fora do EBITDA (capex/financiamento);
        o <b style={{ fontWeight: 500 }}>comportamento</b> (fixo/variável) define a margem de contribuição.
      </div>

      {carregando && <div className="fin-empty" style={{ padding: 30 }}>Carregando…</div>}
      {!carregando && grupos.map((g) => {
        const aberto = !!abertos[g.id];
        return (
          <div key={g.id} className="pc-grupo">
            <div className="pc-grupo-head" onClick={() => setAbertos((s) => ({ ...s, [g.id]: !s[g.id] }))}>
              <span className="pc-tog">{aberto ? '▾' : '▸'}</span>
              <span className="pc-gnome">{g.nome}</span>
              {tipoPill(g.tipo)}
              <span className="pill">{g.categorias.length}</span>
              <span className="fin-spacer" />
              <button className="fin-btn sm" onClick={(e) => { e.stopPropagation(); novaCategoria(g.id); }}>+ categoria</button>
            </div>
            {aberto && (
              <div className="fin-tbl-scroll">
                <table className="fin-tbl pc-tbl">
                  <thead><tr><th>Categoria</th><th>Natureza</th><th>Comportamento</th><th className="num">Uso</th><th>Situação</th><th></th></tr></thead>
                  <tbody>
                    {g.categorias.length === 0 && <tr><td colSpan={6} className="fin-empty">Grupo vazio.</td></tr>}
                    {g.categorias.map((c) => (
                      <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.5 }}>
                        <td><span style={{ fontWeight: 500 }}>{c.nome}</span>{c.subgrupo && <span className="pc-sub"> · {c.subgrupo}</span>}</td>
                        <td>{natLabel(c.natureza)}</td>
                        <td>{c.comportamento === 'NAO_APLICAVEL' ? '—' : c.comportamento === 'FIXO' ? 'Fixo' : 'Variável'}</td>
                        <td className="num">{c.usos || '—'}</td>
                        <td>{c.ativo ? <span className="pill okp">ativa</span> : <span className="pill">inativa</span>}</td>
                        <td className="cad-acao">
                          <button className="fin-btn sm" onClick={() => editarCategoria(c)}>Editar</button>{' '}
                          <button className="fin-btn sm" onClick={() => alternarAtivo(c)}>{c.ativo ? 'Desativar' : 'Ativar'}</button>{' '}
                          {c.usos === 0 && <button className="fin-btn sm ghost" onClick={() => excluirCat(c)}>Excluir</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {/* modal categoria */}
      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head"><h3>{form.id ? 'Editar categoria' : 'Nova categoria'}</h3></div>
            <div className="fin-modal-body">
              <div className="row2" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
                <div className="f"><label>Nome</label>
                  <input className="fin-ctl" value={form.nome} onChange={(e) => setF('nome', e.target.value)} placeholder="ex.: Energia Elétrica" /></div>
                <div className="f"><label>Subgrupo (opcional)</label>
                  <input className="fin-ctl" value={form.subgrupo} onChange={(e) => setF('subgrupo', e.target.value)} placeholder="ex.: Estrutura" /></div>
              </div>
              <div className="f"><label>Grupo</label>
                <select className="fin-ctl" value={form.grupoId} onChange={(e) => setF('grupoId', e.target.value)}>
                  {grupos.map((g) => <option key={g.id} value={g.id}>{g.nome}</option>)}
                </select></div>
              <div className="row3">
                <div className="f"><label>Tipo</label>
                  <select className="fin-ctl" value={form.tipo} onChange={(e) => setF('tipo', e.target.value as TipoCat)}>
                    <option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option><option value="TRANSFERENCIA">Transferência</option>
                  </select></div>
                <div className="f"><label>Natureza</label>
                  <select className="fin-ctl" value={form.natureza} onChange={(e) => setF('natureza', e.target.value as Natureza)}>
                    {NATUREZAS.map((n) => <option key={n.v} value={n.v}>{n.label}</option>)}
                  </select></div>
                <div className="f"><label>Comportamento</label>
                  <select className="fin-ctl" value={form.comportamento} onChange={(e) => setF('comportamento', e.target.value as Comport)}>
                    {COMPORTS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
                  </select></div>
              </div>
              <label className="fin-switch"><input type="checkbox" checked={form.ativo} onChange={(e) => setF('ativo', e.target.checked)} /> Categoria ativa</label>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* modal grupo */}
      {modalGrupo && (
        <div className="fin-overlay" onClick={() => setModalGrupo(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="fin-modal-head"><h3>Novo grupo</h3></div>
            <div className="fin-modal-body">
              <div className="f"><label>Nome</label>
                <input className="fin-ctl" value={grupoForm.nome} onChange={(e) => setGrupoForm((s) => ({ ...s, nome: e.target.value }))} placeholder="ex.: 12. Outras Despesas" /></div>
              <div className="row2">
                <div className="f"><label>Tipo</label>
                  <select className="fin-ctl" value={grupoForm.tipo} onChange={(e) => setGrupoForm((s) => ({ ...s, tipo: e.target.value as TipoCat }))}>
                    <option value="DESPESA">Despesa</option><option value="RECEITA">Receita</option>
                  </select></div>
                <div className="f"><label>Ordem na DRE</label>
                  <input type="number" className="fin-ctl" value={grupoForm.ordem} onChange={(e) => setGrupoForm((s) => ({ ...s, ordem: Number(e.target.value) }))} /></div>
              </div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModalGrupo(false)}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvarGrupo}>Criar grupo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Taxas de cartão ===================== */
interface Taxa { id: string; adquirente: string; bandeira: string; plano: string; forma: string; parcelas: number; aliquotaBps: number; vigenciaInicio: string; }
const BANDEIRAS = ['Visa/Mastercard', 'Elo/Amex'];
const PLANOS = ['Padrao', 'Nitro', 'Sem antecipacao'];
const FORMAS_TX = ['Pix', 'Debito', 'Credito a vista', 'Credito parcelado'];
const ADQUIRENTES_PADRAO = ['InfinityPay', 'Nubank'];
const bpsPct = (b: number) => (b / 100).toFixed(2).replace('.', ',') + '%';
const fmtVig = (iso: string) => new Date(iso).toLocaleDateString('pt-BR');

const taxaVazia = { bandeira: 'Visa/Mastercard', plano: 'Padrao', forma: 'Credito a vista', parcelas: 1, aliquota: '', vigencia: '' };

function SecaoTaxas() {
  const [taxas, setTaxas] = useState<Taxa[]>([]);
  const [adqSel, setAdqSel] = useState('InfinityPay');
  const [vigSel, setVigSel] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(taxaVazia);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      const t = await getJSON('/api/financeiro/auditoria/taxas');
      setTaxas(t || []);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar as taxas');
    } finally {
      setCarregando(false);
    }
  }
  useEffect(() => { carregar(); }, []);

  // adquirentes conhecidas = padrão + as que já têm taxas
  const adquirentes = useMemo(
    () => [...new Set([...ADQUIRENTES_PADRAO, ...taxas.map((t) => t.adquirente || 'InfinityPay')])],
    [taxas],
  );
  // vigências da adquirente selecionada (desc)
  const vigencias = useMemo(
    () => [...new Set(taxas.filter((t) => (t.adquirente || 'InfinityPay') === adqSel).map((t) => t.vigenciaInicio))]
      .sort((a, b) => (a < b ? 1 : -1)),
    [taxas, adqSel],
  );
  // ao trocar de adquirente (ou carregar), garante uma vigência válida selecionada
  useEffect(() => {
    setVigSel((cur) => (cur && vigencias.includes(cur) ? cur : vigencias[0] || ''));
  }, [vigencias]);

  const daVigencia = useMemo(
    () => taxas.filter((t) => (t.adquirente || 'InfinityPay') === adqSel && t.vigenciaInicio === vigSel).sort((a, b) =>
      a.bandeira.localeCompare(b.bandeira) || a.forma.localeCompare(b.forma) || a.parcelas - b.parcelas),
    [taxas, adqSel, vigSel],
  );

  async function editarAliquota(t: Taxa, valorTxt: string) {
    const bps = Math.round(parseFloat(valorTxt.replace(',', '.')) * 100);
    if (isNaN(bps) || bps === t.aliquotaBps) return;
    try {
      await sendJSON(`/api/financeiro/auditoria/taxas/${t.id}`, 'PATCH', { aliquotaBps: bps });
      toast.success('Alíquota atualizada');
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(t: Taxa) {
    try { await fetch(`/api/financeiro/auditoria/taxas/${t.id}`, { method: 'DELETE' }); carregar(); }
    catch { /* ignore */ }
  }
  function abrirNovaTaxa() {
    const vigDefault = vigSel ? vigSel.slice(0, 10) : new Date().toISOString().slice(0, 10);
    setForm({ ...taxaVazia, vigencia: vigDefault });
    setModal(true);
  }
  async function salvar() {
    const bps = Math.round(parseFloat(form.aliquota.replace(',', '.')) * 100);
    if (isNaN(bps)) return toast.error('Informe a alíquota (%).');
    if (!form.vigencia) return toast.error('Informe a vigência (a partir de).');
    setSalvando(true);
    try {
      const vig = `${form.vigencia}T00:00:00.000Z`;
      await sendJSON('/api/financeiro/auditoria/taxas/uma', 'POST', {
        adquirente: adqSel,
        bandeira: form.bandeira, plano: form.plano, forma: form.forma,
        parcelas: Number(form.parcelas) || 1, aliquotaBps: bps, vigenciaInicio: vig,
      });
      toast.success('Taxa adicionada');
      setModal(false); setForm(taxaVazia); setVigSel(vig); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
    finally { setSalvando(false); }
  }
  async function novaVigencia() {
    const hoje = new Date().toISOString().slice(0, 10);
    const data = prompt(`Nova vigência da ${adqSel} a partir de qual data? (AAAA-MM-DD)\nVou copiar as taxas da vigência atual para você ajustar.`, hoje);
    if (!data) return;
    try {
      const r = await sendJSON('/api/financeiro/auditoria/taxas/clonar-vigencia', 'POST', { de: vigSel, para: `${data}T00:00:00.000Z`, adquirente: adqSel });
      toast.success(`${r.clonadas} taxas copiadas para a nova vigência`);
      setVigSel(`${data}T00:00:00.000Z`);
      carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  function importarCSV(file: File) {
    const reader = new FileReader();
    reader.onload = async () => {
      const texto = String(reader.result || '');
      const FORMA: Record<string, string> = { 'Pix': 'Pix', 'Débito': 'Debito', 'Crédito à vista': 'Credito a vista', 'Crédito parcelado': 'Credito parcelado' };
      const linhas = texto.split(/\r?\n/).filter(Boolean).slice(1);
      const parsed = linhas.map((r) => {
        const c = r.split(',');
        const [band, plano, forma, parc, aliq, vig] = c;
        if (!band) return null;
        const parcelas = parc && /\d/.test(parc) ? parseInt(parc) : 1;
        const [d, m, y] = (vig || '').split('/');
        return {
          bandeira: band.trim(), plano: (plano || 'Padrao').replace('ã', 'a').trim(),
          adquirente: adqSel,
          forma: FORMA[(forma || '').trim()] || (forma || '').trim(), parcelas,
          aliquotaBps: Math.round(parseFloat(aliq) * 100),
          vigenciaInicio: y ? `${y}-${m}-${d}` : new Date().toISOString().slice(0, 10),
        };
      }).filter(Boolean);
      if (!parsed.length) return toast.error('Não consegui ler o CSV.');
      try {
        const r = await sendJSON('/api/financeiro/auditoria/taxas', 'POST', { taxas: parsed, substituirVigencia: true });
        toast.success(`${r.inseridas} taxas importadas`);
        carregar();
      } catch (e: any) { toast.error(e.message || 'Erro ao importar'); }
    };
    reader.readAsText(file, 'utf-8');
  }

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>Taxas de cartão contratadas</h2>
        <span className="pill">{daVigencia.length} linhas</span>
        <span className="fin-spacer" />
        <label className="fin-btn sm" style={{ cursor: 'pointer' }}>
          Importar CSV
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importarCSV(e.target.files[0])} />
        </label>{' '}
        <button className="fin-btn sm" onClick={novaVigencia} disabled={!vigSel}>+ Nova vigência</button>{' '}
        <button className="fin-btn primary sm" onClick={abrirNovaTaxa}>+ Taxa</button>
      </div>
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: 'var(--text3)' }}>Adquirente</label>
        <select className="fin-ctl" value={adqSel} onChange={(e) => setAdqSel(e.target.value)} style={{ fontWeight: 600 }}>
          {adquirentes.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label style={{ fontSize: 12, color: 'var(--text3)', marginLeft: 8 }}>Vigência</label>
        <select className="fin-ctl" value={vigSel} onChange={(e) => setVigSel(e.target.value)} disabled={!vigencias.length}>
          {vigencias.length === 0 && <option value="">— sem taxas ainda —</option>}
          {vigencias.map((v) => <option key={v} value={v}>a partir de {fmtVig(v)}</option>)}
        </select>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>
          {vigencias.length === 0
            ? `Nenhuma taxa da ${adqSel} ainda — clique em “+ Taxa” ou “Importar CSV”.`
            : 'edite a alíquota direto na tabela · cada venda usa a vigência válida na data'}
        </span>
      </div>
      <div className="fin-tbl-scroll">
        <table className="fin-tbl">
          <thead><tr><th>Bandeira</th><th>Plano</th><th>Forma</th><th className="num">Parcelas</th><th className="num">Alíquota (%)</th><th></th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="fin-empty">Carregando…</td></tr>}
            {!carregando && daVigencia.length === 0 && (
              <tr><td colSpan={6} className="fin-empty">Sem taxas nesta vigência. Importe o CSV ou adicione linhas.</td></tr>
            )}
            {!carregando && daVigencia.map((t) => (
              <tr key={t.id}>
                <td>{t.bandeira}</td><td>{t.plano}</td><td>{t.forma}</td>
                <td className="num">{t.parcelas}x</td>
                <td className="num">
                  <input className="tx-alq" defaultValue={(t.aliquotaBps / 100).toFixed(2).replace('.', ',')}
                    onBlur={(e) => editarAliquota(t, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} /> %
                </td>
                <td className="cad-acao"><button className="fin-btn sm ghost" onClick={() => excluir(t)}>×</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div className="fin-modal-head"><h3>Nova taxa — {adqSel}</h3></div>
            <div className="fin-modal-body">
              <div className="f">
                <label>Vigência (a partir de)</label>
                <input type="date" className="fin-ctl" value={form.vigencia} onChange={(e) => setForm((s) => ({ ...s, vigencia: e.target.value }))} />
              </div>
              <div className="row2">
                <div className="f"><label>Bandeira</label>
                  <select className="fin-ctl" value={form.bandeira} onChange={(e) => setForm((s) => ({ ...s, bandeira: e.target.value }))}>
                    {BANDEIRAS.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select></div>
                <div className="f"><label>Plano</label>
                  <select className="fin-ctl" value={form.plano} onChange={(e) => setForm((s) => ({ ...s, plano: e.target.value }))}>
                    {PLANOS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select></div>
              </div>
              <div className="row3">
                <div className="f"><label>Forma</label>
                  <select className="fin-ctl" value={form.forma} onChange={(e) => setForm((s) => ({ ...s, forma: e.target.value }))}>
                    {FORMAS_TX.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select></div>
                <div className="f"><label>Parcelas</label>
                  <input type="number" min={1} max={12} className="fin-ctl" value={form.parcelas} onChange={(e) => setForm((s) => ({ ...s, parcelas: Number(e.target.value) }))} /></div>
                <div className="f"><label>Alíquota (%)</label>
                  <input className="fin-ctl" value={form.aliquota} onChange={(e) => setForm((s) => ({ ...s, aliquota: e.target.value }))} placeholder="2,79" /></div>
              </div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Cadastro simples (nome + ativo [+ ordem]) ===================== */
interface ItemSimples { id: string; nome: string; ativo: boolean; ordem?: number; }
function SecaoSimples({ titulo, base, placeholder, temOrdem }: { titulo: string; base: string; placeholder: string; temOrdem?: boolean }) {
  const [itens, setItens] = useState<ItemSimples[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ id: '', nome: '', ordem: 0, ativo: true });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try { setItens((await getJSON(`${base}/gestao`)) || []); }
    catch (e: any) { toast.error(e.message || 'Falha ao carregar'); }
    finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, [base]);

  function abrirNovo() { setForm({ id: '', nome: '', ordem: (itens.length + 1) * 10, ativo: true }); setModal(true); }
  function editar(i: ItemSimples) { setForm({ id: i.id, nome: i.nome, ordem: i.ordem ?? 0, ativo: i.ativo }); setModal(true); }

  async function salvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome.');
    setSalvando(true);
    try {
      const body: any = { nome: form.nome.trim(), ativo: form.ativo };
      if (temOrdem) body.ordem = Number(form.ordem) || 0;
      if (form.id) await sendJSON(`${base}/${form.id}`, 'PATCH', body);
      else await sendJSON(base, 'POST', body);
      toast.success('Salvo'); setModal(false); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
    finally { setSalvando(false); }
  }
  async function alternar(i: ItemSimples) {
    try { await sendJSON(`${base}/${i.id}`, 'PATCH', { ativo: !i.ativo }); carregar(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(i: ItemSimples) {
    if (!confirm(`Excluir "${i.nome}"?`)) return;
    try {
      const r = await fetch(`${base}/${i.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || 'Erro');
      toast.success('Excluído'); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>{titulo}</h2>
        <span className="pill">{itens.filter((i) => i.ativo).length} ativos</span>
        <span className="fin-spacer" />
        <button className="fin-btn primary sm" onClick={abrirNovo}>+ Novo</button>
      </div>
      <div className="fin-tbl-scroll">
        <table className="fin-tbl">
          <thead><tr><th>Nome</th>{temOrdem && <th className="num">Ordem</th>}<th>Situação</th><th></th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={temOrdem ? 4 : 3} className="fin-empty">Carregando…</td></tr>}
            {!carregando && itens.length === 0 && <tr><td colSpan={temOrdem ? 4 : 3} className="fin-empty">Nada cadastrado ainda.</td></tr>}
            {!carregando && itens.map((i) => (
              <tr key={i.id} style={{ opacity: i.ativo ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{i.nome}</td>
                {temOrdem && <td className="num">{i.ordem ?? 0}</td>}
                <td>{i.ativo ? <span className="pill okp">ativo</span> : <span className="pill">inativo</span>}</td>
                <td className="cad-acao">
                  <button className="fin-btn sm" onClick={() => editar(i)}>Editar</button>{' '}
                  <button className="fin-btn sm" onClick={() => alternar(i)}>{i.ativo ? 'Desativar' : 'Ativar'}</button>{' '}
                  <button className="fin-btn sm ghost" onClick={() => excluir(i)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="fin-modal-head"><h3>{form.id ? 'Editar' : 'Novo'} — {titulo}</h3></div>
            <div className="fin-modal-body">
              <div className="f"><label>Nome</label>
                <input className="fin-ctl" value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder={placeholder} /></div>
              {temOrdem && <div className="f"><label>Ordem</label>
                <input type="number" className="fin-ctl" value={form.ordem} onChange={(e) => setForm((s) => ({ ...s, ordem: Number(e.target.value) }))} /></div>}
              <label className="fin-switch"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} /> Ativo</label>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Unidades ===================== */
interface UnidadeFull { id: string; nome: string; tipo: 'PROPRIA' | 'PARCERIA'; cidade: string | null; percentualNos: string | number | null; marcaPadraoId: string | null; ativo: boolean; }
const uniVazia = { id: '', nome: '', tipo: 'PROPRIA' as 'PROPRIA' | 'PARCERIA', cidade: '', percentual: '65', marcaPadraoId: '', ativo: true };
function SecaoUnidades() {
  const [unidades, setUnidades] = useState<UnidadeFull[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(uniVazia);
  const [salvando, setSalvando] = useState(false);
  const mById = useMemo(() => new Map(marcas.map((m) => [m.id, m.nome])), [marcas]);

  async function carregar() {
    setCarregando(true);
    try {
      const [u, m] = await Promise.all([getJSON('/api/financeiro/unidades/gestao'), getJSON('/api/financeiro/marcas')]);
      setUnidades(u || []); setMarcas(m || []);
    } catch (e: any) { toast.error(e.message || 'Falha'); } finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  function abrirNova() { setForm(uniVazia); setModal(true); }
  function editar(u: UnidadeFull) {
    setForm({ id: u.id, nome: u.nome, tipo: u.tipo, cidade: u.cidade || '', percentual: u.percentualNos ? String(Math.round(Number(u.percentualNos) * 100)) : '65', marcaPadraoId: u.marcaPadraoId || '', ativo: u.ativo });
    setModal(true);
  }
  async function salvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome.');
    setSalvando(true);
    try {
      const body: any = { nome: form.nome.trim(), tipo: form.tipo, cidade: form.cidade || null, ativo: form.ativo, marcaPadraoId: form.marcaPadraoId || null };
      if (form.tipo === 'PARCERIA') body.percentualNos = (Number(form.percentual) || 0) / 100;
      if (form.id) await sendJSON(`/api/financeiro/unidades/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/unidades', 'POST', body);
      toast.success('Unidade salva'); setModal(false); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setSalvando(false); }
  }
  async function alternar(u: UnidadeFull) {
    try { await sendJSON(`/api/financeiro/unidades/${u.id}`, 'PATCH', { ativo: !u.ativo }); carregar(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(u: UnidadeFull) {
    if (!confirm(`Excluir a unidade "${u.nome}"?`)) return;
    try {
      const r = await fetch(`/api/financeiro/unidades/${u.id}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || d.message || 'Erro');
      toast.success('Excluída'); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>Unidades</h2>
        <span className="pill">{unidades.filter((u) => u.ativo).length} ativas</span>
        <span className="fin-spacer" />
        <button className="fin-btn primary sm" onClick={abrirNova}>+ Nova unidade</button>
      </div>
      <div className="fin-tbl-scroll">
        <table className="fin-tbl">
          <thead><tr><th>Unidade</th><th>Tipo</th><th className="num">Split (nosso)</th><th>Marca padrão</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={6} className="fin-empty">Carregando…</td></tr>}
            {!carregando && unidades.map((u) => (
              <tr key={u.id} style={{ opacity: u.ativo ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>{u.nome}{u.cidade && <span className="pc-sub"> · {u.cidade}</span>}</td>
                <td>{u.tipo === 'PARCERIA' ? <span className="pill">parceria</span> : <span className="pill okp">própria</span>}</td>
                <td className="num">{u.tipo === 'PARCERIA' && u.percentualNos ? `${Math.round(Number(u.percentualNos) * 100)}%` : '—'}</td>
                <td>{u.marcaPadraoId ? mById.get(u.marcaPadraoId) : '—'}</td>
                <td>{u.ativo ? <span className="pill okp">ativa</span> : <span className="pill">inativa</span>}</td>
                <td className="cad-acao">
                  <button className="fin-btn sm" onClick={() => editar(u)}>Editar</button>{' '}
                  <button className="fin-btn sm" onClick={() => alternar(u)}>{u.ativo ? 'Desativar' : 'Ativar'}</button>{' '}
                  <button className="fin-btn sm ghost" onClick={() => excluir(u)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head"><h3>{form.id ? 'Editar unidade' : 'Nova unidade'}</h3></div>
            <div className="fin-modal-body">
              <div className="row2">
                <div className="f"><label>Nome</label><input className="fin-ctl" value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="ex.: Sede" /></div>
                <div className="f"><label>Cidade</label><input className="fin-ctl" value={form.cidade} onChange={(e) => setForm((s) => ({ ...s, cidade: e.target.value }))} placeholder="Fortaleza" /></div>
              </div>
              <div className="row3">
                <div className="f"><label>Tipo</label>
                  <select className="fin-ctl" value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value as any }))}>
                    <option value="PROPRIA">Própria</option><option value="PARCERIA">Parceria</option>
                  </select></div>
                {form.tipo === 'PARCERIA' && (
                  <div className="f"><label>% que fica conosco</label>
                    <input type="number" min={0} max={100} className="fin-ctl" value={form.percentual} onChange={(e) => setForm((s) => ({ ...s, percentual: e.target.value }))} /></div>
                )}
                <div className="f"><label>Marca padrão</label>
                  <select className="fin-ctl" value={form.marcaPadraoId} onChange={(e) => setForm((s) => ({ ...s, marcaPadraoId: e.target.value }))}>
                    <option value="">— nenhuma —</option>
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select></div>
              </div>
              <label className="fin-switch"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} /> Unidade ativa</label>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Contatos ===================== */
interface ContatoFull { id: string; nome: string; documento: string | null; tipo: string | null; crmv?: string | null; telefone?: string | null; email?: string | null; pixChave?: string | null; ativo: boolean; }
const contatoVazio = { id: '', nome: '', documento: '', tipo: 'Fornecedor', crmv: '', telefone: '', email: '', pixChave: '', ativo: true };
const TIPOS_CONTATO = ['Fornecedor', 'Veterinário parceiro', 'Cliente', 'Ambos'];
function SecaoContatos() {
  const [itens, setItens] = useState<ContatoFull[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(contatoVazio);
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try { setItens((await getJSON('/api/financeiro/contatos')) || []); }
    catch (e: any) { toast.error(e.message || 'Falha'); } finally { setCarregando(false); }
  }
  useEffect(() => { carregar(); }, []);

  function abrirNovo() { setForm(contatoVazio); setModal(true); }
  function editar(c: ContatoFull) { setForm({ id: c.id, nome: c.nome, documento: c.documento || '', tipo: c.tipo || 'Fornecedor', crmv: c.crmv || '', telefone: c.telefone || '', email: c.email || '', pixChave: c.pixChave || '', ativo: c.ativo }); setModal(true); }
  async function salvar() {
    if (!form.nome.trim()) return toast.error('Informe o nome.');
    setSalvando(true);
    try {
      const body = {
        nome: form.nome.trim(), documento: form.documento || null, tipo: form.tipo,
        crmv: form.crmv.trim() || null, telefone: form.telefone.trim() || null,
        email: form.email.trim() || null, pixChave: form.pixChave.trim() || null,
        ativo: form.ativo,
      };
      if (form.id) await sendJSON(`/api/financeiro/contatos/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/contatos', 'POST', body);
      toast.success('Contato salvo'); setModal(false); carregar();
    } catch (e: any) { toast.error(e.message || 'Erro'); } finally { setSalvando(false); }
  }
  async function alternar(c: ContatoFull) {
    try { await sendJSON(`/api/financeiro/contatos/${c.id}`, 'PATCH', { ativo: !c.ativo }); carregar(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  }
  async function excluir(c: ContatoFull) {
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    try { await fetch(`/api/financeiro/contatos/${c.id}`, { method: 'DELETE' }); toast.success('Excluído'); carregar(); }
    catch (e: any) { toast.error(e.message || 'Erro'); }
  }

  return (
    <div className="fin-card">
      <div className="fin-card-head">
        <h2>Contatos</h2>
        <span className="pill">{itens.filter((i) => i.ativo).length} ativos</span>
        <span className="fin-spacer" />
        <button className="fin-btn primary sm" onClick={abrirNovo}>+ Novo contato</button>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', padding: '10px 16px 0' }}>Fornecedores e clientes. Dado sensível — guardado só no financeiro.</div>
      <div className="fin-tbl-scroll">
        <table className="fin-tbl">
          <thead><tr><th>Nome</th><th>Tipo</th><th>Documento</th><th>Situação</th><th></th></tr></thead>
          <tbody>
            {carregando && <tr><td colSpan={5} className="fin-empty">Carregando…</td></tr>}
            {!carregando && itens.length === 0 && <tr><td colSpan={5} className="fin-empty">Nenhum contato ainda.</td></tr>}
            {!carregando && itens.map((c) => {
              const sub = [c.telefone, c.crmv, c.pixChave && `PIX ${c.pixChave}`].filter(Boolean).join(' · ');
              return (
              <tr key={c.id} style={{ opacity: c.ativo ? 1 : 0.5 }}>
                <td style={{ fontWeight: 500 }}>
                  {c.nome}
                  {sub && <div style={{ fontSize: 11, color: 'var(--text2)', fontWeight: 400 }}>{sub}</div>}
                </td>
                <td>{c.tipo ? <span className="pill">{c.tipo}</span> : '—'}</td>
                <td>{c.documento || '—'}</td>
                <td>{c.ativo ? <span className="pill okp">ativo</span> : <span className="pill">inativo</span>}</td>
                <td className="cad-acao">
                  <button className="fin-btn sm" onClick={() => editar(c)}>Editar</button>{' '}
                  <button className="fin-btn sm" onClick={() => alternar(c)}>{c.ativo ? 'Desativar' : 'Ativar'}</button>{' '}
                  <button className="fin-btn sm ghost" onClick={() => excluir(c)}>Excluir</button>
                </td>
              </tr>
            );})}
          </tbody>
        </table>
      </div>
      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="fin-modal-head"><h3>{form.id ? 'Editar contato' : 'Novo contato'}</h3></div>
            <div className="fin-modal-body">
              <div className="f"><label>Nome</label><input className="fin-ctl" value={form.nome} onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))} placeholder="ex.: Agrovet Distribuidora / Dra. Fulana" /></div>
              <div className="row2">
                <div className="f"><label>Tipo</label>
                  <select className="fin-ctl" value={form.tipo} onChange={(e) => setForm((s) => ({ ...s, tipo: e.target.value }))}>
                    {TIPOS_CONTATO.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <div className="f"><label>CNPJ / CPF (opcional)</label><input className="fin-ctl" value={form.documento} onChange={(e) => setForm((s) => ({ ...s, documento: e.target.value }))} /></div>
              </div>
              <div className="row2">
                <div className="f"><label>CRMV <span style={{ color: 'var(--text3)', fontWeight: 400 }}>(veterinário)</span></label>
                  <input className="fin-ctl" value={form.crmv} onChange={(e) => setForm((s) => ({ ...s, crmv: e.target.value }))} placeholder="ex.: CRMV-SP 12345" /></div>
                <div className="f"><label>Telefone</label>
                  <input className="fin-ctl" value={form.telefone} onChange={(e) => setForm((s) => ({ ...s, telefone: e.target.value }))} placeholder="(11) 99999-9999" /></div>
              </div>
              <div className="row2">
                <div className="f"><label>E-mail</label>
                  <input className="fin-ctl" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="nome@email.com" /></div>
                <div className="f"><label>Chave PIX</label>
                  <input className="fin-ctl" value={form.pixChave} onChange={(e) => setForm((s) => ({ ...s, pixChave: e.target.value }))} placeholder="CPF/CNPJ, e-mail, telefone…" /></div>
              </div>
              <label className="fin-switch"><input type="checkbox" checked={form.ativo} onChange={(e) => setForm((s) => ({ ...s, ativo: e.target.checked }))} /> Ativo</label>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== CSS (escopado em .fin-root) ===================== */
const CAD_CSS = `
.fin-root .cad-painel{ display:grid; grid-template-columns:230px 1fr; gap:14px; align-items:start; }
.fin-root .cad-menu{ background:#fff; border:1px solid var(--line); border-radius:13px; padding:8px; box-shadow:0 1px 2px rgba(52,50,46,.04); position:sticky; top:12px; }
.fin-root .cad-grp{ font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--text3); font-weight:600; padding:10px 12px 4px; }
.fin-root .cad-menu a{ display:flex; align-items:center; gap:9px; padding:9px 12px; border-radius:9px; font-size:13.5px; color:var(--text2); cursor:pointer; }
.fin-root .cad-menu a .ic{ width:18px; text-align:center; }
.fin-root .cad-menu a:hover{ background:var(--soft, #FBF9F4); }
.fin-root .cad-menu a.on{ background:var(--tint); color:var(--navy); font-weight:500; }
.fin-root .cad-soon{ margin-left:auto; font-size:9.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); background:#F3F1EC; padding:2px 6px; border-radius:999px; }
.fin-root .cad-acao{ text-align:right; white-space:nowrap; }
.fin-root .pill.okp{ background:var(--green-bg); color:var(--green); }
.fin-root .pill.despp{ background:var(--coral-bg); color:var(--coral); }
.fin-root .pc-grupo{ border-top:1px solid var(--line-soft); }
.fin-root .pc-grupo-head{ display:flex; align-items:center; gap:10px; padding:11px 16px; cursor:pointer; background:var(--soft, #FBF9F4); }
.fin-root .pc-grupo-head:hover{ background:#F5F1E8; }
.fin-root .pc-tog{ color:var(--primary); font-size:11px; width:12px; }
.fin-root .pc-gnome{ font-weight:500; font-size:13.5px; }
.fin-root .pc-sub{ font-size:11.5px; color:var(--text3); }
.fin-root .pc-tbl th{ background:#fff; }
.fin-root .pc-tbl td:first-child{ padding-left:34px; }
.fin-root .tx-alq{ width:64px; font-size:13px; border:1px solid var(--line); border-radius:7px; padding:3px 6px; text-align:right; font-variant-numeric:tabular-nums; background:#fff; color:var(--text1); }
.fin-root .tx-alq:focus{ outline:2px solid var(--primary); outline-offset:1px; }
@media (max-width:820px){ .fin-root .cad-painel{ grid-template-columns:1fr; } .fin-root .cad-menu{ position:static; } }
`;
