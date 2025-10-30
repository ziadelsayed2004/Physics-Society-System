# Centers Management System

A full-stack web application for managing student attendance, grades, and reports across multiple educational centers.

## Features

- **Student Management**: Upload and manage student data via CSV files
- **Session Management**: Create weekly sessions (regular or comprehensive exams)
- **Attendance Tracking**: Upload attendance data with automatic makeup attendance detection
- **Grade Management**: Upload and track student grades
- **Warning System**: Track student warnings and behavioral issues
- **Reports**: Generate attendance, absence, grades, and warnings reports
- **Role-based Access**: Admin and Staff roles with different permissions
- **Student Search**: Search students by ID, name, or phone number
- **Student Profiles**: View complete student history and statistics

## Tech Stack

- **Backend**: Node.js, Express.js, MongoDB, Mongoose
- **Frontend**: React.js, React Router
- **Authentication**: JWT tokens
- **File Processing**: CSV parsing with multer

## Project Structure

```
centers-groups-management/
├── server/                 # Backend application
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API routes
│   ├── middleware/         # Authentication middleware
│   ├── uploads/           # Temporary file storage
│   ├── server.js          # Main server file
│   └── package.json       # Backend dependencies
├── client/                # Frontend application
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   └── App.js         # Main app component
│   └── package.json       # Frontend dependencies
├── package.json           # Root package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local installation or MongoDB Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd centers-groups-management
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Setup environment variables**
   
   Create a `.env` file in the `server` directory:
   ```env
   MONGO_URI=mongodb://localhost:27017/centers_groups_management
   JWT_SECRET=your_jwt_secret_key_here_change_in_production
   PORT=5000
   ```

4. **Start MongoDB**
   
   Make sure MongoDB is running on your system. If using MongoDB Atlas, update the `MONGO_URI` in your `.env` file.

5. **Run the application**
   
   For development (both frontend and backend):
   ```bash
   npm run dev
   ```
   
   For production:
   ```bash
   npm start
   ```

6. **Access the application**
   
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## Usage

### Initial Setup

1. **Create Admin User**
   
   You'll need to create an admin user in MongoDB. Connect to your MongoDB instance and run:
   ```javascript
   use centers_groups_management
   
   db.users.insertOne({
     username: "admin",
     password: "$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8X5Q5K2", // password: admin123
     role: "Admin"
   })
   ```

2. **Login**
   
   Use the credentials:
   - Username: `admin`
   - Password: `admin123`
   - Role: `Admin`

### Admin Functions

- **Create Sessions**: Create weekly sessions for attendance tracking
- **Upload Students**: Upload student data via CSV files
- **Upload Attendance**: Upload attendance data for specific sessions and centers
- **Upload Grades**: Upload grade data for specific sessions
- **Upload Warnings**: Upload warning data for specific sessions

### Staff Functions

- **Search Students**: Search for students by ID, name, or phone number
- **View Student Profiles**: View complete student history and statistics
- **Generate Reports**: Create attendance, absence, grades, and warnings reports

## CSV File Formats

### Students CSV
```csv
studentId,fullName,phoneNumber,parentPhoneNumber,mainCenter
ST001,Ahmed Ali,01234567890,01234567891,Center A
ST002,Sara Mohamed,01234567892,,Center B
```

### Attendance CSV
```csv
studentId,attendance
ST001,حضور
ST002,غياب
```

### Grades CSV
```csv
studentId,grade
ST001,85
ST002,92
```

### Warnings CSV
```csv
studentId,warning
ST001,true
ST002,false
```

## Business Logic

### Attendance Rules

- Students are marked as absent by default
- If a student is marked as absent in their main center but found in another center's attendance sheet for the same week, their status is updated to "تعويض حضور" (Makeup Attendance)
- This ensures students are not penalized for attending alternative centers

### Data Validation

- All CSV uploads validate required fields
- Duplicate student IDs are handled by updating existing records
- Session uniqueness is enforced (one session per week)
- Student-session record uniqueness is enforced

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login

### Admin Routes (Admin only)
- `POST /api/students/upload` - Upload students CSV
- `POST /api/sessions` - Create new session
- `POST /api/records/upload/attendance` - Upload attendance CSV
- `POST /api/records/upload/grades` - Upload grades CSV
- `POST /api/records/upload/warnings` - Upload warnings CSV

### Staff Routes (Admin and Staff)
- `GET /api/students/search` - Search students
- `GET /api/students/:id` - Get student profile
- `GET /api/reports/attendance` - Generate attendance report
- `GET /api/reports/absence` - Generate absence report
- `GET /api/reports/grades` - Generate grades report
- `GET /api/reports/warnings` - Generate warnings report
- `GET /api/sessions` - Get all sessions

## Development

### Backend Development
```bash
cd server
npm run dev
```

### Frontend Development
```bash
cd client
npm start
```

### Database Models

- **Student**: Student information and main center
- **User**: System users (Admin/Staff) with authentication
- **Session**: Weekly sessions with type (regular/comprehensive)
- **Record**: Individual student records per session (attendance, grades, warnings)

## Deployment

1. **Build the frontend**
   ```bash
   cd client
   npm run build
   ```

2. **Deploy backend**
   - Set up MongoDB Atlas or cloud MongoDB instance
   - Update environment variables for production
   - Deploy to your preferred hosting platform (Heroku, AWS, etc.)

3. **Configure frontend**
   - Update API URL in production build
   - Deploy to static hosting (Netlify, Vercel, etc.)

## Security Considerations

- Change default JWT secret in production
- Use environment variables for sensitive data
- Implement proper CORS policies
- Add rate limiting for API endpoints
- Use HTTPS in production
- Implement proper error handling and logging

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.
