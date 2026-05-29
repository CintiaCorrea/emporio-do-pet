'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import BoardFormHeader from '@/components/protected/pipeline/shared/BoardFormHeader';
import ErrorMessage from '@/components/protected/pipeline/new/ErrorMessage';
import BoardForm from '@/components/protected/pipeline/new/BoardForm';
import BoardPreview from '@/components/protected/pipeline/new/BoardPreview';
import { useBoard } from '@/hooks/useBoard';
import { BoardFormData } from '@/types/board-form';

export default function EditBoardPage() {
  const router = useRouter();
  const params = useParams();
  const boardId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<BoardFormData>({
    name: '',
    description: '',
    color: 'bg-blue-500',
    type: 'APPOINTMENT'});

  // Buscar dados do board
  const { board, loading: loadingBoard, error: loadError } = useBoard(boardId);

  // Preencher formulário quando os dados forem carregados
  useEffect(() => {
    if (board) {
      setFormData(board);
    }
  }, [board]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: 'PUT', // ou PATCH, dependendo da sua API
        headers: {
          'Content-Type': 'application/json'},
        credentials: 'include',
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          color: formData.color,
          type: formData.type})});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar board');
      }

      router.push('/dashboard/crm/pipelines');
      router.refresh(); // Atualizar dados da página
      
    } catch (error) {
      console.error('Erro ao atualizar board:', error);
      setError(error instanceof Error ? error.message : 'Erro ao atualizar board');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  // Loading state para carregamento inicial
  if (loadingBoard) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="flex items-center gap-3 text-gray-600">
              <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <span>Carregando board...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state para erro no carregamento
  if (loadError) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Erro ao carregar board</h3>
            <p className="text-red-600 mb-4">{loadError}</p>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Voltar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <BoardFormHeader
          title="Editar Board"
          description="Atualize as informações do seu pipeline"
          backHref="/dashboard/crm/pipelines"
        />
        
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
