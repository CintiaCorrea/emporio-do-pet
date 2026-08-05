'use client';

import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

/* ===================== tipos ===================== */
interface ItemFatura {
  id: string;
  descricao: string;
  dataServico: string;
  custoCentavos: number;
}
interface Fatura {
  id: string;
  fornecedorId: string;
  fornecedorNome: string;
  competencia: string;
  diaFechamento: number | null;
  vencimento: string | null;
  totalCentavos: number;
  qtdItens: number;
  itens: ItemFatura[];
}
interface Parceiro {
  id: string;
  fornecedorNome?: string;
  descricao: string;
  dataServico: string;
  custoCentavos: number;
  vencimento: string;
  pago: boolean;
  lancamentoId: string | null;
}
interface Overview {
  resumo: {
    previsaoFornecedoresCentavos: number;
    faturasAbertas: number;
    proximoFechamento: { fornecedorNome: string; vencimento: string | null; totalCentavos: number } | null;
    parceirosPagosCentavos: number;
    parceirosAPagarCentavos: number;
    parceirosQtd: number;
  };
  faturas: Fatura[];
  parceiros: Parceiro[];
}
interface Conta { id: string; nome: string; }

/* ===================== helpers ===================== */
const fmtDia = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
const fmtMes = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
function diasAte(iso: string | null): number | null {
  if (!iso) return null;
  const hoje = new Date();
  const h = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const alvo = new Date(iso);
  const a = Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth(), alvo.getUTCDate());
  return Math.round((a - h) / 86400000);
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

