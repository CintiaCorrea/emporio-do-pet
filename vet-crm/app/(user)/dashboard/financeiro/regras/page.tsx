'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS } from '../fin-ui';

type Escopo = 'RECEITA' | 'DESPESA' | 'AMBOS';
interface Regra {
  id: string;
  termo: string;
  escopo: Escopo;
  prioridade: number;
  ativo: boolean;
  categoriaId: string | null;
  unidadeId: string | null;
  marcaId: string | null;
  linhaServicoId: string | null;
  contaId: string | null;
}
interface Opt { id: string; nome: string; }

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

const formVazio = {
  id: '' as string,
  termo: '',
  escopo: 'DESPESA' as Escopo,
  prioridade: 0,
  ativo: true,
  categoriaId: '',
  unidadeId: '',
  marcaId: '',
  linhaServicoId: '',
};
type Form = typeof formVazio;

export default function RegrasPage() {
  const [regras, setRegras] = useState<Regra[]>([]);
  const [unidades, setUnidades] = useState<Opt[]>([]);
  const [marcas, setMarcas] = useState<Opt[]>([]);
  const [linhas, setLinhas] = useState<Opt[]>([]);
  const [categorias, setCategorias] = useState<Opt[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Form>(formVazio);
  const [salvando, setSalvando] = useState(false);

  const uById = useMemo(() => new Map(unidades.map((u) => [u.id, u.nome])), [unidades]);
  const mById = useMemo(() => new Map(marcas.map((m) => [m.id, m.nome])), [marcas]);
  const lById = useMemo(() => new Map(linhas.map((l) => [l.id, l.nome])), [linhas]);
  const cById = useMemo(() => new Map(categorias.map((c) => [c.id, c.nome])), [categorias]);

  async function carregar() {
    setCarregando(true);
    try {
      setRegras((await getJSON('/api/financeiro/regras')) || []);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar regras');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const [u, m, l, c] = await Promise.all([
          getJSON('/api/financeiro/unidades'),
          getJSON('/api/financeiro/marcas'),
          getJSON('/api/financeiro/linhas-servico'),
          getJSON('/api/financeiro/categorias'),
        ]);
        setUnidades(u || []); setMarcas(m || []); setLinhas(l || []); setCategorias(c || []);
      } catch (e: any) {
        toast.error(e.message || 'Falha ao carregar cadastros');
      }
    })();
    carregar();
  }, []);

  function abrirNova() {
    setForm(formVazio);
    setModal(true);
  }
  function abrirEdicao(r: Regra) {
    setForm({
      id: r.id, termo: r.termo, escopo: r.escopo, prioridade: r.prioridade, ativo: r.ativo,
      categoriaId: r.categoriaId || '', unidadeId: r.unidadeId || '',
      marcaId: r.marcaId || '', linhaServicoId: r.linhaServicoId || '',
    });
    setModal(true);
  }
  function setF<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function salvar() {
    if (!form.termo.trim()) return toast.error('Informe o termo.');
    setSalvando(true);
    try {
      const body = {
        termo: form.termo.trim(),
        escopo: form.escopo,
        prioridade: Number(form.prioridade) || 0,
        ativo: form.ativo,
        categoriaId: form.categoriaId || null,
        unidadeId: form.unidadeId || null,
        marcaId: form.marcaId || null,
        linhaServicoId: form.linhaServicoId || null,
      };
      if (form.id) await sendJSON(`/api/financeiro/regras/${form.id}`, 'PATCH', body);
      else await sendJSON('/api/financeiro/regras', 'POST', body);
      toast.success('Regra salva');
      setModal(false);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  async function aplicar(r: Regra) {
    try {
      const res = await sendJSON(`/api/financeiro/regras/${r.id}/aplicar`, 'POST');
      toast.success(`${res?.aplicados ?? 0} lançamento(s) classificado(s)`);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao aplicar');
    }
  }
  async function excluir(r: Regra) {
    if (!confirm(`Excluir a regra "${r.termo}"?`)) return;
    try {
      const rr = await fetch(`/api/financeiro/regras/${r.id}`, { method: 'DELETE' });
      if (!rr.ok) throw new Error((await rr.json().catch(() => ({}))).error || 'Erro');
      toast.success('Excluída');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir');
    }
  }

  const escopoPill = (e: Escopo) =>
    e === 'RECEITA' ? <span className="pill rec">receita</span>
      : e === 'DESPESA' ? <span className="pill desp">despesa</span>
        : <span className="pill">receita e despesa</span>;

  return (
    <div className="fin-root">
      <FinTabs
        active="regras"
        right={<button className="fin-btn primary" onClick={abrirNova}>+ Nova regra</button>}
      />

      <div style={{ fontSize: 12.5, color: 'var(--text2)', padding: '0 2px' }}>
        Uma regra diz: <i>“toda vez que a descrição contiver tal termo, já classifique assim”.</i>{' '}
        Vale para receita e despesa. Se dois termos casarem, ganha a de <b style={{ fontWeight: 500 }}>menor prioridade</b>.
      </div>

      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Regras de classificação</h2>
          <span className="pill">{regras.filter((r) => r.ativo).length} ativa(s)</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Quando a descrição contém</th>
                <th>Escopo</th>
                <th>Classifica automaticamente como</th>
                <th className="num">Prio.</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={5} className="fin-empty">Carregando…</td></tr>}
              {!carregando && regras.length === 0 && (
                <tr><td colSpan={5} className="fin-empty">Nenhuma regra ainda. Clique em “+ Nova regra”.</td></tr>
              )}
              {!carregando && regras.map((r) => (
                <tr key={r.id} style={{ opacity: r.ativo ? 1 : 0.5 }}>
                  <td style={{ fontWeight: 500 }}>“{r.termo}”</td>
                  <td>{escopoPill(r.escopo)}</td>
                  <td>
                    {r.categoriaId ? cById.get(r.categoriaId) : <span className="fin-def">sem categoria</span>}
                    {r.unidadeId && <span className="pill">{uById.get(r.unidadeId)}</span>}
                    {r.marcaId && <span className="pill marca">{mById.get(r.marcaId)}</span>}
                    {r.linhaServicoId && <span className="pill">{lById.get(r.linhaServicoId)}</span>}
                  </td>
                  <td className="num">{r.prioridade}</td>
                  <td className="acoes">
                    <button className="fin-btn sm" onClick={() => aplicar(r)}>Aplicar</button>
                    <button className="fin-btn sm" onClick={() => abrirEdicao(r)}>Editar</button>
                    <button className="fin-btn sm ghost" onClick={() => excluir(r)}>Excluir</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fin-overlay" onClick={() => !salvando && setModal(false)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head">
              <h3>{form.id ? 'Editar regra' : 'Nova regra'}</h3>
            </div>
            <div className="fin-modal-body">
              <div className="row2">
                <div className="f">
                  <label>Quando a descrição contiver</label>
                  <input className="fin-ctl" value={form.termo} onChange={(e) => setF('termo', e.target.value)} placeholder="ex.: Enel" />
                  <div className="hint">sem diferenciar maiúscula/acento</div>
                </div>
                <div className="f">
                  <label>Aplicar em</label>
                  <select className="fin-ctl" value={form.escopo} onChange={(e) => setF('escopo', e.target.value as Escopo)}>
                    <option value="DESPESA">Só despesas</option>
                    <option value="RECEITA">Só receitas</option>
                    <option value="AMBOS">Receitas e despesas</option>
                  </select>
                </div>
              </div>

              <div className="f">
                <label>Categoria (plano de contas)</label>
                <select className="fin-ctl" value={form.categoriaId} onChange={(e) => setF('categoriaId', e.target.value)}>
                  <option value="">— não definir —</option>
                  {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>

              <div className="row3">
                <div className="f">
                  <label>Unidade</label>
                  <select className="fin-ctl" value={form.unidadeId} onChange={(e) => setF('unidadeId', e.target.value)}>
                    <option value="">— não mexer —</option>
                    {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Marca</label>
                  <select className="fin-ctl" value={form.marcaId} onChange={(e) => setF('marcaId', e.target.value)}>
                    <option value="">— não mexer —</option>
                    {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
                <div className="f">
                  <label>Linha de serviço</label>
                  <select className="fin-ctl" value={form.linhaServicoId} onChange={(e) => setF('linhaServicoId', e.target.value)}>
                    <option value="">— não mexer —</option>
                    {linhas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </select>
                </div>
              </div>

              <div className="row2">
                <div className="f">
                  <label>Prioridade (menor ganha)</label>
                  <input type="number" className="fin-ctl" value={form.prioridade} onChange={(e) => setF('prioridade', Number(e.target.value))} />
                </div>
                <div className="f">
                  <label>Situação</label>
                  <label className="fin-switch" style={{ marginTop: 4 }}>
                    <input type="checkbox" checked={form.ativo} onChange={(e) => setF('ativo', e.target.checked)} />
                    Regra ativa
                  </label>
                </div>
              </div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setModal(false)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar regra'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
    </div>
  );
}
