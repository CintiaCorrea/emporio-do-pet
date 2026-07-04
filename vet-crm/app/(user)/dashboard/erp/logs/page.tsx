// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/logs/page.tsx
// Log de auditoria no padrao Base44 "delicada" (bege + emojis).
// Somente leitura: lista as acoes registradas no backend (GET /api/audit-logs).
'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

// Paleta Base44 (mesmos tokens de components/ui/base44.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // marinho — titulos / texto forte
const ORANGE = '#D85A30';    // coral
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua (pill de modulo)
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

interface LogRow {
  id: string;
  createdAt: string;
  userName?: string | null;
  module?: string | null;
  action?: string | null;
  path?: string | null;
  entityId?: string | null;
  statusCode?: number | null;
}
interface LogResponse {
  logs: LogRow[];
  total: number;
  page: number;
  pages: number;
  modules: string[];
}
interface Usuario { id: string; name?: string | null; email?: string | null }

const LIMIT = 50;

// dd/mm/aaaa hh:mm em pt-BR
const dataHora = (s?: string | null) =>
  s
    ? new Date(s)
        .toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
        .replace(',', '')
    : '—';

// inicio / fim do dia em ISO, a partir de um input date (aaaa-mm-dd)
const inicioDoDia = (d: string) => (d ? new Date(`${d}T00:00:00`).toISOString() : '');
const fimDoDia = (d: string) => (d ? new Date(`${d}T23:59:59.999`).toISOString() : '');

// traducao amigavel de modulos conhecidos
const MODULO_LABEL: Record<string, string> = {
  tutors: 'Clientes',
  pets: 'Pets',
  appointments: 'Agenda',
  atendimentos: 'Atendimentos',
  commissions: 'Comissões',
  products: 'Produtos',
  caixa: 'Caixa',
  leads: 'Leads',
  interacoes: 'Interações',
  users: 'Usuários',
  credito: 'Crédito',
  internacoes: 'Internação',
  auth: 'Acesso',
};
const traduzModulo = (m?: string | null) => (m ? MODULO_LABEL[m] || m : '—');

// cor por acao (verbo)
const corAcao = (a?: string | null) => {
  const t = (a || '').toLowerCase();
  if (/criou|create|cadastr/.test(t)) return GREEN;
  if (/excluiu|delet|remov/.test(t)) return ORANGE;
  return TEAL_DARK; // atualizou / demais
};

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '10px 12px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '11px 12px', borderBottom: `1px solid ${DIV}`, fontSize: 13 };
const lbl: React.CSSProperties = { fontSize: 12, color: TXT2, display: 'block', marginBottom: 5 };
const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13 };

