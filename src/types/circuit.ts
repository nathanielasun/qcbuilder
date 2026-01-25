/**
 * TypeScript type definitions for quantum circuits.
 */

// Gate categories
export type GateCategory = 'single' | 'rotation' | 'controlled' | 'multi' | 'measurement';

// Gate definition
export interface GateDefinition {
  id: string;
  name: string;
  symbol: string;
  category: GateCategory;
  numQubits: 1 | 2 | 3;
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

// Pattern gate - gate within a pattern, with relative positions
export interface PatternGate {
  gateId: string;
  relativeTarget: number;  // Relative qubit position (0 = first qubit in pattern)
  relativeControl?: number;
  relativeControls?: number[];
  relativeColumn: number;  // Relative column position (0 = first column)
  angle?: number;
  angles?: number[];
}

// Circuit pattern - a reusable template of gates
export interface CircuitPattern {
  id: string;
  name: string;
  gates: PatternGate[];
  qubitSpan: number;    // Number of qubits the pattern spans
  columnSpan: number;   // Number of columns the pattern spans
  color: string;
  createdAt: string;
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

// Complex number for quantum state calculations
export interface Complex {
  re: number;
  im: number;
}

// Saved circuit format (for import/export)
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
  createdAt?: string;
  updatedAt?: string;
}

// Saved patterns format (for import/export)
export interface SavedPatterns {
  version: string;
  patterns: Array<{
    name: string;
    gates: PatternGate[];
    qubitSpan: number;
    columnSpan: number;
    color: string;
  }>;
}
