/**
 * Circuit canvas component for building and visualizing quantum circuits.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { CircuitState, GateInstance } from '../types/circuit';
import { GATE_DEFINITIONS } from '../utils/gateDefinitions';
import { GateBlock, ControlDot, ControlLine, SwapSymbol } from './GateBlock';

interface CircuitCanvasProps {
  circuit: CircuitState;
  numColumns: number;
  selectedGate: string | null;
  selectedInstance: string | null;
  onGateAdd: (gateId: string, target: number, column: number, control?: number) => void;
  onGateMove: (instanceId: string, target: number, column: number, control?: number) => void;
  onGateSelect: (instanceId: string | null) => void;
  onGateRemove: (instanceId: string) => void;
  onGateEdit: (instanceId: string) => void;
}

const CELL_SIZE = 60;
const QUBIT_LABEL_WIDTH = 50;

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  circuit,
  numColumns,
  selectedGate,
  selectedInstance,
  onGateAdd,
  onGateMove,
  onGateSelect,
  onGateRemove,
  onGateEdit,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOverCell, setDragOverCell] = useState<{ qubit: number; column: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ qubit: number; column: number } | null>(null);

  const width = numColumns * CELL_SIZE;
  const height = circuit.numQubits * CELL_SIZE;

  // Check if selected gate is a two-qubit gate
  const selectedGateIsTwoQubit = useMemo(() => {
    if (!selectedGate) return false;
    const def = GATE_DEFINITIONS[selectedGate];
    return def?.numQubits === 2;
  }, [selectedGate]);

  // Get the second qubit for two-qubit gate placement (adjacent qubit)
  const getAdjacentQubit = useCallback((qubit: number): number => {
    // Prefer qubit below, but use qubit above if at bottom
    if (qubit < circuit.numQubits - 1) {
      return qubit + 1;
    }
    return qubit - 1;
  }, [circuit.numQubits]);

  // Get cell from mouse position
  const getCellFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const column = Math.floor(x / CELL_SIZE);
    const qubit = Math.floor(y / CELL_SIZE);

    if (column < 0 || column >= numColumns || qubit < 0 || qubit >= circuit.numQubits) {
      return null;
    }

    return { qubit, column };
  }, [numColumns, circuit.numQubits]);

  // Check if cell is occupied
  const isCellOccupied = useCallback((qubit: number, column: number, excludeId?: string) => {
    return circuit.gates.some(g => {
      if (excludeId && g.id === excludeId) return false;
      if (g.column !== column) return false;

      // Check target qubit
      if (g.target === qubit) return true;

      // Check control qubit for two-qubit gates
      if (g.control !== undefined && g.control === qubit) return true;

      // Check if this is a two-qubit gate that spans this qubit
      const def = GATE_DEFINITIONS[g.gateId];
      if (def && def.numQubits === 2 && g.control !== undefined) {
        const minQ = Math.min(g.target, g.control);
        const maxQ = Math.max(g.target, g.control);
        if (qubit > minQ && qubit < maxQ) return true;
      }

      return false;
    });
  }, [circuit.gates]);

  // Check if two-qubit gate can be placed
  const canPlaceTwoQubitGate = useCallback((qubit: number, column: number): boolean => {
    if (circuit.numQubits < 2) return false;
    const adjacentQubit = getAdjacentQubit(qubit);
    return !isCellOccupied(qubit, column) && !isCellOccupied(adjacentQubit, column);
  }, [circuit.numQubits, getAdjacentQubit, isCellOccupied]);

  // Handle mouse move for hover highlighting
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const cell = getCellFromPosition(e.clientX, e.clientY);
    setHoverCell(cell);
  }, [getCellFromPosition]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const cell = getCellFromPosition(e.clientX, e.clientY);
    if (!cell) {
      onGateSelect(null);
      return;
    }

    // If a gate is selected in palette
    if (selectedGate) {
      const def = GATE_DEFINITIONS[selectedGate];
      if (!def) return;

      if (def.numQubits === 2) {
        // Two-qubit gate: place on clicked qubit and adjacent qubit
        if (!canPlaceTwoQubitGate(cell.qubit, cell.column)) return;

        const adjacentQubit = getAdjacentQubit(cell.qubit);
        // For CNOT/CZ: clicked qubit is control, adjacent is target
        // For SWAP: smaller index is target, larger is control (just for consistency)
        if (selectedGate === 'SWAP') {
          const minQ = Math.min(cell.qubit, adjacentQubit);
          const maxQ = Math.max(cell.qubit, adjacentQubit);
          onGateAdd(selectedGate, minQ, cell.column, maxQ);
        } else {
          // CNOT, CZ: control is clicked, target is adjacent
          onGateAdd(selectedGate, adjacentQubit, cell.column, cell.qubit);
        }
      } else {
        // Single-qubit gate
        if (isCellOccupied(cell.qubit, cell.column)) return;
        onGateAdd(selectedGate, cell.qubit, cell.column);
      }
    } else {
      onGateSelect(null);
    }
  }, [
    getCellFromPosition,
    selectedGate,
    canPlaceTwoQubitGate,
    getAdjacentQubit,
    isCellOccupied,
    onGateAdd,
    onGateSelect,
  ]);

  // Handle drag over
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const cell = getCellFromPosition(e.clientX, e.clientY);
    setDragOverCell(cell);
  }, [getCellFromPosition]);

  // Handle drag leave
  const handleDragLeave = useCallback(() => {
    setDragOverCell(null);
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverCell(null);

    const cell = getCellFromPosition(e.clientX, e.clientY);
    if (!cell) return;

    const instanceId = e.dataTransfer.getData('gateInstanceId');
    const gateId = e.dataTransfer.getData('gateId');

    if (instanceId) {
      // Moving existing gate
      const existingGate = circuit.gates.find(g => g.id === instanceId);
      if (!existingGate) return;

      const def = GATE_DEFINITIONS[existingGate.gateId];
      if (def?.numQubits === 2) {
        // For two-qubit gates, maintain the control-target distance
        const distance = existingGate.control !== undefined
          ? existingGate.control - existingGate.target
          : 1;
        const newControl = cell.qubit + distance;

        if (newControl >= 0 && newControl < circuit.numQubits &&
            !isCellOccupied(cell.qubit, cell.column, instanceId) &&
            !isCellOccupied(newControl, cell.column, instanceId)) {
          onGateMove(instanceId, cell.qubit, cell.column, newControl);
        }
      } else {
        if (!isCellOccupied(cell.qubit, cell.column, instanceId)) {
          onGateMove(instanceId, cell.qubit, cell.column);
        }
      }
    } else if (gateId) {
      // Adding new gate from palette via drag
      const def = GATE_DEFINITIONS[gateId];
      if (!def) return;

      if (def.numQubits === 2) {
        if (!canPlaceTwoQubitGate(cell.qubit, cell.column)) return;
        const adjacentQubit = getAdjacentQubit(cell.qubit);
        if (gateId === 'SWAP') {
          const minQ = Math.min(cell.qubit, adjacentQubit);
          const maxQ = Math.max(cell.qubit, adjacentQubit);
          onGateAdd(gateId, minQ, cell.column, maxQ);
        } else {
          onGateAdd(gateId, adjacentQubit, cell.column, cell.qubit);
        }
      } else {
        if (isCellOccupied(cell.qubit, cell.column)) return;
        onGateAdd(gateId, cell.qubit, cell.column);
      }
    }
  }, [getCellFromPosition, circuit.gates, isCellOccupied, canPlaceTwoQubitGate, getAdjacentQubit, onGateAdd, onGateMove]);

  // Render qubit wires
  const renderWires = () => {
    const wires = [];
    for (let q = 0; q < circuit.numQubits; q++) {
      wires.push(
        <div
          key={`wire-${q}`}
          className="qubit-wire"
          style={{
            position: 'absolute',
            left: 0,
            top: q * CELL_SIZE + CELL_SIZE / 2 - 1,
            width: width,
            height: 2,
            backgroundColor: '#95A5A6',
          }}
        />
      );
    }
    return wires;
  };

  // Render qubit labels
  const renderLabels = () => {
    const labels = [];
    for (let q = 0; q < circuit.numQubits; q++) {
      labels.push(
        <div
          key={`label-${q}`}
          className="qubit-label"
          style={{
            position: 'absolute',
            left: 0,
            top: q * CELL_SIZE,
            width: QUBIT_LABEL_WIDTH,
            height: CELL_SIZE,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#2C3E50',
            fontWeight: 500,
          }}
        >
          q{q}
        </div>
      );
    }
    return labels;
  };

  // Render grid cells with highlighting for two-qubit gates
  const renderGrid = () => {
    const cells = [];

    // Determine which cells to highlight
    const highlightedCells = new Set<string>();

    if (hoverCell && selectedGateIsTwoQubit && circuit.numQubits >= 2) {
      const adjacentQubit = getAdjacentQubit(hoverCell.qubit);
      const canPlace = canPlaceTwoQubitGate(hoverCell.qubit, hoverCell.column);
      if (canPlace) {
        highlightedCells.add(`${hoverCell.qubit}-${hoverCell.column}`);
        highlightedCells.add(`${adjacentQubit}-${hoverCell.column}`);
      }
    } else if (hoverCell && selectedGate && !selectedGateIsTwoQubit) {
      if (!isCellOccupied(hoverCell.qubit, hoverCell.column)) {
        highlightedCells.add(`${hoverCell.qubit}-${hoverCell.column}`);
      }
    }

    for (let q = 0; q < circuit.numQubits; q++) {
      for (let c = 0; c < numColumns; c++) {
        const cellKey = `${q}-${c}`;
        const isHighlighted = highlightedCells.has(cellKey);
        const isDragOver = dragOverCell?.qubit === q && dragOverCell?.column === c;

        cells.push(
          <div
            key={`cell-${q}-${c}`}
            className="grid-cell"
            style={{
              position: 'absolute',
              left: c * CELL_SIZE,
              top: q * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              border: '1px dashed rgba(0, 0, 0, 0.1)',
              backgroundColor: isHighlighted
                ? 'rgba(74, 144, 217, 0.25)'
                : isDragOver
                ? 'rgba(74, 144, 217, 0.15)'
                : 'transparent',
              boxSizing: 'border-box',
              transition: 'background-color 0.1s ease',
            }}
          />
        );
      }
    }
    return cells;
  };

  // Render gates
  const renderGates = () => {
    const elements: React.ReactNode[] = [];

    for (const gate of circuit.gates) {
      const def = GATE_DEFINITIONS[gate.gateId];
      if (!def) continue;

      const isSelected = selectedInstance === gate.id;

      // Render two-qubit gate connections
      if (def.numQubits === 2 && gate.control !== undefined) {
        // Selection highlight for two-qubit gates
        if (isSelected) {
          const minQ = Math.min(gate.target, gate.control);
          const maxQ = Math.max(gate.target, gate.control);
          elements.push(
            <div
              key={`selection-${gate.id}`}
              style={{
                position: 'absolute',
                left: gate.column * CELL_SIZE - 4,
                top: minQ * CELL_SIZE - 4,
                width: CELL_SIZE + 8,
                height: (maxQ - minQ + 1) * CELL_SIZE + 8,
                border: '2px solid #4A90D9',
                borderRadius: 8,
                backgroundColor: 'rgba(74, 144, 217, 0.1)',
                zIndex: 0,
                pointerEvents: 'none',
              }}
            />
          );
        }

        elements.push(
          <ControlLine
            key={`line-${gate.id}`}
            column={gate.column}
            fromQubit={gate.target}
            toQubit={gate.control}
            cellSize={CELL_SIZE}
          />
        );

        if (gate.gateId === 'SWAP') {
          // SWAP gate: two X symbols - clickable area
          const minQ = Math.min(gate.target, gate.control);
          const maxQ = Math.max(gate.target, gate.control);
          elements.push(
            <div
              key={`swap-click-${gate.id}`}
              style={{
                position: 'absolute',
                left: gate.column * CELL_SIZE,
                top: minQ * CELL_SIZE,
                width: CELL_SIZE,
                height: (maxQ - minQ + 1) * CELL_SIZE,
                cursor: 'pointer',
                zIndex: 4,
              }}
              onClick={() => onGateSelect(gate.id)}
              onDoubleClick={() => onGateEdit(gate.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onGateRemove(gate.id);
              }}
            />
          );
          elements.push(
            <SwapSymbol
              key={`swap1-${gate.id}`}
              x={gate.column}
              y={gate.target}
              cellSize={CELL_SIZE}
            />
          );
          elements.push(
            <SwapSymbol
              key={`swap2-${gate.id}`}
              x={gate.column}
              y={gate.control}
              cellSize={CELL_SIZE}
            />
          );
        } else {
          // CNOT/CZ: control dot + target gate
          const minQ = Math.min(gate.target, gate.control);
          const maxQ = Math.max(gate.target, gate.control);

          // Clickable area for the whole gate
          elements.push(
            <div
              key={`ctrl-click-${gate.id}`}
              style={{
                position: 'absolute',
                left: gate.column * CELL_SIZE,
                top: minQ * CELL_SIZE,
                width: CELL_SIZE,
                height: (maxQ - minQ + 1) * CELL_SIZE,
                cursor: 'pointer',
                zIndex: 4,
              }}
              onClick={() => onGateSelect(gate.id)}
              onDoubleClick={() => onGateEdit(gate.id)}
              onContextMenu={(e) => {
                e.preventDefault();
                onGateRemove(gate.id);
              }}
            />
          );

          elements.push(
            <ControlDot
              key={`ctrl-${gate.id}`}
              x={gate.column}
              y={gate.control}
              cellSize={CELL_SIZE}
            />
          );

          if (gate.gateId === 'CNOT') {
            // CNOT target: circle with plus
            elements.push(
              <div
                key={`target-${gate.id}`}
                style={{
                  position: 'absolute',
                  left: gate.column * CELL_SIZE + CELL_SIZE / 2 - 15,
                  top: gate.target * CELL_SIZE + CELL_SIZE / 2 - 15,
                  width: 30,
                  height: 30,
                  border: '3px solid #2C3E50',
                  borderRadius: '50%',
                  backgroundColor: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: '#2C3E50',
                  zIndex: 5,
                  pointerEvents: 'none',
                }}
              >
                +
              </div>
            );
          } else {
            // CZ: just a dot on target too
            elements.push(
              <ControlDot
                key={`target-${gate.id}`}
                x={gate.column}
                y={gate.target}
                cellSize={CELL_SIZE}
              />
            );
          }
        }
      } else {
        // Single qubit gate
        elements.push(
          <GateBlock
            key={`gate-${gate.id}`}
            gate={gate}
            isSelected={isSelected}
            onClick={() => onGateSelect(gate.id)}
            onDoubleClick={() => onGateEdit(gate.id)}
            onRemove={() => onGateRemove(gate.id)}
            cellSize={CELL_SIZE}
          />
        );
      }
    }

    return elements;
  };

  return (
    <div className="circuit-canvas-container">
      <div className="circuit-canvas-scroll">
        <div
          className="circuit-canvas"
          style={{
            display: 'flex',
            position: 'relative',
            minHeight: height,
          }}
        >
          {/* Qubit labels */}
          <div
            className="qubit-labels"
            style={{
              position: 'relative',
              width: QUBIT_LABEL_WIDTH,
              height: height,
              flexShrink: 0,
            }}
          >
            {renderLabels()}
          </div>

          {/* Circuit grid */}
          <div
            ref={canvasRef}
            className="circuit-grid"
            style={{
              position: 'relative',
              width: width,
              height: height,
              backgroundColor: '#FAFAFA',
              borderRadius: 8,
              overflow: 'hidden',
            }}
            onClick={handleCanvasClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {renderGrid()}
            {renderWires()}
            {renderGates()}
          </div>
        </div>
      </div>

      {selectedGate && selectedGateIsTwoQubit && (
        <div className="placement-hint">
          Click to place {selectedGate} on two adjacent qubits
        </div>
      )}
    </div>
  );
};
