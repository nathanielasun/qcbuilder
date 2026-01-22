/**
 * Settings panel for selected repeater block.
 */

import React from 'react';
import { Repeat, Trash2, X, Edit2 } from 'lucide-react';
import { RepeaterBlock } from '../types/circuit';

interface RepeaterSettingsPanelProps {
  repeater: RepeaterBlock;
  onEdit: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export const RepeaterSettingsPanel: React.FC<RepeaterSettingsPanelProps> = ({
  repeater,
  onEdit,
  onRemove,
  onClose,
}) => {
  return (
    <div className="repeater-settings-panel" style={{ borderLeftColor: repeater.color }}>
      <div className="repeater-settings-header">
        <div className="repeater-settings-title">
          <div className="repeater-settings-icon" style={{ backgroundColor: repeater.color }}>
            <Repeat size={16} />
          </div>
          <span className="repeater-settings-name">
            {repeater.label || 'Repeater Block'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="control-button"
            onClick={onEdit}
            title="Edit repeater"
          >
            <Edit2 size={16} />
          </button>
          <button
            className="gate-settings-delete"
            onClick={onRemove}
            title="Delete repeater"
          >
            <Trash2 size={16} />
          </button>
          <button className="close-button" onClick={onClose} title="Close">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="repeater-info">
        <div className="repeater-info-item">
          <span className="repeater-info-label">Qubits</span>
          <span className="repeater-info-value">
            q{repeater.qubitStart} - q{repeater.qubitEnd}
          </span>
        </div>
        <div className="repeater-info-item">
          <span className="repeater-info-label">Columns</span>
          <span className="repeater-info-value">
            {repeater.columnStart + 1} - {repeater.columnEnd + 1}
          </span>
        </div>
        <div className="repeater-info-item">
          <span className="repeater-info-label">Repetitions</span>
          <span className="repeater-info-value" style={{ color: repeater.color, fontWeight: 700 }}>
            ×{repeater.repetitions}
          </span>
        </div>
        <div className="repeater-info-item">
          <span className="repeater-info-label">ID</span>
          <span className="repeater-info-value" style={{ fontSize: 11, color: '#95A5A6' }}>
            {repeater.id}
          </span>
        </div>
      </div>
    </div>
  );
};
