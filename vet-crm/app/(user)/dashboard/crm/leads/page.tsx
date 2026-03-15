'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  LuUsers, LuUserPlus, LuSearch, LuFilter, LuLoader,
  LuTarget, LuFlame, LuTrash2, LuEye, LuPenLine,
  LuArrowUpDown, LuChevronLeft, LuChevronRight, LuRefreshCw,
  LuArrowRightLeft, LuPlus, LuX
} from 'react-icons/lu';
import toast from 'react-hot-toast';
import type { Lead, LeadStatus, LeadSource, LeadFilters } from '@/types/crm';
import {
  LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS,
  getScoreColor, getScoreLabel, getStatusColor
} from '@/types/crm';

export default function LeadsListPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; byStatus: Record<string, number>; averageScore: number; hotLeads: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filters, setFilters] = useState<LeadFilters>({
    page: 1,
    limit: 20,
    search: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const [showFilters, setShowFilters] = useState(false);

  const buildQueryString = useCallback((f: LeadFilters) => {
    const params = new URLSearchParams();
    if (f.page) params.set('page', f.page.toString());
    if (f.limit) params.set('limit', f.limit.toString());
    if (f.search) params.set('search', f.search);
    if (f.status) params.set('status', f.status);
    if (f.source) params.set('source', f.source);
    if (f.minScore !== undefined) params.set('minScore', f.minScore.toString());
    if (f.maxScore !== undefined) params.set('maxScore', f.maxScore.toString());
    if (f.tag) params.set('tag', f.tag);
    if (f.sortBy) params.set('sortBy', f.sortBy);
    if (f.sortOrder) params.set('sortOrder', f.sortOrder);
    if (f.hasInsights) params.set('hasInsights', 'true');
    if (f.hotOnly) params.set('hotOnly', 'true');
    return params.toString();
  }, []);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const qs = buildQueryString(filters);
      const response = await fetch(`/api/leads?${qs}`);
      if (!response.ok) throw new Error('Erro ao carregar leads');
      const data = await response.json();
      if (Array.isArray(data)) {
        setLeads(data);
        setTotal(data.length);
      } else {
        const leadsList = Array.isArray(data.leads)
          ? data.leads
          : Array.isArray(data.data)
            ? data.data
            : [];

        const totalCount =
          typeof data.pagination?.total === 'number'
            ? data.pagination.total
            : typeof data.total === 'number'
              ? data.total
              : leadsList.length;

        setLeads(leadsList);
        setTotal(totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  }, [filters, buildQueryString]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/leads/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch { /* stats are optional */ }
  }, []);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/leads/${deleteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Erro ao deletar lead');
      toast.success('Lead removido com sucesso');
      setDeleteId(null);
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao deletar');
    } finally {
      setDeleting(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error('Erro ao converter lead');
      toast.success('Lead convertido para cliente!');
      fetchLeads();
      fetchStats();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao converter');
    }
  };

  const totalPages = Math.ceil(total / (filters.limit || 20));

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Leads
            </h1>
            <p className="text-gray-500 mt-1">Gerencie todos os seus leads</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => { fetchLeads(); fetchStats(); }} className="p-2 rounded-xl bg-white/80 border border-gray-200/80 hover:bg-white transition-all">
              <LuRefreshCw className="w-5 h-5 text-gray-600" />
            </button>
            <Link href="/dashboard/crm/leads/novo" className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/25">
              <LuPlus className="w-4 h-4" />
              Novo Lead
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl"><LuUsers className="w-5 h-5 text-blue-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl"><LuUserPlus className="w-5 h-5 text-green-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Novos</p>
                  <p className="text-xl font-bold text-gray-900">{stats.byStatus?.NEW || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl"><LuTarget className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Qualificados</p>
                  <p className="text-xl font-bold text-gray-900">{stats.byStatus?.QUALIFIED || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-2xl p-4 shadow-md">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-xl"><LuFlame className="w-5 h-5 text-red-600" /></div>
                <div>
                  <p className="text-xs text-gray-500">Hot (70+)</p>
                  <p className="text-xl font-bold text-gray-900">{stats.hotLeads || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl p-4 shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, email ou telefone..."
                value={filters.search || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                className="w-full pl-10 pr-4 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-300 outline-none transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white/80 border-gray-200/80 text-gray-600 hover:bg-gray-50'}`}
            >
              <LuFilter className="w-4 h-4" />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, status: (e.target.value || undefined) as LeadStatus | undefined, page: 1 }))}
                className="px-3 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="">Todos os status</option>
                {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                value={filters.source || ''}
                onChange={(e) => setFilters(prev => ({ ...prev, source: (e.target.value || undefined) as LeadSource | undefined, page: 1 }))}
                className="px-3 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="">Todas as origens</option>
                {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>

              <select
                value={filters.sortBy || 'createdAt'}
                onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as LeadFilters['sortBy'] }))}
                className="px-3 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl focus:ring-2 focus:ring-blue-500/50 outline-none"
              >
                <option value="createdAt">Data de criação</option>
                <option value="updatedAt">Última atualização</option>
                <option value="currentScore">Score</option>
                <option value="lastSeenAt">Último acesso</option>
                <option value="name">Nome</option>
              </select>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                  className="flex items-center gap-1 px-3 py-2.5 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-gray-50 transition-all"
                >
                  <LuArrowUpDown className="w-4 h-4" />
                  {filters.sortOrder === 'asc' ? 'Crescente' : 'Decrescente'}
                </button>
                <button
                  onClick={() => setFilters({ page: 1, limit: 20, search: '', sortBy: 'createdAt', sortOrder: 'desc' })}
                  className="p-2.5 bg-white/80 border border-gray-200/80 rounded-2xl hover:bg-red-50 hover:border-red-200 transition-all"
                  title="Limpar filtros"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <LuLoader className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-500">Carregando leads...</span>
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="text-red-600 font-semibold">Erro ao carregar</div>
              <div className="text-gray-500 mt-1">{error}</div>
              <button onClick={fetchLeads} className="mt-3 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700">Tentar novamente</button>
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-20">
              <LuUserPlus className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-semibold text-gray-600">Nenhum lead encontrado</p>
              <p className="text-gray-400 mt-1">Crie seu primeiro lead ou ajuste os filtros</p>
              <Link href="/dashboard/crm/leads/novo" className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl hover:scale-105 transition-all">
                <LuPlus className="w-4 h-4" /> Novo Lead
              </Link>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100">
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Lead</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Contato</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Origem</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Score</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="text-left py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Último Acesso</th>
                      <th className="text-right py-3 px-5 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors">
                        <td className="py-3 px-5">
                          <Link href={`/dashboard/crm/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {lead.name || 'Sem nome'}
                          </Link>
                          {lead.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {lead.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-xs px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">{tag}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-5">
                          <div className="text-sm text-gray-700">{lead.email}</div>
                          {lead.phone && <div className="text-xs text-gray-400">{lead.phone}</div>}
                        </td>
                        <td className="py-3 px-5">
                          <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {LEAD_SOURCE_LABELS[lead.source] || lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-bold border ${getScoreColor(lead.currentScore)}`}>
                            {lead.currentScore}
                            <span className="font-normal hidden lg:inline">· {getScoreLabel(lead.currentScore)}</span>
                          </span>
                        </td>
                        <td className="py-3 px-5">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${getStatusColor(lead.status)}`}>
                            {LEAD_STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-500">
                          {new Date(lead.lastSeenAt).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-3 px-5">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/dashboard/crm/leads/${lead.id}`} className="p-2 rounded-xl hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-all" title="Ver detalhes">
                              <LuEye className="w-4 h-4" />
                            </Link>
                            {lead.status !== 'CONVERTED' && lead.status !== 'LOST' && (
                              <button onClick={() => handleConvert(lead.id)} className="p-2 rounded-xl hover:bg-green-100 text-gray-400 hover:text-green-600 transition-all" title="Converter para cliente">
                                <LuArrowRightLeft className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setDeleteId(lead.id)} className="p-2 rounded-xl hover:bg-red-100 text-gray-400 hover:text-red-600 transition-all" title="Excluir">
                              <LuTrash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Mostrando {((filters.page || 1) - 1) * (filters.limit || 20) + 1} - {Math.min((filters.page || 1) * (filters.limit || 20), total)} de {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.max((prev.page || 1) - 1, 1) }))}
                      disabled={(filters.page || 1) <= 1}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <LuChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-sm text-gray-600 px-3">
                      {filters.page || 1} / {totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: Math.min((prev.page || 1) + 1, totalPages) }))}
                      disabled={(filters.page || 1) >= totalPages}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      <LuChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-gray-900">Confirmar exclusão</h3>
            <p className="text-gray-600 mt-2">Tem certeza que deseja excluir este lead? Esta ação não pode ser desfeita.</p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl hover:scale-105 transition-all disabled:opacity-50"
              >
                {deleting ? <LuLoader className="w-4 h-4 animate-spin" /> : <LuTrash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
