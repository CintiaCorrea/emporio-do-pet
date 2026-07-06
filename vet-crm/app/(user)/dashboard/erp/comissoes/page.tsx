// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/comissoes/page.tsx
// Comissionamento completo no padrao Base44 "delicada".
// 3 abas (Em aberto | Extratos | Minhas comissoes) + modal de configuracao.
// Consome os endpoints do contrato /api/commissions/*.
// Camada visual: KIT @/components/ui/base44 (sem tokens/inline copiados na mao).
'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import {
  B44, PageShell, HeaderCard, Card, Kpi, KpiGrid, Btn, Pill, Tabs, Modal, Input, Select,
} from '@/components/ui/base44';

// Verde de sucesso pontual (sem token equivalente no kit) — usado no botao "Marcar pago"
const GREEN = '#0f6e56';

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

// ===== Estilos de tabela (tokens do kit B44) =====
const thStyle: React.CSSProperties = { color: B44.text3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '10px 12px', borderBottom: `1px solid ${B44.line}`, textAlign: 'left' };
const thNum: React.CSSProperties = { ...thStyle, textAlign: 'right' };
const tdStyle: React.CSSProperties = { padding: '12px', borderBottom: `1px solid ${B44.lineSoft}`, color: B44.text1, fontSize: 13 };
const tdNum: React.CSSProperties = { ...tdStyle, textAlign: 'right' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11.5, color: B44.text3, marginBottom: 5, fontWeight: 500 };

