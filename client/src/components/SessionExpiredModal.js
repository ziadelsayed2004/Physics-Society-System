
import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const SessionExpiredModal = ({ show, onClose }) => {
  return (
    <Modal show={show} onHide={onClose} centered dir="rtl">
      <Modal.Header closeButton>
        <Modal.Title>انتهت الجلسة</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>انتهت صلاحية جلستك. يرجى تسجيل الدخول مرة أخرى للمتابعة.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={onClose}>
          تسجيل الدخول
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SessionExpiredModal;
