// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/logs/page.tsx
// Log de auditoria no padrao Base44 "delicada" (bege + emojis).
// Somente leitura: lista as acoes registradas no backend (GET /api/audit-logs).
'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import {
  PageShell,
  HeaderCard,
  Card,
  Btn,
  Pill,
  Input,
  Select,
  EmptyState,
  B44,
  B44_TONES,
} from '@/components/ui/base44';

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

// cor por acao (verbo) — tokens do kit
const corAcao = (a?: string | null) => {
  const t = (a || '').toLowerCase();
  if (/criou|create|cadastr/.test(t)) return B44_TONES.ok.color; // verde — criar
  if (/excluiu|delet|remov/.test(t)) return B44.coral;           // coral — excluir
  return B44.navy;                                               // marinho — atualizar / demais
};

const thStyle: React.CSSProperties = { color: B44.text3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '10px 12px', borderBottom: `1px solid ${B44.line}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '11px 12px', borderBottom: `1px solid ${B44.lineSoft}`, fontSize: 13 };
const lbl: React.CSSProperties = { fontSize: 12, color: B44.text2, display: 'block', marginBottom: 5 };

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
    <PageShell pad="p-6">

      {/* Cabecalho */}
      <HeaderCard>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, color: B44.navy, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>🔎</span> Log de auditoria
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: B44.text2 }}>Registro de ações de criar, editar e excluir no sistema.</p>
      </HeaderCard>

      {/* Barra de filtros */}
      <Card pad="14px 15px" className="mb-4">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div>
              <label style={lbl}>De</label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={{ width: 150 }} />
            </div>
            <div>
              <label style={lbl}>Até</label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={{ width: 150 }} />
            </div>
          </div>
          <div style={{ minWidth: 150 }}>
            <label style={lbl}>Módulo</label>
            <Select value={module} onChange={(e) => setModule(e.target.value)}>
              <option value="">Todos</option>
              {modules.map((m) => <option key={m} value={m}>{traduzModulo(m)}</option>)}
            </Select>
          </div>
          <div style={{ minWidth: 180 }}>
            <label style={lbl}>Usuário</label>
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Todos</option>
              {usuarios.map((u) => <option key={u.id} value={u.id}>{nomeUsuario(u)}</option>)}
            </Select>
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <label style={lbl}>Buscar</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }}
              placeholder="Buscar por evento, caminho…"
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="primary" onClick={aplicar}>Aplicar</Btn>
            <Btn variant="ghost" onClick={limpar}>Limpar</Btn>
          </div>
        </div>
      </Card>

      {/* Tabela */}
      <Card pad="0" className="overflow-hidden">
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
                <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: B44.text2, padding: 24 }}>Carregando…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ borderBottom: 'none' }}>
                    <EmptyState className="py-10">
                      <span style={{ fontSize: 30, display: 'block' }}>🗒️</span>
                      <span style={{ color: B44.text2, display: 'block', marginTop: 10 }}>Nenhum registro ainda.</span>
                      <span style={{ color: B44.text3, fontSize: 13, display: 'block', marginTop: 4 }}>As ações de criar, editar ou excluir aparecerão aqui.</span>
                    </EmptyState>
                  </td>
                </tr>
              )}
              {!loading && logs.map((l) => {
                const evento = l.path || l.entityId || '';
                return (
                  <tr key={l.id}>
                    <td style={{ ...tdStyle, color: B44.text2, whiteSpace: 'nowrap' }}>{dataHora(l.createdAt)}</td>
                    <td style={{ ...tdStyle, color: B44.text1 }}>{l.userName || '—'}</td>
                    <td style={tdStyle}>
                      <Pill tone="navy">{traduzModulo(l.module)}</Pill>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontWeight: 500, color: corAcao(l.action) }}>{l.action || '—'}</span>
                      {evento && <span style={{ color: B44.text3 }}> · {evento}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Paginacao */}
        {!loading && logs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderTop: `1px solid ${B44.lineSoft}`, background: B44.soft }}>
            <span style={{ fontSize: 12.5, color: B44.text2 }}>{total} registro{total === 1 ? '' : 's'} · página {data?.page ?? page} de {pages}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>‹ Anterior</Btn>
              <Btn variant="ghost" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages}>Próxima ›</Btn>
            </div>
          </div>
        )}
      </Card>

    </PageShell>
  );
}
