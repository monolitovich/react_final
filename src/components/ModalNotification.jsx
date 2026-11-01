import React from 'react';

// универсальное модальное окно уведомлений и подтверждений
export function ModalNotification({
  isOpen,
  title,
  message,
  type = 'info', // 'success', 'danger', 'info', 'confirm'
  onConfirm,
  onClose,
  confirmText = 'Понятно',
  cancelText = 'Отмена',
}) {
  if (!isOpen) return null;

  // иконка в зависимости от типа
  let icon = 'ℹ️';
  if (type === 'success') icon = '🎉';
  if (type === 'danger') icon = '⚠️';
  if (type === 'confirm') icon = '❓';

  return (
    <div className="modal-backdrop">
      <div className="modal-card success-order-card">
        <div className="success-icon-badge">{icon}</div>
        <h2>{title}</h2>
        <p className="success-order-text">{message}</p>

        <div className="modal-footer-btns center-btns">
          {type === 'confirm' && (
            <button type="button" onClick={onClose} className="btn-secondary">
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm || onClose}
            className={type === 'danger' ? 'btn-del' : 'btn-primary'}
            style={{ minWidth: '120px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}