import React, { useState, useEffect } from 'react';
import { staffAPI, adminAPI } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';

const SessionManagement = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState([]);
  const [confirmShow, setConfirmShow] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);

  // Session creation form
  const [sessionForm, setSessionForm] = useState({
    weekNumber: '',
    sessionType: 'عادية',
    fullMark: 10,
  });

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await staffAPI.getSessions();
      setSessions(response.data.sessions);
    } catch (error) {
      if (error.response?.status !== 401) {
        setError('خطأ في تحميل الحصص: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await adminAPI.createSession(sessionForm);
      setMessage('تم إنشاء الحصة بنجاح');
      setSessionForm({ weekNumber: '', sessionType: 'عادية', fullMark: 10 });
      loadSessions();
    } catch (error) {
      if (error.response?.status !== 401) {
        setError(error.response?.data?.message || 'فشل إنشاء الحصة');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-page">
      {message && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {message}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setMessage('')}
          />
        </div>
      )}

      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {error}
          <button 
            type="button" 
            className="btn-close" 
            onClick={() => setError('')}
          />
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <h5 className="card-title mb-4">إنشاء حصة جديدة</h5>
          <form onSubmit={handleSessionSubmit}>
            <div className="row">
              <div className="col-md-4">
                <div className="form-group">
                  <label>رقم الأسبوع</label>
                  <input
                    type="number"
                    className="form-control"
                    value={sessionForm.weekNumber}
                    onChange={(e) => setSessionForm({
                      ...sessionForm,
                      weekNumber: e.target.value
                    })}
                    required
                  />
                </div>
              </div>
              <div className="col-md-4">
                <div className="form-group">
                  <label>نوع الحصة</label>
                  <select
                    className="form-control"
                    value={sessionForm.sessionType}
                    onChange={(e) => {
                      const newSessionType = e.target.value;
                      setSessionForm({
                        ...sessionForm,
                        sessionType: newSessionType,
                        fullMark: newSessionType === 'عادية' ? 10 : ''
                      });
                    }}
                  >
                    <option value="عادية">عادية</option>
                    <option value="امتحان شامل">امتحان شامل</option>
                  </select>
                </div>
              </div>
              {sessionForm.sessionType === 'امتحان شامل' && (
                <div className="col-md-4">
                  <div className="form-group">
                    <label>الدرجة النهائية</label>
                    <input
                      type="number"
                      className="form-control"
                      value={sessionForm.fullMark}
                      onChange={(e) => setSessionForm({
                        ...sessionForm,
                        fullMark: e.target.value
                      })}
                      required
                    />
                  </div>
                </div>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary mt-3"
              disabled={loading}
            >
              {loading ? 'جاري الإنشاء...' : 'إنشاء الحصة'}
            </button>
          </form>

          <hr />

          <h5 className="card-title mb-4">قائمة الحصص</h5>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>الأسبوع</th>
                  <th>النوع</th>
                  <th>الدرجة</th>
                  <th>تاريخ الإنشاء</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.weekNumber}</td>
                    <td>{session.sessionType}</td>
                    <td>{session.fullMark}</td>
                    <td>{new Date(session.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge bg-${session.isActive ? 'success' : 'secondary'}`}>
                        {session.isActive ? 'نشطة' : 'غير نشطة'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => {
                          setSessionToDelete(session);
                          setConfirmShow(true);
                        }}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Confirm modal for deleting a session */}
      <ConfirmModal
        show={confirmShow}
        onHide={() => { setConfirmShow(false); setSessionToDelete(null); }}
        title="حذف الحصة"
        message={sessionToDelete ? `هل أنت متأكد أنك تريد حذف الحصة رقم ${sessionToDelete.weekNumber}؟ هذا سيحذف السجلات المرتبطة أيضاً.` : ''}
        onConfirm={async () => {
          if (!sessionToDelete) return;
          try {
            await adminAPI.deleteSession(sessionToDelete.id);
            setMessage('تم حذف الحصة بنجاح');
            setConfirmShow(false);
            setSessionToDelete(null);
            loadSessions();
          } catch (err) {
            if (err.response?.status !== 401) {
              setError(err.response?.data?.message || err.message || 'فشل حذف الحصة');
            }
            setConfirmShow(false);
            setSessionToDelete(null);
          }
        }}
      />
    </div>
  );
};

export default SessionManagement;
