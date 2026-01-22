# Critical Fixes Plan for Quantum Circuit Builder

This document outlines identified issues and their implementation routes, organized by priority.

---

## CRITICAL PRIORITY

### 1. Repeater Blocks Are Not Used in Simulation

**Problem:**
The `RepeaterBlock` feature allows users to visually define sections that repeat N times, but the simulator (`useQuantumSimulator.ts`) completely ignores them. Gates inside repeaters execute only once regardless of the `repetitions` value.

**Affected Files:**
- `src/hooks/useQuantumSimulator.ts`

**Implementation Route:**

1. **Modify `simulateOnce()` function** (line ~437):
   ```typescript
   // Before applying gates, expand gates within repeaters
   const expandedGates = expandRepeaters(circuit.gates, circuit.repeaters);
   const sortedGates = [...expandedGates].sort((a, b) => a.column - b.column);
   ```

2. **Create `expandRepeaters()` helper function:**
   ```typescript
   function expandRepeaters(
     gates: GateInstance[],
     repeaters: RepeaterBlock[]
   ): GateInstance[] {
     if (repeaters.length === 0) return gates;

     const expanded: GateInstance[] = [];
     const gatesInRepeaters = new Set<string>();

     // Sort repeaters by column for proper expansion
     const sortedRepeaters = [...repeaters].sort(
       (a, b) => a.columnStart - b.columnStart
     );

     // Identify gates within each repeater
     for (const repeater of sortedRepeaters) {
       const containedGates = gates.filter(g =>
         g.column >= repeater.columnStart &&
         g.column <= repeater.columnEnd &&
         g.target >= repeater.qubitStart &&
         g.target <= repeater.qubitEnd
       );

       // Add repeated copies with adjusted columns
       const blockWidth = repeater.columnEnd - repeater.columnStart + 1;
       for (let rep = 0; rep < repeater.repetitions; rep++) {
         for (const gate of containedGates) {
           gatesInRepeaters.add(gate.id);
           expanded.push({
             ...gate,
             id: `${gate.id}_rep${rep}`,
             column: gate.column + (rep * blockWidth),
           });
         }
       }
     }

     // Add gates not in any repeater
     for (const gate of gates) {
       if (!gatesInRepeaters.has(gate.id)) {
         expanded.push(gate);
       }
     }

     return expanded;
   }
   ```

3. **Apply same fix to `getStatevector()`** (line ~540)

4. **Update `CircuitState` type** to pass repeaters to simulator functions

5. **Add unit tests** for repeater expansion logic

---

### 2. TensorFlow.js Backend Selection Has No Effect

**Problem:**
TensorFlow.js is imported and users can select backends (CPU/WebGL/WebGPU/WASM), but the actual simulation uses plain JavaScript `Float32Array` with manual complex number arithmetic. The backend selection is misleading.

**Affected Files:**
- `src/hooks/useQuantumSimulator.ts`
- `src/components/HardwareSettingsPanel.tsx`

**Implementation Route (Option A - Implement TF.js GPU Acceleration):**

1. **Replace manual state vector operations with TF.js tensors:**
   ```typescript
   // Initialize state as TF.js tensor
   const stateReal = tf.zeros([dim]);
   const stateImag = tf.zeros([dim]);
   // Set |0...0> = 1
   const indices = tf.tensor1d([0], 'int32');
   const updates = tf.tensor1d([1.0]);
   stateReal = tf.tensorScatterUpdate(stateReal, indices.reshape([-1, 1]), updates);
   ```

2. **Implement gate application using TF.js operations:**
   ```typescript
   function applySingleQubitGateTF(
     stateReal: tf.Tensor1D,
     stateImag: tf.Tensor1D,
     numQubits: number,
     target: number,
     gate: Complex[][]
   ): [tf.Tensor1D, tf.Tensor1D] {
     // Use tf.gather and tf.tensorScatterUpdate for strided access
     // Use tf.matMul for matrix multiplication
   }
   ```

