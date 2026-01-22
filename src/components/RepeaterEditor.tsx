/**
 * RepeaterEditor component for configuring circuit repeater blocks.
 */

import React, { useState, useEffect } from 'react';
import { X, Repeat, Trash2 } from 'lucide-react';
import { RepeaterBlock } from '../types/circuit';

interface RepeaterEditorProps {
  repeater: RepeaterBlock | null;
  numQubits: number;
  numColumns: number;
  isCreating?: boolean;
  initialSelection?: {
    qubitStart: number;
    qubitEnd: number;
    columnStart: number;
    columnEnd: number;
  };
  onSave: (updates: Partial<Omit<RepeaterBlock, 'id'>>) => void;
  onCreate?: (qubitStart: number, qubitEnd: number, columnStart: number, columnEnd: number, repetitions: number, label?: string) => void;
  onDelete?: () => void;
  onClose: () => void;
}

export const RepeaterEditor: React.FC<RepeaterEditorProps> = ({
  repeater,
  numQubits,
  numColumns,
  isCreating = false,
  initialSelection,
  onSave,
  onCreate,
  onDelete,
  onClose,
}) => {
  const [qubitStart, setQubitStart] = useState(repeater?.qubitStart ?? initialSelection?.qubitStart ?? 0);
  const [qubitEnd, setQubitEnd] = useState(repeater?.qubitEnd ?? initialSelection?.qubitEnd ?? 0);
  const [columnStart, setColumnStart] = useState(repeater?.columnStart ?? initialSelection?.columnStart ?? 0);
  const [columnEnd, setColumnEnd] = useState(repeater?.columnEnd ?? initialSelection?.columnEnd ?? 0);
  const [repetitions, setRepetitions] = useState(repeater?.repetitions ?? 2);
  const [label, setLabel] = useState(repeater?.label ?? '');

  // Update state when repeater prop changes
  useEffect(() => {
    if (repeater) {
      setQubitStart(repeater.qubitStart);
      setQubitEnd(repeater.qubitEnd);
      setColumnStart(repeater.columnStart);
      setColumnEnd(repeater.columnEnd);
      setRepetitions(repeater.repetitions);
      setLabel(repeater.label ?? '');
    }
  }, [repeater]);

  const handleSave = () => {
    if (isCreating && onCreate) {
      onCreate(qubitStart, qubitEnd, columnStart, columnEnd, repetitions, label || undefined);
    } else {
      onSave({
        qubitStart: Math.min(qubitStart, qubitEnd),
        qubitEnd: Math.max(qubitStart, qubitEnd),
        columnStart: Math.min(columnStart, columnEnd),
        columnEnd: Math.max(columnStart, columnEnd),
        repetitions,
        label: label || undefined,
      });
    }
    onClose();
  };

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="repeater-editor" onClick={e => e.stopPropagation()}>
        <div className="repeater-editor-header">
          <div className="repeater-editor-title">
            <Repeat size={20} />
            <h3>{isCreating ? 'Create Repeater Block' : 'Edit Repeater Block'}</h3>
          </div>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="repeater-editor-content">
          <p className="repeater-description">
            A repeater block marks a section of the circuit that can be repeated multiple times.
            This is useful for representing iterative algorithms or repeated patterns.
          </p>

          <div className="repeater-form">
            <div className="form-row">
              <div className="form-group">
                <label>Label (optional)</label>
                <input
                  type="text"
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g., QFT Block"
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Qubit Range</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label>Start Qubit</label>
                  <select value={qubitStart} onChange={e => setQubitStart(Number(e.target.value))}>
                    {Array.from({ length: numQubits }, (_, i) => (
                      <option key={i} value={i}>q{i}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>End Qubit</label>
                  <select value={qubitEnd} onChange={e => setQubitEnd(Number(e.target.value))}>
                    {Array.from({ length: numQubits }, (_, i) => (
                      <option key={i} value={i}>q{i}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Column Range</h4>
              <div className="form-row two-col">
                <div className="form-group">
                  <label>Start Column</label>
                  <select value={columnStart} onChange={e => setColumnStart(Number(e.target.value))}>
                    {Array.from({ length: numColumns }, (_, i) => (
                      <option key={i} value={i}>Column {i + 1}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>End Column</label>
                  <select value={columnEnd} onChange={e => setColumnEnd(Number(e.target.value))}>
                    {Array.from({ length: numColumns }, (_, i) => (
                      <option key={i} value={i}>Column {i + 1}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-section">
              <h4>Repetitions</h4>
              <div className="form-row">
                <div className="form-group">
                  <label>Number of times to repeat</label>
                  <div className="repetition-input">
                    <button
                      onClick={() => setRepetitions(Math.max(1, repetitions - 1))}
                      disabled={repetitions <= 1}
                    >
                      -
                    </button>
                    <span className="repetition-value">{repetitions}</span>
                    <button
                      onClick={() => setRepetitions(Math.min(100, repetitions + 1))}
                      disabled={repetitions >= 100}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="repeater-preview">
              <span className="preview-label">Selection:</span>
              <span className="preview-value">
                q{Math.min(qubitStart, qubitEnd)}-q{Math.max(qubitStart, qubitEnd)},
                columns {Math.min(columnStart, columnEnd) + 1}-{Math.max(columnStart, columnEnd) + 1}
              </span>
              <span className="preview-meta">
                ({Math.abs(qubitEnd - qubitStart) + 1} qubits, {Math.abs(columnEnd - columnStart) + 1} columns)
              </span>
            </div>
          </div>
        </div>

        <div className="repeater-editor-footer">
          {!isCreating && onDelete && (
            <button className="delete-button" onClick={onDelete}>
              <Trash2 size={16} />
              Delete
            </button>
          )}
          <div className="footer-right">
            <button className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-button" onClick={handleSave}>
              {isCreating ? 'Create Repeater' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
