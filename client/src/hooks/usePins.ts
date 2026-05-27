import { useState, useEffect, useCallback } from 'react';
import { pinsApi, type Location } from '../lib/api';

export function usePins() {
  const [pins, setPins] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPins = useCallback(async () => {
    try {
      setLoading(true);
      const data = await pinsApi.getAll();
      setPins(data);
      setError(null);
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPins(); }, [fetchPins]);

  const createPin = useCallback(async (data: Parameters<typeof pinsApi.create>[0]) => {
    const pin = await pinsApi.create(data);
    setPins(prev => [pin, ...prev]);
    return pin;
  }, []);

  const updatePin = useCallback(async (id: number, data: Parameters<typeof pinsApi.update>[1]) => {
    const pin = await pinsApi.update(id, data);
    setPins(prev => prev.map(p => (p.id === id ? pin : p)));
    return pin;
  }, []);

  const deletePin = useCallback(async (id: number) => {
    await pinsApi.delete(id);
    setPins(prev => prev.filter(p => p.id !== id));
  }, []);

  return { pins, loading, error, fetchPins, createPin, updatePin, deletePin };
}
