import { useCallback } from 'react';
import { useFlowStore } from '../store/flowStore';

export function useAutoLayout() {
  return useCallback(async () => {
    await useFlowStore.getState().autoLayout();
  }, []);
}
