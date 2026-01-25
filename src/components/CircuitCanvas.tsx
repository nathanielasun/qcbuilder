/**
 * Circuit canvas component for building and visualizing quantum circuits.
 */

import React, { useRef, useState, useCallback, useMemo } from 'react';
import { CircuitState, CircuitPattern } from '../types/circuit';
import { GATE_DEFINITIONS } from '../utils/gateDefinitions';
import { GateBlock, ControlDot, ControlLine, SwapSymbol } from './GateBlock';

interface CircuitCanvasProps {
  circuit: CircuitState;
  numColumns: number;
  selectedGate: string | null;
  selectedPattern: CircuitPattern | null;
  selectedInstances: Set<string>;
  onGateAdd: (gateId: string, target: number, column: number, control?: number, controls?: number[]) => void;
  onGateMove: (instanceId: string, target: number, column: number, control?: number) => void;
  onGateSelect: (instanceId: string | null, addToSelection?: boolean) => void;
  onMultiSelect: (instanceIds: string[]) => void;
  onGateRemove: (instanceId: string) => void;
  onGateEdit: (instanceId: string) => void;
}

interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

const CELL_SIZE = 60;
const QUBIT_LABEL_WIDTH = 50;
const GRID_PADDING = 8; // Padding to prevent clipping of selection borders

