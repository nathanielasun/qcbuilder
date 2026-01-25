/**
 * Pattern panel component for managing reusable circuit patterns.
 */

import React, { useState, useCallback } from 'react';
import { Copy, Trash2, Edit2, Check, X, Plus, Grid3X3 } from 'lucide-react';
import { CircuitPattern, GateInstance } from '../types/circuit';

interface PatternPanelProps {
  patterns: CircuitPattern[];
  selectedPattern: CircuitPattern | null;
  selectedGates: GateInstance[];
  onSelectPattern: (patternId: string | null) => void;
  onCreatePattern: (gates: GateInstance[], name: string) => void;
  onDeletePattern: (patternId: string) => void;
  onRenamePattern: (patternId: string, name: string) => void;
}

interface PatternItemProps {
  pattern: CircuitPattern;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}

const PatternItem: React.FC<PatternItemProps> = ({
  pattern,
  isSelected,
  onSelect,
  onDelete,
  onRename,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(pattern.name);

  const handleSave = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(pattern.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div
      className={`pattern-item ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      <div
        className="pattern-color-indicator"
        style={{ backgroundColor: pattern.color }}
      />
      <div className="pattern-info">
        {isEditing ? (
          <div className="pattern-edit-name" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button onClick={handleSave} className="edit-btn save">
              <Check size={14} />
            </button>
            <button onClick={handleCancel} className="edit-btn cancel">
              <X size={14} />
            </button>
          </div>
        ) : (
          <>
            <span className="pattern-name">{pattern.name}</span>
            <span className="pattern-meta">
              {pattern.gates.length} gate{pattern.gates.length !== 1 ? 's' : ''} •
              {pattern.qubitSpan}q × {pattern.columnSpan}c
            </span>
          </>
        )}
      </div>
      {!isEditing && (
        <div className="pattern-actions" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setIsEditing(true)}
            className="pattern-action-btn"
            title="Rename"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            className="pattern-action-btn delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export const PatternPanel: React.FC<PatternPanelProps> = ({
  patterns,
  selectedPattern,
  selectedGates,
  onSelectPattern,
  onCreatePattern,
  onDeletePattern,
  onRenamePattern,
}) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPatternName, setNewPatternName] = useState('');

  const handleCreatePattern = useCallback(() => {
    if (selectedGates.length === 0) return;

    const name = newPatternName.trim() || `Pattern ${patterns.length + 1}`;
    onCreatePattern(selectedGates, name);
    setNewPatternName('');
    setShowCreateDialog(false);
  }, [selectedGates, newPatternName, patterns.length, onCreatePattern]);

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreatePattern();
    } else if (e.key === 'Escape') {
      setShowCreateDialog(false);
      setNewPatternName('');
    }
  };

  const canCreate = selectedGates.length > 0;

  return (
    <div className="pattern-panel">
      <div className="pattern-panel-header">
        <div className="pattern-panel-title">
          <Grid3X3 size={16} />
          <span>Patterns</span>
        </div>
        {canCreate && !showCreateDialog && (
          <button
            className="create-pattern-btn"
            onClick={() => setShowCreateDialog(true)}
            title="Create pattern from selection"
          >
            <Plus size={14} />
            <span>Create</span>
          </button>
        )}
      </div>

      {showCreateDialog && (
        <div className="create-pattern-dialog">
          <div className="create-dialog-header">
            <Copy size={14} />
            <span>Save {selectedGates.length} gate{selectedGates.length !== 1 ? 's' : ''} as pattern</span>
          </div>
          <input
            type="text"
            placeholder="Pattern name..."
            value={newPatternName}
            onChange={e => setNewPatternName(e.target.value)}
            onKeyDown={handleCreateKeyDown}
            autoFocus
          />
          <div className="create-dialog-actions">
            <button onClick={() => {
              setShowCreateDialog(false);
              setNewPatternName('');
            }} className="cancel-btn">
              Cancel
            </button>
            <button onClick={handleCreatePattern} className="save-btn">
              Save Pattern
            </button>
          </div>
        </div>
      )}

      <div className="pattern-list">
        {patterns.length === 0 ? (
          <div className="pattern-empty">
            <p>No patterns saved yet.</p>
            <p className="pattern-hint">
              Select gates and click "Create" to save a reusable pattern.
            </p>
          </div>
        ) : (
          patterns.map(pattern => (
            <PatternItem
              key={pattern.id}
              pattern={pattern}
              isSelected={selectedPattern?.id === pattern.id}
              onSelect={() => onSelectPattern(
                selectedPattern?.id === pattern.id ? null : pattern.id
              )}
              onDelete={() => onDeletePattern(pattern.id)}
              onRename={(name) => onRenamePattern(pattern.id, name)}
            />
          ))
        )}
      </div>

      {selectedPattern && (
        <div className="pattern-usage-hint">
          <strong>{selectedPattern.name}</strong> selected.
          Click on the circuit to place it.
          <button
            className="deselect-btn"
            onClick={() => onSelectPattern(null)}
          >
            Deselect
          </button>
        </div>
      )}
    </div>
  );
};
