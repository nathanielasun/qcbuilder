/**
 * React hook for managing quantum circuit state.
 * Includes validation, collision detection, and localStorage persistence.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GateInstance, CircuitState, SavedCircuit, RepeaterBlock } from '../types/circuit';
import { validateSavedCircuit } from '../utils/circuitValidator';

const MAX_QUBITS = 10;
const MAX_COLUMNS = 50;
const STORAGE_KEY = 'quantum-circuit-builder-state';
const AUTO_SAVE_DELAY = 500; // ms

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Load saved state from localStorage
function loadSavedState(): CircuitState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const validation = validateSavedCircuit(parsed);
      if (validation.valid) {
        // Convert saved format to internal format
        return {
          numQubits: parsed.numQubits,
          name: parsed.name || 'Untitled Circuit',
          description: parsed.description || '',
          gates: (parsed.gates || []).map((g: Record<string, unknown>) => ({
            id: generateId(),
            gateId: g.gate as string,
            target: g.target as number,
            column: (g.column as number) || 0,
            ...(g.control !== undefined && { control: g.control as number }),
            ...(g.angle !== undefined && { angle: g.angle as number }),
            ...(g.angles !== undefined && { angles: g.angles as number[] }),
          })),
          repeaters: (parsed.repeaters || []).map((r: Record<string, unknown>, i: number) => ({
            id: generateId(),
            qubitStart: r.qubitStart as number,
            qubitEnd: r.qubitEnd as number,
            columnStart: r.columnStart as number,
            columnEnd: r.columnEnd as number,
            repetitions: r.repetitions as number,
            label: r.label as string | undefined,
            color: (r.color as string) || REPEATER_COLORS[i % REPEATER_COLORS.length],
          })),
        };
      }
    }
  } catch (e) {
    console.error('Failed to load saved circuit:', e);
  }
  return null;
}

export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
}

export interface UseCircuitStateReturn {
  circuit: CircuitState;
  numColumns: number;
  addGate: (gateId: string, target: number, column: number, control?: number, angle?: number, angles?: number[]) => ValidationError | null;
  removeGate: (instanceId: string) => void;
  removeGates: (instanceIds: string[]) => void;
  moveGate: (instanceId: string, newTarget: number, newColumn: number, newControl?: number) => ValidationError | null;
  updateGateTarget: (instanceId: string, target: number) => ValidationError | null;
  updateGateControl: (instanceId: string, control: number) => ValidationError | null;
  updateGateAngle: (instanceId: string, angle: number) => void;
  updateGateAngles: (instanceId: string, angles: number[]) => void;
  duplicateGates: (instanceIds: string[], columnOffset: number, qubitOffset: number) => { newIds: string[]; skipped: number };
  addRepeater: (qubitStart: number, qubitEnd: number, columnStart: number, columnEnd: number, repetitions?: number, label?: string) => string;
  removeRepeater: (repeaterId: string) => void;
  updateRepeater: (repeaterId: string, updates: Partial<Omit<RepeaterBlock, 'id'>>) => void;
  setNumQubits: (n: number) => void;
  clearCircuit: () => void;
  newCircuit: () => void;
  loadCircuit: (saved: SavedCircuit) => void;
  saveCircuit: () => SavedCircuit;
  setCircuitName: (name: string) => void;
  setCircuitDescription: (description: string) => void;
  isCellOccupied: (qubit: number, column: number, excludeId?: string) => boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// Repeater colors for visual distinction
const REPEATER_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
];

export function useCircuitState(initialQubits: number = 3): UseCircuitStateReturn {
  // Try to load saved state, fall back to default
  const [circuit, setCircuit] = useState<CircuitState>(() => {
    const saved = loadSavedState();
    return saved || {
      numQubits: initialQubits,
      gates: [],
      repeaters: [],
      name: 'Untitled Circuit',
      description: '',
    };
  });

  const [history, setHistory] = useState<CircuitState[]>([]);
  const [future, setFuture] = useState<CircuitState[]>([]);

  // Auto-save to localStorage with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        const toSave: SavedCircuit = {
          version: '1.0',
          name: circuit.name,
          description: circuit.description,
          numQubits: circuit.numQubits,
          gates: circuit.gates.map(g => ({
            gate: g.gateId,
            target: g.target,
            column: g.column,
            ...(g.control !== undefined && { control: g.control }),
            ...(g.angle !== undefined && { angle: g.angle }),
            ...(g.angles !== undefined && { angles: g.angles }),
          })),
          repeaters: circuit.repeaters.map(r => ({
            qubitStart: r.qubitStart,
            qubitEnd: r.qubitEnd,
            columnStart: r.columnStart,
            columnEnd: r.columnEnd,
            repetitions: r.repetitions,
            label: r.label,
            color: r.color,
          })),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
      } catch (e) {
        console.error('Failed to auto-save circuit:', e);
      }
    }, AUTO_SAVE_DELAY);

    return () => clearTimeout(timeoutId);
  }, [circuit]);

  // Calculate number of columns needed
  const numColumns = useMemo(() => {
    if (circuit.gates.length === 0) return 5;
    const maxColumn = Math.max(...circuit.gates.map(g => g.column));
    return Math.min(Math.max(maxColumn + 3, 5), MAX_COLUMNS);
  }, [circuit.gates]);

  // Check if a cell is occupied by any gate
  const isCellOccupied = useCallback((qubit: number, column: number, excludeId?: string): boolean => {
    return circuit.gates.some(g => {
      if (excludeId && g.id === excludeId) return false;
      // Check target position
      if (g.target === qubit && g.column === column) return true;
      // Check control position for two-qubit gates
      if (g.control !== undefined && g.control === qubit && g.column === column) return true;
      return false;
    });
  }, [circuit.gates]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(h => [...h.slice(-49), circuit]);
    setFuture([]);
  }, [circuit]);

  // Add gate to circuit with validation
  const addGate = useCallback((
    gateId: string,
    target: number,
    column: number,
    control?: number,
    angle?: number,
    angles?: number[]
  ): ValidationError | null => {
    // Validate qubit bounds
    if (target < 0 || target >= circuit.numQubits) {
      return { type: 'error', message: `Target qubit ${target} is out of bounds (0-${circuit.numQubits - 1})` };
    }

    // Validate control qubit
    if (control !== undefined) {
      if (control < 0 || control >= circuit.numQubits) {
        return { type: 'error', message: `Control qubit ${control} is out of bounds (0-${circuit.numQubits - 1})` };
      }
      if (control === target) {
        return { type: 'error', message: 'Control qubit cannot be the same as target qubit' };
      }
    }

    // Validate column bounds
    if (column < 0 || column >= MAX_COLUMNS) {
      return { type: 'error', message: `Column ${column} is out of bounds (0-${MAX_COLUMNS - 1})` };
    }

    // Check for collision at target position
    if (isCellOccupied(target, column)) {
      return { type: 'error', message: `Cell at qubit ${target}, column ${column} is already occupied` };
    }

    // Check for collision at control position
    if (control !== undefined && isCellOccupied(control, column)) {
      return { type: 'error', message: `Cell at qubit ${control}, column ${column} is already occupied` };
    }

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

    return null; // Success
  }, [circuit.numQubits, isCellOccupied, saveToHistory]);

  // Remove gate from circuit
  const removeGate = useCallback((instanceId: string) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.filter(g => g.id !== instanceId),
    }));
  }, [saveToHistory]);

  // Remove multiple gates from circuit
  const removeGates = useCallback((instanceIds: string[]) => {
    if (instanceIds.length === 0) return;
    saveToHistory();
    const idSet = new Set(instanceIds);
    setCircuit(c => ({
      ...c,
      gates: c.gates.filter(g => !idSet.has(g.id)),
    }));
  }, [saveToHistory]);

  // Move gate to new position with validation
  const moveGate = useCallback((
    instanceId: string,
    newTarget: number,
    newColumn: number,
    newControl?: number
  ): ValidationError | null => {
    // Validate qubit bounds
    if (newTarget < 0 || newTarget >= circuit.numQubits) {
      return { type: 'error', message: `Target qubit ${newTarget} is out of bounds` };
    }

    if (newControl !== undefined) {
      if (newControl < 0 || newControl >= circuit.numQubits) {
        return { type: 'error', message: `Control qubit ${newControl} is out of bounds` };
      }
      if (newControl === newTarget) {
        return { type: 'error', message: 'Control qubit cannot be the same as target qubit' };
      }
    }

    // Check for collision (excluding the gate being moved)
    if (isCellOccupied(newTarget, newColumn, instanceId)) {
      return { type: 'error', message: `Cell at qubit ${newTarget}, column ${newColumn} is already occupied` };
    }

    if (newControl !== undefined && isCellOccupied(newControl, newColumn, instanceId)) {
      return { type: 'error', message: `Cell at qubit ${newControl}, column ${newColumn} is already occupied` };
    }

    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId
          ? { ...g, target: newTarget, column: newColumn, control: newControl }
          : g
      ),
    }));

    return null;
  }, [circuit.numQubits, isCellOccupied, saveToHistory]);

  // Update gate target qubit with validation
  const updateGateTarget = useCallback((instanceId: string, target: number): ValidationError | null => {
    const gate = circuit.gates.find(g => g.id === instanceId);
    if (!gate) return { type: 'error', message: 'Gate not found' };

    if (target < 0 || target >= circuit.numQubits) {
      return { type: 'error', message: `Target qubit ${target} is out of bounds` };
    }

    if (gate.control !== undefined && gate.control === target) {
      return { type: 'error', message: 'Target qubit cannot be the same as control qubit' };
    }

    if (isCellOccupied(target, gate.column, instanceId)) {
      return { type: 'error', message: `Cell at qubit ${target}, column ${gate.column} is already occupied` };
    }

    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, target } : g
      ),
    }));

    return null;
  }, [circuit.gates, circuit.numQubits, isCellOccupied, saveToHistory]);

  // Update gate control qubit with validation
  const updateGateControl = useCallback((instanceId: string, control: number): ValidationError | null => {
    const gate = circuit.gates.find(g => g.id === instanceId);
    if (!gate) return { type: 'error', message: 'Gate not found' };

    if (control < 0 || control >= circuit.numQubits) {
      return { type: 'error', message: `Control qubit ${control} is out of bounds` };
    }

    if (control === gate.target) {
      return { type: 'error', message: 'Control qubit cannot be the same as target qubit' };
    }

    if (isCellOccupied(control, gate.column, instanceId)) {
      return { type: 'error', message: `Cell at qubit ${control}, column ${gate.column} is already occupied` };
    }

    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: c.gates.map(g =>
        g.id === instanceId ? { ...g, control } : g
      ),
    }));

    return null;
  }, [circuit.gates, circuit.numQubits, isCellOccupied, saveToHistory]);

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

  // Duplicate gates with offset and collision checking
  const duplicateGates = useCallback((
    instanceIds: string[],
    columnOffset: number,
    qubitOffset: number
  ): { newIds: string[]; skipped: number } => {
    if (instanceIds.length === 0) return { newIds: [], skipped: 0 };

    saveToHistory();
    const newIds: string[] = [];
    let skipped = 0;

    setCircuit(c => {
      const gatesToDuplicate = c.gates.filter(g => instanceIds.includes(g.id));
      const newGates: GateInstance[] = [];

      // Build occupancy set from existing gates
      const occupied = new Set<string>();
      for (const gate of c.gates) {
        occupied.add(`${gate.target},${gate.column}`);
        if (gate.control !== undefined) {
          occupied.add(`${gate.control},${gate.column}`);
        }
      }

      for (const gate of gatesToDuplicate) {
        const newTarget = gate.target + qubitOffset;
        const newControl = gate.control !== undefined ? gate.control + qubitOffset : undefined;
        const newColumn = gate.column + columnOffset;

        // Check bounds
        if (newTarget < 0 || newTarget >= c.numQubits) {
          skipped++;
          continue;
        }
        if (newControl !== undefined && (newControl < 0 || newControl >= c.numQubits)) {
          skipped++;
          continue;
        }
        if (newColumn < 0 || newColumn >= MAX_COLUMNS) {
          skipped++;
          continue;
        }

        // Check collision at target
        const targetKey = `${newTarget},${newColumn}`;
        if (occupied.has(targetKey)) {
          skipped++;
          continue;
        }

        // Check collision at control
        if (newControl !== undefined) {
          const controlKey = `${newControl},${newColumn}`;
          if (occupied.has(controlKey)) {
            skipped++;
            continue;
          }
        }

        const newId = generateId();
        newIds.push(newId);

        // Add to occupied set so subsequent duplicates don't collide
        occupied.add(targetKey);
        if (newControl !== undefined) {
          occupied.add(`${newControl},${newColumn}`);
        }

        newGates.push({
          ...gate,
          id: newId,
          target: newTarget,
          column: newColumn,
          ...(newControl !== undefined && { control: newControl }),
        });
      }

      return {
        ...c,
        gates: [...c.gates, ...newGates],
      };
    });

    return { newIds, skipped };
  }, [saveToHistory]);

  // Add repeater block
  const addRepeater = useCallback((
    qubitStart: number,
    qubitEnd: number,
    columnStart: number,
    columnEnd: number,
    repetitions: number = 2,
    label?: string
  ): string => {
    saveToHistory();
    const id = generateId();
    const colorIndex = circuit.repeaters.length % REPEATER_COLORS.length;
    const newRepeater: RepeaterBlock = {
      id,
      qubitStart: Math.min(qubitStart, qubitEnd),
      qubitEnd: Math.max(qubitStart, qubitEnd),
      columnStart: Math.min(columnStart, columnEnd),
      columnEnd: Math.max(columnStart, columnEnd),
      repetitions,
      label,
      color: REPEATER_COLORS[colorIndex],
    };
    setCircuit(c => ({
      ...c,
      repeaters: [...c.repeaters, newRepeater],
    }));
    return id;
  }, [saveToHistory, circuit.repeaters.length]);

  // Remove repeater block
  const removeRepeater = useCallback((repeaterId: string) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      repeaters: c.repeaters.filter(r => r.id !== repeaterId),
    }));
  }, [saveToHistory]);

  // Update repeater block
  const updateRepeater = useCallback((repeaterId: string, updates: Partial<Omit<RepeaterBlock, 'id'>>) => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      repeaters: c.repeaters.map(r =>
        r.id === repeaterId ? { ...r, ...updates } : r
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
      // Remove repeaters that are out of bounds
      repeaters: c.repeaters.filter(r => r.qubitEnd < n),
    }));
  }, [saveToHistory]);

  // Clear circuit (keeps settings)
  const clearCircuit = useCallback(() => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: [],
      repeaters: [],
    }));
  }, [saveToHistory]);

  // New circuit (clears everything including localStorage)
  const newCircuit = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCircuit({
      numQubits: 3,
      gates: [],
      repeaters: [],
      name: 'Untitled Circuit',
      description: '',
    });
    setHistory([]);
    setFuture([]);
  }, []);

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
      repeaters: (saved.repeaters || []).map((r, i) => ({
        id: generateId(),
        qubitStart: r.qubitStart,
        qubitEnd: r.qubitEnd,
        columnStart: r.columnStart,
        columnEnd: r.columnEnd,
        repetitions: r.repetitions,
        label: r.label,
        color: r.color || REPEATER_COLORS[i % REPEATER_COLORS.length],
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
      repeaters: circuit.repeaters.map(r => ({
        qubitStart: r.qubitStart,
        qubitEnd: r.qubitEnd,
        columnStart: r.columnStart,
        columnEnd: r.columnEnd,
        repetitions: r.repetitions,
        label: r.label,
        color: r.color,
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
    removeGates,
    moveGate,
    updateGateTarget,
    updateGateControl,
    updateGateAngle,
    updateGateAngles,
    duplicateGates,
    addRepeater,
    removeRepeater,
    updateRepeater,
    setNumQubits,
    clearCircuit,
    newCircuit,
    loadCircuit,
    saveCircuit,
    setCircuitName,
    setCircuitDescription,
    isCellOccupied,
    undo,
    redo,
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  };
}
