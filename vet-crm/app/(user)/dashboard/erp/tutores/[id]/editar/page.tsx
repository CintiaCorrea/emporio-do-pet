'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import { useTutorEdit } from '@/hooks/useTutorEdit';
import LoadingState from '@/components/protected/dashboard/tutors/edit/LoadingState';
import ErrorState from '@/components/protected/dashboard/tutors/edit/ErrorState';
import EditTutorHeader from '@/components/protected/dashboard/tutors/edit/EditTutorHeader';
import AlertMessages from '@/components/protected/dashboard/tutors/edit/AlertMessages';
import TutorTabs from '@/components/protected/dashboard/tutors/edit/TutorTabs';
import GeneralTab from '@/components/protected/dashboard/tutors/edit/tabs/GeneralTab';
import AddressTab from '@/components/protected/dashboard/tutors/edit/tabs/AddressTab';
import ExtrasTab from '@/components/protected/dashboard/tutors/edit/tabs/ExtrasTab';
import FormActions from '@/components/protected/dashboard/tutors/edit/FormActions';
import { formatDateForInput } from '@/utils/tutor-formatters';

export default function EditTutorPage() {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'geral' | 'endereco' | 'extras'>('geral');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tutorId = params.id as string;
  const { 
    tutor, 
    loading, 
    error, 
    refetch, 
    updateTutor, 
    updateContact, 
    addContact, 
    removeContact, 
    setPrimaryContact 
  } = useTutorEdit(tutorId);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tutor) return;

    try {
      setSaving(true);
      setSubmitError(null);
      setSuccess(false);

      if (!tutor.name.trim()) {
        throw new Error('Nome é obrigatório');
      }

      const validContacts = tutor.contacts.filter(contact => contact.number.trim());
      if (validContacts.length === 0) {
        throw new Error('Pelo menos um contato com número é necessário');
      }

      const payload = {
        ...tutor,
        contacts: validContacts,
        tags: tutor.tags || [],
        birthDate: tutor.birthDate ? new Date(tutor.birthDate).toISOString() : undefined,
        formDate: tutor.formDate ? new Date(tutor.formDate).toISOString() : undefined,
        inclusionDate: tutor.inclusionDate ? new Date(tutor.inclusionDate).toISOString() : undefined,
      };

      const response = await fetch(`/api/tutors/${tutor.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar tutor');
      }

      setSuccess(true);
      
      setTimeout(() => {
        router.push(`/dashboard/erp/tutores/${tutor.id}`);
      }, 1500);

    } catch (error) {
      console.error('Erro ao atualizar tutor:', error);
      setSubmitError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <LoadingState />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tutor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
        <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
        <div className={`min-h-screen transition-all duration-500 ${
          sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
        } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <ErrorState 
                error={error || 'Tutor não encontrado'} 
                onRetry={refetch}
                tutorId={tutorId}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/20 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <EditTutorHeader tutorName={tutor.name} tutorId={tutor.id} />
            
            <AlertMessages 
              error={submitError} 
              success={success} 
              onDismissError={() => setSubmitError(null)} 
            />

            {/* Main Card */}
            <div className="bg-white/95 backdrop-blur-2xl border border-white/20 rounded-3xl shadow-2xl shadow-blue-500/10 overflow-hidden">
              <TutorTabs activeTab={activeTab} onTabChange={setActiveTab} />

              <form onSubmit={handleSubmit} className="p-8">
                {activeTab === 'geral' && (
                  <GeneralTab
                    tutor={tutor}
                    onTutorChange={updateTutor}
                    onContactChange={updateContact}
                    onAddContact={addContact}
                    onRemoveContact={removeContact}
                    onSetPrimaryContact={setPrimaryContact}
                  />
                )}

                {activeTab === 'endereco' && (
                  <AddressTab
                    tutor={tutor}
                    onTutorChange={updateTutor}
                  />
                )}

                {activeTab === 'extras' && (
                  <ExtrasTab
                    tutor={tutor}
                    onTutorChange={updateTutor}
                  />
                )}

                <FormActions saving={saving} tutorId={tutor.id} />
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
