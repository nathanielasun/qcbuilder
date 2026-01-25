/**
 * Main application component for Quantum Circuit Builder.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
  PatternPanel,
  HardwareSettingsPanel,
} from './components';
import { useCircuitState } from './hooks/useCircuitState';
import { useQuantumSimulator } from './hooks/useQuantumSimulator';
import { usePatterns } from './hooks/usePatterns';
import { GateInstance, SavedCircuit } from './types/circuit';
import { GATE_DEFINITIONS } from './utils/gateDefinitions';
import './styles/App.css';

// Interface for clipboard data
interface ClipboardData {
  gates: GateInstance[];
  minColumn: number;
  minQubit: number;
}

export const App: React.FC = () => {
  const {
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
    loadCircuit,
    saveCircuit,
    setCircuitName,
    isCellOccupied,
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
    hardwareInfo,
    refreshHardwareInfo,
    executeCircuit,
    getStatevector,
  } = useQuantumSimulator();

  const {
    patterns,
    selectedPattern,
    selectPattern,
    createPatternFromGates,
    deletePattern,
    renamePattern,
    applyPattern,
  } = usePatterns();

  const [selectedGate, setSelectedGate] = useState<string | null>(null);
  const [selectedInstances, setSelectedInstances] = useState<Set<string>>(new Set());
  const [editingGate, setEditingGate] = useState<GateInstance | null>(null);
  const [shots, setShots] = useState(1024);
  const [statevector, setStatevector] = useState<{ real: number[]; imag: number[] } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pendingPreset, setPendingPreset] = useState<SavedCircuit | null>(null);
  const [showHardwareSettings, setShowHardwareSettings] = useState(false);
  const clipboardRef = useRef<ClipboardData | null>(null);

  // Get selected gates for pattern creation
  const selectedGates = useMemo(() => {
    return circuit.gates.filter(g => selectedInstances.has(g.id));
  }, [circuit.gates, selectedInstances]);

  // Get the selected gate instance (only when single selection)
  const selectedGateInstance = useMemo(() => {
    if (selectedInstances.size !== 1) return null;
    const [instanceId] = selectedInstances;
    return circuit.gates.find(g => g.id === instanceId) || null;
  }, [selectedInstances, circuit.gates]);

  // Get first selected instance ID for single-item operations
  const selectedInstance = useMemo(() => {
    if (selectedInstances.size === 0) return null;
    return [...selectedInstances][0];
  }, [selectedInstances]);

  // Handle gate selection from palette
  const handleGateSelect = useCallback((gateId: string) => {
    setSelectedGate(prev => prev === gateId ? null : gateId);
    setSelectedInstances(new Set());
    selectPattern(null); // Deselect pattern when selecting gate
  }, [selectPattern]);

  // Handle gate instance selection (supports multi-selection with Shift/Ctrl)
  const handleInstanceSelect = useCallback((instanceId: string | null, addToSelection?: boolean) => {
    if (instanceId === null) {
      setSelectedInstances(new Set());
    } else if (addToSelection) {
      setSelectedInstances(prev => {
        const newSet = new Set(prev);
        if (newSet.has(instanceId)) {
          newSet.delete(instanceId);
        } else {
          newSet.add(instanceId);
        }
        return newSet;
      });
    } else {
      setSelectedInstances(new Set([instanceId]));
    }
    setSelectedGate(null);
  }, []);

  // Handle multi-selection (for box select)
  const handleMultiSelect = useCallback((instanceIds: string[]) => {
    setSelectedInstances(new Set(instanceIds));
    setSelectedGate(null);
  }, []);

  // Handle pattern selection
  const handlePatternSelect = useCallback((patternId: string | null) => {
    selectPattern(patternId);
    setSelectedGate(null);
    setSelectedInstances(new Set());
  }, [selectPattern]);

  // Handle creating a pattern from selected gates
  const handleCreatePattern = useCallback((gates: GateInstance[], name: string) => {
    createPatternFromGates(gates, name);
    setSelectedInstances(new Set());
  }, [createPatternFromGates]);

  // Handle gate add with validation (also handles pattern placement)
  const handleGateAdd = useCallback((
    gateId: string,
    target: number,
    column: number,
    control?: number,
    controls?: number[]
  ) => {
    // Check if a pattern is selected
    if (selectedPattern) {
      const newGates = applyPattern(
        selectedPattern,
        target,
        column,
        circuit.numQubits,
        isCellOccupied
      );
      if (newGates && newGates.length > 0) {
        addGates(newGates);
        // Optionally deselect pattern after placement
        // selectPattern(null);
      }
      return;
    }

    const def = GATE_DEFINITIONS[gateId];
    const angle = def?.hasAngle ? Math.PI : undefined;
    const angles = def?.hasMultipleAngles ? [Math.PI, 0, 0] : undefined;
    const validationError = addGate(gateId, target, column, control, angle, angles, controls);
    if (validationError) {
      console.warn('Gate placement error:', validationError.message);
    }
  }, [selectedPattern, applyPattern, circuit.numQubits, isCellOccupied, addGates, addGate]);

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

  // Handle target update from settings panel with validation
  const handleUpdateTarget = useCallback((target: number) => {
    if (selectedInstance) {
      const error = updateGateTarget(selectedInstance, target);
      if (error) {
        console.warn('Target update error:', error.message);
      }
    }
  }, [selectedInstance, updateGateTarget]);

  // Handle control update from settings panel with validation
  const handleUpdateControl = useCallback((control: number) => {
    if (selectedInstance) {
      const error = updateGateControl(selectedInstance, control);
      if (error) {
        console.warn('Control update error:', error.message);
      }
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

  // Handle remove from settings panel (removes all selected)
  const handleRemoveSelected = useCallback(() => {
    if (selectedInstances.size > 0) {
      removeGates([...selectedInstances]);
      setSelectedInstances(new Set());
    }
  }, [selectedInstances, removeGates]);

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
    setSelectedInstances(new Set());
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
      setSelectedInstances(new Set());
    }
  }, [circuit.gates.length, loadCircuit]);

  // Handle preset load confirmation
  const handlePresetConfirm = useCallback(() => {
    if (pendingPreset) {
      loadCircuit(pendingPreset);
      setStatevector(null);
      setSelectedInstances(new Set());
      setPendingPreset(null);
    }
  }, [pendingPreset, loadCircuit]);

  // Handle preset load cancel
  const handlePresetCancel = useCallback(() => {
    setPendingPreset(null);
  }, []);

  // Copy selected gates to clipboard
  const handleCopy = useCallback(() => {
    if (selectedInstances.size === 0) return;

    const gatesToCopy = circuit.gates.filter(g => selectedInstances.has(g.id));
    if (gatesToCopy.length === 0) return;

    // Calculate the minimum column and qubit to use as reference point
    const minColumn = Math.min(...gatesToCopy.map(g => g.column));
    const minQubit = Math.min(...gatesToCopy.map(g => {
      const controlQubit = g.control !== undefined ? g.control : g.target;
      return Math.min(g.target, controlQubit);
    }));

    clipboardRef.current = {
      gates: gatesToCopy,
      minColumn,
      minQubit,
    };
  }, [selectedInstances, circuit.gates]);

  // Paste gates from clipboard
  const handlePaste = useCallback(() => {
    if (!clipboardRef.current || clipboardRef.current.gates.length === 0) return;

    const { gates, minColumn } = clipboardRef.current;

    // Find the rightmost column in the current circuit to paste after
    const maxColumn = circuit.gates.length > 0
      ? Math.max(...circuit.gates.map(g => g.column))
      : -1;

    const columnOffset = maxColumn + 1 - minColumn;
    const qubitOffset = 0; // Paste at same qubit positions

    const gateIds = gates.map(g => g.id);
    const { newIds, skipped } = duplicateGates(gateIds, columnOffset, qubitOffset);

    // Log if any gates were skipped due to collisions
    if (skipped > 0) {
      console.warn(`${skipped} gate(s) skipped due to collisions or out of bounds`);
    }

    // Select the newly pasted gates
    if (newIds.length > 0) {
      setSelectedInstances(new Set(newIds));
    }
  }, [circuit.gates, duplicateGates]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        return;
      }

      // Don't handle if a modal is open
      if (editingGate || showClearConfirm) {
        return;
      }

      // Delete/Backspace - remove selected gates
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedInstances.size > 0) {
          e.preventDefault();
          removeGates([...selectedInstances]);
          setSelectedInstances(new Set());
        }
      }

      // Escape - deselect
      if (e.key === 'Escape') {
        setSelectedInstances(new Set());
        setSelectedGate(null);
        selectPattern(null);
      }

      // Ctrl/Cmd + C - Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        if (selectedInstances.size > 0) {
          e.preventDefault();
          handleCopy();
        }
      }

      // Ctrl/Cmd + V - Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        e.preventDefault();
        handlePaste();
      }

      // Ctrl/Cmd + A - Select all gates
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedInstances(new Set(circuit.gates.map(g => g.id)));
        setSelectedGate(null);
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
      if ((e.key === 'Enter' || e.key === ' ') && !selectedGate && selectedInstances.size === 0) {
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
          setSelectedInstances(new Set());
          selectPattern(null);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    selectedInstances,
    selectedGate,
    editingGate,
    showClearConfirm,
    removeGates,
    handleCopy,
    handlePaste,
    circuit.gates,
    canUndo,
    canRedo,
    undo,
    redo,
    saveCircuit,
    isReady,
    isExecuting,
    handleExecute,
    selectPattern,
  ]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quantum Circuit Builder</h1>
        <div className="header-info">
          <span className={`backend-badge ${isReady ? 'ready' : 'loading'}`}>
            {isReady ? 'JS Engine Ready' : 'Initializing...'}
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
          <PatternPanel
            patterns={patterns}
            selectedPattern={selectedPattern}
            selectedGates={selectedGates}
            onSelectPattern={handlePatternSelect}
            onCreatePattern={handleCreatePattern}
            onDeletePattern={deletePattern}
            onRenamePattern={renamePattern}
          />
          <PresetCircuits onLoadPreset={handlePresetLoad} />
          <div className="keyboard-hints">
            <h4>Keyboard Shortcuts</h4>
            <div className="hint"><kbd>1-9</kbd> Quick select gates</div>
            <div className="hint"><kbd>Del</kbd> Delete selected</div>
            <div className="hint"><kbd>Ctrl+C</kbd> Copy selected</div>
            <div className="hint"><kbd>Ctrl+V</kbd> Paste</div>
            <div className="hint"><kbd>Ctrl+A</kbd> Select all</div>
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
          />

          <div className="circuit-area">
            <CircuitCanvas
              circuit={circuit}
              numColumns={numColumns}
              selectedGate={selectedGate}
              selectedPattern={selectedPattern}
              selectedInstances={selectedInstances}
              onGateAdd={handleGateAdd}
              onGateMove={moveGate}
              onGateSelect={handleInstanceSelect}
              onMultiSelect={handleMultiSelect}
              onGateRemove={removeGate}
              onGateEdit={handleGateEdit}
            />

            {/* Gate Settings Panel - shows when a single gate is selected */}
            {selectedGateInstance && (
              <GateSettingsPanel
                gate={selectedGateInstance}
                numQubits={circuit.numQubits}
                onUpdateTarget={handleUpdateTarget}
                onUpdateControl={handleUpdateControl}
                onUpdateAngle={handleUpdateAngle}
                onUpdateAngles={handleUpdateAngles}
                onRemove={handleRemoveSelected}
                onClose={() => setSelectedInstances(new Set())}
              />
            )}

            {/* Multi-selection indicator */}
            {selectedInstances.size > 1 && (
              <div className="multi-selection-panel">
                <div className="multi-selection-count">
                  {selectedInstances.size} gates selected
                </div>
                <div className="multi-selection-actions">
                  <button onClick={handleCopy} className="action-btn copy-btn">
                    Copy (Ctrl+C)
                  </button>
                  <button onClick={handleRemoveSelected} className="action-btn delete-btn">
                    Delete (Del)
                  </button>
                </div>
              </div>
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

      <HardwareSettingsPanel
        isOpen={showHardwareSettings}
        hardwareInfo={hardwareInfo}
        onClose={() => setShowHardwareSettings(false)}
        onRefresh={refreshHardwareInfo}
      />
    </div>
  );
};

export default App;
