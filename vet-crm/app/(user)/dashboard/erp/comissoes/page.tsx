// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/comissoes/page.tsx
// Comissionamento completo no padrao Base44 "delicada".
// 3 abas (Em aberto | Extratos | Minhas comissoes) + drawer de configuracao.
// Consome os endpoints do contrato /api/commissions/*.
'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

// Paleta Base44 "delicada" (mesmos tokens de caixa/page.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const NAVY = '#014D5E';      // marinho (titulos)
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

// ===== Tipos do contrato =====
type Base = 'MARGEM' | 'CHEIO';
type Considerar = 'BAIXADAS' | 'TODAS';
type ExtratoStatus = 'A_PAGAR' | 'PAGO';

interface CommissionConfig {
  base: Base;
  considerar: Considerar;
  abaterTaxaCartao: boolean;
  lancarContasPagar: boolean;
  funcionarioVePropria: boolean;
  comissionados: string[];
}
interface ResumoLinha {
  userId: string;
  nome: string;
  iniciais?: string;
  role?: string;
  itens: number;
  base: number;
  comissao: number;
  pctMedio: number;
}
interface AbertoResponse {
  config?: CommissionConfig;
  baixadasAte?: string;
  resumo: ResumoLinha[];
  totais: { itens: number; base: number; comissao: number };
}
interface ExtratoItem {
  id: string;
  userId: string;
  nome: string;
  iniciais?: string;
  itens: number;
  comissao: number;
  status: ExtratoStatus;
  pagoAt?: string | null;
}
interface FechamentoGrupo {
  fechamentoId: string;
  createdAt: string;
  referencia: string;
  baixadasAte: string;
  total: number;
  extratos: ExtratoItem[];
}
interface MinhaLinha {
  grupo?: string;
  nome?: string;
  data?: string;
  itens: number;
  base: number;
  comissao: number;
  pctMedio: number;
}
interface MinhasResponse {
  resumo: { itens: number; base: number; comissao: number; pctMedio: number };
  porGrupo: MinhaLinha[];
  porProduto: MinhaLinha[];
  porData: MinhaLinha[];
}
interface UsuarioLite { id: string; name: string; email?: string; role?: string }

