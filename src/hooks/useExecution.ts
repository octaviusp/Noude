import { useCallback } from 'react';
import { useExecutionStore } from '../store/executionStore';

export function useExecution() {
  const flowStatus = useExecutionStore(s => s.flowStatus);

  const run = useCallback(async () => {
    await useExecutionStore.getState().runFlow();
  }, []);

  const stop = useCallback(async () => {
    await useExecutionStore.getState().cancelFlow();
  }, []);

  const reset = useCallback(() => {
    useExecutionStore.getState().resetExecution();
  }, []);

  return { run, stop, reset, flowStatus, isRunning: flowStatus === 'running' };
}
