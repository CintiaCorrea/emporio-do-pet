// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/vacinacao/page.tsx
// Programacao de vacinacao no padrao Base44 (bege + emojis).
// Lista as doses previstas dos protocolos dos pets, com filtros e acoes.
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { openWhatsAppMeta } from '@/lib/actions/whatsapp';

// Paleta Base44 (mesmos tokens de app/(user)/dashboard/erp/caixa/page.tsx)
const TEAL = '#009AAC';      // acento / botao primario
const TEAL_DARK = '#014D5E'; // titulos / texto forte
const ORANGE = '#D85A30';    // coral
const GREEN = '#0f6e56';     // sucesso
const AMBER = '#8a6400';     // pendente
const BG = '#F6F2EA';        // fundo da pagina
const SOFT = '#FBF9F4';      // areas suaves
const TINT = '#E0F4F6';      // agua
const LINE = '#E8E2D6';      // borda do cartao
const DIV = '#F0EBE0';       // divisoria interna
const TXT = '#1F2A2E';       // corpo
const TXT2 = '#5C6B70';      // secundario
const TXT3 = '#8A989D';      // dica / rotulo

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

// Situacao/status -> pill visual
const pillDe = (d: Dose) => {
  const sit = String(d.situacao || '').toUpperCase();
  const st = String(d.status || '').toUpperCase();
  if (st === 'APLICADA') return { label: 'Aplicada', bg: '#E1F5EE', fg: GREEN };
  if (sit === 'ATRASADA') return { label: 'Atrasada', bg: '#FDECEC', fg: ORANGE };
  if (sit === 'SEM_RESPOSTA' || sit === 'SEM RESPOSTA') return { label: 'Sem resposta', bg: '#F0EBE0', fg: TXT2 };
  return { label: 'Pendente', bg: '#FBF3E3', fg: AMBER };
};

const thStyle: React.CSSProperties = { color: TXT3, fontWeight: 500, fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '.03em', padding: '8px', borderBottom: `1px solid ${LINE}`, textAlign: 'left' };
const tdStyle: React.CSSProperties = { padding: '10px 8px', borderBottom: `1px solid ${DIV}`, verticalAlign: 'middle' };
const inp: React.CSSProperties = { padding: '8px 10px', border: `1px solid ${LINE}`, borderRadius: 9, fontSize: 13, fontFamily: 'inherit', color: TXT, background: '#fff' };
const cardStyle: React.CSSProperties = { background: '#fff', border: `1px solid ${LINE}`, borderRadius: 13, padding: '14px 15px' };

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

  const kpi = (emoji: string, label: string, valor: number, fg: string, bg: string) => (
    <div style={{ ...cardStyle, flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 42, height: 42, borderRadius: 11, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{emoji}</div>
      <div>
        <div style={{ fontSize: 22, fontWeight: 500, color: fg, lineHeight: 1.1 }}>{valor}</div>
        <div style={{ fontSize: 12.5, color: TXT2, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );

  return (
    <div style={{ width: '100%', background: BG, minHeight: '100%' }}>
      <div style={{ width: '100%', padding: '20px 26px 60px', boxSizing: 'border-box' }}>

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, color: TEAL_DARK, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
            <span>💉</span> Programação de vacinação
          </h1>
          <p style={{ fontSize: 13, color: TXT2, margin: '5px 0 0' }}>Acompanhe as vacinas previstas, atrasadas e aplicadas dos pets.</p>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 16 }}>
          {kpi('⚠️', 'Atrasadas', resumo.atrasadas, ORANGE, '#FDECEC')}
          {kpi('⏳', 'Pendentes', resumo.pendentes, AMBER, '#FBF3E3')}
          {kpi('✅', 'Aplicadas', resumo.aplicadas, GREEN, '#E1F5EE')}
        </div>

        {/* Filtros */}
        <div style={{ ...cardStyle, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={{ fontSize: 11.5, color: TXT3, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Período</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} style={inp} />
                <span style={{ color: TXT3, fontSize: 12 }}>até</span>
                <input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} style={inp} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: TXT3, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Status</label>
              <select value={fStatus} onChange={(e) => setFStatus(e.target.value as StatusSel)} style={{ ...inp, minWidth: 130 }}>
                <option value="PENDENTE">A fazer</option>
                <option value="ATRASADA">Atrasadas</option>
                <option value="APLICADA">Aplicadas</option>
                <option value="all">Todas</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11.5, color: TXT3, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Tipo</label>
              <select value={fTipo} onChange={(e) => setFTipo(e.target.value as TipoSel)} style={{ ...inp, minWidth: 130 }}>
                <option value="VACINA">Vacinas</option>
                <option value="VERMIFUGO">Vermífugos</option>
                <option value="ECTOPARASITA">Ectoparasitas</option>
                <option value="all">Todos</option>
              </select>
            </div>
            <div style={{ flex: '1 1 180px', minWidth: 160 }}>
              <label style={{ fontSize: 11.5, color: TXT3, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.03em' }}>Busca</label>
              <input value={fSearch} onChange={(e) => setFSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') aplicar(); }} placeholder="Cliente, pet ou vacina…" style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={aplicar} style={{ background: TEAL, color: '#fff', border: 'none', fontSize: 12.5, fontWeight: 500, padding: '9px 16px', borderRadius: 9, cursor: 'pointer' }}>Aplicar</button>
              <button onClick={limpar} style={{ background: '#fff', color: TXT2, border: `1px solid ${LINE}`, fontSize: 12.5, fontWeight: 500, padding: '9px 14px', borderRadius: 9, cursor: 'pointer' }}>Limpar</button>
            </div>
          </div>
        </div>

        {/* Tabela */}
        <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
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
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: TXT2, padding: 26 }}>Carregando…</td></tr>
                )}
                {!loading && doses.length === 0 && (
                  <tr><td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: TXT3, padding: 34 }}>
                    <div style={{ fontSize: 28 }}>💉</div>
                    <p style={{ margin: '8px 0 0', color: TXT2 }}>Nenhuma vacina na programação para este filtro.</p>
                  </td></tr>
                )}
                {!loading && doses.map((d) => {
                  const pill = pillDe(d);
                  const atrasada = String(d.situacao || '').toUpperCase() === 'ATRASADA' && String(d.status || '').toUpperCase() !== 'APLICADA';
                  return (
                    <tr key={d.id}>
                      <td style={{ ...tdStyle, color: atrasada ? ORANGE : TXT, fontWeight: atrasada ? 500 : 400 }}>{fmtData(d.dataPrevista)}</td>
                      <td style={{ ...tdStyle, color: TXT }}>{d.tutorNome || '—'}</td>
                      <td style={{ ...tdStyle, color: TXT }}>
                        <span style={{ marginRight: 6 }}>{emojiEspecie(d.especie)}</span>{d.petNome || '—'}
                      </td>
                      <td style={{ ...tdStyle, color: TXT2 }}>{d.nomeProtocolo || '—'}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: pill.bg, color: pill.fg, whiteSpace: 'nowrap' }}>{pill.label}</span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {d.tutorPhone && (
                          <button onClick={() => openWhatsAppMeta(d.tutorPhone)} title="WhatsApp" style={{ border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', padding: '5px 9px', borderRadius: 8, fontSize: 14, lineHeight: 1, marginRight: 6 }}>📲</button>
                        )}
                        {d.petId ? (
                          <Link href={`/dashboard/erp/pets/${d.petId}?tab=vacinas`} title="Ficha do pet" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: `1px solid ${LINE}`, background: '#fff', cursor: 'pointer', padding: '5px 10px', borderRadius: 8, fontSize: 12.5, color: TEAL_DARK, textDecoration: 'none' }}>
                            <span style={{ fontSize: 14 }}>🐾</span> Ficha
                          </Link>
                        ) : (
                          <span style={{ color: TXT3, fontSize: 12 }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
