'use client';
// 🏥 Convênios a receber — espelho do painel de Fornecedores (a pagar), lado RECEITA.
// Vendas marcadas como convênio acumulam numa fatura mensal por convênio; ao "fechar o mês"
// vira uma conta a receber (vencimento = dia de fechamento do convênio).
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FinTabs, FIN_CSS, fmtBRL } from '../fin-ui';

const fmtD = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');
const fmtMes = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : '—');

interface FaturaItem { id: string; descricao: string; dataServico: string; valorCentavos: number; }
interface Fatura { id: string; convenioId: string; convenioNome: string; competencia: string; diaFechamento: number | null; vencimento: string | null; totalCentavos: number; qtdItens: number; itens: FaturaItem[]; }
interface Fechada { id: string; convenioNome: string; competencia: string; vencimento: string | null; totalCentavos: number; qtdItens: number; lancamentoId: string | null; pago: boolean; }
interface Overview {
  resumo: { previsaoConvenioCentavos: number; faturasAbertas: number; proximoFechamento: { convenioNome: string; vencimento: string | null; totalCentavos: number } | null; aReceberCentavos: number; recebidoCentavos: number };
  faturas: Fatura[]; fechadas: Fechada[];
}

export default function ConveniosPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState<string | null>(null);
  const [fechando, setFechando] = useState<string | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const r = await fetch('/api/financeiro/convenios', { cache: 'no-store' });
      const d = await r.json();
      setData(d && d.resumo ? d : { resumo: { previsaoConvenioCentavos: 0, faturasAbertas: 0, proximoFechamento: null, aReceberCentavos: 0, recebidoCentavos: 0 }, faturas: [], fechadas: [] });
    } catch { toast.error('Erro ao carregar convênios'); }
    finally { setLoading(false); }
  }
  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, []);

  const [recebendo, setRecebendo] = useState<string | null>(null);
  async function receberFatura(f: Fechada) {
    if (!f.lancamentoId) { toast.error('Fatura sem lançamento a receber'); return; }
    if (!window.confirm(`Marcar como RECEBIDO o pagamento de ${f.convenioNome} (${fmtBRL(f.totalCentavos)})? Baixa a conta a receber.`)) return;
    setRecebendo(f.id);
    try {
      const hoje = new Date().toISOString().slice(0, 10);
      const r = await fetch(`/api/financeiro/lancamentos/${f.lancamentoId}/baixar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dataPagamento: hoje }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || 'Erro'); }
      toast.success('Recebimento do convênio registrado');
      await carregar();
    } catch (e: any) { toast.error(e.message || 'Erro ao dar baixa'); }
    finally { setRecebendo(null); }
  }

  async function fecharMes(f: Fatura) {
    if (!window.confirm(`Fechar a fatura de ${f.convenioNome} (${fmtMes(f.competencia)}) — ${fmtBRL(f.totalCentavos)}? Vira uma conta a RECEBER com vencimento ${fmtD(f.vencimento)}.`)) return;
    setFechando(f.id);
    try {
      const r = await fetch(`/api/financeiro/convenios/faturas/${f.id}/fechar`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.message || 'Erro');
      toast.success('Fatura fechada — conta a receber gerada');
      await carregar();
    } catch (e: any) { toast.error(e.message || 'Erro ao fechar a fatura'); }
    finally { setFechando(null); }
  }

  const cards = useMemo(() => {
    const r = data?.resumo;
    return [
      { label: 'Previsão (em aberto)', n: fmtBRL(r?.previsaoConvenioCentavos || 0), sub: `${r?.faturasAbertas || 0} fatura(s) acumulando`, cor: '#014D5E' },
      { label: 'Próximo fechamento', n: r?.proximoFechamento ? fmtBRL(r.proximoFechamento.totalCentavos) : '—', sub: r?.proximoFechamento ? `${r.proximoFechamento.convenioNome} · vence ${fmtD(r.proximoFechamento.vencimento)}` : 'nada a fechar', cor: '#B26A00' },
      { label: 'A receber (fechadas)', n: fmtBRL(r?.aReceberCentavos || 0), sub: 'faturas fechadas ainda não pagas', cor: '#00798A' },
      { label: 'Recebido no mês', n: fmtBRL(r?.recebidoCentavos || 0), sub: 'convênios que já pagaram', cor: '#0F6E56' },
    ];
  }, [data]);

  return (
    <div className="fin-root">
      <FinTabs active="convenios" right={<button onClick={carregar} className="cv-refresh">↻ Atualizar</button>} />

      <p className="cv-nota">As vendas marcadas como convênio (o pet tem o convênio e o item está na tabela dele) acumulam aqui por mês. Ao <b>fechar o mês</b>, a fatura vira uma conta <b>a receber</b> com vencimento no dia de fechamento do convênio.</p>

      <div className="cv-kpis">
        {cards.map((c, i) => (
          <div key={i} className="cv-kpi">
            <div className="cv-kpi-l">{c.label}</div>
            <div className="cv-kpi-n" style={{ color: c.cor }}>{c.n}</div>
            <div className="cv-kpi-s">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="fin-card">
        <div className="fin-card-head"><h2>Faturas em aberto (acumulando este mês)</h2></div>
        {loading && <div className="cv-empty">Carregando…</div>}
        {!loading && (!data || data.faturas.length === 0) && <div className="cv-empty">Nenhuma venda de convênio ainda. Marque uma venda como convênio no atendimento para ela aparecer aqui.</div>}
        {!loading && data && data.faturas.map((f) => (
          <div key={f.id} className="cv-fat">
            <div className="cv-fat-row">
              <button onClick={() => setAberta(aberta === f.id ? null : f.id)} className="cv-fat-btn">
                <div className="cv-fat-nome">{aberta === f.id ? '▾' : '▸'} {f.convenioNome} <span className="cv-fat-mes">{fmtMes(f.competencia)}</span></div>
                <div className="cv-fat-sub">{f.qtdItens} item(ns) · fecha dia {f.diaFechamento ?? '—'} · vence {fmtD(f.vencimento)}</div>
              </button>
              <div className="cv-fat-total">{fmtBRL(f.totalCentavos)}</div>
              <button onClick={() => fecharMes(f)} disabled={fechando === f.id} className="cv-fechar">{fechando === f.id ? '…' : 'Fechar mês → a receber'}</button>
            </div>
            {aberta === f.id && (
              <table className="cv-itens">
                <tbody>
                  {f.itens.map((i) => (
                    <tr key={i.id}>
                      <td>{i.descricao}</td>
                      <td className="cv-td-data">{fmtD(i.dataServico)}</td>
                      <td className="cv-td-val">{fmtBRL(i.valorCentavos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
      </div>

      {!loading && data && data.fechadas.length > 0 && (
        <div className="fin-card">
          <div className="fin-card-head"><h2>Faturas fechadas (a receber) — mês corrente</h2></div>
          <table className="cv-tab">
            <thead><tr><th>Convênio</th><th>Competência</th><th>Vencimento</th><th className="cv-td-val">Total</th><th>Situação</th><th className="cv-td-val">Ação</th></tr></thead>
            <tbody>
              {data.fechadas.map((f) => (
                <tr key={f.id}>
                  <td className="cv-nome-forte">{f.convenioNome}</td>
                  <td>{fmtMes(f.competencia)}</td>
                  <td>{fmtD(f.vencimento)}</td>
                  <td className="cv-td-val">{fmtBRL(f.totalCentavos)}</td>
                  <td><span className={`cv-badge ${f.pago ? 'ok' : 'wait'}`}>{f.pago ? '✅ Recebido' : '⏳ A receber'}</span></td>
                  <td className="cv-td-val">{!f.pago && <button onClick={() => receberFatura(f)} disabled={recebendo === f.id} className="cv-receber">{recebendo === f.id ? '…' : '✅ Marcar recebido'}</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{FIN_CSS}</style>
      <style>{CV_CSS}</style>
    </div>
  );
}

const CV_CSS = `
.fin-root .cv-refresh{ border:1px solid #E8DFC8; background:#fff; color:#5C6B70; border-radius:8px; padding:6px 12px; font-size:13px; cursor:pointer; }
.fin-root .cv-nota{ background:var(--tint); border:1px solid #CFE9EC; border-radius:12px; padding:10px 14px; font-size:12.5px; color:var(--navy); margin:10px 0 14px; }
.fin-root .cv-kpis{ display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:16px; }
@media (max-width:820px){ .fin-root .cv-kpis{ grid-template-columns:repeat(2,1fr); } }
.fin-root .cv-kpi{ background:#fff; border:1px solid #E8DFC8; border-radius:12px; padding:13px 15px; }
.fin-root .cv-kpi-l{ font-size:11px; color:#8a8f8b; margin-bottom:4px; }
.fin-root .cv-kpi-n{ font-size:19px; font-weight:600; font-variant-numeric:tabular-nums; }
.fin-root .cv-kpi-s{ font-size:10.5px; color:#a7ada8; margin-top:2px; }
.fin-root .cv-empty{ text-align:center; padding:30px; color:#a7ada8; font-size:13px; }
.fin-root .cv-receber{ font-size:11.5px; font-weight:600; padding:5px 10px; border-radius:8px; background:#0F6E56; color:#fff; border:none; cursor:pointer; white-space:nowrap; }
.fin-root .cv-receber:disabled{ opacity:.5; }
.fin-root .cv-fat{ border-top:1px solid #F0EBE0; }
.fin-root .cv-fat-row{ display:flex; align-items:center; gap:14px; padding:12px 16px; flex-wrap:wrap; }
.fin-root .cv-fat-btn{ flex:1; text-align:left; min-width:180px; background:none; border:none; cursor:pointer; padding:0; }
.fin-root .cv-fat-nome{ font-weight:600; color:var(--navy); display:flex; align-items:center; gap:8px; }
.fin-root .cv-fat-mes{ font-size:11px; color:#a7ada8; font-weight:400; }
.fin-root .cv-fat-sub{ font-size:11.5px; color:#8a8f8b; margin-top:2px; }
.fin-root .cv-fat-total{ font-size:17px; font-weight:600; font-variant-numeric:tabular-nums; color:var(--navy); }
.fin-root .cv-fechar{ font-size:12px; padding:7px 13px; border-radius:8px; background:#0F6E56; color:#fff; font-weight:600; border:none; cursor:pointer; }
.fin-root .cv-fechar:disabled{ opacity:.5; }
.fin-root .cv-itens{ width:100%; border-collapse:collapse; padding:0 16px 12px; font-size:12.5px; }
.fin-root .cv-itens td{ padding:6px 16px; border-top:1px solid #F5F1E8; color:#5C6B70; }
.fin-root .cv-td-data{ color:#a7ada8; white-space:nowrap; font-variant-numeric:tabular-nums; }
.fin-root .cv-td-val{ text-align:right; font-variant-numeric:tabular-nums; color:var(--navy); }
.fin-root .cv-tab{ width:100%; border-collapse:collapse; font-size:13px; }
.fin-root .cv-tab th{ text-align:left; font-size:10.5px; text-transform:uppercase; letter-spacing:.04em; color:#8a8f8b; background:#FBF9F4; padding:8px 16px; }
.fin-root .cv-tab td{ padding:8px 16px; border-top:1px solid #F0EBE0; color:#5C6B70; }
.fin-root .cv-nome-forte{ font-weight:600; color:var(--navy); }
.fin-root .cv-badge{ font-size:10.5px; font-weight:700; padding:2px 8px; border-radius:999px; }
.fin-root .cv-badge.ok{ background:#E7F6EE; color:#0F6E56; }
.fin-root .cv-badge.wait{ background:#FBF1E2; color:#B26A00; }
`;
