/**
 * Gate definitions for the quantum circuit builder.
 */

import { GateDefinition } from '../types/circuit';

export const GATE_DEFINITIONS: Record<string, GateDefinition> = {
  // Single-qubit Clifford gates
  H: {
    id: 'H',
    name: 'Hadamard',
    symbol: 'H',
    category: 'single',
    numQubits: 1,
    description: 'Creates superposition: |0⟩ → (|0⟩+|1⟩)/√2',
    color: '#4A90D9',
  },
  X: {
    id: 'X',
    name: 'Pauli-X',
    symbol: 'X',
    category: 'single',
    numQubits: 1,
    description: 'Bit flip (NOT gate): |0⟩ ↔ |1⟩',
    color: '#E74C3C',
  },
  Y: {
    id: 'Y',
    name: 'Pauli-Y',
    symbol: 'Y',
    category: 'single',
    numQubits: 1,
    description: 'Y rotation with phase: |0⟩ → i|1⟩, |1⟩ → -i|0⟩',
    color: '#27AE60',
  },
  Z: {
    id: 'Z',
    name: 'Pauli-Z',
    symbol: 'Z',
    category: 'single',
    numQubits: 1,
    description: 'Phase flip: |1⟩ → -|1⟩',
    color: '#9B59B6',
  },
  S: {
    id: 'S',
    name: 'S Gate',
    symbol: 'S',
    category: 'single',
    numQubits: 1,
    description: 'π/2 phase gate (√Z): |1⟩ → i|1⟩',
    color: '#F39C12',
  },
  T: {
    id: 'T',
    name: 'T Gate',
    symbol: 'T',
    category: 'single',
    numQubits: 1,
    description: 'π/4 phase gate (√S): |1⟩ → e^(iπ/4)|1⟩',
    color: '#1ABC9C',
  },
  Sdg: {
    id: 'Sdg',
    name: 'S† Gate',
    symbol: 'S†',
    category: 'single',
    numQubits: 1,
    description: 'Inverse of S gate: |1⟩ → -i|1⟩',
    color: '#F39C12',
  },
  Tdg: {
    id: 'Tdg',
    name: 'T† Gate',
    symbol: 'T†',
    category: 'single',
    numQubits: 1,
    description: 'Inverse of T gate',
    color: '#1ABC9C',
  },
  SX: {
    id: 'SX',
    name: '√X Gate',
    symbol: '√X',
    category: 'single',
    numQubits: 1,
    description: 'Square root of X gate',
    color: '#E74C3C',
  },
  I: {
    id: 'I',
    name: 'Identity',
    symbol: 'I',
    category: 'single',
    numQubits: 1,
    description: 'Identity gate (no operation)',
    color: '#95A5A6',
  },

  // Rotation gates
  Rx: {
    id: 'Rx',
    name: 'Rx Rotation',
    symbol: 'Rx',
    category: 'rotation',
    numQubits: 1,
    hasAngle: true,
    description: 'Rotation around X-axis by angle θ',
    color: '#E74C3C',
  },
  Ry: {
    id: 'Ry',
    name: 'Ry Rotation',
    symbol: 'Ry',
    category: 'rotation',
    numQubits: 1,
    hasAngle: true,
    description: 'Rotation around Y-axis by angle θ',
    color: '#27AE60',
  },
  Rz: {
    id: 'Rz',
    name: 'Rz Rotation',
    symbol: 'Rz',
    category: 'rotation',
    numQubits: 1,
    hasAngle: true,
    description: 'Rotation around Z-axis by angle θ',
    color: '#9B59B6',
  },
  P: {
    id: 'P',
    name: 'Phase Gate',
    symbol: 'P',
    category: 'rotation',
    numQubits: 1,
    hasAngle: true,
    description: 'Phase shift gate: |1⟩ → e^(iφ)|1⟩',
    color: '#3498DB',
  },
  U: {
    id: 'U',
    name: 'U Gate',
    symbol: 'U',
    category: 'rotation',
    numQubits: 1,
    hasMultipleAngles: true,
    description: 'Universal single-qubit gate U(θ, φ, λ)',
    color: '#8E44AD',
  },

  // Controlled gates
  CNOT: {
    id: 'CNOT',
    name: 'CNOT',
    symbol: 'CX',
    category: 'controlled',
    numQubits: 2,
    description: 'Controlled-NOT: flips target if control is |1⟩',
    color: '#2C3E50',
  },
  CZ: {
    id: 'CZ',
    name: 'CZ Gate',
    symbol: 'CZ',
    category: 'controlled',
    numQubits: 2,
    description: 'Controlled-Z: applies Z to target if control is |1⟩',
    color: '#2C3E50',
  },
  SWAP: {
    id: 'SWAP',
    name: 'SWAP',
    symbol: '×',
    category: 'controlled',
    numQubits: 2,
    description: 'Swaps the states of two qubits',
    color: '#2C3E50',
  },

  // Measurement
  M: {
    id: 'M',
    name: 'Measure',
    symbol: 'M',
    category: 'measurement',
    numQubits: 1,
    description: 'Mid-circuit measurement',
    color: '#C0392B',
  },
};

// Gate categories for UI organization
export const GATE_CATEGORIES = [
  {
    id: 'single',
    name: 'Single Qubit',
    gates: ['H', 'X', 'Y', 'Z', 'S', 'T', 'Sdg', 'Tdg', 'SX', 'I'],
  },
  {
    id: 'rotation',
    name: 'Rotation',
    gates: ['Rx', 'Ry', 'Rz', 'P', 'U'],
  },
  {
    id: 'controlled',
    name: 'Two-Qubit',
    gates: ['CNOT', 'CZ', 'SWAP'],
  },
  {
    id: 'measurement',
    name: 'Measurement',
    gates: ['M'],
  },
];

// Common angle presets
export const ANGLE_PRESETS = [
  { label: 'π', value: Math.PI },
  { label: 'π/2', value: Math.PI / 2 },
  { label: 'π/4', value: Math.PI / 4 },
  { label: 'π/8', value: Math.PI / 8 },
  { label: '-π', value: -Math.PI },
  { label: '-π/2', value: -Math.PI / 2 },
  { label: '-π/4', value: -Math.PI / 4 },
];

/**
 * Get gate definition by ID.
 */
export function getGateDefinition(gateId: string): GateDefinition | undefined {
  return GATE_DEFINITIONS[gateId];
}

/**
 * Format angle for display.
 */
export function formatAngle(angle: number): string {
  const piMultiple = angle / Math.PI;

  if (Math.abs(piMultiple - 1) < 0.001) return 'π';
  if (Math.abs(piMultiple + 1) < 0.001) return '-π';
  if (Math.abs(piMultiple - 0.5) < 0.001) return 'π/2';
  if (Math.abs(piMultiple + 0.5) < 0.001) return '-π/2';
  if (Math.abs(piMultiple - 0.25) < 0.001) return 'π/4';
  if (Math.abs(piMultiple + 0.25) < 0.001) return '-π/4';
  if (Math.abs(piMultiple - 0.125) < 0.001) return 'π/8';
  if (Math.abs(piMultiple + 0.125) < 0.001) return '-π/8';

  return angle.toFixed(2);
}
