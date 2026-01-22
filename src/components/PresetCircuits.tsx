/**
 * Preset circuits panel for loading example quantum circuits.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Zap, BookOpen } from 'lucide-react';
import { SavedCircuit } from '../types/circuit';
import {
  PRESET_CIRCUITS,
  PRESET_CATEGORIES,
  PresetCircuit,
  getPresetsByCategory,
} from '../utils/presetCircuits';

interface PresetCircuitsProps {
  onLoadPreset: (circuit: SavedCircuit) => void;
}

interface CategorySectionProps {
  category: typeof PRESET_CATEGORIES[0];
  presets: PresetCircuit[];
  isExpanded: boolean;
  onToggle: () => void;
  onLoadPreset: (circuit: SavedCircuit) => void;
}

const DifficultyBadge: React.FC<{ difficulty: PresetCircuit['difficulty'] }> = ({ difficulty }) => {
  const colors = {
    beginner: { bg: '#D1FAE5', text: '#065F46' },
    intermediate: { bg: '#FEF3C7', text: '#92400E' },
    advanced: { bg: '#FEE2E2', text: '#991B1B' },
  };

  const { bg, text } = colors[difficulty];

  return (
    <span
      className="difficulty-badge"
      style={{ backgroundColor: bg, color: text }}
    >
      {difficulty}
    </span>
  );
};

const PresetCard: React.FC<{
  preset: PresetCircuit;
  onLoad: () => void;
}> = ({ preset, onLoad }) => {
  return (
    <div className="preset-card" onClick={onLoad}>
      <div className="preset-card-header">
        <span className="preset-name">{preset.name}</span>
        <DifficultyBadge difficulty={preset.difficulty} />
      </div>
      <p className="preset-description">{preset.description}</p>
      <div className="preset-meta">
        <span className="preset-qubits">{preset.numQubits} qubits</span>
        <span className="preset-gates">{preset.gates.length} gates</span>
      </div>
    </div>
  );
};

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  presets,
  isExpanded,
  onToggle,
  onLoadPreset,
}) => {
  return (
    <div className="preset-category">
      <button className="category-header" onClick={onToggle}>
        <div className="category-title">
          <span className="category-icon">{category.icon}</span>
          <span className="category-name">{category.name}</span>
          <span className="category-count">{presets.length}</span>
        </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {isExpanded && (
        <div className="preset-list">
          {presets.map((preset) => (
            <PresetCard
              key={preset.name}
              preset={preset}
              onLoad={() => onLoadPreset(preset)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PresetCircuits: React.FC<PresetCircuitsProps> = ({ onLoadPreset }) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['entanglement']) // Start with entanglement expanded
  );
  const [showPanel, setShowPanel] = useState(true);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="preset-circuits-panel">
      <button
        className="preset-panel-header"
        onClick={() => setShowPanel(!showPanel)}
      >
        <div className="preset-panel-title">
          <BookOpen size={16} />
          <span>Preset Circuits</span>
        </div>
        {showPanel ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>

      {showPanel && (
        <div className="preset-panel-content">
          <p className="preset-panel-description">
            Load example circuits to learn and experiment with quantum computing concepts.
          </p>

          {PRESET_CATEGORIES.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              presets={getPresetsByCategory(category.id)}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              onLoadPreset={onLoadPreset}
            />
          ))}

          <div className="preset-panel-footer">
            <Zap size={12} />
            <span>{PRESET_CIRCUITS.length} circuits available</span>
          </div>
        </div>
      )}
    </div>
  );
};
