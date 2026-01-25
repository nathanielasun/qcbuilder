/**
 * Control panel component for circuit operations.
 */

import React, { useState, useCallback } from 'react';
import { Play, Trash2, Download, Upload, Undo2, Redo2, Plus, Minus, Settings } from 'lucide-react';
import { SavedCircuit } from '../types/circuit';
import { validateSavedCircuit } from '../utils/circuitValidator';

interface ControlPanelProps {
  numQubits: number;
  shots: number;
  isExecuting: boolean;
  canUndo: boolean;
  canRedo: boolean;
  circuitName: string;
  onExecute: () => void;
  onClear: () => void;
  onShotsChange: (shots: number) => void;
  onNumQubitsChange: (n: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => SavedCircuit;
  onLoad: (circuit: SavedCircuit) => void;
  onNameChange: (name: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  numQubits,
  shots,
  isExecuting,
  canUndo,
  canRedo,
  circuitName,
  onExecute,
  onClear,
  onShotsChange,
  onNumQubitsChange,
  onUndo,
  onRedo,
  onSave,
  onLoad,
  onNameChange,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleSave = useCallback(() => {
    const circuit = onSave();
    const json = JSON.stringify(circuit, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${circuit.name.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [onSave]);

  const handleLoad = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        // Validate the circuit before loading
        const validation = validateSavedCircuit(data);
        if (!validation.valid) {
          alert(`Invalid circuit file:\n\n${validation.errors.join('\n')}`);
          return;
        }

        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn('Circuit file warnings:', validation.warnings);
        }

        onLoad(data as SavedCircuit);
      } catch (err) {
        alert('Failed to load circuit file: ' + (err instanceof Error ? err.message : 'Unknown error'));
      }
    };
    input.click();
  }, [onLoad]);

  return (
    <div className="control-panel">
      {/* Circuit name */}
      <div className="circuit-name-section">
        <input
          type="text"
          className="circuit-name-input"
          value={circuitName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Circuit name"
        />
      </div>

      {/* Main controls */}
      <div className="control-buttons">
        <button
          className="control-button primary"
          onClick={onExecute}
          disabled={isExecuting}
          title="Run circuit"
        >
          <Play size={18} />
          <span>Run</span>
        </button>

        <button
          className="control-button"
          onClick={onClear}
          disabled={isExecuting}
          title="Clear circuit"
        >
          <Trash2 size={18} />
        </button>

        <div className="control-divider" />

        <button
          className="control-button"
          onClick={onUndo}
          disabled={!canUndo || isExecuting}
          title="Undo"
        >
          <Undo2 size={18} />
        </button>

        <button
          className="control-button"
          onClick={onRedo}
          disabled={!canRedo || isExecuting}
          title="Redo"
        >
          <Redo2 size={18} />
        </button>

        <div className="control-divider" />

        <button
          className="control-button"
          onClick={handleSave}
          disabled={isExecuting}
          title="Save circuit"
        >
          <Download size={18} />
        </button>

        <button
          className="control-button"
          onClick={handleLoad}
          disabled={isExecuting}
          title="Load circuit"
        >
          <Upload size={18} />
        </button>

        <div className="control-divider" />

        <button
          className={`control-button ${showSettings ? 'active' : ''}`}
          onClick={() => setShowSettings(!showSettings)}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Settings panel */}
      {showSettings && (
        <div className="settings-panel">
          {/* Qubits control */}
          <div className="setting-row">
            <label>Qubits</label>
            <div className="number-input">
              <button
                onClick={() => onNumQubitsChange(numQubits - 1)}
                disabled={numQubits <= 1}
              >
                <Minus size={14} />
              </button>
              <span>{numQubits}</span>
              <button
                onClick={() => onNumQubitsChange(numQubits + 1)}
                disabled={numQubits >= 10}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Shots control */}
          <div className="setting-row">
            <label>Shots</label>
            <select
              value={shots}
              onChange={(e) => onShotsChange(Number(e.target.value))}
            >
              <option value={100}>100</option>
              <option value={256}>256</option>
              <option value={512}>512</option>
              <option value={1024}>1024</option>
              <option value={2048}>2048</option>
              <option value={4096}>4096</option>
              <option value={8192}>8192</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
