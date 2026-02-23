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
        const raw = await response.text();
        let message = response.statusText;
        try {
          const parsed = raw ? (JSON.parse(raw) as any) : null;
          const fromApi =
            parsed?.error ||
            (Array.isArray(parsed?.message) ? parsed.message.join(', ') : parsed?.message);
          if (typeof fromApi === 'string' && fromApi.trim().length > 0) {
            message = fromApi;
          } else if (raw && raw.trim().length > 0) {
            message = raw;
          }
        } catch {
          if (raw && raw.trim().length > 0) message = raw;
        }
        throw new Error(`Erro ${response.status}: ${message}`);
      }
      
      const data: ApiResponse = await response.json();
      
      if (data && Array.isArray(data.tutors)) {
        // Transform isActive (boolean) from backend to status ('active' | 'inactive') for frontend
        const transformedTutors = data.tutors.map((tutor: any) => ({
          ...tutor,
          status: tutor.isActive !== false ? 'active' : 'inactive',
        }));
        setTutors(transformedTutors);
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
