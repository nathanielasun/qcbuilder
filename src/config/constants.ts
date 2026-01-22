/**
 * Application constants to replace magic numbers throughout the codebase.
 */

export const CIRCUIT_LIMITS = {
  MAX_QUBITS: 10,
  MAX_COLUMNS: 50,
  MAX_HISTORY: 50,
  DEFAULT_SHOTS: 1024,
  MAX_SHOTS: 8192,
} as const;

export const UI_CONSTANTS = {
  CELL_SIZE: 60,
  QUBIT_LABEL_WIDTH: 50,
} as const;

export const STORAGE_KEYS = {
  SAVED_CIRCUITS: 'quantumCircuits',
  AUTOSAVE: 'quantumCircuitAutosave',
} as const;

export const EXECUTION_CONSTANTS = {
  CHUNK_SIZE: 100,
  CHUNK_DELAY_MS: 0,
} as const;
