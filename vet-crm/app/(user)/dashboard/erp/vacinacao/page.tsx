// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/vacinacao/page.tsx
// Programacao de vacinacao no padrao Base44 (bege + emojis).
// Lista as doses previstas dos protocolos dos pets, com filtros e acoes.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { openWhatsAppMeta } from '@/lib/actions/whatsapp';
import {
  B44, B44Tone, PageShell, HeaderCard, Card, Kpi, KpiGrid,
  Btn, Pill, Input, Select, Label, Avatar, EmptyState,
} from '@/components/ui/base44';

interface Dose {
  id: string;
  dataPrevista: string;
  status: string;         // PENDENTE | APLICADA | ...
  situacao: string;       // ATRASADA | EM_DIA | SEM_RESPOSTA | ...
  dataAplicada?: string | null;
  protocoloId?: string;
  tipo?: string;
  nomeProtocolo?: string;
  petId?: string;
  petNome?: string;
  especie?: string;
  tutorId?: string;
  tutorNome?: string;
  tutorPhone?: string | null;
}
interface Resumo { total: number; atrasadas: number; pendentes: number; aplicadas: number; }
interface Programacao { doses: Dose[]; resumo: Resumo; tipos: string[]; }

const fmtData = (s?: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

const emojiEspecie = (esp?: string) => {
  const e = String(esp || '').toUpperCase();
  if (e === 'FELINE' || e.includes('GAT') || e.includes('FEL')) return '🐱';
  if (e === 'CANINE' || e.includes('CAN') || e.includes('CACHOR') || e.includes('DOG')) return '🐶';
  return '🐾';
};

// Situacao/status -> pill visual (tom do kit: Atrasada danger, Pendente warn,
// Aplicada ok, Sem resposta neutral). A LOGICA de situacao/status e a mesma.
const pillDe = (d: Dose): { label: string; tone: B44Tone } => {
  const sit = String(d.situacao || '').toUpperCase();
  const st = String(d.status || '').toUpperCase();
  if (st === 'APLICADA') return { label: 'Aplicada', tone: 'ok' };
  if (sit === 'ATRASADA') return { label: 'Atrasada', tone: 'danger' };
  if (sit === 'SEM_RESPOSTA' || sit === 'SEM RESPOSTA') return { label: 'Sem resposta', tone: 'neutral' };
  return { label: 'Pendente', tone: 'warn' };
};

const thStyle: React.CSSProperties = { color: B44.text3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '8px', borderBottom: `1px solid ${B44.line}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 8px', borderBottom: `1px solid ${B44.lineSoft}`, verticalAlign: 'middle' };

// Opcoes do seletor de status (rotulos amigaveis)
type StatusSel = 'PENDENTE' | 'ATRASADA' | 'APLICADA' | 'all';
type TipoSel = 'VACINA' | 'VERMIFUGO' | 'ECTOPARASITA' | 'all';

export default function VacinacaoPage() {
  usePageTitle('Vacinação', 'Programação de vacinas dos pets');

  // filtros aplicados (usados na busca)
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [statusSel, setStatusSel] = useState<StatusSel>('PENDENTE');
  const [tipoSel, setTipoSel] = useState<TipoSel>('VACINA');
  const [search, setSearch] = useState('');

  // rascunho dos filtros (form) — so aplica ao clicar
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fStatus, setFStatus] = useState<StatusSel>('PENDENTE');
  const [fTipo, setFTipo] = useState<TipoSel>('VACINA');
  const [fSearch, setFSearch] = useState('');

  const [data, setData] = useState<Programacao | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (from) qs.set('from', new Date(from + 'T00:00:00').toISOString());
      if (to) qs.set('to', new Date(to + 'T23:59:59.999').toISOString());
      // Se o seletor for "Atrasadas", pedimos PENDENTE ao backend e filtramos no cliente.
      const statusBackend = statusSel === 'ATRASADA' ? 'PENDENTE' : statusSel;
      if (statusBackend !== 'all') qs.set('status', statusBackend);
      if (tipoSel !== 'all') qs.set('tipo', tipoSel);
      if (search.trim()) qs.set('search', search.trim());
      const r = await fetch(`/api/protocolos/programacao?${qs.toString()}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar a programação');
      const d: Programacao = await r.json();
      setData(d);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar a programação');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to, statusSel, tipoSel, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const aplicar = () => { setFrom(fFrom); setTo(fTo); setStatusSel(fStatus); setTipoSel(fTipo); setSearch(fSearch); };
  const limpar = () => {
    setFFrom(''); setFTo(''); setFStatus('PENDENTE'); setFTipo('VACINA'); setFSearch('');
    setFrom(''); setTo(''); setStatusSel('PENDENTE'); setTipoSel('VACINA'); setSearch('');
  };

  const resumo = data?.resumo || { total: 0, atrasadas: 0, pendentes: 0, aplicadas: 0 };

  // Filtro cliente: quando o seletor e "Atrasadas", mostrar so situacao ATRASADA.
  const doses = useMemo(() => {
    const list = data?.doses || [];
    if (statusSel === 'ATRASADA') return list.filter((d) => String(d.situacao || '').toUpperCase() === 'ATRASADA');
    return list;
  }, [data, statusSel]);

  return (
    <PageShell pad="p-6">
      {/* Header */}
      <HeaderCard>
        <h1 style={{ fontSize: 20, fontWeight: 500, color: B44.navy, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
          <span>💉</span> Programação de vacinação
        </h1>
        <p style={{ fontSize: 13, color: B44.text2, margin: '5px 0 0' }}>Acompanhe as vacinas previstas, atrasadas e aplicadas dos pets.</p>
      </HeaderCard>

      {/* KPIs */}
      <div style={{ marginBottom: 16 }}>
        <KpiGrid min={160}>
          <Kpi emoji="⚠️" label="Atrasadas" value={resumo.atrasadas} />
          <Kpi emoji="⏳" label="Pendentes" value={resumo.pendentes} />
          <Kpi emoji="✅" label="Aplicadas" value={resumo.aplicadas} />
        </KpiGrid>
      </div>

      {/* Filtros */}
      <Card pad="14px 15px" className="mb-4">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <Label>Período</Label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={{ width: 'auto' }} />
              <span style={{ color: B44.text3, fontSize: 12 }}>até</span>
              <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={{ width: 'auto' }} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={fStatus} onChange={(e) => setFStatus(e.target.value as StatusSel)} style={{ minWidth: 130 }}>
              <option value="PENDENTE">A fazer</option>
              <option value="ATRASADA">Atrasadas</option>
              <option value="APLICADA">Aplicadas</option>
              <option value="all">Todas</option>
            </Select>
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={fTipo} onChange={(e) => setFTipo(e.target.value as TipoSel)} style={{ minWidth: 130 }}>
              <option value="VACINA">Vacinas</option>
              <option value="VERMIFUGO">Vermífugos</option>
              <option value="ECTOPARASITA">Ectoparasitas</option>
              <option value="all">Todos</option>
            </Select>
          </div>
          <div style={{ flex: '1 1 180px', minWidth: 160 }}>
            <Label>Busca</Label>
            <Input value={fSearch} onChange={(e) => setFSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }} placeholder="Cliente, pet ou vacina…" />
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                <th style={thStyle}>Data prevista</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Animal</th>
                <th style={thStyle}>Vacina</th>
                <th style={thStyle}>Status</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: B44.text2, padding: 26 }}>Carregando…</td></tr>
              )}
              {!loading && doses.length === 0 && (
                <tr><td colSpan={6} style={{ ...tdStyle, padding: 24 }}>
                  <div style={{ textAlign: 'center', fontSize: 28 }}>💉</div>
                  <EmptyState>Nenhuma vacina na programação para este filtro.</EmptyState>
                </td></tr>
              )}
              {!loading && doses.map((d) => {
                const pill = pillDe(d);
                const atrasada = String(d.situacao || '').toUpperCase() === 'ATRASADA' && String(d.status || '').toUpperCase() !== 'APLICADA';
                return (
                  <tr key={d.id}>
                    <td style={{ ...tdStyle, color: atrasada ? B44.coral : B44.text1, fontWeight: atrasada ? 500 : 400 }}>{fmtData(d.dataPrevista)}</td>
                    <td style={{ ...tdStyle, color: B44.text1 }}>{d.tutorNome || '—'}</td>
                    <td style={{ ...tdStyle, color: B44.text1 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <Avatar kind="emoji" emoji={emojiEspecie(d.especie)} size={28} />
                        {d.petNome || '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: B44.text2 }}>{d.nomeProtocolo || '—'}</td>
                    <td style={tdStyle}>
                      <Pill tone={pill.tone}>{pill.label}</Pill>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                        {d.tutorPhone && (
                          <Btn variant="ghost" onClick={() => openWhatsAppMeta(d.tutorPhone)} title="WhatsApp" style={{ padding: '5px 9px' }}>📲</Btn>
                        )}
                        {d.petId ? (
                          <Link href={`/dashboard/erp/pets/${d.petId}?tab=vacinas`} title="Ficha do pet" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${B44.line}`, background: '#fff', cursor: 'pointer', padding: '5px 10px', borderRadius: B44.rSm, fontSize: 12.5, color: B44.navy, textDecoration: 'none' }}>
                            <span style={{ fontSize: 14 }}>🐾</span> Ficha
                          </Link>
                        ) : (
                          <span style={{ color: B44.text3, fontSize: 12 }}>—</span>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </PageShell>
  );
}