3. **Ensure proper tensor disposal** to prevent memory leaks:
   ```typescript
   tf.tidy(() => {
     // All tensor operations here
   });
   ```

4. **Benchmark** to verify GPU acceleration is actually faster for the problem sizes

**Implementation Route (Option B - Remove Misleading UI):**

1. **Simplify HardwareSettingsPanel** to show info-only (no backend selection)

2. **Remove `setBackend` from useQuantumSimulator return**

3. **Update UI text** to clarify simulation runs on CPU via JavaScript

4. **Keep TF.js only for potential future use** or remove entirely to reduce bundle size

**Recommendation:** Option B is faster to implement. Option A requires significant refactoring and may not provide speedup for small circuits (10 qubits = 1024 amplitudes is small).

---

### 3. No Input Validation for Loaded Circuits

**Problem:**
When loading circuits from JSON files, there's no schema validation. Malformed JSON could cause runtime errors, corrupt state, or potentially inject malicious data.

**Affected Files:**
- `src/components/ControlPanel.tsx`
- `src/hooks/useCircuitState.ts`
- `src/types/circuit.ts`

**Implementation Route:**

1. **Create validation schema** in new file `src/utils/circuitValidator.ts`:
   ```typescript
   import { SavedCircuit, GateInstance } from '../types/circuit';
   import { GATE_DEFINITIONS } from './gateDefinitions';

   export interface ValidationResult {
     valid: boolean;
     errors: string[];
     warnings: string[];
   }

   export function validateSavedCircuit(data: unknown): ValidationResult {
     const errors: string[] = [];
     const warnings: string[] = [];

     // Check basic structure
     if (typeof data !== 'object' || data === null) {
       return { valid: false, errors: ['Invalid circuit format'], warnings: [] };
     }

     const circuit = data as Record<string, unknown>;

     // Required fields
     if (typeof circuit.numQubits !== 'number' ||
         circuit.numQubits < 1 ||
         circuit.numQubits > 10) {
       errors.push('numQubits must be between 1 and 10');
     }

     if (!Array.isArray(circuit.gates)) {
       errors.push('gates must be an array');
     } else {
       // Validate each gate
       circuit.gates.forEach((gate, i) => {
         const gateErrors = validateGate(gate, circuit.numQubits as number, i);
         errors.push(...gateErrors);
       });
     }

     // Validate repeaters if present
     if (circuit.repeaters && !Array.isArray(circuit.repeaters)) {
       errors.push('repeaters must be an array');
     }

     return {
       valid: errors.length === 0,
       errors,
       warnings,
     };
   }

   function validateGate(
     gate: unknown,
     numQubits: number,
     index: number
   ): string[] {
     const errors: string[] = [];
     const g = gate as Record<string, unknown>;

     // Check gate ID exists
     if (typeof g.gate !== 'string' || !GATE_DEFINITIONS[g.gate]) {
       errors.push(`Gate ${index}: unknown gate type "${g.gate}"`);
     }

     // Check target qubit bounds
     if (typeof g.target !== 'number' ||
         g.target < 0 ||
         g.target >= numQubits) {
       errors.push(`Gate ${index}: target qubit out of bounds`);
     }

     // Check control qubit bounds if present
     if (g.control !== undefined) {
       if (typeof g.control !== 'number' ||
           g.control < 0 ||
           g.control >= numQubits) {
         errors.push(`Gate ${index}: control qubit out of bounds`);
       }
       if (g.control === g.target) {
         errors.push(`Gate ${index}: control cannot equal target`);
       }
     }

     // Validate angles for rotation gates
     const def = GATE_DEFINITIONS[g.gate as string];
     if (def?.hasAngle && g.angle !== undefined) {
       if (typeof g.angle !== 'number' || !isFinite(g.angle)) {
         errors.push(`Gate ${index}: invalid angle value`);
       }
     }

     return errors;
   }
   ```

