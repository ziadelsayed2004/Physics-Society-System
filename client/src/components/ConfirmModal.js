import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const ConfirmModal = ({ show, onHide, onConfirm, title, message, variant = 'danger', confirmText = 'تأكيد', cancelText = 'إلغاء' }) => {
  return (
    <Modal show={show} onHide={onHide} centered dir="rtl">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{message}</p>
        <div className="alert alert-warning mb-0">
          <strong>تحذير:</strong> هذا الإجراء لا يمكن التراجع عنه.
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          {cancelText}
        </Button>
        <Button variant={variant} onClick={onConfirm}>
          {confirmText}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ConfirmModal;
