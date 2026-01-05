'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/protected/dashboard/Sidebar';
import MobileHeader from '@/components/protected/pipeline/new/MobileHeader';
import NewBoardHeader from '@/components/protected/pipeline/new/NewBoardHeader';
import ErrorMessage from '@/components/protected/pipeline/new/ErrorMessage';
import BoardForm from '@/components/protected/pipeline/new/BoardForm';
import BoardPreview from '@/components/protected/pipeline/new/BoardPreview';
import { BoardFormData } from '@/types/board-form';

export default function NewBoardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BoardFormData>({
    name: '',
    description: '',
    color: 'bg-blue-500',
    type: 'APPOINTMENT',
  });

  const toggleSidebar = () => {
    setSidebarOpen((prev) => !prev);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/boards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          type: formData.type,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar board');
      }

      router.push('/dashboard/crm/pipelines');
      
    } catch (error) {
      console.error('Erro ao criar board:', error);
      setError(error instanceof Error ? error.message : 'Erro ao criar board');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/20 to-purple-50/10 w-full overflow-hidden">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />
      
      {/* Main Content */}
      <div className={`min-h-screen transition-all duration-500 ${
        sidebarOpen ? 'ml-48 sm:ml-64' : 'ml-12 sm:ml-16'
      } w-[calc(100vw-3rem)] sm:w-[calc(100vw-4rem)]`}>
        
        <MobileHeader onToggleSidebar={toggleSidebar} />

        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <NewBoardHeader />
            
            <ErrorMessage error={error} />

            <BoardForm
              formData={formData}
              isLoading={isLoading}
              error={error}
              onFormDataChange={setFormData}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />

            <BoardPreview formData={formData} />
          </div>
        </div>
      </div>
    </div>
  );
}
