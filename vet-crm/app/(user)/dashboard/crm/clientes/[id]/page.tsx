'use client';

// Ficha do cliente (Tutor) — padrão Base44 (bege, avatar iniciais, emojis).
// Aba "Visão geral" ligada aos dados reais: /api/clients/[id] (tutor+pets+atendimentos)
// e /api/tutors/[id]/profile-stats (LTV, ticket, a receber, frequência, share of wallet por marca).
// Valores sensíveis ficam ocultos por padrão (olhinho).

import { useState, useEffect, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { openWhatsAppMeta } from '@/lib/actions/whatsapp';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

interface Contact { id: string; number: string; isWhatsApp?: boolean; isPrimary?: boolean; type?: string }
interface PetLite {
  id: string; name: string; species?: string; breed?: string | null;
  gender?: string | null; birthDate?: string | null; status?: string;
  proximoFollowupAt?: string | null;
}
interface ApptLite {
  id: string; date: string; value?: number; status?: string; paymentStatus?: string;
  type?: string; description?: string | null;
  pet?: { name?: string } | null; user?: { name?: string } | null;
}
interface Tutor {
  id: string; name: string; email?: string | null; status: string;
  type?: string; tags: string[]; cpf?: string | null; cnpj?: string | null;
  address?: string | null; addressNumber?: string | null; neighborhood?: string | null;
  city?: string | null; state?: string | null; birthDate?: string | null;
  createdAt: string; primeiraCompraAt?: string | null; rankingAbc?: string | null;
  howFoundUs?: string | null; observations?: string | null; notaCliente?: string | null;
  estadoRelacionamento?: string | null; proximoFollowupAt?: string | null;
  convertedFromLeadId?: string | null;
  contacts?: Contact[]; pets?: PetLite[]; appointments?: ApptLite[];
  _count?: { pets?: number; appointments?: number };
}
interface MarcaSlice { marca: string; valor: number; pct: number }
interface Stats {
  totalAppointments: number; futurasAgendadas: number; diasDesdeUltima: number | null;
  valorTotal: number; valorPago: number; valorAReceber: number; ticketMedio: number;
  totalPets: number; petsAtivos: number;
  porMarca?: MarcaSlice[];
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo', INACTIVE: 'Inativo', SUSPENDED: 'Suspenso', CHURNED: 'Perdido',
};
const STATUS_STYLE: Record<string, { bg: string; fg: string; dot: string }> = {
  ACTIVE: { bg: '#E7F6EC', fg: '#1E7B43', dot: '🟢' },
  INACTIVE: { bg: '#F1EFE8', fg: '#5F5E5A', dot: '⚪' },
  SUSPENDED: { bg: '#FBEFD6', fg: '#8A5A0B', dot: '🟠' },
  CHURNED: { bg: '#FDECEC', fg: '#A32D2D', dot: '🔴' },
};

const MARCA: Record<string, { label: string; emoji: string; bar: string; bg: string; fg: string }> = {
  EMPORIO: { label: 'Empório do Pet', emoji: '🏥', bar: '#009AAC', bg: '#D9F0F3', fg: '#014D5E' },
  MUNDO_A_PARTE: { label: 'Mundo à Parte', emoji: '🌿', bar: '#639922', bg: '#EAF3DE', fg: '#3B6D11' },
  DRA_VIVIAN: { label: 'Dra. Vivian', emoji: '✨', bar: '#7F77DD', bg: '#EDE9FA', fg: '#3C3489' },
};
const marcaInfo = (m: string) => MARCA[m] || { label: m, emoji: '🏷️', bar: '#888780', bg: '#F1EFE8', fg: '#5F5E5A' };

const SPECIES_EMOJI: Record<string, string> = {
  CANINE: '🐶', FELINE: '🐱', AVIAN: '🐦', BIRD: '🐦', RODENT: '🐹', REPTILE: '🦎',
};
const speciesEmoji = (s?: string) => (s && SPECIES_EMOJI[s]) || '🐾';
const speciesLabel = (s?: string) => ({ CANINE: 'Cão', FELINE: 'Gato', AVIAN: 'Ave', BIRD: 'Ave', RODENT: 'Roedor', REPTILE: 'Réptil' } as Record<string, string>)[s || ''] || (s || 'Pet');
const genderLabel = (g?: string | null) => g === 'MALE' ? 'macho' : g === 'FEMALE' ? 'fêmea' : '';

function idade(birthDate?: string | null): string {
  if (!birthDate) return '';
  const b = new Date(birthDate); const now = new Date();
  let anos = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) anos--;
  if (anos <= 0) {
    const meses = Math.max(0, (now.getFullYear() - b.getFullYear()) * 12 + m);
    return `${meses} ${meses === 1 ? 'mês' : 'meses'}`;
  }
  return `${anos} ${anos === 1 ? 'ano' : 'anos'}`;
}

