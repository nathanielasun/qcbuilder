/**
 * React hook for managing quantum circuit state.
 * Includes validation, collision detection, and localStorage persistence.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { GateInstance, CircuitState, SavedCircuit } from '../types/circuit';
import { validateSavedCircuit } from '../utils/circuitValidator';
import { CIRCUIT_LIMITS, STORAGE_KEYS } from '../config';

const AUTO_SAVE_DELAY = 500; // ms

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Load saved state from localStorage
function loadSavedState(): CircuitState | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.AUTOSAVE);
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
            ...(g.controls !== undefined && { controls: g.controls as number[] }),
            ...(g.angle !== undefined && { angle: g.angle as number }),
            ...(g.angles !== undefined && { angles: g.angles as number[] }),
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
  addGate: (gateId: string, target: number, column: number, control?: number, angle?: number, angles?: number[], controls?: number[]) => ValidationError | null;
  addGates: (gates: GateInstance[]) => void;
  removeGate: (instanceId: string) => void;
  removeGates: (instanceIds: string[]) => void;
  moveGate: (instanceId: string, newTarget: number, newColumn: number, newControl?: number) => ValidationError | null;
  updateGateTarget: (instanceId: string, target: number) => ValidationError | null;
  updateGateControl: (instanceId: string, control: number) => ValidationError | null;
  updateGateAngle: (instanceId: string, angle: number) => void;
  updateGateAngles: (instanceId: string, angles: number[]) => void;
  duplicateGates: (instanceIds: string[], columnOffset: number, qubitOffset: number) => { newIds: string[]; skipped: number };
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

export function useCircuitState(initialQubits: number = 3): UseCircuitStateReturn {
  // Try to load saved state, fall back to default
  const [circuit, setCircuit] = useState<CircuitState>(() => {
    const saved = loadSavedState();
    return saved || {
      numQubits: initialQubits,
      gates: [],
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
            ...(g.controls !== undefined && { controls: g.controls }),
            ...(g.angle !== undefined && { angle: g.angle }),
            ...(g.angles !== undefined && { angles: g.angles }),
          })),
        };
        localStorage.setItem(STORAGE_KEYS.AUTOSAVE, JSON.stringify(toSave));
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
    return Math.min(Math.max(maxColumn + 3, 5), CIRCUIT_LIMITS.MAX_COLUMNS);
  }, [circuit.gates]);

  // Check if a cell is occupied by any gate
  const isCellOccupied = useCallback((qubit: number, column: number, excludeId?: string): boolean => {
    return circuit.gates.some(g => {
      if (excludeId && g.id === excludeId) return false;
      // Check target position
      if (g.target === qubit && g.column === column) return true;
      // Check control position for two-qubit gates
      if (g.control !== undefined && g.control === qubit && g.column === column) return true;
      // Check controls for multi-qubit gates
      if (g.controls && g.controls.includes(qubit) && g.column === column) return true;
      return false;
    });
  }, [circuit.gates]);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    setHistory(h => [...h.slice(-(CIRCUIT_LIMITS.MAX_HISTORY - 1)), circuit]);
    setFuture([]);
  }, [circuit]);

  // Add gate to circuit with validation
  const addGate = useCallback((
    gateId: string,
    target: number,
    column: number,
    control?: number,
    angle?: number,
    angles?: number[],
    controls?: number[]
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

    // Validate controls array (for multi-control gates)
    if (controls !== undefined) {
      for (const ctrl of controls) {
        if (ctrl < 0 || ctrl >= circuit.numQubits) {
          return { type: 'error', message: `Control qubit ${ctrl} is out of bounds (0-${circuit.numQubits - 1})` };
        }
        if (ctrl === target) {
          return { type: 'error', message: 'Control qubit cannot be the same as target qubit' };
        }
      }
    }

    // Validate column bounds
    if (column < 0 || column >= CIRCUIT_LIMITS.MAX_COLUMNS) {
      return { type: 'error', message: `Column ${column} is out of bounds (0-${CIRCUIT_LIMITS.MAX_COLUMNS - 1})` };
    }

    // Check for collision at target position
    if (isCellOccupied(target, column)) {
      return { type: 'error', message: `Cell at qubit ${target}, column ${column} is already occupied` };
    }

    // Check for collision at control position
    if (control !== undefined && isCellOccupied(control, column)) {
      return { type: 'error', message: `Cell at qubit ${control}, column ${column} is already occupied` };
    }

    // Check for collision at controls positions
    if (controls !== undefined) {
      for (const ctrl of controls) {
        if (isCellOccupied(ctrl, column)) {
          return { type: 'error', message: `Cell at qubit ${ctrl}, column ${column} is already occupied` };
        }
      }
    }

    saveToHistory();

    const newGate: GateInstance = {
      id: generateId(),
      gateId,
      target,
      column,
      ...(control !== undefined && { control }),
      ...(controls !== undefined && { controls }),
      ...(angle !== undefined && { angle }),
      ...(angles !== undefined && { angles }),
    };

    setCircuit(c => ({
      ...c,
      gates: [...c.gates, newGate],
    }));

    return null; // Success
  }, [circuit.numQubits, isCellOccupied, saveToHistory]);

  // Add multiple gates at once (for pattern placement)
  const addGates = useCallback((gates: GateInstance[]) => {
    if (gates.length === 0) return;
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: [...c.gates, ...gates],
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
        if (gate.controls) {
          for (const ctrl of gate.controls) {
            occupied.add(`${ctrl},${gate.column}`);
          }
        }
      }

      for (const gate of gatesToDuplicate) {
        const newTarget = gate.target + qubitOffset;
        const newControl = gate.control !== undefined ? gate.control + qubitOffset : undefined;
        const newControls = gate.controls ? gate.controls.map(ctrl => ctrl + qubitOffset) : undefined;
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
        if (newControls && newControls.some(ctrl => ctrl < 0 || ctrl >= c.numQubits)) {
          skipped++;
          continue;
        }
        if (newColumn < 0 || newColumn >= CIRCUIT_LIMITS.MAX_COLUMNS) {
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

        // Check collision at controls
        if (newControls) {
          let hasCollision = false;
          for (const ctrl of newControls) {
            if (occupied.has(`${ctrl},${newColumn}`)) {
              hasCollision = true;
              break;
            }
          }
          if (hasCollision) {
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
        if (newControls) {
          for (const ctrl of newControls) {
            occupied.add(`${ctrl},${newColumn}`);
          }
        }

        newGates.push({
          ...gate,
          id: newId,
          target: newTarget,
          column: newColumn,
          ...(newControl !== undefined && { control: newControl }),
          ...(newControls && { controls: newControls }),
        });
      }

      return {
        ...c,
        gates: [...c.gates, ...newGates],
      };
    });

    return { newIds, skipped };
  }, [saveToHistory]);

  // Set number of qubits
  const setNumQubits = useCallback((n: number) => {
    if (n < 1 || n > CIRCUIT_LIMITS.MAX_QUBITS) return;
    saveToHistory();
    setCircuit(c => ({
      ...c,
      numQubits: n,
      // Remove gates that are out of bounds
      gates: c.gates.filter(g => {
        if (g.target >= n) return false;
        if (g.control !== undefined && g.control >= n) return false;
        if (g.controls && g.controls.some(ctrl => ctrl >= n)) return false;
        return true;
      }),
    }));
  }, [saveToHistory]);

  // Clear circuit (keeps settings)
  const clearCircuit = useCallback(() => {
    saveToHistory();
    setCircuit(c => ({
      ...c,
      gates: [],
    }));
  }, [saveToHistory]);

  // New circuit (clears everything including localStorage)
  const newCircuit = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTOSAVE);
    setCircuit({
      numQubits: 3,
      gates: [],
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
    addGates,
    removeGate,
    removeGates,
    moveGate,
    updateGateTarget,
    updateGateControl,
    updateGateAngle,
    updateGateAngles,
    duplicateGates,
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
