'use client';

import { useState } from 'react';
import Sidebar from '@/components/protected/dashboard/Sidebar';
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

export default function TutorsListPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { tutors, loading, error, refetch } = useTutors();

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleDeleteTutor = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tutor?')) {
      try {
        const response = await fetch(`/api/tutors/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          refetch();
        } else {
          const errorData = await response.json();
          alert(errorData.error || 'Erro ao excluir tutor');
        }
      } catch (error) {
        console.error('Erro ao excluir tutor:', error);
        alert('Erro ao excluir tutor');
      }
    }
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
        <TutorsTable tutors={filteredTutors} onDeleteTutor={handleDeleteTutor} />
        <Pagination currentCount={filteredTutors.length} totalCount={tutors.length} />
      </>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
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
    </div>
  );
}
