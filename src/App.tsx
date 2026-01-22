/**
 * Main application component for Quantum Circuit Builder.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  GatePalette,
  CircuitCanvas,
  ResultsPanel,
  ControlPanel,
  AngleEditor,
  GateSettingsPanel,
} from './components';
import { useCircuitState } from './hooks/useCircuitState';
import { useQuantumSimulator } from './hooks/useQuantumSimulator';
import { GateInstance } from './types/circuit';
import { GATE_DEFINITIONS } from './utils/gateDefinitions';
import './styles/App.css';

export const App: React.FC = () => {
  const {
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
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCircuitState(3);

  const {
    isReady,
    isExecuting,
    results,
    error,
    backend,
    executeCircuit,
    getStatevector,
  } = useQuantumSimulator();

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [editingGate, setEditingGate] = useState<GateInstance | null>(null);
  const [shots, setShots] = useState(1024);
  const [statevector, setStatevector] = useState<{ real: number[]; imag: number[] } | null>(null);

  // Get the selected gate instance
  const selectedGateInstance = useMemo(() => {
    if (!selectedInstance) return null;
    return circuit.gates.find(g => g.id === selectedInstance) || null;
  }, [selectedInstance, circuit.gates]);

  // Handle gate selection from palette
  const handleGateSelect = useCallback((gateId: string) => {
    setSelectedGate(prev => prev === gateId ? null : gateId);
    setSelectedInstance(null);
  }, []);

  // Handle gate instance selection
  const handleInstanceSelect = useCallback((instanceId: string | null) => {
    setSelectedInstance(instanceId);
    setSelectedGate(null);
  }, []);

  // Handle gate add
  const handleGateAdd = useCallback((
    gateId: string,
    target: number,
    column: number,
    control?: number
  ) => {
    const def = GATE_DEFINITIONS[gateId];
    const angle = def?.hasAngle ? Math.PI : undefined;
    const angles = def?.hasMultipleAngles ? [Math.PI, 0, 0] : undefined;
    addGate(gateId, target, column, control, angle, angles);
  }, [addGate]);

  // Handle gate edit (for rotation gates - opens angle editor modal)
  const handleGateEdit = useCallback((instanceId: string) => {
    const gate = circuit.gates.find(g => g.id === instanceId);
    if (gate) {
      const def = GATE_DEFINITIONS[gate.gateId];
      if (def?.hasAngle || def?.hasMultipleAngles) {
        setEditingGate(gate);
      }
    }
  }, [circuit.gates]);

  // Handle angle save from modal
  const handleAngleSave = useCallback((angle?: number, angles?: number[]) => {
    if (editingGate) {
      if (angles !== undefined) {
        updateGateAngles(editingGate.id, angles);
      } else if (angle !== undefined) {
        updateGateAngle(editingGate.id, angle);
      }
    }
  }, [editingGate, updateGateAngle, updateGateAngles]);

  // Handle target update from settings panel
  const handleUpdateTarget = useCallback((target: number) => {
    if (selectedInstance) {
      updateGateTarget(selectedInstance, target);
    }
  }, [selectedInstance, updateGateTarget]);

  // Handle control update from settings panel
  const handleUpdateControl = useCallback((control: number) => {
    if (selectedInstance) {
      updateGateControl(selectedInstance, control);
    }
  }, [selectedInstance, updateGateControl]);

  // Handle angle update from settings panel
  const handleUpdateAngle = useCallback((angle: number) => {
    if (selectedInstance) {
      updateGateAngle(selectedInstance, angle);
    }
  }, [selectedInstance, updateGateAngle]);

  // Handle angles update from settings panel
  const handleUpdateAngles = useCallback((angles: number[]) => {
    if (selectedInstance) {
      updateGateAngles(selectedInstance, angles);
    }
  }, [selectedInstance, updateGateAngles]);

  // Handle remove from settings panel
  const handleRemoveSelected = useCallback(() => {
    if (selectedInstance) {
      removeGate(selectedInstance);
      setSelectedInstance(null);
    }
  }, [selectedInstance, removeGate]);

  // Handle execute
  const handleExecute = useCallback(async () => {
    if (!isReady) return;
    await executeCircuit(circuit, shots);

    // Also get statevector for display
    const sv = await getStatevector(circuit);
    setStatevector(sv);
  }, [isReady, executeCircuit, getStatevector, circuit, shots]);

  // Handle clear
  const handleClear = useCallback(() => {
    clearCircuit();
    setStatevector(null);
    setSelectedInstance(null);
  }, [clearCircuit]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quantum Circuit Builder</h1>
        <div className="header-info">
          <span className={`backend-badge ${isReady ? 'ready' : 'loading'}`}>
            {isReady ? `Backend: ${backend}` : 'Initializing...'}
          </span>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar left-sidebar">
          <GatePalette
            onGateSelect={handleGateSelect}
            selectedGate={selectedGate}
          />
        </aside>

        <div className="main-content">
          <ControlPanel
            numQubits={circuit.numQubits}
            shots={shots}
            isExecuting={isExecuting}
            canUndo={canUndo}
            canRedo={canRedo}
            circuitName={circuit.name}
            onExecute={handleExecute}
            onClear={handleClear}
            onShotsChange={setShots}
            onNumQubitsChange={setNumQubits}
            onUndo={undo}
            onRedo={redo}
            onSave={saveCircuit}
            onLoad={loadCircuit}
            onNameChange={setCircuitName}
          />

          <div className="circuit-area">
            <CircuitCanvas
              circuit={circuit}
              numColumns={numColumns}
              selectedGate={selectedGate}
              selectedInstance={selectedInstance}
              onGateAdd={handleGateAdd}
              onGateMove={moveGate}
              onGateSelect={handleInstanceSelect}
              onGateRemove={removeGate}
              onGateEdit={handleGateEdit}
            />

            {/* Gate Settings Panel - shows when a gate is selected */}
            {selectedGateInstance && (
              <GateSettingsPanel
                gate={selectedGateInstance}
                numQubits={circuit.numQubits}
                onUpdateTarget={handleUpdateTarget}
                onUpdateControl={handleUpdateControl}
                onUpdateAngle={handleUpdateAngle}
                onUpdateAngles={handleUpdateAngles}
                onRemove={handleRemoveSelected}
                onClose={() => setSelectedInstance(null)}
              />
            )}
          </div>

          {error && (
            <div className="error-banner">
              {error}
            </div>
          )}
        </div>

        <aside className="sidebar right-sidebar">
          <ResultsPanel
            results={results}
            numQubits={circuit.numQubits}
            isExecuting={isExecuting}
            showStatevector={true}
            statevector={statevector}
          />
        </aside>
      </main>

      {editingGate && (
        <AngleEditor
          gate={editingGate}
          onClose={() => setEditingGate(null)}
          onSave={handleAngleSave}
        />
      )}
    </div>
  );
};

export default App;
