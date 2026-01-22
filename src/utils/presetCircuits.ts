/**
 * Preset quantum circuits for demonstration and learning.
 */

import { SavedCircuit } from '../types/circuit';

export interface PresetCircuit extends SavedCircuit {
  category: 'entanglement' | 'algorithms' | 'teleportation' | 'error-correction';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export const PRESET_CIRCUITS: PresetCircuit[] = [
  // ============ ENTANGLEMENT ============
  {
    version: '1.0',
    name: 'Bell State (|Φ+⟩)',
    description: 'Creates the maximally entangled Bell state (|00⟩ + |11⟩)/√2. The simplest example of quantum entanglement.',
    category: 'entanglement',
    difficulty: 'beginner',
    numQubits: 2,
    gates: [
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Bell State (|Ψ+⟩)',
    description: 'Creates the Bell state (|01⟩ + |10⟩)/√2 by adding an X gate before entanglement.',
    category: 'entanglement',
    difficulty: 'beginner',
    numQubits: 2,
    gates: [
      { gate: 'X', target: 0 },
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'GHZ State (3 qubits)',
    description: 'Greenberger-Horne-Zeilinger state: (|000⟩ + |111⟩)/√2. A 3-qubit maximally entangled state.',
    category: 'entanglement',
    difficulty: 'beginner',
    numQubits: 3,
    gates: [
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'GHZ State (4 qubits)',
    description: 'Four-qubit GHZ state: (|0000⟩ + |1111⟩)/√2. Demonstrates scalable entanglement.',
    category: 'entanglement',
    difficulty: 'intermediate',
    numQubits: 4,
    gates: [
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
      { gate: 'CNOT', target: 3, control: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'W State (3 qubits)',
    description: 'W state: (|001⟩ + |010⟩ + |100⟩)/√3. Unlike GHZ, remains entangled if one qubit is lost.',
    category: 'entanglement',
    difficulty: 'intermediate',
    numQubits: 3,
    gates: [
      { gate: 'Ry', target: 0, angle: 1.9106 }, // arccos(1/√3)
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 0, control: 1 },
      { gate: 'CNOT', target: 2, control: 0 },
      { gate: 'CNOT', target: 0, control: 1 },
      { gate: 'X', target: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },

  // ============ ALGORITHMS ============
  {
    version: '1.0',
    name: 'QFT (2 qubits)',
    description: 'Quantum Fourier Transform on 2 qubits. The quantum analog of the discrete Fourier transform.',
    category: 'algorithms',
    difficulty: 'intermediate',
    numQubits: 2,
    gates: [
      { gate: 'H', target: 0 },
      { gate: 'P', target: 0, angle: Math.PI / 2 }, // Controlled from q1, but simplified
      { gate: 'H', target: 1 },
      { gate: 'SWAP', target: 0, control: 1 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'QFT (3 qubits)',
    description: 'Quantum Fourier Transform on 3 qubits. Foundation for Shor\'s algorithm and phase estimation.',
    category: 'algorithms',
    difficulty: 'intermediate',
    numQubits: 3,
    gates: [
      { gate: 'H', target: 0 },
      { gate: 'P', target: 0, angle: Math.PI / 2 },
      { gate: 'P', target: 0, angle: Math.PI / 4 },
      { gate: 'H', target: 1 },
      { gate: 'P', target: 1, angle: Math.PI / 2 },
      { gate: 'H', target: 2 },
      { gate: 'SWAP', target: 0, control: 2 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Deutsch-Jozsa (2 qubits)',
    description: 'Simplest quantum algorithm showing exponential speedup. Determines if f(x) is constant or balanced.',
    category: 'algorithms',
    difficulty: 'beginner',
    numQubits: 2,
    gates: [
      { gate: 'X', target: 1 },
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      { gate: 'CNOT', target: 1, control: 0 }, // Oracle for balanced function
      { gate: 'H', target: 0 },
      { gate: 'M', target: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Grover (2 qubits)',
    description: 'Grover\'s search algorithm for 2 qubits. Finds marked item in √N steps instead of N.',
    category: 'algorithms',
    difficulty: 'intermediate',
    numQubits: 2,
    gates: [
      // Initialize superposition
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      // Oracle (marks |11⟩)
      { gate: 'CZ', target: 1, control: 0 },
      // Diffusion operator
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      { gate: 'X', target: 0 },
      { gate: 'X', target: 1 },
      { gate: 'CZ', target: 1, control: 0 },
      { gate: 'X', target: 0 },
      { gate: 'X', target: 1 },
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Quantum Phase Estimation (Simple)',
    description: 'Simplified phase estimation circuit. Estimates eigenvalues of unitary operators.',
    category: 'algorithms',
    difficulty: 'advanced',
    numQubits: 3,
    gates: [
      { gate: 'X', target: 2 }, // Eigenstate
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      { gate: 'P', target: 2, angle: Math.PI / 2 }, // Controlled-U
      { gate: 'P', target: 2, angle: Math.PI / 4 },
      // Inverse QFT on counting register
      { gate: 'SWAP', target: 0, control: 1 },
      { gate: 'H', target: 0 },
      { gate: 'P', target: 0, angle: -Math.PI / 2 },
      { gate: 'H', target: 1 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },

  // ============ TELEPORTATION ============
  {
    version: '1.0',
    name: 'Quantum Teleportation',
    description: 'Teleports quantum state from q0 to q2 using entanglement and classical communication.',
    category: 'teleportation',
    difficulty: 'intermediate',
    numQubits: 3,
    gates: [
      // Prepare state to teleport (|+⟩ state as example)
      { gate: 'H', target: 0 },
      // Create Bell pair between q1 and q2
      { gate: 'H', target: 1 },
      { gate: 'CNOT', target: 2, control: 1 },
      // Bell measurement on q0-q1
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'H', target: 0 },
      { gate: 'M', target: 0 },
      { gate: 'M', target: 1 },
      // Corrections on q2 (classically controlled, shown unconditionally)
      { gate: 'X', target: 2 }, // If q1 measured 1
      { gate: 'Z', target: 2 }, // If q0 measured 1
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Superdense Coding',
    description: 'Sends 2 classical bits using 1 qubit via shared entanglement.',
    category: 'teleportation',
    difficulty: 'intermediate',
    numQubits: 2,
    gates: [
      // Create entangled pair
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
      // Alice encodes message (example: 11 -> apply XZ)
      { gate: 'X', target: 0 },
      { gate: 'Z', target: 0 },
      // Bob decodes
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'H', target: 0 },
      { gate: 'M', target: 0 },
      { gate: 'M', target: 1 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Entanglement Swapping',
    description: 'Creates entanglement between particles that never interacted directly.',
    category: 'teleportation',
    difficulty: 'advanced',
    numQubits: 4,
    gates: [
      // Create two Bell pairs: (q0,q1) and (q2,q3)
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'H', target: 2 },
      { gate: 'CNOT', target: 3, control: 2 },
      // Bell measurement on q1-q2
      { gate: 'CNOT', target: 2, control: 1 },
      { gate: 'H', target: 1 },
      { gate: 'M', target: 1 },
      { gate: 'M', target: 2 },
      // Now q0 and q3 are entangled!
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },

  // ============ ERROR CORRECTION ============
  {
    version: '1.0',
    name: '3-Qubit Bit Flip Code',
    description: 'Protects against single bit-flip (X) errors by encoding |ψ⟩ → |ψψψ⟩.',
    category: 'error-correction',
    difficulty: 'intermediate',
    numQubits: 3,
    gates: [
      // Encode: |ψ⟩ → |ψψψ⟩
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
      // Error occurs here (example: X error on q1)
      { gate: 'X', target: 1 },
      // Decode and correct
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
      // Toffoli would correct q0 based on q1,q2 (simplified here)
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: '3-Qubit Phase Flip Code',
    description: 'Protects against single phase-flip (Z) errors using Hadamard-transformed bit flip code.',
    category: 'error-correction',
    difficulty: 'intermediate',
    numQubits: 3,
    gates: [
      // Encode in |+⟩ basis
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      { gate: 'H', target: 2 },
      // Error occurs here (example: Z error on q1)
      { gate: 'Z', target: 1 },
      // Decode
      { gate: 'H', target: 0 },
      { gate: 'H', target: 1 },
      { gate: 'H', target: 2 },
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: 'Steane [[7,1,3]] Encoder',
    description: 'Encodes 1 logical qubit into 7 physical qubits. Can correct any single-qubit error.',
    category: 'error-correction',
    difficulty: 'advanced',
    numQubits: 7,
    gates: [
      // Initialize logical |0⟩ (q0 is data, q1-q6 are ancilla)
      { gate: 'H', target: 3 },
      { gate: 'H', target: 4 },
      { gate: 'H', target: 5 },
      { gate: 'CNOT', target: 6, control: 3 },
      { gate: 'CNOT', target: 6, control: 4 },
      { gate: 'CNOT', target: 6, control: 5 },
      { gate: 'CNOT', target: 0, control: 3 },
      { gate: 'CNOT', target: 1, control: 3 },
      { gate: 'CNOT', target: 0, control: 4 },
      { gate: 'CNOT', target: 2, control: 4 },
      { gate: 'CNOT', target: 1, control: 5 },
      { gate: 'CNOT', target: 2, control: 5 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    version: '1.0',
    name: '5-Qubit Perfect Code',
    description: 'The smallest code that can correct arbitrary single-qubit errors. [[5,1,3]] code.',
    category: 'error-correction',
    difficulty: 'advanced',
    numQubits: 5,
    gates: [
      // Encoding circuit for [[5,1,3]] code (simplified stabilizer encoding)
      { gate: 'H', target: 0 },
      { gate: 'CNOT', target: 1, control: 0 },
      { gate: 'CNOT', target: 2, control: 0 },
      { gate: 'H', target: 1 },
      { gate: 'H', target: 2 },
      { gate: 'CNOT', target: 3, control: 1 },
      { gate: 'CNOT', target: 4, control: 2 },
      { gate: 'CNOT', target: 3, control: 0 },
      { gate: 'CNOT', target: 4, control: 0 },
      { gate: 'H', target: 3 },
      { gate: 'H', target: 4 },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// Group presets by category
export const PRESET_CATEGORIES = [
  {
    id: 'entanglement',
    name: 'Entanglement',
    description: 'Circuits that create quantum entanglement',
    icon: '🔗',
  },
  {
    id: 'algorithms',
    name: 'Algorithms',
    description: 'Quantum algorithms and subroutines',
    icon: '⚡',
  },
  {
    id: 'teleportation',
    name: 'Teleportation',
    description: 'Quantum communication protocols',
    icon: '📡',
  },
  {
    id: 'error-correction',
    name: 'Error Correction',
    description: 'Quantum error correcting codes',
    icon: '🛡️',
  },
];

export function getPresetsByCategory(category: string): PresetCircuit[] {
  return PRESET_CIRCUITS.filter(p => p.category === category);
}

export function getPresetByName(name: string): PresetCircuit | undefined {
  return PRESET_CIRCUITS.find(p => p.name === name);
}