2. **Update ControlPanel.tsx** to use validator:
   ```typescript
   import { validateSavedCircuit } from '../utils/circuitValidator';

   const handleLoad = useCallback(() => {
     // ... file input setup ...
     input.onchange = async (e) => {
       const file = (e.target as HTMLInputElement).files?.[0];
       if (!file) return;

       try {
         const text = await file.text();
         const data = JSON.parse(text);

         const validation = validateSavedCircuit(data);
         if (!validation.valid) {
           alert(`Invalid circuit file:\n${validation.errors.join('\n')}`);
           return;
         }

         if (validation.warnings.length > 0) {
           console.warn('Circuit warnings:', validation.warnings);
         }

         onLoad(data as SavedCircuit);
       } catch (err) {
         alert('Failed to parse circuit file: ' + (err as Error).message);
       }
     };
   }, [onLoad]);
   ```

3. **Add same validation to preset loading** in `App.tsx`

4. **Consider using Zod** for runtime schema validation (adds ~12KB to bundle but more robust)

---

## HIGH PRIORITY

### 4. Simulation Blocks Main Thread

**Problem:**
The simulation loop runs synchronously, freezing the UI with large shot counts.

**Affected Files:**
- `src/hooks/useQuantumSimulator.ts`

**Implementation Route:**

1. **Create Web Worker** in `src/workers/simulatorWorker.ts`:
   ```typescript
   // simulatorWorker.ts
   import { CircuitState } from '../types/circuit';

   self.onmessage = (e: MessageEvent) => {
     const { circuit, shots } = e.data;
     const counts: Record<string, number> = {};

     for (let i = 0; i < shots; i++) {
       const result = simulateOnce(circuit);
       counts[result] = (counts[result] || 0) + 1;

       // Report progress every 100 shots
       if (i % 100 === 0) {
         self.postMessage({ type: 'progress', completed: i, total: shots });
       }
     }

     self.postMessage({ type: 'complete', counts });
   };

   // Include simulation functions here (or use importScripts)
   function simulateOnce(circuit: CircuitState): string {
     // ... copy simulation logic ...
   }
   ```

2. **Update useQuantumSimulator** to use worker:
   ```typescript
   const workerRef = useRef<Worker | null>(null);

   useEffect(() => {
     workerRef.current = new Worker(
       new URL('../workers/simulatorWorker.ts', import.meta.url),
       { type: 'module' }
     );
     return () => workerRef.current?.terminate();
   }, []);

   const executeCircuit = useCallback(async (
     circuit: CircuitState,
     shots: number
   ): Promise<ExecutionResults | null> => {
     return new Promise((resolve) => {
       workerRef.current!.onmessage = (e) => {
         if (e.data.type === 'progress') {
           // Update progress UI
         } else if (e.data.type === 'complete') {
           resolve(/* process results */);
         }
       };
       workerRef.current!.postMessage({ circuit, shots });
     });
   }, []);
   ```

3. **Add Vite worker configuration** if needed

4. **Add progress indicator** to UI during simulation

**Alternative (simpler):** Use `requestIdleCallback` or chunked execution:
```typescript
async function executeInChunks(circuit: CircuitState, shots: number) {
  const counts: Record<string, number> = {};
  const CHUNK_SIZE = 100;

  for (let i = 0; i < shots; i += CHUNK_SIZE) {
    const chunkEnd = Math.min(i + CHUNK_SIZE, shots);
    for (let j = i; j < chunkEnd; j++) {
      const result = simulateOnce(circuit);
      counts[result] = (counts[result] || 0) + 1;
    }
    // Yield to main thread
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return counts;
}
```

---

### 5. No Circuit Validation

**Problem:**
Users can create invalid circuits without warnings (control=target, overlapping gates, etc.).

**Affected Files:**
- `src/hooks/useCircuitState.ts`
- `src/components/CircuitCanvas.tsx`

**Implementation Route:**

