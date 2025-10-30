import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { staffAPI } from '../services/api';
import SearchBar from '../components/SearchBar';

const StudentSearch = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchPerformed, setSearchPerformed] = useState(false);

  const handleSearch = async (searchTerm) => {
    if (!searchTerm.trim()) {
      setError('يرجى إدخال عبارة للبحث');
      return;
    }

    setLoading(true);
    setError('');
    setSearchResults([]);
    setSearchPerformed(true);

    try {
      const response = await staffAPI.searchStudents(searchTerm);
      setSearchResults(response.data.students);
      if (response.data.students.length === 0) {
        setError('لم يتم العثور على نتائج');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'حدث خطأ أثناء البحث');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="content-page">
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">بحث عن طالب</h5>
          
          <SearchBar 
            onSearch={handleSearch}
            placeholder="ابحث بالاسم، رقم الطالب، رقم ولي الأمر، أو الكود..."
            loading={loading}
          />

          {error && (
            <div className="alert alert-danger mt-3">
              {error}
            </div>
          )}

          {searchPerformed && !error && searchResults.length > 0 && (
            <div className="mt-4">
              <h6>نتائج البحث ({searchResults.length})</h6>
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>رقم الطالب</th>
                      <th>الاسم</th>
                      <th>النوع</th>
                      <th>الشعبة</th>
                      <th>رقم الهاتف</th>
                      <th>رقم ولي الأمر</th>
                      <th>السنتر / المجموعة</th>
                      <th>الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(student => (
                      <tr key={student.id}>
                        <td>{student.studentId}</td>
                        <td>{student.fullName}</td>
                        <td>{student.gender}</td>
                        <td>{student.division}</td>
                        <td>{student.phoneNumber}</td>
                        <td>{student.parentPhoneNumber}</td>
                        <td>{student.mainCenter}</td>
                        <td>
                          <Link to={`/student/${student.id}`} className="btn btn-sm btn-primary">
                            عرض التفاصيل
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentSearch;