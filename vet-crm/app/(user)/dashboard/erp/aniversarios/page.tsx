// DESTINO NO REPO: vet-crm/app/(user)/dashboard/erp/aniversarios/page.tsx
// Aniversarios no padrao Base44 "delicada": lista de clientes e pets que
// fazem aniversario no mes, agrupada por dia, com WhatsApp e ficha.
// Apresentacao migrada para o KIT @/components/ui/base44 (logica intacta).
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { usePageTitle } from '@/lib/ui/PageHeaderContext';
import { openWhatsAppMeta } from '@/lib/actions/whatsapp';
import {
  B44, B44_TONES, PageShell, HeaderCard, Card, Kpi, KpiGrid, Btn, Avatar, EmptyState,
} from '@/components/ui/base44';

type Tipo = 'CLIENTE' | 'PET';
interface Item {
  tipo: Tipo;
  id: string;
  nome: string;
  dia: number;
  birthDate?: string | null;
  idade?: number | null;
  tutorId?: string | null;
  tutorNome?: string | null;
  especie?: string | null;
  telefone?: string | null;
}
interface Resposta {
  month: number;
  total: number;
  clientes: number;
  pets: number;
  itens: Item[];
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

type Filtro = 'TODOS' | 'CLIENTE' | 'PET';

export default function AniversariosPage() {
  usePageTitle('Aniversários', 'Clientes e pets que fazem aniversário');

  const hoje = new Date();
  const [month, setMonth] = useState(hoje.getMonth() + 1); // 1..12
  const [data, setData] = useState<Resposta | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('TODOS');

  const ehMesAtual = month === hoje.getMonth() + 1;
  const diaHoje = hoje.getDate();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/aniversarios?month=${month}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('Erro ao carregar aniversários');
      const d: Resposta = await r.json();
      setData(d);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao carregar aniversários');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mudarMes = (delta: number) => setMonth((m) => ((m - 1 + delta + 12) % 12) + 1);

  const itensFiltrados = useMemo(() => {
    const itens = data?.itens || [];
    if (filtro === 'TODOS') return itens;
    return itens.filter((i) => i.tipo === filtro);
  }, [data, filtro]);

  // agrupa por dia (ordenado)
  const grupos = useMemo(() => {
    const map = new Map<number, Item[]>();
    itensFiltrados.forEach((it) => {
      const arr = map.get(it.dia) || [];
      arr.push(it);
      map.set(it.dia, arr);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([dia, itens]) => ({ dia, itens: itens.slice().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')) }));
  }, [itensFiltrados]);

  // chip de filtro usando tokens do kit (ativo = tint + navy)
  const chip = (id: Filtro, label: string) => {
    const on = filtro === id;
    return (
      <Btn
        variant="soft"
        onClick={() => setFiltro(id)}
        style={{
          padding: '7px 14px', borderRadius: 20, fontSize: 12.5,
          background: on ? B44.tint : '#fff',
          color: on ? B44.navy : B44.text2,
          border: on ? `1.5px solid ${B44.primary}` : `1px solid ${B44.line}`,
        }}
      >
        {label}
      </Btn>
    );
  };

  return (
    <PageShell pad="p-6">
      <div style={{ width: '100%', maxWidth: 820, margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Cabecalho da tela: titulo + seletor de mes + "Este mes" */}
        <HeaderCard>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 500, color: B44.navy, margin: 0, display: 'flex', alignItems: 'center', gap: 9 }}>
                <span>🎂</span> Aniversários
              </h1>
              <p style={{ fontSize: 13.5, color: B44.text2, margin: '4px 0 0' }}>Clientes e pets que fazem aniversário</p>
            </div>

            {/* Seletor de mes */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${B44.line}`, borderRadius: 9, overflow: 'hidden', background: '#fff' }}>
                <button onClick={() => mudarMes(-1)} style={{ border: 'none', background: '#fff', padding: '6px 14px', color: B44.navy, cursor: 'pointer', fontSize: 18, lineHeight: 1 }} aria-label="Mês anterior">‹</button>
                <span style={{ fontSize: 13.5, fontWeight: 500, padding: '0 14px', color: B44.text1, minWidth: 100, textAlign: 'center' }}>{MESES[month - 1]}</span>
                <button onClick={() => mudarMes(1)} style={{ border: 'none', background: '#fff', padding: '6px 14px', color: B44.navy, cursor: 'pointer', fontSize: 18, lineHeight: 1 }} aria-label="Próximo mês">›</button>
              </div>
              {!ehMesAtual && (
                <Btn variant="ghost" onClick={() => setMonth(hoje.getMonth() + 1)}>Este mês</Btn>
              )}
            </div>
          </div>
        </HeaderCard>

        {/* KPIs */}
        <div style={{ marginBottom: 16 }}>
          <KpiGrid min={150}>
            <Kpi emoji="🎂" label="Total do mês" value={data?.total || 0} />
            <Kpi emoji="👤" label="Clientes" value={data?.clientes || 0} />
            <Kpi emoji="🐾" label="Pets" value={data?.pets || 0} />
          </KpiGrid>
        </div>

        {/* Chips de filtro */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
          {chip('TODOS', 'Todos')}
          {chip('CLIENTE', '👤 Clientes')}
          {chip('PET', '🐾 Pets')}
        </div>

        {loading && <p style={{ color: B44.text2 }}>Carregando…</p>}

        {!loading && grupos.length === 0 && (
          <Card pad="44px">
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 34 }}>🎈</div>
              <EmptyState className="!py-0" >
                Nenhum aniversariante neste mês.
                <br />
                <span style={{ fontSize: 13 }}>Navegue pelos meses para ver as datas.</span>
              </EmptyState>
            </div>
          </Card>
        )}

        {!loading && grupos.map(({ dia, itens }) => {
          const ehHoje = ehMesAtual && dia === diaHoje;
          return (
            <div key={dia} style={{ marginBottom: 18 }}>
              {/* Cabecalho do dia (destaque "hoje" com B44.tint) */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 9, marginBottom: 8,
                background: ehHoje ? B44.tint : B44.soft, border: `1px solid ${ehHoje ? B44.primary : B44.lineSoft}`,
              }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: B44.navy }}>Dia {dia}</span>
                {ehHoje && <span style={{ fontSize: 11, fontWeight: 500, color: '#fff', background: B44.primary, padding: '2px 9px', borderRadius: 20 }}>Hoje 🎉</span>}
                <span style={{ fontSize: 12, color: B44.text3, marginLeft: 'auto' }}>{itens.length} {itens.length === 1 ? 'aniversariante' : 'aniversariantes'}</span>
              </div>

              <Card pad="0" className="overflow-hidden">
                {itens.map((it, i) => {
                  const ehPet = it.tipo === 'PET';
                  const fichaHref = ehPet ? `/dashboard/erp/pets/${it.id}` : `/dashboard/erp/tutores/${it.id}`;
                  return (
                    <div key={`${it.tipo}-${it.id}`} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 15px',
                      borderTop: i === 0 ? 'none' : `1px solid ${B44.lineSoft}`,
                    }}>
                      {/* avatar do kit */}
                      {ehPet
                        ? <Avatar kind="pet" species={it.especie ?? undefined} size={38} />
                        : <Avatar kind="client" name={it.nome} size={38} />}

                      {/* dados */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: B44.text1, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {it.nome}
                          {ehPet && it.tutorNome && <span style={{ color: B44.text3, fontWeight: 400 }}> · tutor: {it.tutorNome}</span>}
                        </div>
                        <div style={{ fontSize: 12, color: B44.text2, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, fontWeight: 500, color: ehPet ? B44.text2 : B44.navy, background: ehPet ? B44.lineSoft : B44.tint, padding: '1px 8px', borderRadius: 20 }}>
                            {ehPet ? '🐾 Pet' : '👤 Cliente'}
                          </span>
                          {it.idade != null && <span>faz {it.idade} {it.idade === 1 ? 'ano' : 'anos'}</span>}
                        </div>
                      </div>

                      {/* acoes */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto' }}>
                        {it.telefone && (
                          <Btn
                            variant="ghost"
                            onClick={() => openWhatsAppMeta(it.telefone)}
                            title="Enviar WhatsApp"
                            style={{ color: B44_TONES.ok.color, borderColor: B44_TONES.ok.color, padding: '7px 11px' }}
                          >
                            <span>📲</span> WhatsApp
                          </Btn>
                        )}
                        <Link
                          href={fichaHref}
                          title="Ver ficha"
                          className="inline-flex items-center gap-1.5 hover:border-[#009AAC] hover:text-[#009AAC]"
                          style={{ fontSize: 12.5, fontWeight: 500, padding: '7px 11px', borderRadius: B44.rSm, border: `1px solid ${B44.line}`, background: '#fff', color: B44.navy, textDecoration: 'none' }}
                        >
                          <span>🔗</span> Ver ficha
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </Card>
            </div>
          );
        })}

      </div>
    </PageShell>
  );
}
