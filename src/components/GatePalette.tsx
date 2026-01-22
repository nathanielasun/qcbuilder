/**
 * Gate palette component for selecting quantum gates.
 */

import React from 'react';
import { GATE_DEFINITIONS, GATE_CATEGORIES } from '../utils/gateDefinitions';
import { GateDefinition } from '../types/circuit';

interface GatePaletteProps {
  onGateSelect: (gateId: string) => void;
  selectedGate: string | null;
}

interface GateButtonProps {
  gate: GateDefinition;
  isSelected: boolean;
  onClick: () => void;
}

const GateButton: React.FC<GateButtonProps> = ({ gate, isSelected, onClick }) => {
  return (
    <button
      className={`gate-button ${isSelected ? 'selected' : ''}`}
      onClick={onClick}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('gateId', gate.id);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      style={{
        '--gate-color': gate.color,
      } as React.CSSProperties}
      title={gate.description}
    >
      <span className="gate-symbol">{gate.symbol}</span>
      <span className="gate-name">{gate.name}</span>
    </button>
  );
};

export const GatePalette: React.FC<GatePaletteProps> = ({
  onGateSelect,
  selectedGate,
}) => {
  return (
    <div className="gate-palette">
      <h2 className="palette-title">Gates</h2>
      {GATE_CATEGORIES.map((category) => (
        <div key={category.id} className="gate-category">
          <h3 className="category-name">{category.name}</h3>
          <div className="gate-grid">
            {category.gates.map((gateId) => {
              const gate = GATE_DEFINITIONS[gateId];
              if (!gate) return null;
              return (
                <GateButton
                  key={gate.id}
                  gate={gate}
                  isSelected={selectedGate === gate.id}
                  onClick={() => onGateSelect(gate.id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
