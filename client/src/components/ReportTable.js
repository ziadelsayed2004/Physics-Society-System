import React from 'react';

const ReportTable = ({ 
  title, 
  data, 
  columns, 
  emptyMessage = "No data available",
  showCount = true 
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="card-body">
          <h5>{title}</h5>
          <p className="text-muted">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5>{title}</h5>
          {showCount && (
            <span className="badge bg-primary">
              {data.length} {data.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>
        
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                {columns.map((column, index) => (
                  <th key={index}>{column.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column, colIndex) => (
                    <td key={colIndex}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ReportTable;
