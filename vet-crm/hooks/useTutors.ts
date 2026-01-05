import { useState, useEffect } from 'react';
import { Tutor, ApiResponse } from '@/types/tutor';

export function useTutors() {
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tutors');
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data && Array.isArray(data.tutors)) {
        setTutors(data.tutors);
      } else {
        console.warn('Estrutura de dados inesperada:', data);
        setTutors([]);
      }
    } catch (error) {
      console.error('Erro ao buscar tutores:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao carregar tutores');
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTutors();
  }, []);

  return { tutors, loading, error, refetch: fetchTutors };
}
