'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from './api';
import type { PaperType } from '@/types';

export function usePaperTypes() {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<PaperType[]>('/paper-types');
      setPaperTypes(data);
      setError('');
    } catch {
      setError('Error al cargar los tipos de papel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { paperTypes, loading, error, reload };
}
