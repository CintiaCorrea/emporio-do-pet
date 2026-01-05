import { useState, useEffect } from 'react';
import { Tutor } from '@/types/tutor-detail';

export function useTutorDetail(tutorId: string) {
  const [tutor, setTutor] = useState<Tutor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutor = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/tutors/${tutorId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Tutor não encontrado');
        }
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data: Tutor = await response.json();
      setTutor(data);
    } catch (error) {
      console.error('Erro ao buscar tutor:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tutorId) {
      fetchTutor();
    }
  }, [tutorId]);

  return {
    tutor,
    loading,
    error,
    refetch: fetchTutor,
  };
}