// Avatar de iniciais (mantém as iniciais vindas da API quando existirem)
function Avatar({ nome, iniciais }: { nome?: string; iniciais?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: '50%', background: B44.tint, color: B44.navy, fontSize: 11.5, fontWeight: 600, flexShrink: 0 }}>
      {iniciais || iniciaisDe(nome)}
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

  // ---- Modal de config ----
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

  // ===== Modal de config =====
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
    <PageShell pad="p-6">
      <div style={{ width: '100%' }}>

        {/* Header */}
        <HeaderCard>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <h1 style={{ fontSize: 24, fontWeight: 500, color: B44.navy, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ fontSize: 22 }}>🧾</span> Comissionamento
            </h1>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="ghost" onClick={openConfig}>⚙️ Configurar</Btn>
              <Btn variant="ghost" onClick={() => window.print()}>🖨️ Imprimir</Btn>
            </div>
          </div>
        </HeaderCard>

        {/* Abas */}
        <Tabs
          tabs={tabs.filter((t) => t.show).map((t) => ({ k: t.key, label: `${t.emoji} ${t.label}` }))}
          active={tab}
          onChange={setTab}
        />

        {/* ===================== ABA EM ABERTO ===================== */}
        {tab === 'aberto' && (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Vendas baixadas até</label>
                <Input type="date" value={baixadasAte} onChange={(e) => setBaixadasAte(e.target.value)} style={{ width: 170 }} />
              </div>
              <Btn variant="primary" onClick={handleFechar} disabled={fechando}>
                🔒 {fechando ? 'Fechando...' : 'Fechar comissões do período'}
              </Btn>
            </div>

            <div style={{ marginBottom: 22 }}>
              <KpiGrid min={200}>
                <Kpi emoji="💰" label="Total em aberto" value={brl(aberto?.totais?.comissao || 0)} />
                <Kpi emoji="👥" label="Comissionados" value={String(aberto?.resumo?.length || 0)} />
                <Kpi emoji="📦" label="Itens baixados" value={String(aberto?.totais?.itens || 0)} />
              </KpiGrid>
            </div>

            {loadingAberto ? (
              <Card pad="48px"><div style={{ textAlign: 'center', color: B44.text2 }}>Carregando...</div></Card>
            ) : !aberto || aberto.resumo.length === 0 ? (
              <Card pad="56px 20px">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 34 }}>🧾</div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: B44.navy, margin: '12px 0 6px' }}>Nenhuma comissão em aberto</h3>
                  <p style={{ color: B44.text2, fontSize: 13.5, maxWidth: 460, margin: '0 auto' }}>
                    Verifique se os profissionais têm % configurado e se há vendas baixadas no período.
                  </p>
                </div>
              </Card>
            ) : (
              <div style={{ background: '#fff', border: `1px solid ${B44.line}`, borderRadius: 12, overflow: 'hidden' }}>
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
                                <div style={{ fontWeight: 500, color: B44.text1 }}>{l.nome}</div>
                                {l.role && <div style={{ fontSize: 11.5, color: B44.text3 }}>{l.role}</div>}
                              </div>
                            </div>
                          </td>
                          <td style={tdNum}>{l.itens}</td>
                          <td style={tdNum}>{brl(l.base)}</td>
                          <td style={{ ...tdNum, color: B44.primary }}>{pct(l.pctMedio)}</td>
                          <td style={{ ...tdNum, fontWeight: 600, color: B44.navy }}>{brl(l.comissao)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td style={{ ...tdStyle, fontWeight: 600, color: B44.text1, borderBottom: 'none', background: B44.soft }}>Total</td>
                        <td style={{ ...tdNum, fontWeight: 600, borderBottom: 'none', background: B44.soft }}>{aberto.totais.itens}</td>
                        <td style={{ ...tdNum, fontWeight: 600, borderBottom: 'none', background: B44.soft }}>{brl(aberto.totais.base)}</td>
                        <td style={{ ...tdNum, borderBottom: 'none', background: B44.soft }}></td>
                        <td style={{ ...tdNum, fontWeight: 700, color: B44.navy, borderBottom: 'none', background: B44.soft }}>{brl(aberto.totais.comissao)}</td>
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
            <Card pad="16px 18px" className="mb-5">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle}>Período</label>
                  <Input type="month" value={exMonth} onChange={(e) => setExMonth(e.target.value)} style={{ width: 170 }} />
                </div>
                <div>
                  <label style={labelStyle}>Funcionário</label>
                  <Select value={exUser} onChange={(e) => setExUser(e.target.value)} style={{ minWidth: 180 }}>
                    <option value="">Todos</option>
                    {usuarios.map((u) => (<option key={u.id} value={u.id}>{u.name}</option>))}
                  </Select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <Select value={exStatus} onChange={(e) => setExStatus(e.target.value as '' | ExtratoStatus)} style={{ minWidth: 140 }}>
                    <option value="">Todos</option>
                    <option value="A_PAGAR">A pagar</option>
                    <option value="PAGO">Pago</option>
                  </Select>
                </div>
              </div>
            </Card>

            {loadingExtratos ? (
              <Card pad="48px"><div style={{ textAlign: 'center', color: B44.text2 }}>Carregando...</div></Card>
            ) : extratos.length === 0 ? (
              <Card pad="56px 20px">
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 34 }}>📁</div>
                  <h3 style={{ fontSize: 17, fontWeight: 500, color: B44.navy, margin: '12px 0 6px' }}>Nenhum fechamento encontrado</h3>
                  <p style={{ color: B44.text2, fontSize: 13.5 }}>Feche um período na aba "Em aberto" para gerar extratos.</p>
                </div>
              </Card>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {extratos.map((g) => (
                  <div key={g.fechamentoId} style={{ background: '#fff', border: `1px solid ${B44.line}`, borderRadius: 12, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '13px 16px', background: B44.soft, borderBottom: `1px solid ${B44.line}` }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, color: B44.navy }}>
                        🔒 Fechado em {dataBR(g.createdAt)} · {g.referencia}
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: B44.navy }}>{brl(g.total)}</div>
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
                              <td style={{ ...tdNum, fontWeight: 600, color: B44.navy }}>{brl(ex.comissao)}</td>
                              <td style={{ ...tdStyle, textAlign: 'center' }}>
                                <Pill tone={ex.status === 'PAGO' ? 'ok' : 'warn'}>{ex.status === 'PAGO' ? 'Pago' : 'A pagar'}</Pill>
                              </td>
                              <td style={{ ...tdStyle, textAlign: 'right' }}>
                                <Btn
                                  variant="ghost"
                                  onClick={() => handleTogglePago(ex)}
                                  style={ex.status === 'A_PAGAR' ? { borderColor: GREEN, color: GREEN } : undefined}
                                >
                                  {ex.status === 'A_PAGAR' ? '✅ Marcar pago' : '↩️ Reabrir'}
                                </Btn>
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
                <label style={labelStyle}>Vendas baixadas até</label>
                <Input type="date" value={minhasAte} onChange={(e) => setMinhasAte(e.target.value)} style={{ width: 170 }} />
              </div>
              <Btn variant="ghost" onClick={() => setTab('extratos')}>📁 Ver meus extratos</Btn>
            </div>

            <div style={{ marginBottom: 22 }}>
              <KpiGrid min={200}>
                <Kpi emoji="💰" label="Minha comissão em aberto" value={brl(minhas?.resumo?.comissao || 0)} />
                <Kpi emoji="📦" label="Meus itens" value={String(minhas?.resumo?.itens || 0)} />
                <Kpi emoji="📊" label="Meu % médio" value={pct(minhas?.resumo?.pctMedio || 0)} />
              </KpiGrid>
            </div>

            {/* Sub-abas (chips) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
              {([['grupo', 'Por grupo'], ['produto', 'Por produto'], ['data', 'Por data'], ['resumo', 'Resumo']] as [SubMinha, string][]).map(([k, lbl]) => {
                const on = subMinha === k;
                return (
                  <button key={k} onClick={() => setSubMinha(k)} style={{ padding: '7px 14px', borderRadius: 999, fontSize: 12.5, fontWeight: 500, cursor: 'pointer', border: `1px solid ${on ? B44.primary : B44.line}`, background: on ? B44.tint : '#fff', color: on ? B44.navy : B44.text2 }}>
                    {lbl}
                  </button>
                );
              })}
            </div>

            {loadingMinhas ? (
              <Card pad="48px"><div style={{ textAlign: 'center', color: B44.text2 }}>Carregando...</div></Card>
            ) : subMinha === 'resumo' ? (
              <KpiGrid min={200}>
                <Kpi emoji="💰" label="Comissão total" value={brl(minhas?.resumo?.comissao || 0)} />
                <Kpi emoji="💵" label="Base total" value={brl(minhas?.resumo?.base || 0)} />
                <Kpi emoji="📦" label="Itens" value={String(minhas?.resumo?.itens || 0)} />
                <Kpi emoji="📊" label="% médio" value={pct(minhas?.resumo?.pctMedio || 0)} />
              </KpiGrid>
            ) : (
              (() => {
                const linhas = subMinha === 'grupo' ? (minhas?.porGrupo || []) : subMinha === 'produto' ? (minhas?.porProduto || []) : (minhas?.porData || []);
                const colLabel = subMinha === 'grupo' ? 'Grupo' : subMinha === 'produto' ? 'Produto' : 'Data';
                if (linhas.length === 0) {
                  return (
                    <Card pad="56px 20px">
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 34 }}>📊</div>
                        <h3 style={{ fontSize: 17, fontWeight: 500, color: B44.navy, margin: '12px 0 6px' }}>Nada por aqui ainda</h3>
                        <p style={{ color: B44.text2, fontSize: 13.5 }}>Não há comissões em aberto para você neste período.</p>
                      </div>
                    </Card>
                  );
                }
                return (
                  <div style={{ background: '#fff', border: `1px solid ${B44.line}`, borderRadius: 12, overflow: 'hidden' }}>
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
                              <td style={{ ...tdNum, color: B44.primary }}>{pct(l.pctMedio)}</td>
                              <td style={{ ...tdNum, fontWeight: 600, color: B44.navy }}>{brl(l.comissao)}</td>
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

      {/* ===================== MODAL DE CONFIGURAÇÃO ===================== */}
      <Modal
        open={configOpen}
        onClose={() => setConfigOpen(false)}
        title="⚙️ Configuração de comissões"
        width={460}
        footer={cfgDraft ? (
          <Btn variant="primary" onClick={saveConfig} disabled={savingConfig} style={{ justifyContent: 'center', padding: '12px 18px', fontSize: 13.5 }}>
            {savingConfig ? 'Salvando...' : '💾 Salvar configuração'}
          </Btn>
        ) : null}
      >
        {!cfgDraft ? (
          <div style={{ padding: 40, textAlign: 'center', color: B44.text2 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Base de cálculo */}
            <div>
              <h3 style={{ fontSize: 12.5, fontWeight: 600, color: B44.text2, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Base de cálculo</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([['CHEIO', 'Valor cheio'], ['MARGEM', 'Margem (preço − custo)']] as [Base, string][]).map(([v, lbl]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px solid ${cfgDraft.base === v ? B44.primary : B44.line}`, borderRadius: 10, background: cfgDraft.base === v ? B44.tint : '#fff', cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="base" checked={cfgDraft.base === v} onChange={() => setCfgDraft({ ...cfgDraft, base: v })} />
                    <span style={{ color: B44.text1 }}>{lbl}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Considerar */}
            <div>
              <h3 style={{ fontSize: 12.5, fontWeight: 600, color: B44.text2, margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Considerar</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {([['BAIXADAS', 'Só baixadas'], ['TODAS', 'Todas']] as [Considerar, string][]).map(([v, lbl]) => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', border: `1px solid ${cfgDraft.considerar === v ? B44.primary : B44.line}`, borderRadius: 10, background: cfgDraft.considerar === v ? B44.tint : '#fff', cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="considerar" checked={cfgDraft.considerar === v} onChange={() => setCfgDraft({ ...cfgDraft, considerar: v })} />
                    <span style={{ color: B44.text1 }}>{lbl}</span>
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
                <label key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '11px 2px', borderBottom: `1px solid ${B44.lineSoft}`, cursor: 'pointer', fontSize: 13, color: B44.text1 }}>
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
              <h3 style={{ fontSize: 12.5, fontWeight: 600, color: B44.text2, margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '.02em' }}>Quem é comissionado</h3>
              <p style={{ fontSize: 11.5, color: B44.text3, margin: '0 0 10px' }}>Nenhum marcado = todos são comissionados.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
                {usuarios.length === 0 ? (
                  <p style={{ fontSize: 12.5, color: B44.text3 }}>Nenhum usuário carregado.</p>
                ) : usuarios.map((u) => {
                  const marcado = (cfgDraft.comissionados || []).includes(u.id);
                  return (
                    <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 2px', borderBottom: `1px solid ${B44.lineSoft}`, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={marcado} onChange={() => toggleComissionado(u.id)} style={{ width: 17, height: 17 }} />
                      <Avatar nome={u.name} />
                      <span style={{ color: B44.text1 }}>{u.name}{u.role ? <span style={{ color: B44.text3, fontSize: 11.5 }}> · {u.role}</span> : null}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </PageShell>
  );
}
