/**
 * Confirmation dialog component.
 */

import React, { useEffect, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'warning',
  onConfirm,
  onCancel,
}) => {
  // Handle keyboard events
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter') {
      onConfirm();
    }
  }, [onConfirm, onCancel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const variantColors = {
    danger: {
      icon: '#DC2626',
      bg: '#FEE2E2',
      button: '#DC2626',
      buttonHover: '#B91C1C',
    },
    warning: {
      icon: '#F59E0B',
      bg: '#FEF3C7',
      button: '#F59E0B',
      buttonHover: '#D97706',
    },
    info: {
      icon: '#3B82F6',
      bg: '#DBEAFE',
      button: '#3B82F6',
      buttonHover: '#2563EB',
    },
  };

  const colors = variantColors[variant];

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="confirm-dialog-content">
          <div
            className="confirm-dialog-icon"
            style={{ backgroundColor: colors.bg }}
          >
            <AlertTriangle size={24} color={colors.icon} />
          </div>
          <div className="confirm-dialog-text">
            <h3>{title}</h3>
            <p>{message}</p>
          </div>
        </div>
        <div className="confirm-dialog-actions">
          <button
            className="confirm-dialog-cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            className="confirm-dialog-confirm"
            style={{
              backgroundColor: colors.button,
            }}
            onMouseEnter={e => (e.target as HTMLButtonElement).style.backgroundColor = colors.buttonHover}
            onMouseLeave={e => (e.target as HTMLButtonElement).style.backgroundColor = colors.button}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