1. **Add validation to `addGate()`**:
   ```typescript
   const addGate = useCallback((
     gateId: string,
     target: number,
     column: number,
     control?: number,
     angle?: number,
     angles?: number[]
   ) => {
     // Validate control != target
     if (control !== undefined && control === target) {
       console.error('Control qubit cannot be same as target');
       return; // Or show toast notification
     }

     // Validate qubit bounds
     if (target < 0 || target >= circuit.numQubits) {
       console.error('Target qubit out of bounds');
       return;
     }

     if (control !== undefined && (control < 0 || control >= circuit.numQubits)) {
       console.error('Control qubit out of bounds');
       return;
     }

     // Check for collisions
     if (isCellOccupied(target, column)) {
       console.error('Cell already occupied');
       return;
     }

     // ... rest of addGate logic
   }, [circuit.numQubits, saveToHistory]);
   ```

2. **Add `validateCircuit()` function** for comprehensive checking:
   ```typescript
   export function validateCircuit(circuit: CircuitState): ValidationResult {
     const errors: string[] = [];

     for (const gate of circuit.gates) {
       // Check qubit bounds
       if (gate.target >= circuit.numQubits) {
         errors.push(`Gate ${gate.gateId}: target qubit ${gate.target} exceeds circuit size`);
       }

       // Check control bounds and validity
       if (gate.control !== undefined) {
         if (gate.control >= circuit.numQubits) {
           errors.push(`Gate ${gate.gateId}: control qubit exceeds circuit size`);
         }
         if (gate.control === gate.target) {
           errors.push(`Gate ${gate.gateId}: control equals target`);
         }
       }
     }

     // Check for gate collisions
     const occupiedCells = new Map<string, string>();
     for (const gate of circuit.gates) {
       const key = `${gate.target},${gate.column}`;
       if (occupiedCells.has(key)) {
         errors.push(`Collision at qubit ${gate.target}, column ${gate.column}`);
       }
       occupiedCells.set(key, gate.id);
     }

     return { valid: errors.length === 0, errors };
   }
   ```

3. **Call validation before execution** in `App.tsx`:
   ```typescript
   const handleExecute = useCallback(async () => {
     const validation = validateCircuit(circuit);
     if (!validation.valid) {
       setError(validation.errors.join('; '));
       return;
     }
     await executeCircuit(circuit, shots);
   }, [circuit, shots, executeCircuit]);
   ```

4. **Add visual feedback** for invalid placements in CircuitCanvas

---

### 6. Copy/Paste Doesn't Check for Collisions

**Problem:**
Pasted gates can overlap with existing gates without warning.

**Affected Files:**
- `src/hooks/useCircuitState.ts`
- `src/App.tsx`

**Implementation Route:**

1. **Update `duplicateGates()` to check collisions**:
   ```typescript
   const duplicateGates = useCallback((
     instanceIds: string[],
     columnOffset: number,
     qubitOffset: number
   ): { newIds: string[]; collisions: number } => {
     let collisions = 0;
     const newIds: string[] = [];

     setCircuit(c => {
       const gatesToDuplicate = c.gates.filter(g => instanceIds.includes(g.id));
       const newGates: GateInstance[] = [];

       // Build occupancy map
       const occupied = new Set<string>();
       for (const gate of c.gates) {
         occupied.add(`${gate.target},${gate.column}`);
         if (gate.control !== undefined) {
           occupied.add(`${gate.control},${gate.column}`);
         }
       }

       for (const gate of gatesToDuplicate) {
         const newTarget = gate.target + qubitOffset;
         const newColumn = gate.column + columnOffset;
         const newControl = gate.control !== undefined
           ? gate.control + qubitOffset
           : undefined;

         // Check collision
         const key = `${newTarget},${newColumn}`;
         if (occupied.has(key)) {
           collisions++;
           continue; // Skip this gate
         }

         // ... create new gate ...
       }

       return { ...c, gates: [...c.gates, ...newGates] };
     });

     return { newIds, collisions };
   }, [saveToHistory]);
   ```

2. **Show warning if collisions occurred**:
   ```typescript
   const handlePaste = useCallback(() => {
     // ...
     const { newIds, collisions } = duplicateGates(gateIds, columnOffset, 0);

     if (collisions > 0) {
       // Show toast or notification
       console.warn(`${collisions} gates skipped due to collisions`);
     }

     if (newIds.length > 0) {
       setSelectedInstances(new Set(newIds));
     }
   }, [/* deps */]);
   ```