/* ===================== página ===================== */
export default function FornecedoresPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [expandida, setExpandida] = useState<string | null>(null);

  // modal de fechamento
  const [fecharAlvo, setFecharAlvo] = useState<Fatura | null>(null);
  const [contaId, setContaId] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const ov = await getJSON('/api/financeiro/fornecedores');
      setData(ov);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao carregar');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    getJSON('/api/financeiro/contas').then((c) => setContas(c || [])).catch(() => {});
  }, []);

  async function reprocessar() {
    try {
      const r = await sendJSON('/api/financeiro/fornecedores/processar', 'POST');
      const total = (r?.itensLab ?? 0) + (r?.parceirosDMais1 ?? 0);
      toast.success(total > 0 ? `${total} novo(s) item(ns) do caixa processado(s)` : 'Tudo já estava em dia');
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao processar');
    }
  }

  function abrirFechar(f: Fatura) {
    setFecharAlvo(f);
    setContaId('');
    setVencimento(f.vencimento ? f.vencimento.slice(0, 10) : '');
  }
  async function confirmarFechar() {
    if (!fecharAlvo) return;
    setSalvando(true);
    try {
      await sendJSON(`/api/financeiro/fornecedores/faturas/${fecharAlvo.id}/fechar`, 'POST', {
        contaId: contaId || undefined,
        vencimento: vencimento || undefined,
      });
      toast.success('Fatura fechada — conta a pagar gerada na agenda');
      setFecharAlvo(null);
      carregar();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao fechar');
    } finally {
      setSalvando(false);
    }
  }

  const r = data?.resumo;
  const faturas = data?.faturas ?? [];
  const parceiros = data?.parceiros ?? [];
  const proxDias = useMemo(() => diasAte(r?.proximoFechamento?.vencimento ?? null), [r]);

  return (
    <div className="fin-root">
      <FinTabs
        active="fornecedores"
        right={<button className="fin-btn" onClick={reprocessar}>↻ Atualizar do caixa</button>}
      />

      {/* explicação curta */}
      <div className="frn-nota">
        As contas de <b style={{ fontWeight: 500 }}>laboratório</b> e <b style={{ fontWeight: 500 }}>parceiro</b> nascem
        sozinhas das vendas do caixa. Laboratório <b style={{ fontWeight: 500 }}>acumula</b> até o dia de fechamento;
        parceiro vira um a-pagar <b style={{ fontWeight: 500 }}>D+1</b>.
      </div>

      {/* KPIs */}
      <div className="frn-kpis">
        <div className="frn-kpi info">
          <small>Previsão a pagar — fornecedores</small>
          <b>{fmtBRL(r?.previsaoFornecedoresCentavos ?? 0)}</b>
          <div className="d">soma das faturas em aberto</div>
        </div>
        <div className="frn-kpi alert">
          <small>Próximo fechamento</small>
          <b>{r?.proximoFechamento?.vencimento ? fmtDia(r.proximoFechamento.vencimento) : '—'}</b>
          <div className="d">
            {r?.proximoFechamento
              ? `${r.proximoFechamento.fornecedorNome} · ${fmtBRL(r.proximoFechamento.totalCentavos)}`
              : 'nenhuma fatura aberta'}
            {proxDias !== null && proxDias >= 0 && proxDias <= 7 ? ` · em ${proxDias}d` : ''}
          </div>
        </div>
        <div className="frn-kpi ok">
          <small>Parceiros pagos no mês (D+1)</small>
          <b>{fmtBRL(r?.parceirosPagosCentavos ?? 0)}</b>
          <div className="d">{r?.parceirosQtd ?? 0} atendimento(s) no mês</div>
        </div>
        <div className="frn-kpi">
          <small>Faturas em aberto</small>
          <b>{r?.faturasAbertas ?? 0}</b>
          <div className="d">laboratórios acumulando</div>
        </div>
      </div>

      {/* faturas em aberto */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Faturas em aberto — laboratórios (acumulando)</h2>
          <span className="pill marca">lote mensal</span>
          <span className="fin-spacer" />
          <span className="pill">config vem do cadastro de Fornecedor</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Laboratório</th>
                <th className="num">Exames</th>
                <th className="num">Acumulado (previsão)</th>
                <th>Fecha dia</th>
                <th>Vira a pagar em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={6} className="fin-empty">Carregando…</td></tr>}
              {!carregando && faturas.length === 0 && (
                <tr><td colSpan={6} className="fin-empty">Nenhuma fatura em aberto. Assim que houver exames de laboratório vendidos no caixa, eles aparecem aqui. 🧾</td></tr>
              )}
              {!carregando && faturas.map((f) => {
                const aberta = expandida === f.id;
                const d = diasAte(f.vencimento);
                return (
                  <Fragment key={f.id}>
                    <tr>
                      <td>
                        <div className="desc">{f.fornecedorNome}</div>
                        <div className="sub">competência {fmtMes(f.competencia)}</div>
                      </td>
                      <td className="num">{f.qtdItens}</td>
                      <td className="num frn-prev">{fmtBRL(f.totalCentavos)}</td>
                      <td>{f.diaFechamento ?? '—'}</td>
                      <td className="dt">
                        {fmtDia(f.vencimento)}
                        {d !== null && d >= 0 && d <= 3 && <span className="pill hj" style={{ marginLeft: 6 }}>em {d}d</span>}
                        {d !== null && d < 0 && <span className="pill vencido" style={{ marginLeft: 6 }}>passou</span>}
                      </td>
                      <td className="acoes">
                        <button className="fin-btn sm" onClick={() => setExpandida(aberta ? null : f.id)}>
                          {aberta ? '▾ exames' : '▸ exames'}
                        </button>
                        <button className="fin-btn primary sm" onClick={() => abrirFechar(f)}>Fechar agora</button>
                      </td>
                    </tr>
                    {aberta && f.itens.map((it) => (
                      <tr key={it.id} className="frn-filho">
                        <td colSpan={2}>{fmtDia(it.dataServico)} · {it.descricao}</td>
                        <td className="num">{fmtBRL(it.custoCentavos)}</td>
                        <td colSpan={3}></td>
                      </tr>
                    ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="frn-rodape">
          No dia do fechamento, a fatura vira <b style={{ fontWeight: 500 }}>uma conta a pagar</b> na agenda. Quando o boleto chegar,
          é só conferir — o valor já bate. Você também pode <b style={{ fontWeight: 500 }}>fechar antes</b> (boleto adiantado).
        </p>
      </div>

      {/* parceiros D+1 */}
      <div className="fin-card">
        <div className="fin-card-head">
          <h2>Parceiros — a pagar gerado na hora (D+1, valor fixo)</h2>
          <span className="pill hj">imediato</span>
        </div>
        <div className="fin-tbl-scroll">
          <table className="fin-tbl">
            <thead>
              <tr>
                <th>Data</th><th>Parceiro</th><th>Serviço · cliente</th>
                <th className="num">Valor fixo</th><th>Vencimento</th><th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {carregando && <tr><td colSpan={6} className="fin-empty">Carregando…</td></tr>}
              {!carregando && parceiros.length === 0 && (
                <tr><td colSpan={6} className="fin-empty">Nenhum atendimento de parceiro no mês.</td></tr>
              )}
              {!carregando && parceiros.map((p) => (
                <tr key={p.id}>
                  <td className="dt">{fmtDia(p.dataServico)}</td>
                  <td className="desc">{p.fornecedorNome || '—'}</td>
                  <td>{p.descricao}</td>
                  <td className="num">{fmtBRL(p.custoCentavos)}</td>
                  <td className="dt venc">{fmtDia(p.vencimento)}</td>
                  <td>
                    {p.pago
                      ? <span className="pill rec">✓ pago</span>
                      : <span className="pill vencido">a pagar</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="frn-rodape">
          Cada atendimento de parceiro no caixa vira um a-pagar no dia seguinte, pelo valor fixo do serviço.
          Eles também aparecem em <Link href="/dashboard/financeiro/agenda" className="frn-link">A pagar/receber</Link>.
        </p>
      </div>

      {/* modal fechar fatura */}
      {fecharAlvo && (
        <div className="fin-overlay" onClick={() => !salvando && setFecharAlvo(null)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fin-modal-head"><h3>Fechar fatura — {fecharAlvo.fornecedorNome}</h3></div>
            <div className="fin-modal-body">
              <div className="frn-resumo">
                <div><span>Competência</span><b>{fmtMes(fecharAlvo.competencia)}</b></div>
                <div><span>Exames</span><b>{fecharAlvo.qtdItens}</b></div>
                <div><span>Total a pagar</span><b>{fmtBRL(fecharAlvo.totalCentavos)}</b></div>
              </div>
              <div className="row2">
                <div className="f">
                  <label>Vencimento</label>
                  <input type="date" className="fin-ctl" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
                  <div className="hint">padrão: dia de fechamento do fornecedor</div>
                </div>
                <div className="f">
                  <label>Conta (de onde vai pagar)</label>
                  <select className="fin-ctl" value={contaId} onChange={(e) => setContaId(e.target.value)}>
                    <option value="">— usar conta padrão —</option>
                    {contas.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              </div>
              <div className="frn-info">A fatura vira uma conta a pagar na agenda. Você pode conferir/ajustar o valor quando o boleto chegar.</div>
            </div>
            <div className="fin-modal-foot">
              <button className="fin-btn" onClick={() => setFecharAlvo(null)} disabled={salvando}>Cancelar</button>
              <button className="fin-btn primary" onClick={confirmarFechar} disabled={salvando}>
                {salvando ? 'Fechando…' : 'Fechar e gerar a pagar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{FRN_CSS}</style>
    </div>
  );
}

/* ===================== CSS (escopado em .fin-root) ===================== */
const FRN_CSS = `
.fin-root .frn-nota{ background:var(--tint); border:1px solid #CFE9EC; border-radius:12px; padding:10px 14px; font-size:12.5px; color:var(--navy); }
.fin-root .frn-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
.fin-root .frn-kpi{ border:1px solid var(--line); border-radius:12px; padding:14px 16px; box-shadow:0 1px 2px rgba(52,50,46,.04); background:#fff; }
.fin-root .frn-kpi small{ font-size:12px; color:var(--text2); }
.fin-root .frn-kpi b{ display:block; margin-top:4px; font-size:22px; font-weight:500; font-variant-numeric:tabular-nums; }
.fin-root .frn-kpi .d{ font-size:11.5px; color:var(--text3); margin-top:2px; }
.fin-root .frn-kpi.info{ border-color:#CFE9EC; background:var(--tint); }
.fin-root .frn-kpi.info b,.fin-root .frn-kpi.info small{ color:var(--navy); } .fin-root .frn-kpi.info .d{ color:#3E7A85; }
.fin-root .frn-kpi.alert{ border-color:#E7D4A8; background:var(--gold-bg); }
.fin-root .frn-kpi.alert b,.fin-root .frn-kpi.alert small{ color:var(--gold); } .fin-root .frn-kpi.alert .d{ color:#93701a; }
.fin-root .frn-kpi.ok{ border-color:#BFE6CF; background:var(--green-bg); }
.fin-root .frn-kpi.ok b,.fin-root .frn-kpi.ok small{ color:var(--green); } .fin-root .frn-kpi.ok .d{ color:#2c6b47; }
.fin-root .frn-prev{ color:var(--green); font-weight:500; }
.fin-root tr.frn-filho td{ background:#FBF9F4; font-size:12.5px; color:var(--text2); padding-top:7px; padding-bottom:7px; }
.fin-root tr.frn-filho td:first-child{ padding-left:30px; }
.fin-root .frn-rodape{ font-size:12px; color:var(--text3); padding:10px 16px; }
.fin-root .frn-link{ color:var(--primary); }
.fin-root .frn-resumo{ display:grid; grid-template-columns:repeat(3,1fr); gap:10px; background:#FBF9F4; border:1px solid var(--lineSoft); border-radius:10px; padding:12px; }
.fin-root .frn-resumo span{ font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:var(--text3); display:block; }
.fin-root .frn-resumo b{ font-size:15px; font-weight:500; color:var(--text1); font-variant-numeric:tabular-nums; }
.fin-root .frn-info{ font-size:12px; color:var(--text2); background:var(--tint); border-radius:9px; padding:9px 12px; }
@media (max-width:900px){ .fin-root .frn-kpis{ grid-template-columns:repeat(2,1fr); } .fin-root .frn-resumo{ grid-template-columns:1fr; } }
`;
