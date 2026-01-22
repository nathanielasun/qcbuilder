/**
 * Hardware settings panel for viewing and configuring compute backends.
 */

import React, { useState } from 'react';
import { X, Cpu, Monitor, RefreshCw, Check, AlertCircle, Zap, HardDrive, Layers } from 'lucide-react';
import { HardwareInfo } from '../hooks/useQuantumSimulator';

interface HardwareSettingsPanelProps {
  isOpen: boolean;
  hardwareInfo: HardwareInfo | null;
  currentBackend: string;
  availableBackends: string[];
  isChangingBackend: boolean;
  onClose: () => void;
  onBackendChange: (backend: string) => Promise<boolean>;
  onRefresh: () => void;
}

// Format bytes to human-readable string
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get backend display info
function getBackendInfo(backend: string): { name: string; description: string; icon: React.ReactNode } {
  switch (backend) {
    case 'cpu':
      return {
        name: 'CPU',
        description: 'JavaScript execution on CPU. Most compatible, moderate performance.',
        icon: <Cpu size={16} />,
      };
    case 'webgl':
      return {
        name: 'WebGL',
        description: 'GPU acceleration via WebGL. Good performance for matrix operations.',
        icon: <Monitor size={16} />,
      };
    case 'webgpu':
      return {
        name: 'WebGPU',
        description: 'Modern GPU API. Best performance (experimental, limited browser support).',
        icon: <Zap size={16} />,
      };
    case 'wasm':
      return {
        name: 'WebAssembly',
        description: 'Near-native CPU performance via WASM. Good balance of speed and compatibility.',
        icon: <Layers size={16} />,
      };
    default:
      return {
        name: backend,
        description: 'Unknown backend',
        icon: <Cpu size={16} />,
      };
  }
}

export const HardwareSettingsPanel: React.FC<HardwareSettingsPanelProps> = ({
  isOpen,
  hardwareInfo,
  currentBackend,
  availableBackends,
  isChangingBackend,
  onClose,
  onBackendChange,
  onRefresh,
}) => {
  const [pendingBackend, setPendingBackend] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleBackendSelect = async (backend: string) => {
    if (backend === currentBackend || isChangingBackend) return;
    setPendingBackend(backend);
    const success = await onBackendChange(backend);
    setPendingBackend(null);
    if (!success) {
      // Backend change failed - error will be shown by parent
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="hardware-settings-panel" onClick={e => e.stopPropagation()}>
        <div className="hardware-panel-header">
          <div className="hardware-panel-title">
            <Cpu size={20} />
            <h3>Hardware Settings</h3>
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
          {/* Backend Selection */}
          <div className="hardware-section">
            <h4>Compute Backend</h4>
            <p className="section-description">
              Select the backend for quantum circuit simulation. Different backends offer varying performance characteristics.
            </p>
            <div className="backend-options">
              {availableBackends.map(backend => {
                const info = getBackendInfo(backend);
                const isActive = backend === currentBackend;
                const isPending = backend === pendingBackend;

                return (
                  <button
                    key={backend}
                    className={`backend-option ${isActive ? 'active' : ''} ${isPending ? 'pending' : ''}`}
                    onClick={() => handleBackendSelect(backend)}
                    disabled={isChangingBackend}
                  >
                    <div className="backend-option-header">
                      <span className="backend-icon">{info.icon}</span>
                      <span className="backend-name">{info.name}</span>
                      {isActive && <Check size={14} className="active-check" />}
                      {isPending && <RefreshCw size={14} className="pending-spinner" />}
                    </div>
                    <p className="backend-description">{info.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hardware Info */}
          {hardwareInfo && (
            <>
              <div className="hardware-section">
                <h4>System Information</h4>
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

              {/* Memory Usage */}
              {hardwareInfo.memoryInfo && (
                <div className="hardware-section">
                  <h4>
                    <HardDrive size={14} style={{ marginRight: 6 }} />
                    TensorFlow.js Memory
                  </h4>
                  <div className="memory-stats">
                    <div className="memory-stat">
                      <span className="memory-label">Tensors</span>
                      <span className="memory-value">{hardwareInfo.memoryInfo.numTensors}</span>
                    </div>
                    <div className="memory-stat">
                      <span className="memory-label">Data Buffers</span>
                      <span className="memory-value">{hardwareInfo.memoryInfo.numDataBuffers}</span>
                    </div>
                    <div className="memory-stat">
                      <span className="memory-label">Memory Used</span>
                      <span className="memory-value">{formatBytes(hardwareInfo.memoryInfo.numBytes)}</span>
                    </div>
                    {hardwareInfo.memoryInfo.numBytesInGPU !== undefined && (
                      <div className="memory-stat">
                        <span className="memory-label">GPU Memory</span>
                        <span className="memory-value">{formatBytes(hardwareInfo.memoryInfo.numBytesInGPU)}</span>
                      </div>
                    )}
                  </div>
                  {hardwareInfo.memoryInfo.unreliable && (
                    <div className="memory-warning">
                      <AlertCircle size={12} />
                      <span>Memory values may be unreliable on this backend</span>
                    </div>
                  )}
                </div>
              )}

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
            Current: <strong>{getBackendInfo(currentBackend).name}</strong>
          </span>
          <button className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
