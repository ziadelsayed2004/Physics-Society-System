import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { centerAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const CentersManagement = () => {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingCenter, setEditingCenter] = useState(null);
  const [centerToDelete, setCenterToDelete] = useState(null);
  const [exporting, setExporting] = useState(null); // To track which center is exporting

  useEffect(() => {
    loadCenters();
  }, []);

  const loadCenters = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await centerAPI.getCenters();
      setCenters(response.data.centers);
    } catch (error) {
      setError(error.response?.data?.message || 'فشل تحميل السناتر / المجموعات');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object({
    name: Yup.string()
      .required('اسم السنتر / المجموعة مطلوب')
      .min(2, 'يجب أن يكون اسم السنتر / المجموعة حرفين على الأقل')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setError('');
    setMessage('');

    try {
      if (editingCenter) {
        await centerAPI.updateCenter(editingCenter.id, values);
        setMessage('تم تحديث السنتر / المجموعة بنجاح');
      } else {
        await centerAPI.createCenter(values);
        setMessage('تم إنشاء السنتر / المجموعة بنجاح');
      }

      setShowModal(false);
      setEditingCenter(null);
      loadCenters();
    } catch (error) {
      setError(error.response?.data?.message || 'فشلت العملية');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (center) => {
    setEditingCenter(center);
    setShowModal(true);
  };

  const handleDeleteClick = (center) => {
    setCenterToDelete(center);
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      await centerAPI.deleteCenter(centerToDelete.id);
      setMessage('تم حذف السنتر / المجموعة بنجاح');
      setShowConfirm(false);
      setCenterToDelete(null);
      loadCenters();
    } catch (error) {
      setError(error.response?.data?.message || 'فشل حذف السنتر / المجموعة');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCenter(null);
    setError('');
  };

  const handleExportData = async (centerName) => {
    setExporting(centerName);
    setError('');
    try {
      const response = await centerAPI.exportCenterData(centerName);
      
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `بيانات سنتر ${centerName}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      setError(error.response?.data?.message || `فشل تحميل بيانات سنتر ${centerName}`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>إدارة السناتر / المجموعات</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          إضافة سنتر / مجموعة جديد
        </Button>
      </div>

      {message && (
        <Alert variant="success" dismissible onClose={() => setMessage('')}>
          {message}
        </Alert>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading && !showModal && (
        <div className="text-center">
          <Spinner animation="border" />
          <p>جاري التحميل...</p>
        </div>
      )}

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>اسم السنتر / المجموعة</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {centers.map(center => (
            <tr key={center.id}>
              <td>{center.name}</td>
              <td>
                <Button
                  variant="outline-success"
                  size="sm"
                  className="me-2"
                  onClick={() => handleExportData(center.name)}
                  disabled={loading || exporting}
                >
                  {exporting === center.name ? (
                    <>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                      {' '}
                      جاري التحميل...
                    </>
                  ) : (
                    'تحميل البيانات'
                  )}
                </Button>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => handleEdit(center)}
                  disabled={loading || exporting}
                >
                  تعديل
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteClick(center)}
                  disabled={loading || exporting}
                >
                  حذف
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleModalClose} centered dir="rtl">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingCenter ? 'تعديل سنتر / مجموعة' : 'إضافة سنتر / مجموعة جديد'}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{
            name: editingCenter?.name || ''
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Form.Group className="mb-3">
                  <Form.Label>اسم السنتر / المجموعة</Form.Label>
                  <Form.Control
                    type="text"
                    name="name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.name && errors.name}
                    placeholder="أدخل اسم السنتر / المجموعة"
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.name}
                  </Form.Control.Feedback>
                </Form.Group>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="secondary" onClick={handleModalClose}>
                  إلغاء
                </Button>
                <Button variant="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Spinner
                        as="span"
                        animation="border"
                        size="sm"
                        role="status"
                        aria-hidden="true"
                        className="me-2"
                      />
                      جاري الحفظ...
                    </>
                  ) : (
                    editingCenter ? 'تحديث' : 'إنشاء'
                  )}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        show={showConfirm}
        onHide={() => setShowConfirm(false)}
        onConfirm={handleDeleteConfirm}
        title="تأكيد الحذف"
        message={`هل أنت متأكد من حذف السنتر / المجموعة "${centerToDelete?.name}"؟`}
        variant="danger"
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </Container>
  );
};

export default CentersManagement;