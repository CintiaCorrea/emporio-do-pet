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
      
      const data: Tutor = await response.json();
      // Backward compatible: se o backend ainda não retornar isActive, assume Ativo
      const normalized = {
        ...data,
        isActive: (data as any)?.isActive !== false,
      } as Tutor;
      setTutor(normalized);
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
