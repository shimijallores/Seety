import { useState, useCallback } from 'react';
import { directionsApi, type DirectionsResult } from '../lib/api';

export interface DirectionsState {
  result: DirectionsResult | null;
  fromLabel: string;
  toLabel: string;
  loading: boolean;
  error: string | null;
}

export function useDirections() {
  const [state, setState] = useState<DirectionsState>({
    result: null,
    fromLabel: '',
    toLabel: '',
    loading: false,
    error: null,
  });

  const fetchDirections = useCallback(
    async (
      from: { lat: number; lng: number; label: string },
      to: { lat: number; lng: number; label: string }
    ) => {
      setState(s => ({ ...s, loading: true, error: null, fromLabel: from.label, toLabel: to.label }));
      try {
        const result = await directionsApi.getRoute(from.lat, from.lng, to.lat, to.lng);
        setState(s => ({ ...s, result, loading: false }));
        return result;
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : 'Could not load directions. Please try again.';
        setState(s => ({ ...s, loading: false, error: msg, result: null }));
        throw err;
      }
    },
    []
  );

  const clearDirections = useCallback(() => {
    setState({ result: null, fromLabel: '', toLabel: '', loading: false, error: null });
  }, []);

  return { ...state, fetchDirections, clearDirections };
}
