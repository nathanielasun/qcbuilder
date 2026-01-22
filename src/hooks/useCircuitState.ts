/**
 * React hook for managing quantum circuit state.
 */

import { useState, useCallback, useMemo } from 'react';
import { GateInstance, CircuitState, SavedCircuit } from '../types/circuit';

const MAX_QUBITS = 10;
const MAX_COLUMNS = 50;

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export interface UseCircuitStateReturn {
  circuit: CircuitState;
  numColumns: number;
  addGate: (gateId: string, target: number, column: number, control?: number, angle?: number, angles?: number[]) => void;
  removeGate: (instanceId: string) => void;
  moveGate: (instanceId: string, newTarget: number, newColumn: number, newControl?: number) => void;
  updateGateTarget: (instanceId: string, target: number) => void;
  updateGateControl: (instanceId: string, control: number) => void;
  updateGateAngle: (instanceId: string, angle: number) => void;
  updateGateAngles: (instanceId: string, angles: number[]) => void;
  setNumQubits: (n: number) => void;
  clearCircuit: () => void;
  loadCircuit: (saved: SavedCircuit) => void;
  saveCircuit: () => SavedCircuit;
  setCircuitName: (name: string) => void;
  setCircuitDescription: (description: string) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useCircuitState(initialQubits: number = 3): UseCircuitStateReturn {
  const [circuit, setCircuit] = useState<CircuitState>({
    numQubits: initialQubits,
    gates: [],
    name: 'Untitled Circuit',
    description: '',
  });

  const [history, setHistory] = useState<CircuitState[]>([]);
  const [future, setFuture] = useState<CircuitState[]>([]);

  // Calculate number of columns needed
  const numColumns = useMemo(() => {
    if (circuit.gates.length === 0) return 5;
    const maxColumn = Math.max(...circuit.gates.map(g => g.column));
    return Math.min(Math.max(maxColumn + 3, 5), MAX_COLUMNS);
  }, [circuit.gates]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(h => [...h.slice(-49), circuit]);
    setFuture([]);
  }, [circuit]);

  // Add gate to circuit
  const addGate = useCallback((
    gateId: string,
    target: number,
    column: number,
    control?: number,
    angle?: number,
    angles?: number[]
  ) => {
    saveToHistory();

    const newGate: GateInstance = {
      id: generateId(),
      gateId,
      target,
      column,
      ...(control !== undefined && { control }),
      ...(angle !== undefined && { angle }),
      ...(angles !== undefined && { angles }),
    };

    setCircuit(c => ({
      ...c,
      gates: [...c.gates, newGate],
    }));
  }, [saveToHistory]);

  // Remove gate from circuit
  const removeGate = useCallback((instanceId: string) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.filter(g => g.id !== instanceId),
    }));
  }, [saveToHistory]);

  // Move gate to new position
  const moveGate = useCallback((
    instanceId: string,
    newTarget: number,
    newColumn: number,
    newControl?: number
  ) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId
          ? { ...g, target: newTarget, column: newColumn, control: newControl }
          : g
      ),
    }));
  }, [saveToHistory]);

  // Update gate target qubit
  const updateGateTarget = useCallback((instanceId: string, target: number) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, target } : g
      ),
    }));
  }, [saveToHistory]);

  // Update gate control qubit
  const updateGateControl = useCallback((instanceId: string, control: number) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, control } : g
      ),
    }));
  }, [saveToHistory]);

  // Update gate angle
  const updateGateAngle = useCallback((instanceId: string, angle: number) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, angle } : g
      ),
    }));
  }, [saveToHistory]);

  // Update gate angles (for U gate)
  const updateGateAngles = useCallback((instanceId: string, angles: number[]) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, angles } : g
      ),
    }));
  }, [saveToHistory]);

  // Set number of qubits
  const setNumQubits = useCallback((n: number) => {
    if (n < 1 || n > MAX_QUBITS) return;
    saveToHistory();
    setCircuit(c => ({
      ...c,
      numQubits: n,
      // Remove gates that are out of bounds
      gates: c.gates.filter(g => {
        if (g.target >= n) return false;
        if (g.control !== undefined && g.control >= n) return false;
        return true;
      }),
    }));
  }, [saveToHistory]);

  // Clear circuit
  const clearCircuit = useCallback(() => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: [],
    }));
  }, [saveToHistory]);

  // Load saved circuit
  const loadCircuit = useCallback((saved: SavedCircuit) => {
    saveToHistory();
    setCircuit({
      numQubits: saved.numQubits,
      name: saved.name,
      description: saved.description,
      gates: saved.gates.map(g => ({
        id: generateId(),
        gateId: g.gate,
        target: g.target,
        column: 0, // Will be calculated
        ...(g.control !== undefined && { control: g.control }),
        ...(g.controls !== undefined && { controls: g.controls }),
        ...(g.angle !== undefined && { angle: g.angle }),
        ...(g.angles !== undefined && { angles: g.angles }),
      })),
    });

    // Recalculate columns based on gate order
    setCircuit(c => {
      const gates = [...c.gates];
      const qubitColumns: number[] = new Array(c.numQubits).fill(0);

      for (let i = 0; i < gates.length; i++) {
        const gate = gates[i];
        const affectedQubits = [gate.target];
        if (gate.control !== undefined) affectedQubits.push(gate.control);
        if (gate.controls !== undefined) affectedQubits.push(...gate.controls);

        const column = Math.max(...affectedQubits.map(q => qubitColumns[q]));
        gates[i] = { ...gate, column };

        for (const q of affectedQubits) {
          qubitColumns[q] = column + 1;
        }
      }

      return { ...c, gates };
    });
  }, [saveToHistory]);

  // Save circuit to format
  const saveCircuit = useCallback((): SavedCircuit => {
    const sortedGates = [...circuit.gates].sort((a, b) => a.column - b.column);

    return {
      version: '1.0',
      name: circuit.name,
      description: circuit.description,
      numQubits: circuit.numQubits,
      gates: sortedGates.map(g => ({
        gate: g.gateId,
        target: g.target,
        ...(g.control !== undefined && { control: g.control }),
        ...(g.controls !== undefined && { controls: g.controls }),
        ...(g.angle !== undefined && { angle: g.angle }),
        ...(g.angles !== undefined && { angles: g.angles }),
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }, [circuit]);

  // Set circuit name
  const setCircuitName = useCallback((name: string) => {
    setCircuit(c => ({ ...c, name }));
  }, []);

  // Set circuit description
  const setCircuitDescription = useCallback((description: string) => {
    setCircuit(c => ({ ...c, description }));
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [circuit, ...f]);
    setCircuit(previous);
  }, [history, circuit]);

  // Redo
  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture(f => f.slice(1));
    setHistory(h => [...h, circuit]);
    setCircuit(next);
  }, [future, circuit]);

  return {
    circuit,
    numColumns,
    addGate,
    removeGate,
    moveGate,
    updateGateTarget,
    updateGateControl,
    updateGateAngle,
    updateGateAngles,
    setNumQubits,
    clearCircuit,
    loadCircuit,
    saveCircuit,
    setCircuitName,
    setCircuitDescription,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  };
}