// ===== Formatadores =====
const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const pct = (v: number) => `${(Number.isFinite(v) ? v : 0).toFixed(1)}%`;
const dataBR = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
const hojeStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
// "2026-06-15" -> "Junho/2026"
const referenciaDe = (ymd: string) => {
  const [y, m] = ymd.split('-');
  const idx = Math.max(0, Math.min(11, Number(m) - 1));
  return `${MESES[idx]}/${y}`;
};
const iniciaisDe = (nome?: string) =>
  (nome || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('') || '?';

// ===== Estilos comuns =====
const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '10px 12px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const thNum: React.CSSProperties = { ...thStyle, textAlign: 'right' };
const tdStyle: React.CSSProperties = { padding: '12px', borderBottom: `1px solid ${DIV}`, color: TXT, fontSize: 13 };
const tdNum: React.CSSProperties = { ...tdStyle, textAlign: 'right' };
const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '16px 18px' };
const inp: React.CSSProperties = { padding: '9px 11px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const btnSec: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TXT2 };
const btnNavy: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', border: 'none', background: NAVY, color: '#fff' };

// Avatar de iniciais
function Avatar({ nome, iniciais }: { nome?: string; iniciais?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: TINT, color: '#014D5E', fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
      {iniciais || iniciaisDe(nome)}
    </span>
  );
}

// KPI card
function Kpi({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <span style={{ fontSize: 15 }}>{emoji}</span>
        <span style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em', color: TXT3 }}>{label}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 500, color: TEAL_DARK, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

// Pill de status
function StatusPill({ status }: { status: ExtratoStatus }) {
  const paga = status === 'PAGO';
  return (
    <span style={{ display: 'inline-flex', padding: '3px 10px', fontSize: 11, fontWeight: 500, borderRadius: 999, background: paga ? '#E1F5EE' : '#FBF3E3', color: paga ? '#0F6E56' : '#8a6400' }}>
      {paga ? 'Pago' : 'A pagar'}
    </span>
  );
}

type TabKey = 'aberto' | 'extratos' | 'minhas';
type SubMinha = 'grupo' | 'produto' | 'data' | 'resumo';

export default function ComissoesPage() {
  usePageTitle('Comissionamento', 'Comissões dos profissionais');

  const [tab, setTab] = useState<TabKey>('aberto');
  const [config, setConfig] = useState<CommissionConfig | null>(null);

  // ---- Aba Em aberto ----
  const [baixadasAte, setBaixadasAte] = useState(hojeStr());
  const [aberto, setAberto] = useState<AbertoResponse | null>(null);
  const [loadingAberto, setLoadingAberto] = useState(false);
  const [fechando, setFechando] = useState(false);

  // ---- Aba Extratos ----
  const [exMonth, setExMonth] = useState('');
  const [exUser, setExUser] = useState('');
  const [exStatus, setExStatus] = useState<'' | ExtratoStatus>('');
  const [extratos, setExtratos] = useState<FechamentoGrupo[]>([]);
  const [loadingExtratos, setLoadingExtratos] = useState(false);

  // ---- Aba Minhas ----
  const [minhasAte, setMinhasAte] = useState(hojeStr());
  const [minhas, setMinhas] = useState<MinhasResponse | null>(null);
  const [loadingMinhas, setLoadingMinhas] = useState(false);
  const [subMinha, setSubMinha] = useState<SubMinha>('grupo');

  // ---- Drawer de config ----
  const [configOpen, setConfigOpen] = useState(false);
  const [cfgDraft, setCfgDraft] = useState<CommissionConfig | null>(null);
  const [usuarios, setUsuarios] = useState<UsuarioLite[]>([]);
  const [savingConfig, setSavingConfig] = useState(false);

  const verPropria = config?.funcionarioVePropria !== false;

  // ===== Carregamento inicial da config (define visibilidade da aba Minhas) =====
  const loadConfig = useCallback(async () => {
    try {
      const r = await fetch('/api/commissions/config', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        if (data && typeof data === 'object') setConfig(data);
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  // ===== Aba Em aberto =====
  const fetchAberto = useCallback(async () => {
    try {
      setLoadingAberto(true);
      const iso = new Date(baixadasAte + 'T23:59:59').toISOString();
      const r = await fetch(`/api/commissions/aberto?baixadasAte=${encodeURIComponent(iso)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar comissões em aberto');
      const data: AbertoResponse = await r.json();
      setAberto(data);
      if (data?.config) setConfig(data.config);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar comissões em aberto');
      setAberto(null);
    } finally {
      setLoadingAberto(false);
    }
  }, [baixadasAte]);

  useEffect(() => { if (tab === 'aberto') fetchAberto(); }, [tab, fetchAberto]);

  const handleFechar = async () => {
    const referencia = referenciaDe(baixadasAte);
    if (!confirm(`Fechar as comissões de ${referencia} (vendas baixadas até ${dataBR(baixadasAte)})?\n\nIsso gera os extratos para pagamento.`)) return;
    try {
      setFechando(true);
      const iso = new Date(baixadasAte + 'T23:59:59').toISOString();
      const r = await fetch('/api/commissions/fechar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baixadasAte: iso, referencia }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.error || err?.message || 'Erro ao fechar comissões');
      }
      toast.success(`Comissões de ${referencia} fechadas!`);
      fetchAberto();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao fechar comissões');
    } finally {
      setFechando(false);
    }
  };

  // ===== Aba Extratos =====
  const fetchExtratos = useCallback(async () => {
    try {
      setLoadingExtratos(true);
      const params = new URLSearchParams();
      if (exMonth) {
        // month input "2026-06" -> from/to do mes
        const [y, m] = exMonth.split('-').map(Number);
        const from = new Date(y, m - 1, 1).toISOString();
        const to = new Date(y, m, 0, 23, 59, 59).toISOString();
        params.set('from', from);
        params.set('to', to);
      }
      if (exUser) params.set('userId', exUser);
      if (exStatus) params.set('status', exStatus);
      const qs = params.toString();
      const r = await fetch(`/api/commissions/extratos${qs ? `?${qs}` : ''}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar extratos');
      const data = await r.json();
      setExtratos(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar extratos');
      setExtratos([]);
    } finally {
      setLoadingExtratos(false);
    }
  }, [exMonth, exUser, exStatus]);

  useEffect(() => { if (tab === 'extratos') fetchExtratos(); }, [tab, fetchExtratos]);

  const handleTogglePago = async (ex: ExtratoItem) => {
    const novo: ExtratoStatus = ex.status === 'A_PAGAR' ? 'PAGO' : 'A_PAGAR';
    try {
      const r = await fetch(`/api/commissions/extratos/${ex.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novo }),
      });
      if (!r.ok) throw new Error('Erro ao atualizar extrato');
      toast.success(novo === 'PAGO' ? 'Marcado como pago!' : 'Extrato reaberto');
      fetchExtratos();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao atualizar extrato');
    }
  };

  // ===== Aba Minhas =====
  const fetchMinhas = useCallback(async () => {
    try {
      setLoadingMinhas(true);
      const iso = new Date(minhasAte + 'T23:59:59').toISOString();
      const r = await fetch(`/api/commissions/minhas?baixadasAte=${encodeURIComponent(iso)}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar minhas comissões');
      const data: MinhasResponse = await r.json();
      setMinhas(data);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar minhas comissões');
      setMinhas(null);
    } finally {
      setLoadingMinhas(false);
    }
  }, [minhasAte]);

  useEffect(() => { if (tab === 'minhas') fetchMinhas(); }, [tab, fetchMinhas]);

  // ===== Drawer de config =====
  const openConfig = async () => {
    setConfigOpen(true);
    // carrega config atual
    try {
      const r = await fetch('/api/commissions/config', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setConfig(data);
        setCfgDraft(data);
      } else {
        setCfgDraft(config);
      }
    } catch {
      setCfgDraft(config);
    }
    // carrega usuarios (comissionaveis)
    try {
      const r = await fetch('/api/users', { cache: 'no-store' });
      if (r.ok) {
        const data = await r.json();
        setUsuarios(Array.isArray(data) ? data : (data?.users || data?.data || []));
      }
    } catch { /* silencioso */ }
  };

  const saveConfig = async () => {
    if (!cfgDraft) return;
    try {
      setSavingConfig(true);
      const r = await fetch('/api/commissions/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cfgDraft),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => null);
        throw new Error(err?.error || err?.message || 'Erro ao salvar configuração');
      }
      toast.success('Configuração salva!');
      setConfig(cfgDraft);
      setConfigOpen(false);
      // recarrega aba atual
      if (tab === 'aberto') fetchAberto();
      else if (tab === 'extratos') fetchExtratos();
      else if (tab === 'minhas') fetchMinhas();
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar configuração');
    } finally {
      setSavingConfig(false);
    }
  };

  const toggleComissionado = (userId: string) => {
    setCfgDraft((prev) => {
      if (!prev) return prev;
      const set = new Set(prev.comissionados || []);
      if (set.has(userId)) set.delete(userId);
      else set.add(userId);
      return { ...prev, comissionados: Array.from(set) };
    });
  };

  // ===== Render de abas =====
  const tabs: { key: TabKey; emoji: string; label: string; show: boolean }[] = [
    { key: 'aberto', emoji: '📂', label: 'Em aberto', show: true },
    { key: 'extratos', emoji: '📁', label: 'Extratos', show: true },
    { key: 'minhas', emoji: '👤', label: 'Minhas comissões', show: verPropria },
  ];

  return (
    <div style={{ minHeight: '100%', background: BG, width: '100%' }}>
      <div style={{ padding: '24px 26px 60px', boxSizing: 'border-box' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>

          {/* Header */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: NAVY, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 22 }}>🧾</span> Comissionamento
            </h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={openConfig} style={btnSec}><span>⚙️</span><span>Configurar</span></button>
              <button onClick={() => window.print()} style={btnSec}><span>🖨️</span><span>Imprimir</span></button>
            </div>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${LINE}`, marginBottom: 22 }}>
            {tabs.filter((t) => t.show).map((t) => {
              const ativo = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '11px 16px', fontSize: 13.5, fontWeight: 500,
                    background: 'none', border: 'none', cursor: 'pointer', color: ativo ? TEAL_DARK : TXT2,
                    borderBottom: ativo ? `2px solid ${TEAL}` : '2px solid transparent', marginBottom: -1,
                  }}
                >
                  <span>{t.emoji}</span><span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* ===================== ABA EM ABERTO ===================== */}
          {tab === 'aberto' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: TXT3, marginBottom: 5, fontWeight: 500 }}>Vendas baixadas até</label>
                  <input type="date" value={baixadasAte} onChange={(e) => setBaixadasAte(e.target.value)} style={inp} />
                </div>
                <button onClick={handleFechar} disabled={fechando} style={{ ...btnNavy, opacity: fechando ? 0.6 : 1 }}>
                  <span>🔒</span><span>{fechando ? 'Fechando...' : 'Fechar comissões do período'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
                <Kpi emoji="💰" label="Total em aberto" value={brl(aberto?.totais?.comissao || 0)} />
                <Kpi emoji="👥" label="Comissionados" value={String(aberto?.resumo?.length || 0)} />
                <Kpi emoji="📦" label="Itens baixados" value={String(aberto?.totais?.itens || 0)} />
              </div>

              {loadingAberto ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 48, color: TXT2 }}>Carregando...</div>
              ) : !aberto || aberto.resumo.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 20px' }}>
                  <div style={{ fontSize: 34 }}>🧾</div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: '12px 0 6px' }}>Nenhuma comissão em aberto</h3>
                  <p style={{ color: TXT2, fontSize: 13.5, maxWidth: 460, margin: '0 auto' }}>
                    Verifique se os profissionais têm % configurado e se há vendas baixadas no período.
                  </p>
                </div>
              ) : (
                <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={thStyle}>Funcionário</th>
                          <th style={thNum}>Itens</th>
                          <th style={thNum}>Base</th>
                          <th style={thNum}>% médio</th>
                          <th style={thNum}>Comissão</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aberto.resumo.map((l) => (
                          <tr key={l.userId}>
                            <td style={tdStyle}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar nome={l.nome} iniciais={l.iniciais} />
                                <div>
                                  <div style={{ fontWeight: 500, color: TXT }}>{l.nome}</div>
                                  {l.role && <div style={{ fontSize: 11.5, color: TXT3 }}>{l.role}</div>}
                                </div>
                              </div>
                            </td>
                            <td style={tdNum}>{l.itens}</td>
                            <td style={tdNum}>{brl(l.base)}</td>
                            <td style={{ ...tdNum, color: TEAL }}>{pct(l.pctMedio)}</td>
                            <td style={{ ...tdNum, fontWeight: 600, color: TEAL_DARK }}>{brl(l.comissao)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td style={{ ...tdStyle, fontWeight: 600, color: TXT, borderBottom: 'none', background: SOFT }}>Total</td>
                          <td style={{ ...tdNum, fontWeight: 600, borderBottom: 'none', background: SOFT }}>{aberto.totais.itens}</td>
                          <td style={{ ...tdNum, fontWeight: 600, borderBottom: 'none', background: SOFT }}>{brl(aberto.totais.base)}</td>
                          <td style={{ ...tdNum, borderBottom: 'none', background: SOFT }}></td>
                          <td style={{ ...tdNum, fontWeight: 700, color: TEAL_DARK, borderBottom: 'none', background: SOFT }}>{brl(aberto.totais.comissao)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===================== ABA EXTRATOS ===================== */}
          {tab === 'extratos' && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 20 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, color: TXT3, marginBottom: 5, fontWeight: 500 }}>Período</label>
                    <input type="month" value={exMonth} onChange={(e) => setExMonth(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, color: TXT3, marginBottom: 5, fontWeight: 500 }}>Funcionário</label>
                    <select value={exUser} onChange={(e) => setExUser(e.target.value)} style={{ ...inp, minWidth: 180 }}>
                      <option value="">Todos</option>
                      {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11.5, color: TXT3, marginBottom: 5, fontWeight: 500 }}>Status</label>
                    <select value={exStatus} onChange={(e) => setExStatus(e.target.value as '' | ExtratoStatus)} style={inp}>
                      <option value="">Todos</option>
                      <option value="A_PAGAR">A pagar</option>
                      <option value="PAGO">Pago</option>
                    </select>
                  </div>
                </div>
              </div>

              {loadingExtratos ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 48, color: TXT2 }}>Carregando...</div>
              ) : extratos.length === 0 ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 20px' }}>
                  <div style={{ fontSize: 34 }}>📁</div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: '12px 0 6px' }}>Nenhum fechamento encontrado</h3>
                  <p style={{ color: TXT2, fontSize: 13.5 }}>Feche um período na aba "Em aberto" para gerar extratos.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {extratos.map((g) => (
                    <div key={g.fechamentoId} style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '13px 16px', background: SOFT, borderBottom: `1px solid ${LINE}` }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: TEAL_DARK }}>
                          🔒 Fechado em {dataBR(g.createdAt)} · {g.referencia}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: TEAL_DARK }}>{brl(g.total)}</div>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>Funcionário</th>
                              <th style={thNum}>Itens</th>
                              <th style={thNum}>Comissão</th>
                              <th style={{ ...thStyle, textAlign: 'center' }}>Status</th>
                              <th style={{ ...thStyle, textAlign: 'right' }}>Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.extratos.map((ex) => (
                              <tr key={ex.id}>
                                <td style={tdStyle}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar nome={ex.nome} iniciais={ex.iniciais} />
                                    <span style={{ fontWeight: 500 }}>{ex.nome}</span>
                                  </div>
                                </td>
                                <td style={tdNum}>{ex.itens}</td>
                                <td style={{ ...tdNum, fontWeight: 600, color: TEAL_DARK }}>{brl(ex.comissao)}</td>
                                <td style={{ ...tdStyle, textAlign: 'center' }}><StatusPill status={ex.status} /></td>
                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                  <button onClick={() => handleTogglePago(ex)} style={ex.status === 'A_PAGAR' ? { ...btnSec, borderColor: GREEN, color: GREEN } : btnSec}>
                                    {ex.status === 'A_PAGAR' ? '✅ Marcar pago' : '↩️ Reabrir'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===================== ABA MINHAS COMISSÕES ===================== */}
          {tab === 'minhas' && (
            <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11.5, color: TXT3, marginBottom: 5, fontWeight: 500 }}>Vendas baixadas até</label>
                  <input type="date" value={minhasAte} onChange={(e) => setMinhasAte(e.target.value)} style={inp} />
                </div>
                <button onClick={() => setTab('extratos')} style={btnSec}><span>📁</span><span>Ver meus extratos</span></button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 22 }}>
                <Kpi emoji="💰" label="Minha comissão em aberto" value={brl(minhas?.resumo?.comissao || 0)} />
                <Kpi emoji="📦" label="Meus itens" value={String(minhas?.resumo?.itens || 0)} />
                <Kpi emoji="📊" label="Meu % médio" value={pct(minhas?.resumo?.pctMedio || 0)} />
              </div>

              {/* Sub-abas (chips) */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
                {([['grupo', 'Por grupo'], ['produto', 'Por produto'], ['data', 'Por data'], ['resumo', 'Resumo']] as [SubMinha, string][]).map(([k, lbl]) => {
                  const on = subMinha === k;
                  return (
                    <button key={k} onClick={() => setSubMinha(k)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${on ? TEAL : LINE}`, background: on ? TINT : '#fff', color: on ? TEAL_DARK : TXT2 }}>
                      {lbl}
                    </button>
                  );
                })}
              </div>

              {loadingMinhas ? (
                <div style={{ ...cardStyle, textAlign: 'center', padding: 48, color: TXT2 }}>Carregando...</div>
              ) : subMinha === 'resumo' ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <Kpi emoji="💰" label="Comissão total" value={brl(minhas?.resumo?.comissao || 0)} />
                  <Kpi emoji="💵" label="Base total" value={brl(minhas?.resumo?.base || 0)} />
                  <Kpi emoji="📦" label="Itens" value={String(minhas?.resumo?.itens || 0)} />
                  <Kpi emoji="📊" label="% médio" value={pct(minhas?.resumo?.pctMedio || 0)} />
                </div>
              ) : (
                (() => {
                  const linhas = subMinha === 'grupo' ? (minhas?.porGrupo || []) : subMinha === 'produto' ? (minhas?.porProduto || []) : (minhas?.porData || []);
                  const colLabel = subMinha === 'grupo' ? 'Grupo' : subMinha === 'produto' ? 'Produto' : 'Data';
                  if (linhas.length === 0) {
                    return (
                      <div style={{ ...cardStyle, textAlign: 'center', padding: '56px 20px' }}>
                        <div style={{ fontSize: 34 }}>📊</div>
                        <h3 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: '12px 0 6px' }}>Nada por aqui ainda</h3>
                        <p style={{ color: TXT2, fontSize: 13.5 }}>Não há comissões em aberto para você neste período.</p>
                      </div>
                    );
                  }
                  return (
                    <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thStyle}>{colLabel}</th>
                              <th style={thNum}>Itens</th>
                              <th style={thNum}>Base</th>
                              <th style={thNum}>% médio</th>
                              <th style={thNum}>Comissão</th>
                            </tr>
                          </thead>
                          <tbody>
                            {linhas.map((l, i) => (
                              <tr key={i}>
                                <td style={{ ...tdStyle, fontWeight: 500 }}>{subMinha === 'grupo' ? l.grupo : subMinha === 'produto' ? l.nome : dataBR(l.data)}</td>
                                <td style={tdNum}>{l.itens}</td>
                                <td style={tdNum}>{brl(l.base)}</td>
                                <td style={{ ...tdNum, color: TEAL }}>{pct(l.pctMedio)}</td>
                                <td style={{ ...tdNum, fontWeight: 600, color: TEAL_DARK }}>{brl(l.comissao)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      </div>

      {/* ===================== DRAWER DE CONFIGURAÇÃO ===================== */}
      {configOpen && (
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setConfigOpen(false); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', justifyContent: 'flex-end', zIndex: 60 }}
        >
          <div style={{ background: '#FBF9F4', width: '100%', maxWidth: 460, height: '100%', overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,.12)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${DIV}`, position: 'sticky', top: 0, background: '#FBF9F4', zIndex: 1 }}>
              <h2 style={{ fontSize: 17, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>⚙️</span> Configuração de comissões
              </h2>
              <button onClick={() => setConfigOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3 }}>✕</button>
            </div>

            {!cfgDraft ? (
              <div style={{ padding: 40, textAlign: 'center', color: TXT2 }}>Carregando...</div>
            ) : (
              <div style={{ padding: '20px 22px 40px', display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Base de cálculo */}
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 600, color: TXT2, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Base de cálculo</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([['CHEIO', 'Valor cheio'], ['MARGEM', 'Margem (preço − custo)']] as [Base, string][]).map(([v, lbl]) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px solid ${cfgDraft.base === v ? TEAL : LINE}`, borderRadius: 10, background: cfgDraft.base === v ? TINT : '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="base" checked={cfgDraft.base === v} onChange={() => setCfgDraft({ ...cfgDraft, base: v })} />
                        <span style={{ color: TXT }}>{lbl}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Considerar */}
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 600, color: TXT2, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Considerar</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {([['BAIXADAS', 'Só baixadas'], ['TODAS', 'Todas']] as [Considerar, string][]).map(([v, lbl]) => (
                      <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px solid ${cfgDraft.considerar === v ? TEAL : LINE}`, borderRadius: 10, background: cfgDraft.considerar === v ? TINT : '#fff', cursor: 'pointer', fontSize: 13 }}>
                        <input type="radio" name="considerar" checked={cfgDraft.considerar === v} onChange={() => setCfgDraft({ ...cfgDraft, considerar: v })} />
                        <span style={{ color: TXT }}>{lbl}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Toggles */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {([
                    ['abaterTaxaCartao', 'Abater taxa de cartão'],
                    ['lancarContasPagar', 'Lançar em contas a pagar'],
                    ['funcionarioVePropria', 'Funcionário vê a própria comissão'],
                  ] as [keyof CommissionConfig, string][]).map(([key, lbl]) => (
                    <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 2px', borderBottom: `1px solid ${DIV}`, cursor: 'pointer', fontSize: 13, color: TXT }}>
                      <span>{lbl}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(cfgDraft[key])}
                        onChange={(e) => setCfgDraft({ ...cfgDraft, [key]: e.target.checked })}
                        style={{ width: 18, height: 18 }}
                      />
                    </label>
                  ))}
                </div>

                {/* Comissionados */}
                <div>
                  <h3 style={{ fontSize: 12.5, fontWeight: 600, color: TXT2, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Quem é comissionado</h3>
                  <p style={{ fontSize: 11.5, color: TXT3, margin: '0 0 10px' }}>Nenhum marcado = todos são comissionados.</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                    {usuarios.length === 0 ? (
                      <p style={{ fontSize: 12.5, color: TXT3 }}>Nenhum usuário carregado.</p>
                    ) : usuarios.map((u) => {
                      const marcado = (cfgDraft.comissionados || []).includes(u.id);
                      return (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `1px solid ${DIV}`, cursor: 'pointer', fontSize: 13 }}>
                          <input type="checkbox" checked={marcado} onChange={() => toggleComissionado(u.id)} style={{ width: 17, height: 17 }} />
                          <Avatar nome={u.name} />
                          <span style={{ color: TXT }}>{u.name}{u.role ? <span style={{ color: TXT3, fontSize: 11.5 }}> · {u.role}</span> : null}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button onClick={saveConfig} disabled={savingConfig} style={{ ...btnNavy, justifyContent: 'center', padding: '12px', fontSize: 13.5, opacity: savingConfig ? 0.6 : 1 }}>
                  {savingConfig ? 'Salvando...' : '💾 Salvar configuração'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
