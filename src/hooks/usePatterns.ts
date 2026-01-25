/**
 * React hook for managing circuit patterns (reusable gate templates).
 */

import { useState, useCallback, useEffect } from 'react';
import { CircuitPattern, PatternGate, GateInstance } from '../types/circuit';

const STORAGE_KEY = 'quantum-circuit-patterns';

// Pattern colors for visual distinction
const PATTERN_COLORS = [
  '#6366F1', // Indigo
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#06B6D4', // Cyan
  '#EF4444', // Red
  '#84CC16', // Lime
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Load patterns from localStorage
function loadPatterns(): CircuitPattern[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load patterns:', e);
  }
  return [];
}

// Save patterns to localStorage
function savePatterns(patterns: CircuitPattern[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patterns));
  } catch (e) {
    console.error('Failed to save patterns:', e);
  }
}

export interface UsePatternsReturn {
  patterns: CircuitPattern[];
  selectedPattern: CircuitPattern | null;
  selectPattern: (patternId: string | null) => void;
  createPatternFromGates: (gates: GateInstance[], name: string) => CircuitPattern | null;
  deletePattern: (patternId: string) => void;
  renamePattern: (patternId: string, name: string) => void;
  applyPattern: (
    pattern: CircuitPattern,
    targetQubit: number,
    targetColumn: number,
    numQubits: number,
    isCellOccupied: (qubit: number, column: number) => boolean
  ) => GateInstance[] | null;
}

export function usePatterns(): UsePatternsReturn {
  const [patterns, setPatterns] = useState<CircuitPattern[]>(loadPatterns);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);

  // Save patterns whenever they change
  useEffect(() => {
    savePatterns(patterns);
  }, [patterns]);

  // Get selected pattern
  const selectedPattern = patterns.find(p => p.id === selectedPatternId) || null;

  // Select a pattern
  const selectPattern = useCallback((patternId: string | null) => {
    setSelectedPatternId(patternId);
  }, []);

  // Create a pattern from selected gates
  const createPatternFromGates = useCallback((
    gates: GateInstance[],
    name: string
  ): CircuitPattern | null => {
    if (gates.length === 0) return null;

    // Find the minimum qubit and column to normalize positions
    let minQubit = Infinity;
    let maxQubit = -Infinity;
    let minColumn = Infinity;
    let maxColumn = -Infinity;

    for (const gate of gates) {
      minQubit = Math.min(minQubit, gate.target);
      maxQubit = Math.max(maxQubit, gate.target);
      minColumn = Math.min(minColumn, gate.column);
      maxColumn = Math.max(maxColumn, gate.column);

      if (gate.control !== undefined) {
        minQubit = Math.min(minQubit, gate.control);
        maxQubit = Math.max(maxQubit, gate.control);
      }

      if (gate.controls) {
        for (const ctrl of gate.controls) {
          minQubit = Math.min(minQubit, ctrl);
          maxQubit = Math.max(maxQubit, ctrl);
        }
      }
    }

    // Convert gates to pattern gates with relative positions
    const patternGates: PatternGate[] = gates.map(gate => ({
      gateId: gate.gateId,
      relativeTarget: gate.target - minQubit,
      relativeColumn: gate.column - minColumn,
      ...(gate.control !== undefined && { relativeControl: gate.control - minQubit }),
      ...(gate.controls && { relativeControls: gate.controls.map(c => c - minQubit) }),
      ...(gate.angle !== undefined && { angle: gate.angle }),
      ...(gate.angles !== undefined && { angles: gate.angles }),
    }));

    const colorIndex = patterns.length % PATTERN_COLORS.length;
    const newPattern: CircuitPattern = {
      id: generateId(),
      name: name || `Pattern ${patterns.length + 1}`,
      gates: patternGates,
      qubitSpan: maxQubit - minQubit + 1,
      columnSpan: maxColumn - minColumn + 1,
      color: PATTERN_COLORS[colorIndex],
      createdAt: new Date().toISOString(),
    };

    setPatterns(prev => [...prev, newPattern]);
    return newPattern;
  }, [patterns.length]);

  // Delete a pattern
  const deletePattern = useCallback((patternId: string) => {
    setPatterns(prev => prev.filter(p => p.id !== patternId));
    if (selectedPatternId === patternId) {
      setSelectedPatternId(null);
    }
  }, [selectedPatternId]);

  // Rename a pattern
  const renamePattern = useCallback((patternId: string, name: string) => {
    setPatterns(prev => prev.map(p =>
      p.id === patternId ? { ...p, name } : p
    ));
  }, []);

  // Apply a pattern to the circuit at a specific position
  const applyPattern = useCallback((
    pattern: CircuitPattern,
    targetQubit: number,
    targetColumn: number,
    numQubits: number,
    isCellOccupied: (qubit: number, column: number) => boolean
  ): GateInstance[] | null => {
    // Check if pattern fits within circuit bounds
    if (targetQubit + pattern.qubitSpan > numQubits) {
      return null; // Pattern doesn't fit
    }

    // Check for collisions
    for (const pg of pattern.gates) {
      const qubit = targetQubit + pg.relativeTarget;
      const column = targetColumn + pg.relativeColumn;

      if (isCellOccupied(qubit, column)) {
        return null; // Collision detected
      }

      if (pg.relativeControl !== undefined) {
        const ctrlQubit = targetQubit + pg.relativeControl;
        if (isCellOccupied(ctrlQubit, column)) {
          return null;
        }
      }

      if (pg.relativeControls) {
        for (const relCtrl of pg.relativeControls) {
          const ctrlQubit = targetQubit + relCtrl;
          if (isCellOccupied(ctrlQubit, column)) {
            return null;
          }
        }
      }
    }

    // Create gate instances from pattern
    const newGates: GateInstance[] = pattern.gates.map(pg => ({
      id: generateId(),
      gateId: pg.gateId,
      target: targetQubit + pg.relativeTarget,
      column: targetColumn + pg.relativeColumn,
      ...(pg.relativeControl !== undefined && { control: targetQubit + pg.relativeControl }),
      ...(pg.relativeControls && { controls: pg.relativeControls.map(c => targetQubit + c) }),
      ...(pg.angle !== undefined && { angle: pg.angle }),
      ...(pg.angles !== undefined && { angles: pg.angles }),
    }));

    return newGates;
  }, []);

  return {
    patterns,
    selectedPattern,
    selectPattern,
    createPatternFromGates,
    deletePattern,
    renamePattern,
    applyPattern,
  };
}
