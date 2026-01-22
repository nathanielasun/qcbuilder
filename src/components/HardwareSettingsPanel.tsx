/**
 * Hardware information panel for viewing system capabilities.
 * Note: The quantum simulation uses pure JavaScript with typed arrays.
 * This panel shows system info for reference only.
 */

import React from 'react';
import { X, Cpu, RefreshCw } from 'lucide-react';
import { HardwareInfo } from '../hooks/useQuantumSimulator';

interface HardwareSettingsPanelProps {
  isOpen: boolean;
  hardwareInfo: HardwareInfo | null;
  onClose: () => void;
  onRefresh: () => void;
}

export const HardwareSettingsPanel: React.FC<HardwareSettingsPanelProps> = ({
  isOpen,
  hardwareInfo,
  onClose,
  onRefresh,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hardware-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="hardware-panel-header">
          <div className="hardware-panel-title">
            <Cpu size={20} />
            <h3>System Information</h3>
          </div>
          <div className="hardware-panel-actions">
            <button
              className="refresh-button"
              onClick={onRefresh}
              title="Refresh hardware info"
            >
              <RefreshCw size={16} />
            </button>
            <button className="close-button" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="hardware-panel-content">
          {/* Simulation Engine Info */}
          <div className="hardware-section">
            <h4>Simulation Engine</h4>
            <p className="section-description">
              This quantum circuit simulator uses a pure JavaScript implementation with typed arrays
              (Float32Array) for statevector manipulation. Simulation runs directly in your browser.
            </p>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Engine</span>
                <span className="info-value">JavaScript (Float32Array)</span>
              </div>
              <div className="info-item">
                <span className="info-label">Max Qubits</span>
                <span className="info-value">10 (memory limited)</span>
              </div>
            </div>
          </div>

          {/* Hardware Info */}
          {hardwareInfo && (
            <>
              <div className="hardware-section">
                <h4>System Capabilities</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Platform</span>
                    <span className="info-value">{hardwareInfo.platform}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">CPU Cores</span>
                    <span className="info-value">{hardwareInfo.hardwareConcurrency}</span>
                  </div>
                  {hardwareInfo.deviceMemory && (
                    <div className="info-item">
                      <span className="info-label">Device Memory</span>
                      <span className="info-value">{hardwareInfo.deviceMemory} GB</span>
                    </div>
                  )}
                  <div className="info-item">
                    <span className="info-label">WebGL Support</span>
                    <span className={`info-value ${hardwareInfo.webGLSupported ? 'supported' : 'not-supported'}`}>
                      {hardwareInfo.webGLSupported ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">WebGPU Support</span>
                    <span className={`info-value ${hardwareInfo.webGPUSupported ? 'supported' : 'not-supported'}`}>
                      {hardwareInfo.webGPUSupported ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Browser Info */}
              <div className="hardware-section">
                <h4>Browser Information</h4>
                <div className="browser-info">
                  <code>{hardwareInfo.userAgent}</code>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="hardware-panel-footer">
          <span className="current-backend-label">
            Engine: <strong>JavaScript</strong>
          </span>
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