export default function LogsPage() {
  usePageTitle('Log de auditoria', 'Registro de ações no sistema');

  // filtros (rascunho) — so viram consulta ao "Aplicar"
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [module, setModule] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');

  const [page, setPage] = useState(1);
  const [data, setData] = useState<LogResponse | null>(null);
  const [modules, setModules] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);

  // consulta efetiva (aplicada) — permite paginar sem reaplicar os campos
  const [applied, setApplied] = useState({ from: '', to: '', module: '', userId: '', search: '' });

  // carrega usuarios uma vez
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/users', { cache: 'no-store' });
        if (!r.ok) return;
        const d = await r.json();
        const list: Usuario[] = Array.isArray(d) ? d : d?.users || d?.data || [];
        setUsuarios(list);
      } catch { /* silencioso */ }
    })();
  }, []);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (applied.from) qs.set('from', inicioDoDia(applied.from));
      if (applied.to) qs.set('to', fimDoDia(applied.to));
      if (applied.module) qs.set('module', applied.module);
      if (applied.userId) qs.set('userId', applied.userId);
      if (applied.search) qs.set('search', applied.search);
      qs.set('page', String(page));
      qs.set('limit', String(LIMIT));
      const r = await fetch(`/api/audit-logs?${qs.toString()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar registros');
      const d: LogResponse = await r.json();
      setData(d);
      // acumula os modulos vistos (mantem o select estavel entre paginas)
      if (Array.isArray(d.modules) && d.modules.length) {
        setModules((prev) => Array.from(new Set([...prev, ...d.modules])));
      }
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar registros');
    } finally {
      setLoading(false);
    }
  }, [applied, page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const aplicar = () => {
    setApplied({ from, to, module, userId, search });
    setPage(1);
  };
  const limpar = () => {
    setFrom(''); setTo(''); setModule(''); setUserId(''); setSearch('');
    setApplied({ from: '', to: '', module: '', userId: '', search: '' });
    setPage(1);
  };

  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;
  const logs = data?.logs ?? [];
  const nomeUsuario = (u: Usuario) => u.name || u.email || u.id;

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>

        {/* Cabecalho */}
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: TEAL_DARK, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔎</span> Log de auditoria
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: TXT2 }}>Registro de ações de criar, editar e excluir no sistema.</p>
        </div>

        {/* Barra de filtros */}
        <div style={{ ...cardStyle, padding: '14px 15px', marginBottom: 16 }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <div>
                <label style={lbl}>De</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ ...inp, width: 150 }} />
              </div>
              <div>
                <label style={lbl}>Até</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ ...inp, width: 150 }} />
              </div>
            </div>
            <div style={{ minWidth: 150 }}>
              <label style={lbl}>Módulo</label>
              <select value={module} onChange={(e) => setModule(e.target.value)} style={inp}>
                <option value="">Todos</option>
                {modules.map((m) => <option key={m} value={m}>{traduzModulo(m)}</option>)}
              </select>
            </div>
            <div style={{ minWidth: 180 }}>
              <label style={lbl}>Usuário</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} style={inp}>
                <option value="">Todos</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{nomeUsuario(u)}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={lbl}>Buscar</label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }}
                placeholder="Buscar por evento, caminho…"
                style={inp}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={aplicar} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 9, cursor: 'pointer' }}>Aplicar</button>
              <button onClick={limpar} style={{ background: '#fff', color: TXT2, border: `1px solid ${LINE}`, fontSize: 13, fontWeight: 500, padding: '9px 16px', borderRadius: 9, cursor: 'pointer' }}>Limpar</button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ ...cardStyle, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data e hora</th>
                  <th style={thStyle}>Usuário</th>
                  <th style={thStyle}>Módulo</th>
                  <th style={thStyle}>Evento</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: TXT2, padding: 24 }}>Carregando…</td></tr>
                )}
                {!loading && logs.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'center', padding: 40, borderBottom: 'none' }}>
                      <div style={{ fontSize: 30 }}>🗒️</div>
                      <p style={{ color: TXT2, margin: '10px 0 0' }}>Nenhum registro ainda.</p>
                      <p style={{ color: TXT3, fontSize: 13, margin: '4px 0 0' }}>As ações de criar, editar ou excluir aparecerão aqui.</p>
                    </td>
                  </tr>
                )}
                {!loading && logs.map((l) => {
                  const evento = l.path || l.entityId || '';
                  return (
                    <tr key={l.id}>
                      <td style={{ ...tdStyle, color: TXT2, whiteSpace: 'nowrap' }}>{dataHora(l.createdAt)}</td>
                      <td style={{ ...tdStyle, color: TXT }}>{l.userName || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 500, padding: '3px 11px', borderRadius: 999, background: TINT, color: TEAL_DARK }}>
                          {traduzModulo(l.module)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 500, color: corAcao(l.action) }}>{l.action || '—'}</span>
                        {evento && <span style={{ color: TXT3 }}> · {evento}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Paginacao */}
          {!loading && logs.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${DIV}`, background: SOFT }}>
              <span style={{ fontSize: 12.5, color: TXT2 }}>{total} registro{total === 1 ? '' : 's'} · página {data?.page ?? page} de {pages}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{ background: '#fff', color: page <= 1 ? TXT3 : TEAL_DARK, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 500, padding: '7px 14px', borderRadius: 9, cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}
                >‹ Anterior</button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  style={{ background: '#fff', color: page >= pages ? TXT3 : TEAL_DARK, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 500, padding: '7px 14px', borderRadius: 9, cursor: page >= pages ? 'default' : 'pointer', opacity: page >= pages ? 0.5 : 1 }}
                >Próxima ›</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
