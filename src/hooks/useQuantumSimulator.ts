/**
 * React hook for quantum circuit simulation using TensorFlow.js.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import { ExecutionResults, CircuitState } from '../types/circuit';

// Complex number utilities
interface Complex {
  re: number;
  im: number;
}

function complexMul(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

function complexMagnitudeSq(a: Complex): number {
  return a.re * a.re + a.im * a.im;
}

// Gate matrices
const GATE_MATRICES: Record<string, Complex[][]> = {
  I: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
  ],
  X: [
    [{ re: 0, im: 0 }, { re: 1, im: 0 }],
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
  ],
  Y: [
    [{ re: 0, im: 0 }, { re: 0, im: -1 }],
    [{ re: 0, im: 1 }, { re: 0, im: 0 }],
  ],
  Z: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: -1, im: 0 }],
  ],
  H: [
    [{ re: 1 / Math.sqrt(2), im: 0 }, { re: 1 / Math.sqrt(2), im: 0 }],
    [{ re: 1 / Math.sqrt(2), im: 0 }, { re: -1 / Math.sqrt(2), im: 0 }],
  ],
  S: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 0, im: 1 }],
  ],
  Sdg: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: 0, im: -1 }],
  ],
  T: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: Math.cos(Math.PI / 4), im: Math.sin(Math.PI / 4) }],
  ],
  Tdg: [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: Math.cos(Math.PI / 4), im: -Math.sin(Math.PI / 4) }],
  ],
  SX: [
    [{ re: 0.5, im: 0.5 }, { re: 0.5, im: -0.5 }],
    [{ re: 0.5, im: -0.5 }, { re: 0.5, im: 0.5 }],
  ],
};

// Create rotation gate matrices
function createRx(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: 0, im: -s }],
    [{ re: 0, im: -s }, { re: c, im: 0 }],
  ];
}

function createRy(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: 0 }, { re: -s, im: 0 }],
    [{ re: s, im: 0 }, { re: c, im: 0 }],
  ];
}

function createRz(theta: number): Complex[][] {
  const c = Math.cos(theta / 2);
  const s = Math.sin(theta / 2);
  return [
    [{ re: c, im: -s }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: c, im: s }],
  ];
}

function createPhase(phi: number): Complex[][] {
  return [
    [{ re: 1, im: 0 }, { re: 0, im: 0 }],
    [{ re: 0, im: 0 }, { re: Math.cos(phi), im: Math.sin(phi) }],
  ];
}

function createU(theta: number, phi: number, lambda: number): Complex[][] {
  const ct = Math.cos(theta / 2);
  const st = Math.sin(theta / 2);
  return [
    [
      { re: ct, im: 0 },
      { re: -st * Math.cos(lambda), im: -st * Math.sin(lambda) },
    ],
    [
      { re: st * Math.cos(phi), im: st * Math.sin(phi) },
      { re: ct * Math.cos(phi + lambda), im: ct * Math.sin(phi + lambda) },
    ],
  ];
}

// Get gate matrix
function getGateMatrix(gateId: string, angle?: number, angles?: number[]): Complex[][] {
  if (GATE_MATRICES[gateId]) {
    return GATE_MATRICES[gateId];
  }

  const theta = angle ?? Math.PI;

  switch (gateId) {
    case 'Rx':
      return createRx(theta);
    case 'Ry':
      return createRy(theta);
    case 'Rz':
      return createRz(theta);
    case 'P':
      return createPhase(theta);
    case 'U':
      const [t, p, l] = angles ?? [theta, 0, 0];
      return createU(t, p, l);
    default:
      return GATE_MATRICES.I;
  }
}

// Hardware information interface
export interface HardwareInfo {
  backend: string;
  availableBackends: string[];
  memoryInfo: {
    numTensors: number;
    numDataBuffers: number;
    numBytes: number;
    numBytesInGPU?: number;
    unreliable?: boolean;
  } | null;
  deviceMemory: number | null; // Device memory in GB (if available)
  hardwareConcurrency: number; // Number of logical CPU cores
  platform: string;
  userAgent: string;
  webGLSupported: boolean;
  webGPUSupported: boolean;
}

export interface UseQuantumSimulatorReturn {
  isReady: boolean;
  isExecuting: boolean;
  results: ExecutionResults | null;
  error: string | null;
  backend: string;
  availableBackends: string[];
  hardwareInfo: HardwareInfo | null;
  setBackend: (backendName: string) => Promise<boolean>;
  refreshHardwareInfo: () => void;
  executeCircuit: (circuit: CircuitState, shots?: number) => Promise<ExecutionResults | null>;
  getStatevector: (circuit: CircuitState) => Promise<{ real: number[]; imag: number[] } | null>;
  reset: () => void;
}

// Check WebGL support
function checkWebGLSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// Check WebGPU support
function checkWebGPUSupport(): boolean {
  return 'gpu' in navigator;
}

export function useQuantumSimulator(): UseQuantumSimulatorReturn {
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [results, setResults] = useState<ExecutionResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [backend, setBackendState] = useState<string>('cpu');
  const [availableBackends, setAvailableBackends] = useState<string[]>([]);
  const [hardwareInfo, setHardwareInfo] = useState<HardwareInfo | null>(null);
  const initRef = useRef(false);

  // Refresh hardware information
  const refreshHardwareInfo = useCallback(() => {
    const memoryInfo = tf.memory();
    const currentBackend = tf.getBackend() || 'cpu';

    // Get device memory if available (Chrome only)
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory || null;

    const info: HardwareInfo = {
      backend: currentBackend,
      availableBackends: availableBackends,
      memoryInfo: {
        numTensors: memoryInfo.numTensors,
        numDataBuffers: memoryInfo.numDataBuffers,
        numBytes: memoryInfo.numBytes,
        numBytesInGPU: (memoryInfo as { numBytesInGPU?: number }).numBytesInGPU,
        unreliable: memoryInfo.unreliable,
      },
      deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency || 1,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      webGLSupported: checkWebGLSupport(),
      webGPUSupported: checkWebGPUSupport(),
    };

    setHardwareInfo(info);
  }, [availableBackends]);

  // Set backend
  const setBackend = useCallback(async (backendName: string): Promise<boolean> => {
    try {
      setError(null);
      await tf.setBackend(backendName);
      await tf.ready();
      const newBackend = tf.getBackend() || 'cpu';
      setBackendState(newBackend);
      refreshHardwareInfo();
      return true;
    } catch (err) {
      setError(`Failed to set backend to ${backendName}: ${err}`);
      return false;
    }
  }, [refreshHardwareInfo]);

  // Initialize TensorFlow.js
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const initTf = async () => {
      try {
        await tf.ready();
        const currentBackend = tf.getBackend();
        setBackendState(currentBackend || 'cpu');

        // Get available backends
        const backends: string[] = [];

        // Always available
        backends.push('cpu');

        // Check WebGL
        if (checkWebGLSupport()) {
          backends.push('webgl');
        }

        // Check WebGPU (experimental)
        if (checkWebGPUSupport()) {
          backends.push('webgpu');
        }

        // WASM is typically available
        backends.push('wasm');

        setAvailableBackends(backends);
        setIsReady(true);
      } catch (err) {
        setError(`Failed to initialize TensorFlow.js: ${err}`);
      }
    };

    initTf();
  }, []);

  // Update hardware info when ready or backend changes
  useEffect(() => {
    if (isReady) {
      refreshHardwareInfo();
    }
  }, [isReady, backend, refreshHardwareInfo]);

  // Apply single-qubit gate using strided indexing
  const applySingleQubitGate = useCallback((
    stateReal: Float32Array,
    stateImag: Float32Array,
    numQubits: number,
    target: number,
    gate: Complex[][]
  ) => {
    const dim = 1 << numQubits;
    const stride = 1 << target;

    for (let i = 0; i < dim; i += stride * 2) {
      for (let j = 0; j < stride; j++) {
        const idx0 = i + j;
        const idx1 = i + j + stride;

        const a0: Complex = { re: stateReal[idx0], im: stateImag[idx0] };
        const a1: Complex = { re: stateReal[idx1], im: stateImag[idx1] };

        const new0 = complexAdd(complexMul(gate[0][0], a0), complexMul(gate[0][1], a1));
        const new1 = complexAdd(complexMul(gate[1][0], a0), complexMul(gate[1][1], a1));

        stateReal[idx0] = new0.re;
        stateImag[idx0] = new0.im;
        stateReal[idx1] = new1.re;
        stateImag[idx1] = new1.im;
      }
    }
  }, []);

  // Apply controlled gate
  const applyControlledGate = useCallback((
    stateReal: Float32Array,
    stateImag: Float32Array,
    numQubits: number,
    control: number,
    target: number,
    gate: Complex[][]
  ) => {
    const dim = 1 << numQubits;
    const controlMask = 1 << control;
    const targetMask = 1 << target;

    for (let i = 0; i < dim; i++) {
      // Only apply if control qubit is |1⟩
      if ((i & controlMask) === 0) continue;

      // Only process pairs once (when target bit is 0)
      if ((i & targetMask) !== 0) continue;

      const idx0 = i;
      const idx1 = i | targetMask;

      const a0: Complex = { re: stateReal[idx0], im: stateImag[idx0] };
      const a1: Complex = { re: stateReal[idx1], im: stateImag[idx1] };

      const new0 = complexAdd(complexMul(gate[0][0], a0), complexMul(gate[0][1], a1));
      const new1 = complexAdd(complexMul(gate[1][0], a0), complexMul(gate[1][1], a1));

      stateReal[idx0] = new0.re;
      stateImag[idx0] = new0.im;
      stateReal[idx1] = new1.re;
      stateImag[idx1] = new1.im;
    }
  }, []);

  // Apply SWAP gate
  const applySwapGate = useCallback((
    stateReal: Float32Array,
    stateImag: Float32Array,
    numQubits: number,
    qubit1: number,
    qubit2: number
  ) => {
    const dim = 1 << numQubits;
    const mask1 = 1 << qubit1;
    const mask2 = 1 << qubit2;

    for (let i = 0; i < dim; i++) {
      const bit1 = (i & mask1) !== 0 ? 1 : 0;
      const bit2 = (i & mask2) !== 0 ? 1 : 0;

      // Only swap if bits are different and we haven't processed this pair
      if (bit1 !== bit2 && bit1 < bit2) {
        const j = (i ^ mask1) ^ mask2;

        const tempReal = stateReal[i];
        const tempImag = stateImag[i];
        stateReal[i] = stateReal[j];
        stateImag[i] = stateImag[j];
        stateReal[j] = tempReal;
        stateImag[j] = tempImag;
      }
    }
  }, []);

  // Measure qubit
  const measureQubit = useCallback((
    stateReal: Float32Array,
    stateImag: Float32Array,
    numQubits: number,
    target: number
  ): number => {
    const dim = 1 << numQubits;
    const mask = 1 << target;

    // Calculate probability of |1⟩
    let prob1 = 0;
    for (let i = 0; i < dim; i++) {
      if ((i & mask) !== 0) {
        prob1 += complexMagnitudeSq({ re: stateReal[i], im: stateImag[i] });
      }
    }

    // Random measurement
    const result = Math.random() < prob1 ? 1 : 0;

    // Collapse wavefunction
    const norm = Math.sqrt(result === 1 ? prob1 : 1 - prob1);
    for (let i = 0; i < dim; i++) {
      const bit = (i & mask) !== 0 ? 1 : 0;
      if (bit === result) {
        stateReal[i] /= norm;
        stateImag[i] /= norm;
      } else {
        stateReal[i] = 0;
        stateImag[i] = 0;
      }
    }

    return result;
  }, []);

  // Simulate circuit once
  const simulateOnce = useCallback((
    circuit: CircuitState
  ): string => {
    const { numQubits, gates } = circuit;
    const dim = 1 << numQubits;

    // Initialize |0...0⟩ state
    const stateReal = new Float32Array(dim);
    const stateImag = new Float32Array(dim);
    stateReal[0] = 1;

    // Sort gates by column
    const sortedGates = [...gates].sort((a, b) => a.column - b.column);

    // Measurement results
    const measurements: number[] = new Array(numQubits).fill(0);
    const measured: boolean[] = new Array(numQubits).fill(false);

    // Apply gates
    for (const gate of sortedGates) {
      const { gateId, target, control, angle, angles } = gate;

      if (gateId === 'M') {
        measurements[target] = measureQubit(stateReal, stateImag, numQubits, target);
        measured[target] = true;
      } else if (gateId === 'CNOT') {
        const ctrlQubit = control ?? target - 1;
        applyControlledGate(stateReal, stateImag, numQubits, ctrlQubit, target, GATE_MATRICES.X);
      } else if (gateId === 'CZ') {
        const ctrlQubit = control ?? target - 1;
        applyControlledGate(stateReal, stateImag, numQubits, ctrlQubit, target, GATE_MATRICES.Z);
      } else if (gateId === 'SWAP') {
        const qubit2 = control ?? target + 1;
        applySwapGate(stateReal, stateImag, numQubits, target, qubit2);
      } else {
        const matrix = getGateMatrix(gateId, angle, angles);
        applySingleQubitGate(stateReal, stateImag, numQubits, target, matrix);
      }
    }

    // Final measurement for unmeasured qubits
    for (let q = 0; q < numQubits; q++) {
      if (!measured[q]) {
        measurements[q] = measureQubit(stateReal, stateImag, numQubits, q);
      }
    }

    // Convert to bitstring (little-endian)
    return measurements.map(b => b.toString()).join('');
  }, [applySingleQubitGate, applyControlledGate, applySwapGate, measureQubit]);

  // Execute circuit with multiple shots
  const executeCircuit = useCallback(async (
    circuit: CircuitState,
    shots: number = 1024
  ): Promise<ExecutionResults | null> => {
    if (!isReady) {
      setError('Simulator not ready');
      return null;
    }

    setIsExecuting(true);
    setError(null);

    try {
      const startTime = performance.now();

      // Run shots
      const counts: Record<string, number> = {};
      for (let i = 0; i < shots; i++) {
        const result = simulateOnce(circuit);
        counts[result] = (counts[result] || 0) + 1;
      }

      // Calculate probabilities
      const dim = 1 << circuit.numQubits;
      const probabilities = new Array(dim).fill(0);
      for (const [bitstring, count] of Object.entries(counts)) {
        const idx = parseInt(bitstring.split('').reverse().join(''), 2);
        probabilities[idx] = count / shots;
      }

      const executionTime = performance.now() - startTime;

      const executionResults: ExecutionResults = {
        counts,
        probabilities,
        shots,
        executionTime,
      };

      setResults(executionResults);
      return executionResults;
    } catch (err) {
      const errorMsg = `Execution failed: ${err}`;
      setError(errorMsg);
      return null;
    } finally {
      setIsExecuting(false);
    }
  }, [isReady, simulateOnce]);

  // Get statevector without measurement
  const getStatevector = useCallback(async (
    circuit: CircuitState
  ): Promise<{ real: number[]; imag: number[] } | null> => {
    if (!isReady) {
      setError('Simulator not ready');
      return null;
    }

    try {
      const { numQubits, gates } = circuit;
      const dim = 1 << numQubits;

      // Initialize |0...0⟩ state
      const stateReal = new Float32Array(dim);
      const stateImag = new Float32Array(dim);
      stateReal[0] = 1;

      // Sort gates by column and filter out measurements
      const sortedGates = [...gates]
        .filter(g => g.gateId !== 'M')
        .sort((a, b) => a.column - b.column);

      // Apply gates
      for (const gate of sortedGates) {
        const { gateId, target, control, angle, angles } = gate;

        if (gateId === 'CNOT') {
          const ctrlQubit = control ?? target - 1;
          applyControlledGate(stateReal, stateImag, numQubits, ctrlQubit, target, GATE_MATRICES.X);
        } else if (gateId === 'CZ') {
          const ctrlQubit = control ?? target - 1;
          applyControlledGate(stateReal, stateImag, numQubits, ctrlQubit, target, GATE_MATRICES.Z);
        } else if (gateId === 'SWAP') {
          const qubit2 = control ?? target + 1;
          applySwapGate(stateReal, stateImag, numQubits, target, qubit2);
        } else {
          const matrix = getGateMatrix(gateId, angle, angles);
          applySingleQubitGate(stateReal, stateImag, numQubits, target, matrix);
        }
      }

      return {
        real: Array.from(stateReal),
        imag: Array.from(stateImag),
      };
    } catch (err) {
      setError(`Failed to compute statevector: ${err}`);
      return null;
    }
  }, [isReady, applySingleQubitGate, applyControlledGate, applySwapGate]);

  // Reset results
  const reset = useCallback(() => {
    setResults(null);
    setError(null);
  }, []);

  return {
    isReady,
    isExecuting,
    results,
    error,
    backend,
    availableBackends,
    hardwareInfo,
    setBackend,
    refreshHardwareInfo,
    executeCircuit,
    getStatevector,
    reset,
  };
}