const iniciais = (nome: string) => nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';
const fmtDataCurta = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '—';
const fmtDataLonga = (d?: string | null) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const TABS = [
  { key: 'geral', label: '👤 Visão geral' },
  { key: 'cadastro', label: '📋 Cadastro' },
  { key: 'pets', label: '🐾 Pets' },
  { key: 'compras', label: '🧾 Compras' },
  { key: 'atendimentos', label: '🩺 Atendimentos' },
  { key: 'relacionamento', label: '🔔 Relacionamento' },
];

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<Tutor | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('geral');
  const [showValues, setShowValues] = useState(false);

  const [statusModal, setStatusModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [tagModal, setTagModal] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  usePageTitle(client?.name || 'Cliente', 'Ficha do cliente');

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [rc, rs] = await Promise.all([
        fetch(`/api/clients/${id}`),
        fetch(`/api/tutors/${id}/profile-stats`),
      ]);
      if (!rc.ok) throw new Error('Cliente não encontrado');
      setClient(await rc.json());
      if (rs.ok) setStats(await rs.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const money = (v?: number | null) => {
    if (v == null) return '—';
    if (!showValues) return 'R$ ••••';
    return 'R$ ' + Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleStatusChange = async () => {
    if (!selectedStatus) return;
    try {
      setSaving(true);
      const r = await fetch(`/api/clients/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: selectedStatus }),
      });
      if (!r.ok) throw new Error('Erro ao atualizar status');
      toast.success('Status atualizado!'); setStatusModal(false); fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  };

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      setSaving(true);
      const currentTags = client?.tags || [];
      const r = await fetch(`/api/clients/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: [...new Set([...currentTags, newTag.trim()])] }),
      });
      if (!r.ok) throw new Error('Erro ao adicionar tag');
      toast.success('Tag adicionada!'); setNewTag(''); setTagModal(false); fetchAll();
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Erro'); }
    finally { setSaving(false); }
  };

  const handleRemoveTag = async (tag: string) => {
    try {
      const currentTags = client?.tags || [];
      const r = await fetch(`/api/clients/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: currentTags.filter(t => t !== tag) }),
      });
      if (!r.ok) throw new Error('Erro ao remover tag');
      toast.success('Tag removida!'); fetchAll();
    } catch { toast.error('Erro ao remover tag'); }
  };

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7A776E' }}>Carregando cliente…</div>;
  }
  if (error || !client) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ color: '#A32D2D', fontWeight: 500 }}>{error || 'Cliente não encontrado'}</div>
        <button onClick={() => router.back()} style={{ padding: '8px 18px', borderRadius: 10, background: '#fff', border: '1px solid #E0DACB', cursor: 'pointer' }}>Voltar</button>
      </div>
    );
  }

  const st = STATUS_STYLE[client.status] || STATUS_STYLE.INACTIVE;
  const phone = client.contacts?.find(c => c.isPrimary)?.number || client.contacts?.[0]?.number || null;
  const cidade = [client.city, client.state].filter(Boolean).join('-');
  const desde = client.primeiraCompraAt || client.createdAt;
  const pets = client.pets || [];
  const compras = client.appointments || [];
  const porMarca = stats?.porMarca || [];

  const card: React.CSSProperties = { background: '#fff', borderRadius: 14, padding: '14px 16px' };
  const kpi: React.CSSProperties = { background: '#fff', borderRadius: 12, padding: '12px 14px' };

  return (
    <div style={{ background: '#F6F2EA', minHeight: '100vh', padding: 16, fontFamily: 'inherit', color: '#33322E' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        <div style={{ fontSize: 12, color: '#7A776E', marginBottom: 10, cursor: 'pointer' }} onClick={() => router.push('/dashboard/erp/clientes')}>
          ← Clientes › <span style={{ color: '#33322E' }}>{client.name}</span>
        </div>

        {/* Cabeçalho */}
        <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#D6EEF1', color: '#014D5E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 500 }}>{iniciais(client.name)}</div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 500 }}>{client.name}</span>
              <span onClick={() => { setSelectedStatus(client.status); setStatusModal(true); }} title="Alterar status" style={{ background: st.bg, color: st.fg, fontSize: 12, padding: '2px 10px', borderRadius: 999, cursor: 'pointer' }}>{st.dot} {STATUS_LABELS[client.status] || client.status}</span>
              {client.rankingAbc && <span style={{ background: '#FBEFD6', color: '#8A5A0B', fontSize: 12, padding: '2px 10px', borderRadius: 999 }}>⭐ Cliente {client.rankingAbc}</span>}
            </div>
            <div style={{ fontSize: 13, color: '#7A776E', marginTop: 3 }}>
              {cidade && <>📍 {cidade} · </>}Cliente desde {fmtDataLonga(desde)}{phone && <> · 📞 {phone}</>}
            </div>
            <div style={{ marginTop: 7, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {(client.tags || []).map(t => (
                <span key={t} style={{ background: '#F1EFE8', color: '#5F5E5A', fontSize: 11, padding: '2px 9px', borderRadius: 999 }}>
                  {t} <span style={{ cursor: 'pointer' }} onClick={() => handleRemoveTag(t)}>✕</span>
                </span>
              ))}
              <span style={{ background: '#F1EFE8', color: '#5F5E5A', fontSize: 11, padding: '2px 9px', borderRadius: 999, cursor: 'pointer' }} onClick={() => setTagModal(true)}>+ tag</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => setShowValues(v => !v)} style={{ background: '#FBF6EC', color: '#8A5A0B', border: '1px solid #EAD9B6', fontSize: 12, padding: '8px 12px', borderRadius: 9, cursor: 'pointer' }}>
              {showValues ? '🙈 Ocultar valores' : '👁️ Mostrar valores'}
            </button>
            <button onClick={() => openWhatsAppMeta(phone)} style={{ background: '#009AAC', color: '#fff', border: 'none', fontSize: 13, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>💬 WhatsApp</button>
            <button onClick={() => router.push(`/dashboard/erp/tutores/${id}/editar`)} style={{ background: '#fff', color: '#33322E', border: '1px solid #E0DACB', fontSize: 13, padding: '8px 14px', borderRadius: 9, cursor: 'pointer' }}>✏️ Editar</button>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap', borderBottom: '1px solid #E6E0D2' }}>
          {TABS.map(t => (
            <div key={t.key} onClick={() => t.key === 'cadastro' ? router.push(`/dashboard/erp/tutores/${id}/editar`) : setTab(t.key)}
              style={{ fontSize: 13, padding: '9px 14px', cursor: 'pointer', color: tab === t.key ? '#014D5E' : '#7A776E', fontWeight: tab === t.key ? 500 : 400, borderBottom: tab === t.key ? '2px solid #009AAC' : '2px solid transparent' }}>
              {t.label}
            </div>
          ))}
        </div>

        {tab === 'geral' && (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10, marginTop: 14 }}>
              <div style={kpi}><div style={{ fontSize: 12, color: '#7A776E' }}>💰 Total gasto</div><div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{money(stats?.valorTotal)}</div></div>
              <div style={kpi}><div style={{ fontSize: 12, color: '#7A776E' }}>🎯 Ticket médio</div><div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{money(stats?.ticketMedio)}</div></div>
              <div style={kpi}><div style={{ fontSize: 12, color: '#7A776E' }}>🛒 Compras</div><div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{stats?.totalAppointments ?? 0}</div></div>
              <div style={kpi}><div style={{ fontSize: 12, color: '#7A776E' }}>📅 Última visita</div><div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{stats?.diasDesdeUltima == null ? '—' : stats.diasDesdeUltima === 0 ? 'hoje' : stats.diasDesdeUltima < 30 ? `${stats.diasDesdeUltima}d` : stats.diasDesdeUltima < 365 ? `${Math.floor(stats.diasDesdeUltima / 30)}m` : `${Math.floor(stats.diasDesdeUltima / 365)}a`}</div></div>
              <div style={kpi}><div style={{ fontSize: 12, color: '#7A776E' }}>⏳ A receber</div><div style={{ fontSize: 22, fontWeight: 500, marginTop: 2 }}>{money(stats?.valorAReceber)}</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12, marginTop: 12 }}>
              {/* Pets */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>🐾 Pets {pets.length > 0 && <span style={{ color: '#7A776E', fontWeight: 400 }}>({pets.length})</span>}</div>
                {pets.length === 0 && <div style={{ fontSize: 13, color: '#9A968C' }}>Nenhum pet vinculado.</div>}
                {pets.map((p, i) => (
                  <div key={p.id} onClick={() => router.push(`/dashboard/erp/pets/${p.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 0', borderBottom: i < pets.length - 1 ? '1px solid #F1EFE8' : 'none', cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F3EFE4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{speciesEmoji(p.species)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}{p.status && p.status !== 'ACTIVE' && <span style={{ fontSize: 11, color: '#A32D2D' }}> · inativo</span>}</div>
                      <div style={{ fontSize: 12, color: '#7A776E' }}>{[speciesLabel(p.species), p.breed, idade(p.birthDate), genderLabel(p.gender)].filter(Boolean).join(' · ')}</div>
                    </div>
                    {p.proximoFollowupAt && <span style={{ background: '#EAF3DE', color: '#3B6D11', fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>🩺 {fmtDataCurta(p.proximoFollowupAt)}</span>}
                  </div>
                ))}
              </div>

              {/* Share of wallet */}
              <div style={card}>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>🎯 Onde gasta (por marca)</div>
                {porMarca.length === 0 && <div style={{ fontSize: 13, color: '#9A968C' }}>Aparece quando houver compras registradas.</div>}
                {porMarca.map(s => {
                  const mi = marcaInfo(s.marca);
                  return (
                    <div key={s.marca} style={{ marginBottom: 11 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>{mi.emoji} {mi.label}</span>
                        <span style={{ color: '#7A776E' }}>{money(s.valor)} · {s.pct}%</span>
                      </div>
                      <div style={{ background: '#F1EFE8', borderRadius: 999, height: 8 }}><div style={{ width: `${s.pct}%`, height: 8, background: mi.bar, borderRadius: 999 }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Últimas compras */}
            <div style={{ ...card, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>🧾 Últimas compras</div>
                {compras.length > 0 && <span style={{ fontSize: 12, color: '#009AAC', cursor: 'pointer' }} onClick={() => setTab('compras')}>ver tudo →</span>}
              </div>
              {compras.length === 0 && <div style={{ fontSize: 13, color: '#9A968C' }}>Nenhuma compra registrada ainda.</div>}
              {compras.slice(0, 5).map((a, i) => (
                <div key={a.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: i < Math.min(compras.length, 5) - 1 ? '1px solid #F1EFE8' : 'none', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#7A776E', width: 52 }}>{fmtDataCurta(a.date)}</span>
                  <span style={{ flex: 1, fontSize: 13 }}>{a.description || a.type || 'Atendimento'}{a.pet?.name && <span style={{ color: '#7A776E' }}> · {a.pet.name}</span>}</span>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{money(a.value)}</span>
                </div>
              ))}
            </div>

            {/* Próximas ações */}
            <div style={{ background: '#FFF9EE', border: '1px solid #F3E4C6', borderRadius: 14, padding: '13px 16px', marginTop: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 7 }}>🔔 Próximas ações</div>
              <div style={{ fontSize: 13, color: '#5F5E5A', lineHeight: 1.9 }}>
                {client.birthDate && <div>🎂 Aniversário em <b>{fmtDataCurta(client.birthDate)}</b> — enviar mensagem</div>}
                {client.proximoFollowupAt && <div>📞 Follow-up em <b>{fmtDataCurta(client.proximoFollowupAt)}</b></div>}
                {stats && stats.futurasAgendadas > 0 && <div>📅 {stats.futurasAgendadas} agendamento(s) futuro(s)</div>}
                {stats && stats.valorAReceber > 0 && <div>⏳ Há valores a receber deste cliente</div>}
                {!client.birthDate && !client.proximoFollowupAt && !(stats && stats.futurasAgendadas > 0) && <div style={{ color: '#9A968C' }}>Nenhuma ação pendente no momento.</div>}
              </div>
            </div>
          </>
        )}

        {tab !== 'geral' && tab !== 'cadastro' && (
          <div style={{ ...card, marginTop: 14, textAlign: 'center', color: '#9A968C', padding: '32px 16px' }}>
            🚧 Esta aba entra na próxima etapa (Etapa B).
          </div>
        )}
      </div>

      {/* Modal status */}
      {statusModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setStatusModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 380, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Alterar status</h3>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => setSelectedStatus(key)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: 10, marginBottom: 6, border: selectedStatus === key ? '2px solid #009AAC' : '1px solid #E0DACB', background: selectedStatus === key ? '#F0FAFB' : '#fff', cursor: 'pointer' }}>{label}</button>
            ))}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setStatusModal(false)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleStatusChange} disabled={saving || selectedStatus === client.status} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#009AAC', color: '#fff', cursor: 'pointer', opacity: saving || selectedStatus === client.status ? 0.5 : 1 }}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tag */}
      {tagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setTagModal(false)}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 20, maxWidth: 380, width: '100%' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 500, marginBottom: 12 }}>Adicionar tag</h3>
            <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Nome da tag…" autoFocus
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #E0DACB', outline: 'none', fontSize: 14 }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button onClick={() => setTagModal(false)} style={{ padding: '8px 14px', borderRadius: 9, border: 'none', background: 'transparent', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleAddTag} disabled={saving || !newTag.trim()} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#009AAC', color: '#fff', cursor: 'pointer', opacity: saving || !newTag.trim() ? 0.5 : 1 }}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
