import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { staffAPI } from '../services/api';
import StudentProfile from './StudentProfile';

const StudentProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await staffAPI.getStudentProfile(id);
        setStudent(response.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch student profile');
      }
      setLoading(false);
    };

    fetchStudent();
  }, [id]);

  const handleBack = () => {
    navigate('/search');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!student) {
    return <div>Student not found.</div>;
  }

  return (
    <StudentProfile 
      student={student} 
      onBack={handleBack} 
    />
  );
};

export default StudentProfilePage;
