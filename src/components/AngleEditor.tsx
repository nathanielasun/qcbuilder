/**
 * Angle editor modal for rotation gates.
 */

import React, { useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { GateInstance } from '../types/circuit';
import { GATE_DEFINITIONS, ANGLE_PRESETS, formatAngle } from '../utils/gateDefinitions';

interface AngleEditorProps {
  gate: GateInstance;
  onClose: () => void;
  onSave: (angle?: number, angles?: number[]) => void;
}

export const AngleEditor: React.FC<AngleEditorProps> = ({
  gate,
  onClose,
  onSave,
}) => {
  const definition = GATE_DEFINITIONS[gate.gateId];
  const isUGate = definition?.hasMultipleAngles;

  const [angle, setAngle] = useState(gate.angle ?? Math.PI);
  const [angles, setAngles] = useState(gate.angles ?? [Math.PI, 0, 0]);
  const [inputValue, setInputValue] = useState(
    isUGate
      ? angles.map(a => a.toString()).join(', ')
      : angle.toString()
  );

  const handlePresetClick = useCallback((value: number) => {
    if (isUGate) {
      const newAngles = [...angles];
      newAngles[0] = value;
      setAngles(newAngles);
      setInputValue(newAngles.map(a => a.toString()).join(', '));
    } else {
      setAngle(value);
      setInputValue(value.toString());
    }
  }, [isUGate, angles]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    if (isUGate) {
      const parts = e.target.value.split(',').map(s => parseFloat(s.trim()));
      if (parts.length === 3 && parts.every(p => !isNaN(p))) {
        setAngles(parts);
      }
    } else {
      const value = parseFloat(e.target.value);
      if (!isNaN(value)) {
        setAngle(value);
      }
    }
  }, [isUGate]);

  const handleSave = useCallback(() => {
    if (isUGate) {
      onSave(undefined, angles);
    } else {
      onSave(angle);
    }
    onClose();
  }, [isUGate, angle, angles, onSave, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [handleSave, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="angle-editor" onClick={e => e.stopPropagation()}>
        <div className="angle-editor-header">
          <h3>Edit {definition?.name}</h3>
          <button className="close-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="angle-editor-content">
          {isUGate ? (
            <>
              <p className="angle-description">
                U(θ, φ, λ) - Universal single-qubit gate
              </p>
              <div className="angle-inputs">
                <div className="angle-input-group">
                  <label>θ (theta)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={angles[0]}
                    onChange={(e) => {
                      const newAngles = [...angles];
                      newAngles[0] = parseFloat(e.target.value) || 0;
                      setAngles(newAngles);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div className="angle-input-group">
                  <label>φ (phi)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={angles[1]}
                    onChange={(e) => {
                      const newAngles = [...angles];
                      newAngles[1] = parseFloat(e.target.value) || 0;
                      setAngles(newAngles);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
                <div className="angle-input-group">
                  <label>λ (lambda)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={angles[2]}
                    onChange={(e) => {
                      const newAngles = [...angles];
                      newAngles[2] = parseFloat(e.target.value) || 0;
                      setAngles(newAngles);
                    }}
                    onKeyDown={handleKeyDown}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="angle-description">
                {definition?.description}
              </p>
              <div className="angle-input-section">
                <label>Angle (radians)</label>
                <input
                  type="number"
                  step="0.1"
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <span className="angle-preview">{formatAngle(angle)}</span>
              </div>
            </>
          )}

          <div className="angle-presets">
            <span className="presets-label">Presets:</span>
            {ANGLE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                className="preset-button"
                onClick={() => handlePresetClick(preset.value)}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div className="angle-editor-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="save-button" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
