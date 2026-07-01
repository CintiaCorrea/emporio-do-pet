'use client';

// Rota antiga da ficha do cliente. A ficha canônica é erp/tutores/[id].
// Mantida como redirect para evitar duas fichas divergentes.

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => { router.replace(`/dashboard/erp/tutores/${id}`); }, [id, router]);
  return <div style={{ padding: 24, textAlign: 'center', color: '#7A776E' }}>Abrindo a ficha do cliente…</div>;
}