---

### 7. No Auto-Save or State Persistence

**Problem:**
Circuit state is lost on page refresh.

**Affected Files:**
- `src/hooks/useCircuitState.ts`
- `src/App.tsx`

**Implementation Route:**

1. **Add localStorage persistence to useCircuitState**:
   ```typescript
   const STORAGE_KEY = 'quantum-circuit-builder-state';

   // Load initial state from localStorage
   const loadSavedState = (): CircuitState | null => {
     try {
       const saved = localStorage.getItem(STORAGE_KEY);
       if (saved) {
         const parsed = JSON.parse(saved);
         // Validate before using
         const validation = validateSavedCircuit(parsed);
         if (validation.valid) {
           return parsed;
         }
       }
     } catch (e) {
       console.error('Failed to load saved circuit:', e);
     }
     return null;
   };

   export function useCircuitState(initialQubits: number = 3) {
     const savedState = loadSavedState();

     const [circuit, setCircuit] = useState<CircuitState>(
       savedState || {
         numQubits: initialQubits,
         gates: [],
         repeaters: [],
         name: 'Untitled Circuit',
         description: '',
       }
     );

     // Auto-save on changes
     useEffect(() => {
       const timeoutId = setTimeout(() => {
         try {
           localStorage.setItem(STORAGE_KEY, JSON.stringify(circuit));
         } catch (e) {
           console.error('Failed to save circuit:', e);
         }
       }, 500); // Debounce saves

       return () => clearTimeout(timeoutId);
     }, [circuit]);

     // ... rest of hook
   }
   ```

2. **Add "New Circuit" action** that clears localStorage:
   ```typescript
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
   ```

3. **Add UI button** for "New Circuit" in ControlPanel

4. **Consider adding multiple save slots** or circuit list

---

## MEDIUM PRIORITY

### 8. Unused TypeScript Types

**Problem:**
Several types in `types/circuit.ts` are defined but never used.

**Affected Files:**
- `src/types/circuit.ts`

**Implementation Route:**

1. **Remove unused types** or mark with `// TODO: implement`:
   - `UIState` - Remove (state is managed in components)
   - `Toast` - Keep if planning to add toast notifications
   - `AppSettings` - Keep if planning settings persistence
   - `DragItem`, `DropResult` - Remove (using HTML5 drag-drop instead)

2. **Or implement the features they were designed for:**
   - Add toast notification system using `Toast` type
   - Add settings panel using `AppSettings` type

---

### 9. Duplicate Complex Type Definition

**Problem:**
`Complex` is defined in both `types/circuit.ts` and `useQuantumSimulator.ts`.

**Implementation Route:**

1. **Remove from `useQuantumSimulator.ts`** and import from types:
   ```typescript
   import { Complex } from '../types/circuit';
   ```

2. **Export Complex from types/index.ts** if not already

---

### 10. Multi-Control Gates Not Implemented

**Problem:**
`GateInstance.controls?: number[]` exists but is unused. No Toffoli, Fredkin, or other multi-control gates.

**Implementation Route:**

1. **Add gate definitions** for CCX (Toffoli), CCZ, CSWAP (Fredkin):
   ```typescript
   CCX: {
     id: 'CCX',
     name: 'Toffoli',
     symbol: 'CCX',
     category: 'controlled',
     numQubits: 3,
     description: 'Controlled-controlled-NOT gate',
     color: '#2C3E50',
   },
   ```

2. **Implement multi-control gate application** in simulator:
   ```typescript
   const applyMultiControlledGate = useCallback((
     stateReal: Float32Array,
     stateImag: Float32Array,
     numQubits: number,
     controls: number[],
     target: number,
     gate: Complex[][]
   ) => {
     const dim = 1 << numQubits;
     const controlMask = controls.reduce((m, c) => m | (1 << c), 0);
     const targetMask = 1 << target;

     for (let i = 0; i < dim; i++) {
       // Only apply if ALL control qubits are |1>
       if ((i & controlMask) !== controlMask) continue;
       if ((i & targetMask) !== 0) continue;

       // ... apply gate to target ...
     }
   }, []);
   ```

