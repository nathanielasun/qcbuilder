/**
 * Utility exports.
 */

export {
  GATE_DEFINITIONS,
  GATE_CATEGORIES,
  ANGLE_PRESETS,
  getGateDefinition,
  formatAngle,
} from './gateDefinitions';

export {
  validateSavedCircuit,
  validateCircuitState,
  type ValidationResult,
} from './circuitValidator';
