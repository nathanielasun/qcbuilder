/**
 * Main application component for Quantum Circuit Builder.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Settings } from 'lucide-react';
import {
  GatePalette,
  CircuitCanvas,
  ResultsPanel,
  ControlPanel,
  AngleEditor,
  GateSettingsPanel,
  ConfirmDialog,
  PresetCircuits,
  RepeaterEditor,
  RepeaterSettingsPanel,
  HardwareSettingsPanel,
} from './components';
import { useCircuitState } from './hooks/useCircuitState';
import { useQuantumSimulator } from './hooks/useQuantumSimulator';
import { GateInstance, SavedCircuit, RepeaterBlock } from './types/circuit';
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
    addRepeater,
    removeRepeater,
    updateRepeater,
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
    availableBackends,
    hardwareInfo,
    setBackend,
    refreshHardwareInfo,
    executeCircuit,
    getStatevector,
  } = useQuantumSimulator();

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [selectedRepeater, setSelectedRepeater] = useState<string | null>(null);
  const [editingGate, setEditingGate] = useState<GateInstance | null>(null);
  const [editingRepeater, setEditingRepeater] = useState<RepeaterBlock | null>(null);
  const [isCreatingRepeater, setIsCreatingRepeater] = useState(false);
  const [shots, setShots] = useState(1024);
  const [statevector, setStatevector] = useState<{ real: number[]; imag: number[] } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<SavedCircuit | null>(null);
  const [showHardwareSettings, setShowHardwareSettings] = useState(false);
  const [isChangingBackend, setIsChangingBackend] = useState(false);

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

  // Handle clear button click - show confirmation
  const handleClearClick = useCallback(() => {
    if (circuit.gates.length > 0) {
      setShowClearConfirm(true);
    }
  }, [circuit.gates.length]);

  // Handle confirmed clear
  const handleClearConfirm = useCallback(() => {
    clearCircuit();
    setStatevector(null);
    setSelectedInstance(null);
    setShowClearConfirm(false);
  }, [clearCircuit]);

  // Handle cancel clear
  const handleClearCancel = useCallback(() => {
    setShowClearConfirm(false);
  }, []);

  // Handle preset load request
  const handlePresetLoad = useCallback((preset: SavedCircuit) => {
    if (circuit.gates.length > 0) {
      // Show confirmation if there are existing gates
      setPendingPreset(preset);
    } else {
      // Load directly if circuit is empty
      loadCircuit(preset);
      setStatevector(null);
      setSelectedInstance(null);
    }
  }, [circuit.gates.length, loadCircuit]);

  // Handle preset load confirmation
  const handlePresetConfirm = useCallback(() => {
    if (pendingPreset) {
      loadCircuit(pendingPreset);
      setStatevector(null);
      setSelectedInstance(null);
      setPendingPreset(null);
    }
  }, [pendingPreset, loadCircuit]);

  // Handle preset load cancel
  const handlePresetCancel = useCallback(() => {
    setPendingPreset(null);
  }, []);

  // Handle repeater selection
  const handleRepeaterSelect = useCallback((repeaterId: string | null) => {
    setSelectedRepeater(repeaterId);
    setSelectedInstance(null);
    setSelectedGate(null);
  }, []);

  // Handle repeater edit
  const handleRepeaterEdit = useCallback((repeaterId: string) => {
    const repeater = circuit.repeaters.find(r => r.id === repeaterId);
    if (repeater) {
      setEditingRepeater(repeater);
    }
  }, [circuit.repeaters]);

  // Handle add repeater button click
  const handleAddRepeaterClick = useCallback(() => {
    setIsCreatingRepeater(true);
  }, []);

  // Handle repeater save
  const handleRepeaterSave = useCallback((updates: Partial<Omit<RepeaterBlock, 'id'>>) => {
    if (editingRepeater) {
      updateRepeater(editingRepeater.id, updates);
    }
    setEditingRepeater(null);
  }, [editingRepeater, updateRepeater]);

  // Handle repeater create
  const handleRepeaterCreate = useCallback((
    qubitStart: number,
    qubitEnd: number,
    columnStart: number,
    columnEnd: number,
    repetitions: number,
    label?: string
  ) => {
    addRepeater(qubitStart, qubitEnd, columnStart, columnEnd, repetitions, label);
    setIsCreatingRepeater(false);
  }, [addRepeater]);

  // Handle repeater delete
  const handleRepeaterDelete = useCallback(() => {
    if (editingRepeater) {
      removeRepeater(editingRepeater.id);
      setEditingRepeater(null);
      setSelectedRepeater(null);
    }
  }, [editingRepeater, removeRepeater]);

  // Get the selected repeater instance
  const selectedRepeaterInstance = useMemo(() => {
    if (!selectedRepeater) return null;
    return circuit.repeaters.find(r => r.id === selectedRepeater) || null;
  }, [selectedRepeater, circuit.repeaters]);

  // Handle backend change
  const handleBackendChange = useCallback(async (backendName: string): Promise<boolean> => {
    setIsChangingBackend(true);
    const success = await setBackend(backendName);
    setIsChangingBackend(false);
    return success;
  }, [setBackend]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Don't handle if a modal is open
      if (editingGate || editingRepeater || isCreatingRepeater || showClearConfirm) {
        return;
      }

      // Delete/Backspace - remove selected gate or repeater
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedInstance) {
          e.preventDefault();
          removeGate(selectedInstance);
          setSelectedInstance(null);
        } else if (selectedRepeater) {
          e.preventDefault();
          removeRepeater(selectedRepeater);
          setSelectedRepeater(null);
        }
      }

      // Escape - deselect
      if (e.key === 'Escape') {
        setSelectedInstance(null);
        setSelectedGate(null);
        setSelectedRepeater(null);
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          undo();
        }
      }

      // Ctrl/Cmd + Y or Ctrl/Cmd + Shift + Z - Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo) {
          redo();
        }
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        const circuitData = saveCircuit();
        const json = JSON.stringify(circuitData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${circuitData.name.replace(/[^a-z0-9]/gi, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }

      // Enter/Space - Run circuit (when no gate is selected for placement)
      if ((e.key === 'Enter' || e.key === ' ') && !selectedGate && !selectedInstance) {
        e.preventDefault();
        if (isReady && !isExecuting) {
          handleExecute();
        }
      }

      // Number keys 1-9 - Quick select gates
      if (e.key >= '1' && e.key <= '9' && !e.ctrlKey && !e.metaKey) {
        const gateIndex = parseInt(e.key) - 1;
        const quickGates = ['H', 'X', 'Y', 'Z', 'CNOT', 'CZ', 'Rx', 'Ry', 'Rz'];
        if (gateIndex < quickGates.length) {
          const gateId = quickGates[gateIndex];
          setSelectedGate(prev => prev === gateId ? null : gateId);
          setSelectedInstance(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedInstance,
    selectedGate,
    selectedRepeater,
    editingGate,
    editingRepeater,
    isCreatingRepeater,
    showClearConfirm,
    removeGate,
    removeRepeater,
    canUndo,
    canRedo,
    undo,
    redo,
    saveCircuit,
    isReady,
    isExecuting,
    handleExecute,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quantum Circuit Builder</h1>
        <div className="header-info">
          <span className={`backend-badge ${isReady ? 'ready' : 'loading'}`}>
            {isReady ? `Backend: ${backend.toUpperCase()}` : 'Initializing...'}
          </span>
          <button
            className="header-settings-button"
            onClick={() => setShowHardwareSettings(true)}
            title="Hardware Settings"
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <aside className="sidebar left-sidebar">
          <GatePalette
            onGateSelect={handleGateSelect}
            selectedGate={selectedGate}
          />
          <PresetCircuits onLoadPreset={handlePresetLoad} />
          <div className="keyboard-hints">
            <h4>Keyboard Shortcuts</h4>
            <div className="hint"><kbd>1-9</kbd> Quick select gates</div>
            <div className="hint"><kbd>Del</kbd> Delete selected gate</div>
            <div className="hint"><kbd>Ctrl+Z</kbd> Undo</div>
            <div className="hint"><kbd>Ctrl+Y</kbd> Redo</div>
            <div className="hint"><kbd>Ctrl+S</kbd> Save circuit</div>
            <div className="hint"><kbd>Enter</kbd> Run circuit</div>
            <div className="hint"><kbd>Esc</kbd> Deselect</div>
          </div>
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
            onClear={handleClearClick}
            onShotsChange={setShots}
            onNumQubitsChange={setNumQubits}
            onUndo={undo}
            onRedo={redo}
            onSave={saveCircuit}
            onLoad={loadCircuit}
            onNameChange={setCircuitName}
            onAddRepeater={handleAddRepeaterClick}
          />

          <div className="circuit-area">
            <CircuitCanvas
              circuit={circuit}
              numColumns={numColumns}
              selectedGate={selectedGate}
              selectedInstance={selectedInstance}
              selectedRepeater={selectedRepeater}
              onGateAdd={handleGateAdd}
              onGateMove={moveGate}
              onGateSelect={handleInstanceSelect}
              onGateRemove={removeGate}
              onGateEdit={handleGateEdit}
              onRepeaterSelect={handleRepeaterSelect}
              onRepeaterEdit={handleRepeaterEdit}
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

            {/* Repeater Settings Panel - shows when a repeater is selected */}
            {selectedRepeaterInstance && (
              <RepeaterSettingsPanel
                repeater={selectedRepeaterInstance}
                onEdit={() => handleRepeaterEdit(selectedRepeaterInstance.id)}
                onRemove={() => {
                  removeRepeater(selectedRepeaterInstance.id);
                  setSelectedRepeater(null);
                }}
                onClose={() => setSelectedRepeater(null)}
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

      {showClearConfirm && (
        <ConfirmDialog
          title="Clear Circuit"
          message={`Are you sure you want to clear the circuit? This will remove all ${circuit.gates.length} gate${circuit.gates.length !== 1 ? 's' : ''} and cannot be undone.`}
          confirmLabel="Clear Circuit"
          cancelLabel="Cancel"
          variant="danger"
          onConfirm={handleClearConfirm}
          onCancel={handleClearCancel}
        />
      )}

      {pendingPreset && (
        <ConfirmDialog
          title="Load Preset Circuit"
          message={`Loading "${pendingPreset.name}" will replace your current circuit with ${circuit.gates.length} gate${circuit.gates.length !== 1 ? 's' : ''}. This action cannot be undone.`}
          confirmLabel="Load Preset"
          cancelLabel="Cancel"
          variant="warning"
          onConfirm={handlePresetConfirm}
          onCancel={handlePresetCancel}
        />
      )}

      {(editingRepeater || isCreatingRepeater) && (
        <RepeaterEditor
          repeater={editingRepeater}
          numQubits={circuit.numQubits}
          numColumns={numColumns}
          isCreating={isCreatingRepeater}
          onSave={handleRepeaterSave}
          onCreate={handleRepeaterCreate}
          onDelete={handleRepeaterDelete}
          onClose={() => {
            setEditingRepeater(null);
            setIsCreatingRepeater(false);
          }}
        />
      )}

      <HardwareSettingsPanel
        isOpen={showHardwareSettings}
        hardwareInfo={hardwareInfo}
        currentBackend={backend}
        availableBackends={availableBackends}
        isChangingBackend={isChangingBackend}
        onClose={() => setShowHardwareSettings(false)}
        onBackendChange={handleBackendChange}
        onRefresh={refreshHardwareInfo}
      />
    </div>
  );
};

export default App;
