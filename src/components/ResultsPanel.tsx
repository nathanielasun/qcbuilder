/**
 * Results panel component for displaying execution results.
 */

import React, { useMemo, useRef, useCallback } from 'react';
import { Download } from 'lucide-react';
import { ExecutionResults } from '../types/circuit';

interface ResultsPanelProps {
  results: ExecutionResults | null;
  numQubits: number;
  isExecuting: boolean;
  showStatevector?: boolean;
  statevector?: { real: number[]; imag: number[] } | null;
}

interface HistogramBarProps {
  label: string;
  count: number;
  probability: number;
  maxCount: number;
  color: string;
}

const HistogramBar: React.FC<HistogramBarProps> = ({
  label,
  count,
  probability,
  maxCount,
  color,
}) => {
  const widthPercent = (count / maxCount) * 100;

  return (
    <div className="histogram-bar-container">
      <div className="histogram-label">{label}</div>
      <div className="histogram-bar-wrapper">
        <div
          className="histogram-bar"
          style={{
            width: `${widthPercent}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="histogram-value">
        {count} ({(probability * 100).toFixed(1)}%)
      </div>
    </div>
  );
};

const StatevectorDisplay: React.FC<{
  statevector: { real: number[]; imag: number[] };
  numQubits: number;
}> = ({ statevector, numQubits }) => {
  const amplitudes = useMemo(() => {
    const result = [];
    for (let i = 0; i < statevector.real.length; i++) {
      const re = statevector.real[i];
      const im = statevector.imag[i];
      const mag = Math.sqrt(re * re + im * im);
      if (mag > 0.001) {
        const bitstring = i.toString(2).padStart(numQubits, '0').split('').reverse().join('');
        const phase = Math.atan2(im, re);
        result.push({ bitstring, re, im, mag, phase });
      }
    }
    return result.sort((a, b) => b.mag - a.mag);
  }, [statevector, numQubits]);

  return (
    <div className="statevector-display">
      <h4>Statevector</h4>
      <div className="amplitude-list">
        {amplitudes.map(({ bitstring, re, im, mag }) => (
          <div key={bitstring} className="amplitude-row">
            <span className="amplitude-state">|{bitstring}⟩</span>
            <span className="amplitude-value">
              {re >= 0 ? ' ' : ''}{re.toFixed(4)}
              {im >= 0 ? '+' : '−'}{Math.abs(im).toFixed(4)}i
            </span>
            <span className="amplitude-mag">
              |α|² = {(mag * mag).toFixed(4)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  numQubits,
  isExecuting,
  showStatevector,
  statevector,
}) => {
  const histogramRef = useRef<HTMLDivElement>(null);

  // Export statistics as JSON
  const handleExportJSON = useCallback(() => {
    if (!results) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      statistics: {
        shots: results.shots,
        executionTime: results.executionTime,
        uniqueStates: Object.keys(results.counts).length,
      },
      counts: results.counts,
      probabilities: Object.fromEntries(
        Object.entries(results.counts).map(([state, count]) => [
          state,
          count / results.shots,
        ])
      ),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_results_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [results]);

  // Export histogram as PNG
  const handleExportPNG = useCallback(() => {
    if (!results || !histogramRef.current) return;

    const sortedEntries = Object.entries(results.counts)
      .map(([bitstring, count]) => ({
        bitstring,
        count,
        probability: count / results.shots,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 16);

    const maxCount = Math.max(...sortedEntries.map(e => e.count));

    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set dimensions
    const barHeight = 28;
    const padding = 20;
    const labelWidth = 100;
    const valueWidth = 120;
    const barAreaWidth = 300;
    const totalWidth = padding * 2 + labelWidth + barAreaWidth + valueWidth;
    const titleHeight = 50;
    const statsHeight = 40;
    const totalHeight = titleHeight + statsHeight + sortedEntries.length * barHeight + padding * 2;

    canvas.width = totalWidth;
    canvas.height = totalHeight;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Title
    ctx.fillStyle = '#2C3E50';
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.fillText('Measurement Histogram', padding, padding + 20);

    // Stats
    ctx.font = '12px JetBrains Mono, monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText(
      `Shots: ${results.shots.toLocaleString()} | Time: ${results.executionTime.toFixed(1)}ms | States: ${Object.keys(results.counts).length}`,
      padding,
      titleHeight + 15
    );

    // Colors
    const colors = [
      '#4A90D9', '#E74C3C', '#27AE60', '#9B59B6',
      '#F39C12', '#1ABC9C', '#34495E', '#E67E22',
    ];

    // Draw bars
    const startY = titleHeight + statsHeight;
    sortedEntries.forEach((entry, i) => {
      const y = startY + i * barHeight;
      const barWidth = (entry.count / maxCount) * barAreaWidth;

      // Label
      ctx.fillStyle = '#2C3E50';
      ctx.font = '12px JetBrains Mono, monospace';
      ctx.fillText(`|${entry.bitstring}⟩`, padding, y + 18);

      // Bar
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(padding + labelWidth, y + 6, barWidth, 16);

      // Value
      ctx.fillStyle = '#666666';
      ctx.fillText(
        `${entry.count} (${(entry.probability * 100).toFixed(1)}%)`,
        padding + labelWidth + barAreaWidth + 10,
        y + 18
      );
    });

    // Download
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `quantum_histogram_${Date.now()}.png`;
    a.click();
  }, [results]);

  const sortedCounts = useMemo(() => {
    if (!results) return [];
    return Object.entries(results.counts)
      .map(([bitstring, count]) => ({
        bitstring,
        count,
        probability: count / results.shots,
      }))
      .sort((a, b) => b.count - a.count);
  }, [results]);

  const maxCount = useMemo(() => {
    if (sortedCounts.length === 0) return 1;
    return Math.max(...sortedCounts.map(c => c.count));
  }, [sortedCounts]);

  const colors = useMemo(() => {
    const baseColors = [
      '#4A90D9', '#E74C3C', '#27AE60', '#9B59B6',
      '#F39C12', '#1ABC9C', '#34495E', '#E67E22',
    ];
    return sortedCounts.map((_, i) => baseColors[i % baseColors.length]);
  }, [sortedCounts]);

  if (isExecuting) {
    return (
      <div className="results-panel">
        <h3>Results</h3>
        <div className="executing-message">
          <div className="spinner" />
          <span>Executing circuit...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="results-panel">
        <h3>Results</h3>
        <div className="no-results">
          Run the circuit to see results
        </div>
      </div>
    );
  }

  return (
    <div className="results-panel">
      <div className="results-header">
        <h3>Results</h3>
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleExportJSON}
            title="Export statistics as JSON"
          >
            <Download size={14} />
            JSON
          </button>
          <button
            className="export-btn"
            onClick={handleExportPNG}
            title="Export histogram as PNG"
          >
            <Download size={14} />
            PNG
          </button>
        </div>
      </div>

      <div className="results-stats">
        <div className="stat-item">
          <span className="stat-label">Shots</span>
          <span className="stat-value">{results.shots.toLocaleString()}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Time</span>
          <span className="stat-value">{results.executionTime.toFixed(1)} ms</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Unique</span>
          <span className="stat-value">{sortedCounts.length}</span>
        </div>
      </div>

      <div className="histogram-section" ref={histogramRef}>
        <h4>Measurement Histogram</h4>
        <div className="histogram">
          {sortedCounts.slice(0, 16).map(({ bitstring, count, probability }, i) => (
            <HistogramBar
              key={bitstring}
              label={`|${bitstring}⟩`}
              count={count}
              probability={probability}
              maxCount={maxCount}
              color={colors[i]}
            />
          ))}
          {sortedCounts.length > 16 && (
            <div className="histogram-more">
              +{sortedCounts.length - 16} more states
            </div>
          )}
        </div>
      </div>

      {showStatevector && statevector && (
        <StatevectorDisplay
          statevector={statevector}
          numQubits={numQubits}
        />
      )}
    </div>
  );
};
