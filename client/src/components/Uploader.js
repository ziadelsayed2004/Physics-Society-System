import React, { useState, useRef, useEffect } from 'react';
import { Alert, Button, FormControl, InputLabel, MenuItem, Select, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import api, { centerAPI } from '../services/api';

const UPLOAD_TYPES = {
  students: {
    label: 'بيانات الطلاب',
    headers: ['ID', 'Student Name', 'Student Phone', 'Parent Phone', 'Group']
  },
  attendance: {
    label: 'الحضور',
    headers: ['ID', 'Student Name', 'Student Phone', 'Parent Phone', 'Group']
  },
  grades: {
    label: 'الدرجات',
    headers: ['Grade', 'ID', 'Student Name', 'Student Phone', 'Parent Phone', 'Group']
  },
  warnings: {
    label: 'الإنذارات',
    headers: ['ID', 'Student Name', 'Student Phone', 'Parent Phone', 'Group']
  }
};

const Uploader = () => {
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);



  const handleFileSelect = (event) => {
    const selectedFile = event.target.files[0];
    setError('');
    setSuccess('');

    if (!selectedFile) {
      setFile(null);
      return;
    }

    // Accept CSV files only
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (ext !== 'csv') {
      setError('من فضلك اختر ملف CSV (.csv) فقط.');
      setFile(null);
      fileInputRef.current.value = '';
      return;
    }

    setFile(selectedFile);
  };

  const handleTypeChange = (event) => {
    setSelectedType(event.target.value);
    setFile(null);
    setError('');
    setSuccess('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const [uploadStats, setUploadStats] = useState(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [centers, setCenters] = useState([]);
  const [selectedCenter, setSelectedCenter] = useState('');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
  const res = await centerAPI.getCenters();
  if (mounted && res?.data) setCenters(res.data.centers || res.data || []);
      } catch (e) {
        console.error('Failed to load centers', e);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);
  
  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file || !selectedType) return;

    setLoading(true);
    setError('');
    setSuccess('');
    setUploadStats(null);
    setUploadProgress(0);

    if (!selectedCenter) {
      setError('الرجاء اختيار السنتر / المجموعة قبل رفع الملف');
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('uploadType', selectedType);
    formData.append('center', selectedCenter);

    // Add sessionId if needed for attendance/grades/warnings
    const currentSession = localStorage.getItem('currentSession');
    if (['attendance', 'grades', 'warnings'].includes(selectedType) && currentSession) {
      formData.append('sessionId', currentSession);
    }

    try {
      console.log('[Upload Started]', {
        type: selectedType,
        fileName: file.name,
        fileSize: file.size,
        timestamp: new Date().toISOString()
      });

      const response = await api.post('/upload/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
          console.log('[Upload Progress]', { percentCompleted });
        }
      });

      console.log('[Upload Response]', response.data);

      if (response.data.status === 'success') {
        const { details } = response.data;
        
        // Format success message based on upload type
        let successMessage = response.data.message;
        if (details?.processingTime) {
          successMessage += ` (${Math.round(parseInt(details.processingTime) / 1000)} ثواني)`;
        }
        
        setSuccess(successMessage);
        setUploadStats(details);
        
  // Clear form
  setFile(null);
  setSelectedCenter('');
  fileInputRef.current.value = '';
        
        // Trigger search update if it's a student upload
        if (selectedType === 'students') {
          // Notify parent component or use context to refresh search index
          window.dispatchEvent(new CustomEvent('studentDataUpdated'));
        }
      } else {
        throw new Error(response.data.message || 'حدث خطأ غير معروف');
      }
    } catch (error) {
      console.error('[Upload Error]', {
        error: error.message,
        response: error.response?.data,
        timestamp: new Date().toISOString()
      });
      
      // Format error message
      let errorMessage = error.response?.data?.message || error.message;
      if (error.response?.data?.details?.errors?.length > 0) {
        errorMessage += '\n\nتفاصيل الأخطاء:';
        error.response.data.details.errors.forEach((err, index) => {
          errorMessage += `\n${index + 1}. ${err.message}`;
        });
      }
      
      setError(errorMessage || 'حدث خطأ أثناء رفع الملف. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="uploader-container" style={{ maxWidth: '600px', margin: '20px auto', padding: '20px' }}>
      <form onSubmit={handleSubmit}>
        <FormControl fullWidth margin="normal">
          <InputLabel>نوع البيانات</InputLabel>
          <Select
            value={selectedType}
            onChange={handleTypeChange}
            label="نوع البيانات"
          >
            {Object.entries(UPLOAD_TYPES).map(([key, value]) => (
              <MenuItem key={key} value={key}>
                {value.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <div style={{ marginTop: '20px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant="contained"
            component="label"
            startIcon={<CloudUploadIcon />}
            onClick={() => fileInputRef.current.click()}
            fullWidth
          >
            اختر ملف CSV
          </Button>
        </div>

        <FormControl fullWidth margin="normal">
          <InputLabel>السنتر / المجموعة (مطلوب)</InputLabel>
          <Select value={selectedCenter} onChange={(e) => setSelectedCenter(e.target.value)} label="السنتر / المجموعة (مطلوب)">
            <MenuItem value="">-- اختر السنتر / المجموعة --</MenuItem>
            {centers.map(c => (
              <MenuItem key={c._id || c.id || c.name} value={c.name || c.label || c._id}>{c.name || c.label || c._id}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {error && (
          <Alert severity="error" style={{ marginTop: '20px' }}>
            {error}
          </Alert>
        )}

        {success && (
          <>
            <Alert severity="success" style={{ marginTop: '20px' }}>
              {success}
            </Alert>
            {uploadStats && (
              <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#2196f3' }}>تفاصيل المعالجة:</h4>
                <div style={{ display: 'grid', gap: '10px' }}>
                  {uploadStats.created > 0 && (
                    <div className="stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#4caf50', marginRight: '8px' }}>✓</span>
                      <span>تمت إضافة {uploadStats.created} سجل جديد</span>
                    </div>
                  )}
                  {uploadStats.updated > 0 && (
                    <div className="stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#2196f3', marginRight: '8px' }}>↻</span>
                      <span>تم تحديث {uploadStats.updated} سجل</span>
                    </div>
                  )}
                  {uploadStats.processed > 0 && (
                    <div className="stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#9c27b0', marginRight: '8px' }}>∑</span>
                      <span>إجمالي السجلات المعالجة: {uploadStats.processed}</span>
                    </div>
                  )}
                  {uploadStats.processingTime && (
                    <div className="stat-item" style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ color: '#ff9800', marginRight: '8px' }}>⏱</span>
                      <span>زمن المعالجة: {Math.round(parseInt(uploadStats.processingTime) / 1000)} ثواني</span>
                    </div>
                  )}
                  {uploadStats.errors?.length > 0 && (
                    <div className="error-section" style={{ marginTop: '10px' }}>
                      <div style={{ color: '#f44336', display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ marginRight: '8px' }}>⚠</span>
                        <span>تم اكتشاف {uploadStats.errors.length} أخطاء:</span>
                      </div>
                      <ul style={{ margin: '0', paddingLeft: '24px' }}>
                        {uploadStats.errors.map((error, index) => (
                          <li key={index} style={{ color: '#f44336', fontSize: '0.9em' }}>
                            {error.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          style={{ marginTop: '20px' }}
          disabled={!file || !selectedType || loading}
        >
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress size={24} variant="determinate" value={uploadProgress} />
              <span style={{ marginLeft: '10px' }}>
                {uploadProgress}%
              </span>
            </div>
          ) : (
            'رفع الملف'
          )}
        </Button>
      </form>
    </div>
  );
};

export default Uploader;