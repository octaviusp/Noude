export type FlowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface ExecutionPlan {
  layers: string[][];
  cycleGroups: CycleGroup[];
  isAcyclic: boolean;
}

export interface CycleGroup {
  nodeIds: string[];
  maxIterations: number;
  currentIteration: number;
  converged: boolean;
}
