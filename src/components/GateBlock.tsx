/**
 * Gate block component for rendering a gate on the circuit.
 */

import React from 'react';
import { GateInstance } from '../types/circuit';
import { GATE_DEFINITIONS, formatAngle } from '../utils/gateDefinitions';

interface GateBlockProps {
  gate: GateInstance;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
  onRemove: () => void;
  cellSize: number;
}

export const GateBlock: React.FC<GateBlockProps> = ({
  gate,
  isSelected,
  onClick,
  onDoubleClick,
  onRemove,
  cellSize,
}) => {
  const definition = GATE_DEFINITIONS[gate.gateId];
  if (!definition) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: gate.column * cellSize + cellSize * 0.1,
    top: gate.target * cellSize + cellSize * 0.1,
    width: cellSize * 0.8,
    height: cellSize * 0.8,
    backgroundColor: definition.color,
    borderRadius: definition.category === 'measurement' ? '4px' : '6px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: isSelected
      ? `0 0 0 3px rgba(255, 255, 255, 0.8), 0 4px 8px rgba(0, 0, 0, 0.3)`
      : '0 2px 4px rgba(0, 0, 0, 0.2)',
    transition: 'transform 0.1s, box-shadow 0.1s',
    zIndex: isSelected ? 10 : 1,
    userSelect: 'none',
  };

  const symbolStyle: React.CSSProperties = {
    color: 'white',
    fontSize: cellSize * 0.35,
    fontWeight: 600,
    fontFamily: "'JetBrains Mono', monospace",
    lineHeight: 1,
  };

  const angleStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: cellSize * 0.18,
    fontFamily: "'JetBrains Mono', monospace",
    marginTop: 2,
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('gateInstanceId', gate.id);
    e.dataTransfer.setData('gateId', gate.gateId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onRemove();
  };

  return (
    <div
      className={`gate-block ${isSelected ? 'selected' : ''}`}
      style={style}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
    >
      <span style={symbolStyle}>{definition.symbol}</span>
      {gate.angle !== undefined && (
        <span style={angleStyle}>{formatAngle(gate.angle)}</span>
      )}
      {gate.angles !== undefined && (
        <span style={angleStyle}>
          {gate.angles.map(a => formatAngle(a)).join(',')}
        </span>
      )}
    </div>
  );
};

interface ControlDotProps {
  x: number;
  y: number;
  cellSize: number;
}

export const ControlDot: React.FC<ControlDotProps> = ({ x, y, cellSize }) => {
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x * cellSize + cellSize / 2 - 6,
    top: y * cellSize + cellSize / 2 - 6,
    width: 12,
    height: 12,
    backgroundColor: '#2C3E50',
    borderRadius: '50%',
    zIndex: 5,
  };

  return <div className="control-dot" style={style} />;
};

interface ControlLineProps {
  column: number;
  fromQubit: number;
  toQubit: number;
  cellSize: number;
}

export const ControlLine: React.FC<ControlLineProps> = ({
  column,
  fromQubit,
  toQubit,
  cellSize,
}) => {
  const minQubit = Math.min(fromQubit, toQubit);
  const maxQubit = Math.max(fromQubit, toQubit);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: column * cellSize + cellSize / 2 - 1,
    top: minQubit * cellSize + cellSize / 2,
    width: 2,
    height: (maxQubit - minQubit) * cellSize,
    backgroundColor: '#2C3E50',
    zIndex: 0,
  };

  return <div className="control-line" style={style} />;
};

interface SwapSymbolProps {
  x: number;
  y: number;
  cellSize: number;
}

export const SwapSymbol: React.FC<SwapSymbolProps> = ({ x, y, cellSize }) => {
  const size = cellSize * 0.4;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x * cellSize + cellSize / 2 - size / 2,
    top: y * cellSize + cellSize / 2 - size / 2,
    width: size,
    height: size,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.8,
    fontWeight: 'bold',
    color: '#2C3E50',
    zIndex: 5,
  };

  return <div className="swap-symbol" style={style}>×</div>;
};
