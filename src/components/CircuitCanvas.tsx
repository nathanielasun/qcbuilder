/**
 * Circuit canvas component for building and visualizing quantum circuits.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { Repeat } from 'lucide-react';
import { CircuitState } from '../types/circuit';
import { GATE_DEFINITIONS } from '../utils/gateDefinitions';
import { GateBlock, ControlDot, ControlLine, SwapSymbol } from './GateBlock';

interface CircuitCanvasProps {
  circuit: CircuitState;
  numColumns: number;
  selectedGate: string | null;
  selectedInstances: Set<string>;
  selectedRepeater: string | null;
  onGateAdd: (gateId: string, target: number, column: number, control?: number) => void;
  onGateMove: (instanceId: string, target: number, column: number, control?: number) => void;
  onGateSelect: (instanceId: string | null, addToSelection?: boolean) => void;
  onMultiSelect: (instanceIds: string[]) => void;
  onGateRemove: (instanceId: string) => void;
  onGateEdit: (instanceId: string) => void;
  onRepeaterSelect: (repeaterId: string | null) => void;
  onRepeaterEdit?: (repeaterId: string) => void;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const CELL_SIZE = 60;
const QUBIT_LABEL_WIDTH = 50;

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  circuit,
  numColumns,
  selectedGate,
  selectedInstances,
  selectedRepeater,
  onGateAdd,
  onGateMove,
  onGateSelect,
  onMultiSelect,
  onGateRemove,
  onGateEdit,
  onRepeaterSelect,
  onRepeaterEdit,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOverCell, setDragOverCell] = useState<{ qubit: number; column: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ qubit: number; column: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);

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

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, []);

  // Get gates within a rectangular area
  const getGatesInRect = useCallback((x1: number, y1: number, x2: number, y2: number): string[] => {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);

    return circuit.gates
      .filter(gate => {
        // Calculate gate bounding box
        const gateLeft = gate.column * CELL_SIZE;
        const gateRight = gateLeft + CELL_SIZE;
        let gateTop = gate.target * CELL_SIZE;
        let gateBottom = gateTop + CELL_SIZE;

        // For two-qubit gates, extend to include control
        if (gate.control !== undefined) {
          const controlTop = gate.control * CELL_SIZE;
          const controlBottom = controlTop + CELL_SIZE;
          gateTop = Math.min(gateTop, controlTop);
          gateBottom = Math.max(gateBottom, controlBottom);
        }

        // Check if gate intersects with selection rectangle
        return gateLeft < maxX && gateRight > minX && gateTop < maxY && gateBottom > minY;
      })
      .map(gate => gate.id);
  }, [circuit.gates]);

  // Handle mouse down for box selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start box selection on left click, and when no gate is being placed
    if (e.button !== 0 || selectedGate) return;

    // Don't start selection if clicking on a gate
    const target = e.target as HTMLElement;
    if (target.closest('.gate-block') || target.closest('.repeater-block')) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsBoxSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  }, [selectedGate]);

  // Handle mouse move for box selection
  const handleMouseMoveSelection = useCallback((e: React.MouseEvent) => {
    if (!isBoxSelecting || !selectionBox) {
      // Normal hover handling
      const cell = getCellFromPosition(e.clientX, e.clientY);
      setHoverCell(cell);
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionBox(prev => prev ? {
      ...prev,
      currentX: Math.max(0, Math.min(x, width)),
      currentY: Math.max(0, Math.min(y, height)),
    } : null);
  }, [isBoxSelecting, selectionBox, getCellFromPosition, width, height]);

  // Handle mouse up for box selection
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (!isBoxSelecting || !selectionBox) return;

    // Calculate selection rectangle
    const { startX, startY, currentX, currentY } = selectionBox;
    const selectedIds = getGatesInRect(startX, startY, currentX, currentY);

    // If shift is held, add to existing selection
    if (e.shiftKey) {
      const combined = new Set([...selectedInstances, ...selectedIds]);
      onMultiSelect([...combined]);
    } else {
      onMultiSelect(selectedIds);
    }

    setIsBoxSelecting(false);
    setSelectionBox(null);
  }, [isBoxSelecting, selectionBox, getGatesInRect, selectedInstances, onMultiSelect]);

  // Handle canvas click
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Don't handle click if we just finished box selecting
    if (isBoxSelecting) return;

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
    isBoxSelecting,
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

      const isSelected = selectedInstances.has(gate.id);

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
              onClick={(e) => {
                e.stopPropagation();
                onGateSelect(gate.id, e.shiftKey || e.ctrlKey || e.metaKey);
              }}
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
              onClick={(e) => {
                e.stopPropagation();
                onGateSelect(gate.id, e.shiftKey || e.ctrlKey || e.metaKey);
              }}
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
        // Single qubit gate - wrap to handle multi-selection
        elements.push(
          <div
            key={`gate-wrapper-${gate.id}`}
            onClick={(e) => {
              e.stopPropagation();
              onGateSelect(gate.id, e.shiftKey || e.ctrlKey || e.metaKey);
            }}
          >
            <GateBlock
              key={`gate-${gate.id}`}
              gate={gate}
              isSelected={isSelected}
              onClick={() => {}} // Handled by wrapper
              onDoubleClick={() => onGateEdit(gate.id)}
              onRemove={() => onGateRemove(gate.id)}
              cellSize={CELL_SIZE}
            />
          </div>
        );
      }
    }

    return elements;
  };

  // Render repeater blocks
  const renderRepeaters = () => {
    const elements: React.ReactNode[] = [];

    for (const repeater of circuit.repeaters) {
      const isSelected = selectedRepeater === repeater.id;
      const x = repeater.columnStart * CELL_SIZE;
      const y = repeater.qubitStart * CELL_SIZE;
      const w = (repeater.columnEnd - repeater.columnStart + 1) * CELL_SIZE;
      const h = (repeater.qubitEnd - repeater.qubitStart + 1) * CELL_SIZE;

      elements.push(
        <div
          key={`repeater-${repeater.id}`}
          className={`repeater-block ${isSelected ? 'selected' : ''}`}
          style={{
            position: 'absolute',
            left: x - 6,
            top: y - 6,
            width: w + 12,
            height: h + 12,
            border: `3px dashed ${repeater.color}`,
            borderRadius: 10,
            backgroundColor: `${repeater.color}15`,
            cursor: 'pointer',
            zIndex: isSelected ? 15 : 10,
            boxShadow: isSelected ? `0 0 0 3px ${repeater.color}50` : 'none',
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRepeaterSelect(repeater.id);
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            onRepeaterEdit?.(repeater.id);
          }}
        >
          {/* Repeater label - positioned inside at top-left */}
          <div
            className="repeater-label"
            style={{
              position: 'absolute',
              top: 4,
              left: 4,
              padding: '2px 6px',
              backgroundColor: repeater.color,
              color: 'white',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              whiteSpace: 'nowrap',
              maxWidth: 'calc(100% - 8px)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            <Repeat size={9} />
            {repeater.label || 'Repeat'}
          </div>

          {/* Repetition badge - positioned inside at bottom-right */}
          <div
            className="repeater-count"
            style={{
              position: 'absolute',
              bottom: 4,
              right: 4,
              padding: '2px 6px',
              backgroundColor: 'white',
              color: repeater.color,
              border: `2px solid ${repeater.color}`,
              borderRadius: 10,
              fontSize: 10,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            ×{repeater.repetitions}
          </div>
        </div>
      );
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
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMoveSelection}
            onMouseUp={handleMouseUp}
            onMouseLeave={(e) => {
              handleMouseLeave();
              if (isBoxSelecting) {
                handleMouseUp(e as unknown as React.MouseEvent);
              }
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {renderGrid()}
            {renderWires()}
            {renderRepeaters()}
            {renderGates()}

            {/* Selection box overlay */}
            {selectionBox && (
              <div
                className="selection-box"
                style={{
                  position: 'absolute',
                  left: Math.min(selectionBox.startX, selectionBox.currentX),
                  top: Math.min(selectionBox.startY, selectionBox.currentY),
                  width: Math.abs(selectionBox.currentX - selectionBox.startX),
                  height: Math.abs(selectionBox.currentY - selectionBox.startY),
                  border: '2px dashed #4A90D9',
                  backgroundColor: 'rgba(74, 144, 217, 0.15)',
                  borderRadius: 4,
                  pointerEvents: 'none',
                  zIndex: 100,
                }}
              />
            )}
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
