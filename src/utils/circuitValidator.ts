/**
 * Circuit validation utilities for safe loading of circuit files.
 */

import { GATE_DEFINITIONS } from './gateDefinitions';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const MAX_QUBITS = 10;
const MAX_COLUMNS = 50;

/**
 * Validate a saved circuit file before loading.
 */
export function validateSavedCircuit(data: unknown): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check basic structure
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Invalid circuit format: expected object'], warnings: [] };
  }

  const circuit = data as Record<string, unknown>;

  // Validate version (optional but check if present)
  if (circuit.version !== undefined && typeof circuit.version !== 'string') {
    warnings.push('version should be a string');
  }

  // Validate name
  if (circuit.name !== undefined && typeof circuit.name !== 'string') {
    errors.push('name must be a string');
  }

  // Validate numQubits (required)
  if (typeof circuit.numQubits !== 'number') {
    errors.push('numQubits is required and must be a number');
  } else if (!Number.isInteger(circuit.numQubits) || circuit.numQubits < 1 || circuit.numQubits > MAX_QUBITS) {
    errors.push(`numQubits must be an integer between 1 and ${MAX_QUBITS}`);
  }

  const numQubits = typeof circuit.numQubits === 'number' ? circuit.numQubits : MAX_QUBITS;

  // Validate gates (required)
  if (!Array.isArray(circuit.gates)) {
    errors.push('gates must be an array');
  } else {
    circuit.gates.forEach((gate, i) => {
      const gateErrors = validateGate(gate, numQubits, i);
      errors.push(...gateErrors);
    });

    // Check for duplicate positions (warning, not error)
    const positions = new Map<string, number>();
    circuit.gates.forEach((gate, i) => {
      const g = gate as Record<string, unknown>;
      if (typeof g.target === 'number') {
        // For loaded circuits, column may not be present (calculated on load)
        const key = `${g.target}`;
        if (positions.has(key)) {
          // This is just informational since column positions are recalculated
        }
        positions.set(key, i);
      }
    });
  }

  // Validate repeaters (optional)
  if (circuit.repeaters !== undefined) {
    if (!Array.isArray(circuit.repeaters)) {
      errors.push('repeaters must be an array');
    } else {
      circuit.repeaters.forEach((repeater, i) => {
        const repeaterErrors = validateRepeater(repeater, numQubits, i);
        errors.push(...repeaterErrors);
      });
    }
  }

  // Validate description (optional)
  if (circuit.description !== undefined && typeof circuit.description !== 'string') {
    warnings.push('description should be a string');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a single gate in a saved circuit.
 */
function validateGate(gate: unknown, numQubits: number, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Gate ${index}`;

  if (typeof gate !== 'object' || gate === null) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const g = gate as Record<string, unknown>;

  // Check gate type exists
  if (typeof g.gate !== 'string') {
    errors.push(`${prefix}: 'gate' field is required and must be a string`);
  } else if (!GATE_DEFINITIONS[g.gate]) {
    errors.push(`${prefix}: unknown gate type "${g.gate}"`);
  }

  // Check target qubit
  if (typeof g.target !== 'number') {
    errors.push(`${prefix}: 'target' field is required and must be a number`);
  } else if (!Number.isInteger(g.target) || g.target < 0 || g.target >= numQubits) {
    errors.push(`${prefix}: target qubit ${g.target} out of bounds (0-${numQubits - 1})`);
  }

  // Check control qubit if present
  if (g.control !== undefined) {
    if (typeof g.control !== 'number') {
      errors.push(`${prefix}: control must be a number`);
    } else if (!Number.isInteger(g.control) || g.control < 0 || g.control >= numQubits) {
      errors.push(`${prefix}: control qubit ${g.control} out of bounds (0-${numQubits - 1})`);
    } else if (g.control === g.target) {
      errors.push(`${prefix}: control qubit cannot equal target qubit`);
    }
  }

  // Check controls array if present
  if (g.controls !== undefined) {
    if (!Array.isArray(g.controls)) {
      errors.push(`${prefix}: controls must be an array`);
    } else {
      g.controls.forEach((ctrl, ci) => {
        if (typeof ctrl !== 'number' || !Number.isInteger(ctrl) || ctrl < 0 || ctrl >= numQubits) {
          errors.push(`${prefix}: controls[${ci}] out of bounds`);
        }
        if (ctrl === g.target) {
          errors.push(`${prefix}: controls[${ci}] cannot equal target`);
        }
      });
    }
  }

  // Check angle if present
  if (g.angle !== undefined) {
    if (typeof g.angle !== 'number' || !Number.isFinite(g.angle)) {
      errors.push(`${prefix}: angle must be a finite number`);
    }
  }

  // Check angles array if present
  if (g.angles !== undefined) {
    if (!Array.isArray(g.angles)) {
      errors.push(`${prefix}: angles must be an array`);
    } else {
      g.angles.forEach((angle, ai) => {
        if (typeof angle !== 'number' || !Number.isFinite(angle)) {
          errors.push(`${prefix}: angles[${ai}] must be a finite number`);
        }
      });
    }
  }

  // Validate gate-specific requirements
  if (typeof g.gate === 'string') {
    const def = GATE_DEFINITIONS[g.gate];
    if (def) {
      // Two-qubit gates should have control
      if (def.numQubits === 2 && g.control === undefined && g.gate !== 'M') {
        // This is a warning - control will default during load
      }

      // Rotation gates should have angle
      if (def.hasAngle && g.angle === undefined) {
        // This is okay - will default to PI
      }

      // U gate should have angles
      if (def.hasMultipleAngles && g.angles === undefined) {
        // This is okay - will default
      }
    }
  }

  return errors;
}

/**
 * Validate a repeater block.
 */
function validateRepeater(repeater: unknown, numQubits: number, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Repeater ${index}`;

  if (typeof repeater !== 'object' || repeater === null) {
    errors.push(`${prefix}: must be an object`);
    return errors;
  }

  const r = repeater as Record<string, unknown>;

  // Check qubit bounds
  if (typeof r.qubitStart !== 'number' || !Number.isInteger(r.qubitStart)) {
    errors.push(`${prefix}: qubitStart must be an integer`);
  } else if (r.qubitStart < 0 || r.qubitStart >= numQubits) {
    errors.push(`${prefix}: qubitStart out of bounds`);
  }

  if (typeof r.qubitEnd !== 'number' || !Number.isInteger(r.qubitEnd)) {
    errors.push(`${prefix}: qubitEnd must be an integer`);
  } else if (r.qubitEnd < 0 || r.qubitEnd >= numQubits) {
    errors.push(`${prefix}: qubitEnd out of bounds`);
  }

  // Check column bounds
  if (typeof r.columnStart !== 'number' || !Number.isInteger(r.columnStart)) {
    errors.push(`${prefix}: columnStart must be an integer`);
  } else if (r.columnStart < 0 || r.columnStart >= MAX_COLUMNS) {
    errors.push(`${prefix}: columnStart out of bounds`);
  }

  if (typeof r.columnEnd !== 'number' || !Number.isInteger(r.columnEnd)) {
    errors.push(`${prefix}: columnEnd must be an integer`);
  } else if (r.columnEnd < 0 || r.columnEnd >= MAX_COLUMNS) {
    errors.push(`${prefix}: columnEnd out of bounds`);
  }

  // Check repetitions
  if (typeof r.repetitions !== 'number' || !Number.isInteger(r.repetitions)) {
    errors.push(`${prefix}: repetitions must be an integer`);
  } else if (r.repetitions < 1 || r.repetitions > 100) {
    errors.push(`${prefix}: repetitions must be between 1 and 100`);
  }

  // Check logical ordering
  if (typeof r.qubitStart === 'number' && typeof r.qubitEnd === 'number') {
    if (r.qubitStart > r.qubitEnd) {
      errors.push(`${prefix}: qubitStart cannot be greater than qubitEnd`);
    }
  }

  if (typeof r.columnStart === 'number' && typeof r.columnEnd === 'number') {
    if (r.columnStart > r.columnEnd) {
      errors.push(`${prefix}: columnStart cannot be greater than columnEnd`);
    }
  }

  return errors;
}

/**
 * Validate a circuit state (for runtime validation).
 */
export function validateCircuitState(circuit: {
  numQubits: number;
  gates: Array<{
    id: string;
    gateId: string;
    target: number;
    control?: number;
    column: number;
  }>;
}): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for gate collisions
  const occupiedCells = new Map<string, string>();

  for (const gate of circuit.gates) {
    // Check target qubit bounds
    if (gate.target < 0 || gate.target >= circuit.numQubits) {
      errors.push(`Gate ${gate.gateId} (${gate.id}): target qubit ${gate.target} out of bounds`);
    }

    // Check control qubit bounds
    if (gate.control !== undefined) {
      if (gate.control < 0 || gate.control >= circuit.numQubits) {
        errors.push(`Gate ${gate.gateId} (${gate.id}): control qubit ${gate.control} out of bounds`);
      }
      if (gate.control === gate.target) {
        errors.push(`Gate ${gate.gateId} (${gate.id}): control equals target`);
      }
    }

    // Check for collisions
    const key = `${gate.target},${gate.column}`;
    if (occupiedCells.has(key)) {
      warnings.push(`Collision at qubit ${gate.target}, column ${gate.column}`);
    }
    occupiedCells.set(key, gate.id);

    // Also check control position for two-qubit gates
    if (gate.control !== undefined) {
      const ctrlKey = `${gate.control},${gate.column}`;
      if (occupiedCells.has(ctrlKey) && occupiedCells.get(ctrlKey) !== gate.id) {
        warnings.push(`Collision at qubit ${gate.control}, column ${gate.column}`);
      }
      occupiedCells.set(ctrlKey, gate.id);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
