// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/pacotes/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';

// Paleta Base44 "delicada" (mesmos tokens de caixa/page.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral
const GREEN = '#0f6e56';     // sucesso
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

interface Sessao { id: string; numero: number; data: string; profissional?: string | null; observacao?: string | null; appointmentId?: string | null; }
interface Pacote {
  id: string; petId: string; tutorId?: string | null; orcamentoId?: string | null;
  servico: string; descricao?: string | null; totalSessoes: number; sessoesUsadas: number;
  valor: number; validade?: string | null; status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO' | 'EXPIRADO';
  observacao?: string | null; createdAt: string; sessoes: Sessao[];
  pet?: { id: string; name: string } | null; tutor?: { id: string; name: string } | null;
}
interface Appointment { id: string; value: number; pet?: { name: string } | null; tutor?: { name: string } | null; start?: string; }

const brl = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number.isFinite(v) ? v : 0);
const dataLabel = (s?: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');
const hojeStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const statusInfo: Record<string, { label: string; bg: string; fg: string }> = {
  ATIVO: { label: 'Ativo', bg: '#E1F5EE', fg: GREEN },
  CONCLUIDO: { label: 'Concluído', bg: '#E0F4F6', fg: TEAL_DARK },
  CANCELADO: { label: 'Cancelado', bg: '#F0EBE0', fg: '#5C6B70' },
  EXPIRADO: { label: 'Expirado', bg: '#fef0e8', fg: ORANGE },
};

export default function PacotesPage() {
  usePageTitle('Pacotes', 'Pacotes de sessões (fisioterapia)');

  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tab, setTab] = useState<'ATIVO' | 'CONCLUIDO' | 'CANCELADO' | 'TODOS'>('ATIVO');
  const [loading, setLoading] = useState(true);
  const [ocultar, setOcultar] = useState(false);
  const money = (v: number) => (ocultar ? 'R$ ••••' : brl(v));

  const [novoOpen, setNovoOpen] = useState(false);
  const [novo, setNovo] = useState({ appointmentId: '', servico: 'Fisioterapia', totalSessoes: '', valor: '', validade: '', observacao: '' });
  const [sessaoOpen, setSessaoOpen] = useState(false);
  const [sel, setSel] = useState<Pacote | null>(null);
  const [sessaoForm, setSessaoForm] = useState({ profissional: '', observacao: '' });

  const fetchPacotes = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch('/api/pacotes', { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar pacotes');
      setPacotes(await r.json());
    } catch (e: any) { toast.error(e.message || 'Erro ao carregar pacotes'); } finally { setLoading(false); }
  }, []);

  const fetchAppointments = useCallback(async () => {
    try {
      const r = await fetch('/api/appointments?limit=1000', { cache: 'no-store' });
      if (!r.ok) return;
      const data = await r.json();
      const list: Appointment[] = (data.appointments || data.data || data || []).filter((a: any) => (a.start ? a.start.slice(0, 10) === hojeStr() : true));
      setAppointments(list);
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { fetchPacotes(); fetchAppointments(); }, [fetchPacotes, fetchAppointments]);

  const resumo = useMemo(() => {
    const ativos = pacotes.filter((p) => p.status === 'ATIVO');
    const restantes = ativos.reduce((s, p) => s + Math.max(0, p.totalSessoes - p.sessoesUsadas), 0);
    const valorAtivo = ativos.reduce((s, p) => s + Number(p.valor || 0), 0);
    return { ativos: ativos.length, restantes, valorAtivo };
  }, [pacotes]);

  const lista = useMemo(() => (tab === 'TODOS' ? pacotes : pacotes.filter((p) => p.status === tab)), [pacotes, tab]);

  const criarPacote = async () => {
    if (!novo.appointmentId) { toast.error('Selecione o cliente/pet'); return; }
    const total = Number(novo.totalSessoes);
    if (!total || total <= 0) { toast.error('Informe o nº de sessões'); return; }
    try {
      const r = await fetch('/api/pacotes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: novo.appointmentId, servico: novo.servico || 'Fisioterapia',
          totalSessoes: total, valor: Number(String(novo.valor).replace(',', '.')) || 0,
          validade: novo.validade || null, observacao: novo.observacao || null,
        }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao criar pacote'); }
      toast.success('Pacote criado!'); setNovoOpen(false);
      setNovo({ appointmentId: '', servico: 'Fisioterapia', totalSessoes: '', valor: '', validade: '', observacao: '' });
      await fetchPacotes();
    } catch (e: any) { toast.error(e.message || 'Erro ao criar pacote'); }
  };

  const abrirSessao = (p: Pacote) => { setSel(p); setSessaoForm({ profissional: '', observacao: '' }); setSessaoOpen(true); };
  const registrarSessao = async () => {
    if (!sel) return;
    try {
      const r = await fetch(`/api/pacotes/${sel.id}/sessao`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profissional: sessaoForm.profissional || null, observacao: sessaoForm.observacao || null }),
      });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || 'Erro ao registrar sessão'); }
      toast.success('Sessão registrada!'); setSessaoOpen(false); await fetchPacotes();
    } catch (e: any) { toast.error(e.message || 'Erro ao registrar sessão'); }
  };

  const cancelarPacote = async (p: Pacote) => {
    if (!confirm(`Cancelar o pacote de ${p.pet?.name || 'pet'}?`)) return;
    const r = await fetch(`/api/pacotes/${p.id}/cancelar`, { method: 'PATCH' });
    if (!r.ok) { toast.error('Erro ao cancelar'); return; }
    toast.success('Pacote cancelado'); await fetchPacotes();
  };
  const excluirPacote = async (p: Pacote) => {
    if (!confirm(`Excluir definitivamente este pacote? Esta ação não pode ser desfeita.`)) return;
    const r = await fetch(`/api/pacotes/${p.id}`, { method: 'DELETE' });
    if (!r.ok) { toast.error('Erro ao excluir'); return; }
    toast.success('Pacote excluído'); await fetchPacotes();
  };

  const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '14px 15px' };
  const cardH = (emoji: string, txt: string) => (
    <div style={{ fontSize: 13, fontWeight: 500, margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 7, color: TEAL_DARK }}>
      <span style={{ fontSize: 15 }}>{emoji}</span>{txt}
    </div>
  );
  const tabBtn = (id: typeof tab, label: string) => {
    const on = tab === id;
    return <button onClick={() => setTab(id)} style={{ fontSize: 13.5, color: on ? TEAL_DARK : TXT2, fontWeight: on ? 500 : 400, padding: '10px 2px', cursor: 'pointer', background: 'none', border: 'none', borderBottom: `2px solid ${on ? TEAL : 'transparent'}`, whiteSpace: 'nowrap' }}>{label}</button>;
  };

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <style>{`@media print { .no-print { display:none !important; } body { background:#fff; } }`}</style>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>

        <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={() => setOcultar((v) => !v)} title={ocultar ? 'Mostrar valores' : 'Esconder valores'} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, padding: '8px 12px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${LINE}`, background: '#fff', color: TEAL_DARK }}>
            <span style={{ fontSize: 14 }}>{ocultar ? '🙈' : '👁️'}</span>{ocultar ? 'Mostrar valores' : 'Esconder valores'}
          </button>
          <button onClick={() => setNovoOpen(true)} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><span>➕</span> Novo pacote</button>
        </div>

        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* COLUNA ESQUERDA */}
          <div style={{ width: 266, flex: '0 0 266px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={cardStyle}>
              {cardH('📦', 'Resumo')}
              <div style={{ fontSize: 12.5, lineHeight: 2, color: TXT }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEAL_DARK }}>Pacotes ativos</span><b style={{ fontWeight: 500 }}>{resumo.ativos}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEAL_DARK }}>Sessões restantes</span><b style={{ fontWeight: 500 }}>{resumo.restantes}</b></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: TEAL_DARK }}>Valor em ativos</span><b style={{ color: TEAL_DARK, fontWeight: 500 }}>{money(resumo.valorAtivo)}</b></div>
              </div>
            </div>
            <div className="no-print" style={cardStyle}>
              {cardH('⚙️', 'Ações')}
              <button onClick={() => setNovoOpen(true)} style={{ width: '100%', background: TEAL, color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, padding: '9px', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}><span>➕</span> Novo pacote</button>
              <p style={{ fontSize: 11, color: TXT3, margin: '9px 0 0' }}>A baixa de sessões também é feita ao confirmar o comparecimento do agendamento.</p>
            </div>
          </div>

          {/* AREA PRINCIPAL */}
          <div style={{ flex: '1 1 480px', minWidth: 0 }}>
            <div className="no-print" style={{ display: 'flex', gap: 26, borderBottom: `1px solid ${LINE}`, overflowX: 'auto' }}>
              {tabBtn('ATIVO', 'Ativos')}{tabBtn('CONCLUIDO', 'Concluídos')}{tabBtn('CANCELADO', 'Cancelados')}{tabBtn('TODOS', 'Todos')}
            </div>
            <div style={{ background: '#fff', border: `1px solid ${LINE}`, borderTop: 'none', borderRadius: '0 0 13px 13px', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loading && <p style={{ color: TXT2 }}>Carregando…</p>}
              {!loading && lista.length === 0 && <p style={{ color: TXT3, textAlign: 'center', padding: 18 }}>Nenhum pacote nesta aba.</p>}
              {lista.map((p) => {
                const st = statusInfo[p.status] || statusInfo.ATIVO;
                const restantes = Math.max(0, p.totalSessoes - p.sessoesUsadas);
                const pct = p.totalSessoes > 0 ? Math.min(100, Math.round((p.sessoesUsadas / p.totalSessoes) * 100)) : 0;
                const podeRegistrar = p.status === 'ATIVO' && restantes > 0;
                return (
                  <div key={p.id} style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 500, color: TXT, fontSize: 14 }}>{p.tutor?.name || 'Cliente'} · {p.pet?.name || 'Pet'}</span>
                      <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.fg }}>{st.label}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: TXT2, margin: '3px 0 9px' }}>{p.servico}{p.descricao ? ` — ${p.descricao}` : ''} · {money(Number(p.valor))}{p.validade ? ` · validade ${dataLabel(p.validade)}` : ''}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 8, background: DIV, borderRadius: 20, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: p.status === 'CANCELADO' ? '#8A989D' : TEAL, borderRadius: 20 }} />
                      </div>
                      <span style={{ fontSize: 12, color: TEAL_DARK, fontWeight: 500, whiteSpace: 'nowrap' }}>{p.sessoesUsadas} de {p.totalSessoes} sessões</span>
                    </div>
                    <div className="no-print" style={{ display: 'flex', gap: 8, marginTop: 11, flexWrap: 'wrap' }}>
                      {podeRegistrar && <button onClick={() => abrirSessao(p)} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><span>📅</span> Registrar sessão</button>}
                      {p.status === 'ATIVO' && <button onClick={() => cancelarPacote(p)} style={{ background: '#fff', color: ORANGE, border: `1px solid ${ORANGE}`, fontSize: 12, fontWeight: 500, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><span>🚫</span> Cancelar</button>}
                      <button onClick={() => excluirPacote(p)} title="Excluir" style={{ background: '#fff', color: TXT2, border: `1px solid ${LINE}`, fontSize: 12, fontWeight: 500, padding: '7px 10px', borderRadius: 8, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}><span>🗑️</span></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {novoOpen && (
        <Modal title="Novo pacote" onClose={() => setNovoOpen(false)} onConfirm={criarPacote} confirmLabel="Criar pacote">
          <Field label="Cliente / pet (pela venda do dia)">
            <select value={novo.appointmentId} onChange={(e) => setNovo({ ...novo, appointmentId: e.target.value })} style={inp}>
              <option value="">Selecione…</option>
              {appointments.map((a) => <option key={a.id} value={a.id}>{a.tutor?.name || 'Cliente'} · {a.pet?.name || 'Pet'}</option>)}
            </select>
          </Field>
          <Field label="Serviço"><input value={novo.servico} onChange={(e) => setNovo({ ...novo, servico: e.target.value })} style={inp} /></Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><Field label="Nº de sessões"><input value={novo.totalSessoes} onChange={(e) => setNovo({ ...novo, totalSessoes: e.target.value })} inputMode="numeric" placeholder="Ex: 10" style={inp} /></Field></div>
            <div style={{ flex: 1 }}><Field label="Valor total"><input value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} inputMode="decimal" placeholder="0,00" style={inp} /></Field></div>
          </div>
          <Field label="Validade (opcional)"><input type="date" value={novo.validade} onChange={(e) => setNovo({ ...novo, validade: e.target.value })} style={inp} /></Field>
          <Field label="Observação"><input value={novo.observacao} onChange={(e) => setNovo({ ...novo, observacao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}

      {sessaoOpen && sel && (
        <Modal title="Registrar sessão" onClose={() => setSessaoOpen(false)} onConfirm={registrarSessao} confirmLabel="Registrar sessão">
          <div style={{ display: 'flex', justifyContent: 'space-between', background: SOFT, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <span style={{ color: TXT }}>{sel.tutor?.name || 'Cliente'} · {sel.pet?.name || 'Pet'}</span>
            <span style={{ color: TXT2, fontSize: 12 }}>{sel.sessoesUsadas} de {sel.totalSessoes} feitas</span>
          </div>
          <Field label="Profissional"><input value={sessaoForm.profissional} onChange={(e) => setSessaoForm({ ...sessaoForm, profissional: e.target.value })} placeholder="Ex: Dra. Vivian" style={inp} /></Field>
          <Field label="Observação"><input value={sessaoForm.observacao} onChange={(e) => setSessaoForm({ ...sessaoForm, observacao: e.target.value })} style={inp} /></Field>
        </Modal>
      )}
    </div>
  );
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff', boxSizing: 'border-box' };
const lbl: React.CSSProperties = { fontSize: 13, color: TXT2, display: 'block', marginBottom: 6 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={lbl}>{label}</label>{children}</div>;
}

function Modal({ title, children, onClose, onConfirm, confirmLabel }: { title: string; children: React.ReactNode; onClose: () => void; onConfirm: () => void; confirmLabel: string }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ position: 'fixed', inset: 0, background: 'rgba(1,43,46,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 50 }}>
      <div style={{ background: SOFT, border: `1px solid ${LINE}`, borderRadius: 16, width: '100%', maxWidth: 430, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 18px', borderBottom: `1px solid ${DIV}` }}>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: 0, color: TEAL_DARK }}>{title}</h3>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: TXT3, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 13 }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: '15px 18px', borderTop: `1px solid ${DIV}` }}>
          <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 9, border: `1px solid ${LINE}`, background: '#fff', color: TXT2, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={onConfirm} style={{ padding: '9px 18px', borderRadius: 9, border: 'none', color: '#fff', fontWeight: 500, cursor: 'pointer', background: TEAL }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
