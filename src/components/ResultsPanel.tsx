/**
 * Results panel component for displaying execution results.
 */

import React, { useMemo } from 'react';
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
      <h3>Results</h3>

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

      <div className="histogram-section">
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
