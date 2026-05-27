import { useState, useCallback } from 'react';
import { peopleApi, type Person } from '../lib/api';

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentLocationId, setCurrentLocationId] = useState<number | null>(null);

  const fetchPeople = useCallback(async (locationId: number) => {
    setLoading(true);
    setCurrentLocationId(locationId);
    try {
      const data = await peopleApi.getAll(locationId);
      setPeople(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPerson = useCallback(
    async (locationId: number, data: Parameters<typeof peopleApi.create>[1]) => {
      const person = await peopleApi.create(locationId, data);
      setPeople(prev => [...prev, person]);
      return person;
    },
    []
  );

  const updatePerson = useCallback(
    async (locationId: number, personId: number, data: Parameters<typeof peopleApi.update>[2]) => {
      const person = await peopleApi.update(locationId, personId, data);
      setPeople(prev => prev.map(p => (p.id === personId ? person : p)));
      return person;
    },
    []
  );

  const deletePerson = useCallback(async (locationId: number, personId: number) => {
    await peopleApi.delete(locationId, personId);
    setPeople(prev => prev.filter(p => p.id !== personId));
  }, []);

  const clearPeople = useCallback(() => {
    setPeople([]);
    setCurrentLocationId(null);
  }, []);

  return {
    people,
    loading,
    currentLocationId,
    fetchPeople,
    createPerson,
    updatePerson,
    deletePerson,
    clearPeople,
  };
}
