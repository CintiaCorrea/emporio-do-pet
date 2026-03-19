'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NewBoardHeader from '@/components/protected/pipeline/new/NewBoardHeader';
import ErrorMessage from '@/components/protected/pipeline/new/ErrorMessage';
import BoardForm from '@/components/protected/pipeline/new/BoardForm';
import BoardPreview from '@/components/protected/pipeline/new/BoardPreview';
import { BoardFormData, detectBoardTypeFromName } from '@/types/board-form';

export default function NewBoardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<BoardFormData>({
    name: '',
    description: '',
    color: 'bg-blue-500',
    type: 'TASK',
  });

  useEffect(() => {
    const detectedType = detectBoardTypeFromName(formData.name);
    if (detectedType !== formData.type) {
      setFormData(prev => ({ ...prev, type: detectedType }));
    }
  }, [formData.name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const boardType = detectBoardTypeFromName(formData.name);

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
          type: boardType,
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
  );
}
