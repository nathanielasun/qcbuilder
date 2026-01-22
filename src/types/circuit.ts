/**
 * TypeScript type definitions for quantum circuits.
 */

// Gate categories
export type GateCategory = 'single' | 'rotation' | 'controlled' | 'measurement';

// Gate definition
export interface GateDefinition {
  id: string;
  name: string;
  symbol: string;
  category: GateCategory;
  numQubits: 1 | 2;
  hasAngle?: boolean;
  hasMultipleAngles?: boolean;
  description: string;
  color: string;
}

// Gate instance in circuit
export interface GateInstance {
  id: string;
  gateId: string;
  target: number;
  control?: number;
  controls?: number[];
  angle?: number;
  angles?: number[];
  column: number;
}

// Circuit state
export interface CircuitState {
  numQubits: number;
  gates: GateInstance[];
  name: string;
  description?: string;
}

// Execution results
export interface ExecutionResults {
  counts: Record<string, number>;
  probabilities: number[];
  statevector?: {
    real: number[];
    imag: number[];
  };
  shots: number;
  executionTime: number;
}

// Complex number
export interface Complex {
  re: number;
  im: number;
}

// Saved circuit format
export interface SavedCircuit {
  version: string;
  name: string;
  description?: string;
  numQubits: number;
  gates: Array<{
    gate: string;
    target: number;
    control?: number;
    controls?: number[];
    angle?: number;
    angles?: number[];
  }>;
  createdAt: string;
  updatedAt: string;
}

// Drag and drop types
export interface DragItem {
  type: 'gate' | 'placed-gate';
  gateId: string;
  instanceId?: string;
}

export interface DropResult {
  qubit: number;
  column: number;
}

// UI state
export interface UIState {
  selectedGate: string | null;
  hoveredQubit: number | null;
  hoveredColumn: number | null;
  isExecuting: boolean;
  showStatevector: boolean;
}

// Toast notification
export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

// Application settings
export interface AppSettings {
  defaultShots: number;
  autoExecute: boolean;
  showProbabilities: boolean;
  theme: 'light' | 'dark';
  maxQubits: number;
}