3. **Update UI** to support placing 3+ qubit gates

---

### 11. Box Selection Doesn't Include Repeaters

**Problem:**
Multi-selection only works with gates, not repeater blocks.

**Implementation Route:**

1. **Extend selection state** to include repeaters:
   ```typescript
   const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
   const [selectedRepeaters, setSelectedRepeaters] = useState<Set<string>>(new Set());
   ```

2. **Update `getGatesInRect()`** in CircuitCanvas to also check repeaters:
   ```typescript
   const getItemsInRect = useCallback((x1, y1, x2, y2) => {
     const gates = getGatesInRect(x1, y1, x2, y2);
     const repeaters = circuit.repeaters
       .filter(r => {
         const rx = r.columnStart * CELL_SIZE;
         const ry = r.qubitStart * CELL_SIZE;
         const rw = (r.columnEnd - r.columnStart + 1) * CELL_SIZE;
         const rh = (r.qubitEnd - r.qubitStart + 1) * CELL_SIZE;
         return intersects(x1, y1, x2, y2, rx, ry, rx + rw, ry + rh);
       })
       .map(r => r.id);
     return { gates, repeaters };
   }, [circuit.repeaters]);
   ```

3. **Update copy/paste** to handle repeaters

---

### 12. Memory Pressure with Large Simulations

**Problem:**
Each shot allocates new Float32Array objects, creating GC pressure.

**Implementation Route:**

1. **Reuse state vectors** across shots:
   ```typescript
   const simulateOnce = useCallback((
     circuit: CircuitState,
     stateReal: Float32Array,  // Reusable buffer
     stateImag: Float32Array   // Reusable buffer
   ): string => {
     // Reset to |0...0>
     stateReal.fill(0);
     stateImag.fill(0);
     stateReal[0] = 1;

     // ... rest of simulation
   }, []);

   const executeCircuit = useCallback(async (circuit, shots) => {
     const dim = 1 << circuit.numQubits;
     const stateReal = new Float32Array(dim);
     const stateImag = new Float32Array(dim);

     for (let i = 0; i < shots; i++) {
       const result = simulateOnce(circuit, stateReal, stateImag);
       // ...
     }
   }, []);
   ```

---

## QUICK WINS

### 13. Missing Error Boundaries

**Implementation:**
```typescript
// src/components/ErrorBoundary.tsx
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <pre>{this.state.error?.message}</pre>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap App in `main.tsx`:
```typescript
<ErrorBoundary>
  <App />
</ErrorBoundary>
```

---

### 14. No Loading State for Large Circuits

**Implementation:**

Add loading state when importing circuits:
```typescript
const [isLoading, setIsLoading] = useState(false);

const handleLoad = useCallback(async () => {
  setIsLoading(true);
  try {
    // ... load circuit
  } finally {
    setIsLoading(false);
  }
}, []);
```

---

### 15. Hard-coded Magic Numbers

**Implementation:**

Create config file `src/config/constants.ts`:
```typescript
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
```

Import and use throughout codebase.

---

## Implementation Order Recommendation

1. **Phase 1 (Critical - 1 week)**
   - Fix #3 (Input validation) - Security priority
   - Fix #1 (Repeater simulation) - Feature is broken
   - Fix #2 (Remove misleading TF.js UI) - Quick fix

2. **Phase 2 (High - 1 week)**
   - Fix #5 (Circuit validation)
   - Fix #7 (State persistence)
   - Fix #4 (Web Worker) - Can use simple chunking first

3. **Phase 3 (Medium - 1 week)**
   - Fix #6 (Collision detection)
   - Fix #8-9 (Code cleanup)
   - Quick wins #13-15

4. **Phase 4 (Enhancement)**
   - Fix #10-12 (Feature additions)
