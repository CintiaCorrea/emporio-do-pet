'use client';

import { useState } from 'react';
import { useTutors } from '@/hooks/useTutors';
import TutorsHeader from '@/components/protected/dashboard/tutors/TutorsHeader';
import SearchAndFilters from '@/components/protected/dashboard/tutors/SearchAndFilters';
import LoadingState from '@/components/protected/dashboard/tutors/LoadingState';
import ErrorState from '@/components/protected/dashboard/tutors/ErrorState';
import EmptyState from '@/components/protected/dashboard/tutors/EmptyState';
import TutorsTable from '@/components/protected/dashboard/tutors/TutorsTable';
import Pagination from '@/components/protected/dashboard/tutors/Pagination';
import { Tutor } from '@/types/tutor';
import { getPrimaryPhone } from '@/utils/formatters-tutors';
import ConfirmDeleteModal from '@/components/common/ConfirmDeleteModal';
import toast from 'react-hot-toast';

export default function TutorsListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [tutorToDelete, setTutorToDelete] = useState<Tutor | null>(null);

  const { tutors, loading, error, refetch } = useTutors();

  const handleRequestDeleteTutor = (tutor: Tutor) => {
    setTutorToDelete(tutor);
  };

  const confirmDeleteTutor = async () => {
    if (!tutorToDelete) return;

    const res = await fetch(`/api/tutors/${tutorToDelete.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      const message =
        (data && (data.error || (Array.isArray(data.message) ? data.message.join(', ') : data.message))) ||
        'Erro ao excluir tutor';
      throw new Error(message);
    }

    await refetch();
    toast.success('Tutor excluído com sucesso!');
    setTutorToDelete(null);
  };

  // Filtrar tutores
  const filteredTutors = tutors.filter(tutor => {
    const name = tutor.name || '';
    const cpf = tutor.cpf || '';
    const phone = getPrimaryPhone(tutor.contacts || []);
    
    const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cpf.includes(searchTerm) ||
                         phone.includes(searchTerm);
    
    const matchesStatus = filterStatus === 'all' || tutor.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const renderContent = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (tutors.length === 0) return <EmptyState type="no-tutors" />;
    if (filteredTutors.length === 0) return <EmptyState type="no-results" searchTerm={searchTerm} />;
    
    return (
      <>
        <TutorsTable tutors={filteredTutors} onDeleteTutor={handleRequestDeleteTutor} />
        <Pagination currentCount={filteredTutors.length} totalCount={tutors.length} />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <ConfirmDeleteModal
        isOpen={Boolean(tutorToDelete)}
        entityLabel="Tutor"
        itemName={tutorToDelete?.name || '—'}
        consequenceText="Esta ação não pode ser desfeita. Os dados do tutor serão removidos."
        onClose={() => setTutorToDelete(null)}
        onConfirm={confirmDeleteTutor}
      />
      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
            <TutorsHeader />

            {/* Filtros e Busca */}
            {!loading && tutors.length > 0 && (
              <SearchAndFilters
                searchTerm={searchTerm}
                filterStatus={filterStatus}
                onSearchChange={setSearchTerm}
                onFilterChange={setFilterStatus}
              />
            )}

            {/* Tabela de Tutores */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              {renderContent()}
            </div>
        </div>
      </div>
    </div>
  );
}
