# Quantum Circuit Builder

A web-based interface for building, saving, and running quantum circuits using TensorFlow.js for GPU-accelerated simulation.

## Features

- **Visual Circuit Builder**: Drag-and-drop interface for constructing quantum circuits
- **GPU Acceleration**: Uses TensorFlow.js backend for fast simulation (WebGL, Metal, CUDA support)
- **Comprehensive Gate Library**:
  - Single-qubit gates: H, X, Y, Z, S, T, S†, T†, √X, I
  - Rotation gates: Rx, Ry, Rz, P (phase), U (universal)
  - Two-qubit gates: CNOT, CZ, SWAP
  - Mid-circuit measurement
- **Interactive Visualization**: Real-time probability histograms and statevector display
- **Save/Load Circuits**: Export and import circuits as JSON files
- **Undo/Redo**: Full history support for circuit modifications

## Installation

```bash
cd web_qc_builder
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

This will start a local server at `http://localhost:3000` with hot module replacement.

## Building

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Usage

### Building Circuits

1. **Select a Gate**: Click on a gate in the left palette to select it
2. **Place the Gate**: Click on the circuit grid to place the gate on a qubit
3. **Two-Qubit Gates**: For CNOT, CZ, or SWAP, click first qubit then second qubit in the same column
4. **Edit Rotation Angles**: Double-click on rotation gates to modify their angle parameters
5. **Remove Gates**: Right-click on any gate to remove it
6. **Drag to Move**: Drag gates to reposition them

### Running Simulations

1. Configure the number of shots in settings
2. Click the "Run" button to execute the circuit
3. View measurement results in the histogram
4. Toggle statevector display to see amplitude information

### Keyboard Shortcuts

- **Ctrl+Z / Cmd+Z**: Undo
- **Ctrl+Y / Cmd+Shift+Z**: Redo
- **Delete/Backspace**: Remove selected gate

## Circuit JSON Format

Circuits are saved in a JSON format compatible with the gpuqc_js library:

```json
{
  "version": "1.0",
  "name": "Bell State",
  "description": "Creates a Bell state",
  "numQubits": 2,
  "gates": [
    {"gate": "H", "target": 0},
    {"gate": "CNOT", "target": 1, "control": 0},
    {"gate": "M", "target": 0},
    {"gate": "M", "target": 1}
  ],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

## Project Structure

```
web_qc_builder/
├── src/
│   ├── components/        # React components
│   │   ├── GatePalette.tsx
│   │   ├── CircuitCanvas.tsx
│   │   ├── GateBlock.tsx
│   │   ├── ResultsPanel.tsx
│   │   ├── ControlPanel.tsx
│   │   └── AngleEditor.tsx
│   ├── hooks/             # React hooks
│   │   ├── useQuantumSimulator.ts
│   │   └── useCircuitState.ts
│   ├── styles/            # CSS styles
│   │   ├── index.css
│   │   └── App.css
│   ├── types/             # TypeScript types
│   │   └── circuit.ts
│   ├── utils/             # Utilities
│   │   └── gateDefinitions.ts
│   ├── App.tsx            # Main app component
│   └── main.tsx           # Entry point
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Supported Gates

### Single-Qubit Gates

| Gate | Symbol | Description |
|------|--------|-------------|
| Hadamard | H | Creates superposition |
| Pauli-X | X | Bit flip (NOT) |
| Pauli-Y | Y | Y rotation with phase |
| Pauli-Z | Z | Phase flip |
| S | S | π/2 phase gate |
| T | T | π/4 phase gate |
| S† | S† | Inverse S gate |
| T† | T† | Inverse T gate |
| √X | √X | Square root of X |
| Identity | I | No operation |

### Rotation Gates

| Gate | Symbol | Parameters | Description |
|------|--------|------------|-------------|
| Rx | Rx | θ | X-axis rotation |
| Ry | Ry | θ | Y-axis rotation |
| Rz | Rz | θ | Z-axis rotation |
| Phase | P | φ | Phase shift |
| Universal | U | θ, φ, λ | Universal single-qubit gate |

### Two-Qubit Gates

| Gate | Symbol | Description |
|------|--------|-------------|
| CNOT | CX | Controlled-NOT |
| CZ | CZ | Controlled-Z |
| SWAP | × | Swaps qubit states |

### Measurement

| Gate | Symbol | Description |
|------|--------|-------------|
| Measure | M | Mid-circuit measurement |

## Technical Details

### Simulation Method

The simulator uses statevector simulation with strided indexing for efficient gate application. This avoids creating large tensor products and enables simulation of circuits up to ~10 qubits in the browser.

### TensorFlow.js Backend

The application automatically selects the best available backend:
- **WebGL**: Default for most browsers
- **WebGPU**: Used if available (Chrome with flags)
- **CPU**: Fallback for compatibility

## Dependencies

- React 18
- TypeScript
- Vite (build tool)
- TensorFlow.js
- Lucide React (icons)

## License

MIT