export const CircuitCanvas: React.FC<CircuitCanvasProps> = ({
  circuit,
  numColumns,
  selectedGate,
  selectedPattern,
  selectedInstances,
  onGateAdd,
  onGateMove,
  onGateSelect,
  onMultiSelect,
  onGateRemove,
  onGateEdit,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragOverCell, setDragOverCell] = useState<{ qubit: number; column: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<{ qubit: number; column: number } | null>(null);
  const [selectionBox, setSelectionBox] = useState<SelectionBox | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);

  const width = numColumns * CELL_SIZE;
  const height = circuit.numQubits * CELL_SIZE;

  // Check if selected gate is a multi-qubit gate
  const selectedGateNumQubits = useMemo(() => {
    if (!selectedGate) return 1;
    const def = GATE_DEFINITIONS[selectedGate];
    return def?.numQubits ?? 1;
  }, [selectedGate]);

  const selectedGateIsTwoQubit = selectedGateNumQubits === 2;
  const selectedGateIsThreeQubit = selectedGateNumQubits === 3;

  // Get the second qubit for two-qubit gate placement (adjacent qubit)
  const getAdjacentQubit = useCallback((qubit: number): number => {
    // Prefer qubit below, but use qubit above if at bottom
    if (qubit < circuit.numQubits - 1) {
      return qubit + 1;
    }
    return qubit - 1;
  }, [circuit.numQubits]);

  // Get qubits for three-qubit gate placement (clicked qubit + 2 more)
  const getThreeQubitRange = useCallback((qubit: number): number[] => {
    // Prefer qubits below, but adjust if at bottom
    if (qubit <= circuit.numQubits - 3) {
      return [qubit, qubit + 1, qubit + 2];
    } else if (qubit === circuit.numQubits - 2) {
      return [qubit - 1, qubit, qubit + 1];
    } else {
      return [qubit - 2, qubit - 1, qubit];
    }
  }, [circuit.numQubits]);

  // Get cell from mouse position (accounting for padding)
  const getCellFromPosition = useCallback((clientX: number, clientY: number) => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clientX - rect.left - GRID_PADDING;
    const y = clientY - rect.top - GRID_PADDING;

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

      // Check controls array for multi-control gates
      if (g.controls !== undefined && g.controls.includes(qubit)) return true;

      // Check if this is a multi-qubit gate that spans this qubit
      const def = GATE_DEFINITIONS[g.gateId];
      if (def && def.numQubits >= 2) {
        const allQubits = [g.target];
        if (g.control !== undefined) allQubits.push(g.control);
        if (g.controls !== undefined) allQubits.push(...g.controls);

        const minQ = Math.min(...allQubits);
        const maxQ = Math.max(...allQubits);
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

  // Check if three-qubit gate can be placed
  const canPlaceThreeQubitGate = useCallback((qubit: number, column: number): boolean => {
    if (circuit.numQubits < 3) return false;
    const qubits = getThreeQubitRange(qubit);
    return qubits.every(q => !isCellOccupied(q, column));
  }, [circuit.numQubits, getThreeQubitRange, isCellOccupied]);

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

        // For multi-control gates, extend to include all controls
        if (gate.controls !== undefined) {
          for (const ctrl of gate.controls) {
            const controlTop = ctrl * CELL_SIZE;
            const controlBottom = controlTop + CELL_SIZE;
            gateTop = Math.min(gateTop, controlTop);
            gateBottom = Math.max(gateBottom, controlBottom);
          }
        }

        // Check if gate intersects with selection rectangle
        return gateLeft < maxX && gateRight > minX && gateTop < maxY && gateBottom > minY;
      })
      .map(gate => gate.id);
  }, [circuit.gates]);

  // Handle mouse down for box selection
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start box selection on left click, and when no gate or pattern is being placed
    if (e.button !== 0 || selectedGate || selectedPattern) return;

    // Don't start selection if clicking on a gate
    const target = e.target as HTMLElement;
    if (target.closest('.gate-block')) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Account for padding when calculating position
    const x = e.clientX - rect.left - GRID_PADDING;
    const y = e.clientY - rect.top - GRID_PADDING;

    setIsBoxSelecting(true);
    setSelectionBox({
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  }, [selectedGate, selectedPattern]);

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

    // Account for padding when calculating position
    const x = e.clientX - rect.left - GRID_PADDING;
    const y = e.clientY - rect.top - GRID_PADDING;

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
    const selectedGateIds = getGatesInRect(startX, startY, currentX, currentY);

    // If shift is held, add to existing selection
    if (e.shiftKey) {
      const combinedGates = new Set([...selectedInstances, ...selectedGateIds]);
      onMultiSelect([...combinedGates]);
    } else {
      onMultiSelect(selectedGateIds);
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

    // If a pattern is selected, trigger pattern placement via onGateAdd
    // The pattern logic is handled in App.tsx's handleGateAdd
    if (selectedPattern) {
      // Pass a dummy gate ID - the pattern logic takes over in App.tsx
      onGateAdd('PATTERN', cell.qubit, cell.column);
      return;
    }

    // If a gate is selected in palette
    if (selectedGate) {
      const def = GATE_DEFINITIONS[selectedGate];
      if (!def) return;

      if (def.numQubits === 3) {
        // Three-qubit gate: place on clicked qubit and two adjacent qubits
        if (!canPlaceThreeQubitGate(cell.qubit, cell.column)) return;

        const qubits = getThreeQubitRange(cell.qubit);
        // For CCX/CCZ: two controls and one target (target is bottom qubit)
        // For CSWAP: one control and two swap targets
        if (selectedGate === 'CSWAP') {
          // CSWAP: control=top, swap qubits are middle and bottom
          onGateAdd(selectedGate, qubits[2], cell.column, qubits[0], [qubits[1], qubits[2]]);
        } else {
          // CCX/CCZ: controls=[0,1], target=2
          onGateAdd(selectedGate, qubits[2], cell.column, undefined, [qubits[0], qubits[1]]);
        }
      } else if (def.numQubits === 2) {
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
    selectedPattern,
    canPlaceTwoQubitGate,
    canPlaceThreeQubitGate,
    getAdjacentQubit,
    getThreeQubitRange,
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

    if (hoverCell && selectedGateIsThreeQubit && circuit.numQubits >= 3) {
      const canPlace = canPlaceThreeQubitGate(hoverCell.qubit, hoverCell.column);
      if (canPlace) {
        const qubits = getThreeQubitRange(hoverCell.qubit);
        qubits.forEach(q => highlightedCells.add(`${q}-${hoverCell.column}`));
      }
    } else if (hoverCell && selectedGateIsTwoQubit && circuit.numQubits >= 2) {
      const adjacentQubit = getAdjacentQubit(hoverCell.qubit);
      const canPlace = canPlaceTwoQubitGate(hoverCell.qubit, hoverCell.column);
      if (canPlace) {
        highlightedCells.add(`${hoverCell.qubit}-${hoverCell.column}`);
        highlightedCells.add(`${adjacentQubit}-${hoverCell.column}`);
      }
    } else if (hoverCell && selectedGate && !selectedGateIsTwoQubit && !selectedGateIsThreeQubit) {
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

      // Render three-qubit gate connections (CCX, CCZ, CSWAP)
      if (def.numQubits === 3 && gate.controls !== undefined) {
        const allQubits = [...gate.controls, gate.target];
        const minQ = Math.min(...allQubits);
        const maxQ = Math.max(...allQubits);

        // Selection highlight for three-qubit gates
        if (isSelected) {
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

        // Control line spanning all qubits
        elements.push(
          <ControlLine
            key={`line-${gate.id}`}
            column={gate.column}
            fromQubit={minQ}
            toQubit={maxQ}
            cellSize={CELL_SIZE}
          />
        );

        // Clickable area for the whole gate
        elements.push(
          <div
            key={`multi-click-${gate.id}`}
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

        if (gate.gateId === 'CSWAP') {
          // CSWAP: one control dot + two swap symbols
          elements.push(
            <ControlDot
              key={`ctrl-${gate.id}`}
              x={gate.column}
              y={gate.controls[0]}
              cellSize={CELL_SIZE}
            />
          );
          elements.push(
            <SwapSymbol
              key={`swap1-${gate.id}`}
              x={gate.column}
              y={gate.controls[1]}
              cellSize={CELL_SIZE}
            />
          );
          elements.push(
            <SwapSymbol
              key={`swap2-${gate.id}`}
              x={gate.column}
              y={gate.target}
              cellSize={CELL_SIZE}
            />
          );
        } else if (gate.gateId === 'CCX') {
          // CCX (Toffoli): two control dots + target circle with plus
          gate.controls.forEach((ctrl, idx) => {
            elements.push(
              <ControlDot
                key={`ctrl-${gate.id}-${idx}`}
                x={gate.column}
                y={ctrl}
                cellSize={CELL_SIZE}
              />
            );
          });
          elements.push(
            <div
              key={`target-${gate.id}`}
              style={{
                position: 'absolute',
                left: gate.column * CELL_SIZE + CELL_SIZE / 2 - 15,
                top: gate.target * CELL_SIZE + CELL_SIZE / 2 - 15,
                width: 30,
                height: 30,
                border: '3px solid #1A252F',
                borderRadius: '50%',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 'bold',
                color: '#1A252F',
                zIndex: 5,
                pointerEvents: 'none',
              }}
            >
              +
            </div>
          );
        } else if (gate.gateId === 'CCZ') {
          // CCZ: all three are control dots
          allQubits.forEach((q, idx) => {
            elements.push(
              <ControlDot
                key={`ctrl-${gate.id}-${idx}`}
                x={gate.column}
                y={q}
                cellSize={CELL_SIZE}
              />
            );
          });
        }
      } else if (def.numQubits === 2 && gate.control !== undefined) {
      // Render two-qubit gate connections
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

  // Render pattern preview when hovering with a selected pattern
  const renderPatternPreview = () => {
    if (!selectedPattern || !hoverCell) return null;

    const elements: React.ReactNode[] = [];
    const baseQubit = hoverCell.qubit;
    const baseColumn = hoverCell.column;

    // Check if pattern can be placed
    const wouldFit = baseQubit + selectedPattern.qubitSpan <= circuit.numQubits &&
                     baseColumn + selectedPattern.columnSpan <= numColumns;

    // Render preview outline
    if (wouldFit) {
      elements.push(
        <div
          key="pattern-preview"
          style={{
            position: 'absolute',
            left: baseColumn * CELL_SIZE - 4,
            top: baseQubit * CELL_SIZE - 4,
            width: selectedPattern.columnSpan * CELL_SIZE + 8,
            height: selectedPattern.qubitSpan * CELL_SIZE + 8,
            border: `3px dashed ${selectedPattern.color}`,
            borderRadius: 8,
            backgroundColor: `${selectedPattern.color}20`,
            pointerEvents: 'none',
            zIndex: 50,
          }}
        />
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
            minHeight: height + GRID_PADDING * 2,
          }}
        >
          {/* Qubit labels */}
          <div
            className="qubit-labels"
            style={{
              position: 'relative',
              width: QUBIT_LABEL_WIDTH,
              height: height + GRID_PADDING * 2,
              paddingTop: GRID_PADDING,
              paddingBottom: GRID_PADDING,
              flexShrink: 0,
              boxSizing: 'border-box',
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
              width: width + GRID_PADDING * 2,
              height: height + GRID_PADDING * 2,
              padding: GRID_PADDING,
              backgroundColor: '#FAFAFA',
              borderRadius: 8,
              boxSizing: 'border-box',
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
            {/* Content container with padding offset */}
            <div style={{ position: 'relative', width: width, height: height }}>
              {renderGrid()}
              {renderWires()}
              {renderGates()}
              {renderPatternPreview()}

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
      </div>

      {selectedPattern && (
        <div className="placement-hint">
          Click to place pattern "{selectedPattern.name}" ({selectedPattern.qubitSpan}q × {selectedPattern.columnSpan}c)
        </div>
      )}
      {!selectedPattern && selectedGate && selectedGateIsThreeQubit && (
        <div className="placement-hint">
          Click to place {selectedGate} on three adjacent qubits
        </div>
      )}
      {!selectedPattern && selectedGate && selectedGateIsTwoQubit && (
        <div className="placement-hint">
          Click to place {selectedGate} on two adjacent qubits
        </div>
      )}
    </div>
  );
};
