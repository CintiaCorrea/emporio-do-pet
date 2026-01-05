'use client';

import { useState } from 'react'; // ← Adicione esta importação
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { useTutorDetail } from '@/hooks/useTutorDetail';
import LoadingState from '@/components/protected/dashboard/tutors/detail/LoadingState';
import ErrorState from '@/components/protected/dashboard/tutors/detail/ErrorState';
import TutorDetailHeader from '@/components/protected/dashboard/tutors/detail/TutorDetailHeader';
import PersonalInfoSection from '@/components/protected/dashboard/tutors/detail/sections/PersonalInfoSection';
import EmailSection from '@/components/protected/dashboard/tutors/detail/sections/EmailSection';
import ContactsSection from '@/components/protected/dashboard/tutors/detail/sections/ContactsSection';
import AddressSection from '@/components/protected/dashboard/tutors/detail/sections/AdditionalSections';
import StatusSidebar from '@/components/protected/dashboard/tutors/detail/sidebar/StatusSidebar';
import AdditionalSections from '@/components/protected/dashboard/tutors/detail/sections/AdditionalSections';

export default function TutorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tutorId = params.id as string;
  const { tutor, loading, error, refetch } = useTutorDetail(tutorId);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleDeleteTutor = async () => {
    if (!tutor) return;

    if (confirm(`Tem certeza que deseja excluir o tutor "${tutor.name}"?`)) {
      try {
        const response = await fetch(`/api/tutors/${tutor.id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          router.push('/dashboard/erp/tutores');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } overflow-hidden`}>
          <div className="p-4 sm:p-6 h-full overflow-hidden">
            <div className="max-w-6xl mx-auto h-full overflow-hidden">
              <LoadingState />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } overflow-hidden`}>
          <div className="p-4 sm:p-6 h-full overflow-hidden">
            <div className="max-w-6xl mx-auto h-full overflow-hidden">
              <ErrorState error={error || 'Tutor não encontrado'} onRetry={refetch} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } overflow-hidden`}>
        <div className="p-4 sm:p-6 h-full overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            <TutorDetailHeader tutor={tutor} onDelete={handleDeleteTutor} />

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
              {/* Coluna Principal */}
              <div className="xl:col-span-2 space-y-4 sm:space-y-6">
                <PersonalInfoSection tutor={tutor} />
                <EmailSection tutor={tutor} />
                <ContactsSection contacts={tutor.contacts} />
                <AddressSection tutor={tutor} />
                <AdditionalSections tutor={tutor} />
              </div>

              {/* Coluna Lateral */}
              <StatusSidebar tutor={tutor} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
