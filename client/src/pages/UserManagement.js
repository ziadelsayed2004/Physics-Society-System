import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { userAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await userAPI.getUsers();
      setUsers(response.data.users);
    } catch (error) {
      setError(error.response?.data?.message || 'فشل تحميل المستخدمين');
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object({
    username: Yup.string()
      .required('اسم المستخدم مطلوب')
      .min(3, 'يجب أن يكون اسم المستخدم 3 أحرف على الأقل'),
    password: editingUser 
      ? Yup.string().min(6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل')
      : Yup.string().required('كلمة المرور مطلوبة').min(6, 'يجب أن تكون كلمة المرور 6 أحرف على الأقل'),
    role: Yup.string().required('الدور مطلوب')
  });

  const handleSubmit = async (values, { setSubmitting }) => {
    setError('');
    setMessage('');

    try {
      const submitData = { ...values };
      if (editingUser && !submitData.password) {
        delete submitData.password;
      }

      if (editingUser) {
        await userAPI.updateUser(editingUser.id, submitData);
        setMessage('تم تحديث المستخدم بنجاح');
      } else {
        await userAPI.createUser(submitData);
        setMessage('تم إنشاء المستخدم بنجاح');
      }

      setShowModal(false);
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'فشلت العملية');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowModal(true);
  };

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setShowConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setLoading(true);
    setError('');

    try {
      await userAPI.deleteUser(userToDelete.id);
      setMessage('تم حذف المستخدم بنجاح');
      setShowConfirm(false);
      setUserToDelete(null);
      loadUsers();
    } catch (error) {
      setError(error.response?.data?.message || 'فشل حذف المستخدم');
      setShowConfirm(false);
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUser(null);
    setError('');
  };

  return (
    <Container fluid>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>إدارة المستخدمين</h2>
        <Button variant="primary" onClick={() => setShowModal(true)}>
          إضافة مستخدم جديد
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
            <th>اسم المستخدم</th>
            <th>الدور</th>
            <th>تاريخ الإنشاء</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id}>
              <td>{user.username}</td>
              <td>
                <Badge bg={user.role === 'Admin' ? 'danger' : 'primary'}>
                  {user.role}
                </Badge>
              </td>
              <td>{new Date(user.createdAt).toLocaleDateString('ar-EG')}</td>
              <td>
                <Button
                  variant="outline-primary"
                  size="sm"
                  className="me-2"
                  onClick={() => handleEdit(user)}
                  disabled={loading}
                >
                  تعديل
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDeleteClick(user)}
                  disabled={loading}
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
            {editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
          </Modal.Title>
        </Modal.Header>
        <Formik
          initialValues={{
            username: editingUser?.username || '',
            password: '',
            role: editingUser?.role || 'Admin'
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
            <Form onSubmit={handleSubmit}>
              <Modal.Body>
                <Form.Group className="mb-3">
                  <Form.Label>اسم المستخدم</Form.Label>
                  <Form.Control
                    type="text"
                    name="username"
                    value={values.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.username && errors.username}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.username}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>
                    كلمة المرور {editingUser && '(اتركها فارغة للإبقاء على الحالية)'}
                  </Form.Label>
                  <Form.Control
                    type="password"
                    name="password"
                    value={values.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.password && errors.password}
                  />
                  <Form.Control.Feedback type="invalid">
                    {errors.password}
                  </Form.Control.Feedback>
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>الدور</Form.Label>
                  <Form.Select
                    name="role"
                    value={values.role}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    isInvalid={touched.role && errors.role}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Staff">Staff</option>
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    {errors.role}
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
                    editingUser ? 'تحديث' : 'إنشاء'
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
        message={`هل أنت متأكد من حذف المستخدم "${userToDelete?.username}"؟`}
        variant="danger"
        confirmText="حذف"
        cancelText="إلغاء"
      />
    </Container>
  );
};

export default UserManagement;