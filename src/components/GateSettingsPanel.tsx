/**
 * Gate settings panel for editing gate properties.
 */

import React, { useMemo } from 'react';
import { Trash2, X } from 'lucide-react';
import { GateInstance } from '../types/circuit';
import { GATE_DEFINITIONS, ANGLE_PRESETS, formatAngle } from '../utils/gateDefinitions';

interface GateSettingsPanelProps {
  gate: GateInstance;
  numQubits: number;
  onUpdateTarget: (target: number) => void;
  onUpdateControl: (control: number) => void;
  onUpdateAngle: (angle: number) => void;
  onUpdateAngles: (angles: number[]) => void;
  onRemove: () => void;
  onClose: () => void;
}

export const GateSettingsPanel: React.FC<GateSettingsPanelProps> = ({
  gate,
  numQubits,
  onUpdateTarget,
  onUpdateControl,
  onUpdateAngle,
  onUpdateAngles,
  onRemove,
  onClose,
}) => {
  const definition = GATE_DEFINITIONS[gate.gateId];

  const isTwoQubitGate = definition?.numQubits === 2;
  const hasAngle = definition?.hasAngle;
  const hasMultipleAngles = definition?.hasMultipleAngles;

  // Get available qubits for control/target selection
  const availableQubits = useMemo(() => {
    return Array.from({ length: numQubits }, (_, i) => i);
  }, [numQubits]);

  // For two-qubit gates, get valid target options (not the control)
  const validTargets = useMemo(() => {
    if (!isTwoQubitGate) return availableQubits;
    return availableQubits.filter(q => q !== gate.control);
  }, [isTwoQubitGate, availableQubits, gate.control]);

  // For two-qubit gates, get valid control options (not the target)
  const validControls = useMemo(() => {
    if (!isTwoQubitGate) return [];
    return availableQubits.filter(q => q !== gate.target);
  }, [isTwoQubitGate, availableQubits, gate.target]);

  if (!definition) return null;

  return (
    <div className="gate-settings-panel">
      <div className="gate-settings-header">
        <div className="gate-settings-title">
          <span
            className="gate-settings-symbol"
            style={{ backgroundColor: definition.color }}
          >
            {definition.symbol}
          </span>
          <span className="gate-settings-name">{definition.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="gate-settings-delete" onClick={onRemove} title="Delete gate">
            <Trash2 size={16} />
          </button>
          <button className="close-button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      <p className="gate-settings-description">{definition.description}</p>

      <div className="gate-settings-content">
        {/* Target qubit selector */}
        <div className="setting-group">
          <label>Target Qubit</label>
          <select
            value={gate.target}
            onChange={(e) => onUpdateTarget(parseInt(e.target.value))}
          >
            {validTargets.map((q) => (
              <option key={q} value={q}>
                q{q}
              </option>
            ))}
          </select>
        </div>

        {/* Control qubit selector for two-qubit gates */}
        {isTwoQubitGate && gate.control !== undefined && (
          <div className="setting-group">
            <label>{gate.gateId === 'SWAP' ? 'Second Qubit' : 'Control Qubit'}</label>
            <select
              value={gate.control}
              onChange={(e) => onUpdateControl(parseInt(e.target.value))}
            >
              {validControls.map((q) => (
                <option key={q} value={q}>
                  q{q}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Angle input for rotation gates */}
        {hasAngle && gate.angle !== undefined && (
          <div className="setting-group">
            <label>Angle (radians)</label>
            <div className="angle-input-row">
              <input
                type="number"
                step="0.1"
                value={gate.angle}
                onChange={(e) => onUpdateAngle(parseFloat(e.target.value) || 0)}
              />
              <span className="angle-display">{formatAngle(gate.angle)}</span>
            </div>
            <div className="angle-presets-row">
              {ANGLE_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset.label}
                  className="preset-btn"
                  onClick={() => onUpdateAngle(preset.value)}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multiple angles for U gate */}
        {hasMultipleAngles && gate.angles !== undefined && (
          <>
            <div className="setting-group">
              <label>θ (theta)</label>
              <div className="angle-input-row">
                <input
                  type="number"
                  step="0.1"
                  value={gate.angles[0]}
                  onChange={(e) => {
                    const newAngles = [...gate.angles!];
                    newAngles[0] = parseFloat(e.target.value) || 0;
                    onUpdateAngles(newAngles);
                  }}
                />
                <span className="angle-display">{formatAngle(gate.angles[0])}</span>
              </div>
            </div>
            <div className="setting-group">
              <label>φ (phi)</label>
              <div className="angle-input-row">
                <input
                  type="number"
                  step="0.1"
                  value={gate.angles[1]}
                  onChange={(e) => {
                    const newAngles = [...gate.angles!];
                    newAngles[1] = parseFloat(e.target.value) || 0;
                    onUpdateAngles(newAngles);
                  }}
                />
                <span className="angle-display">{formatAngle(gate.angles[1])}</span>
              </div>
            </div>
            <div className="setting-group">
              <label>λ (lambda)</label>
              <div className="angle-input-row">
                <input
                  type="number"
                  step="0.1"
                  value={gate.angles[2]}
                  onChange={(e) => {
                    const newAngles = [...gate.angles!];
                    newAngles[2] = parseFloat(e.target.value) || 0;
                    onUpdateAngles(newAngles);
                  }}
                />
                <span className="angle-display">{formatAngle(gate.angles[2])}</span>
              </div>
            </div>
          </>
        )}

        {/* Gate info */}
        <div className="gate-info">
          <div className="gate-info-row">
            <span className="gate-info-label">Column</span>
            <span className="gate-info-value">{gate.column}</span>
          </div>
          <div className="gate-info-row">
            <span className="gate-info-label">Category</span>
            <span className="gate-info-value">{definition.category}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
