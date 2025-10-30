const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  studentId: { 
    type: String, 
    required: [true, 'Student ID is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^\d{11}$/.test(v);
      },
      message: props => `${props.value} is not a valid student ID. Must be exactly 11 digits.`
    }
  },
  fullName: { 
    type: String, 
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters long']
  },
  phoneNumber: { 
    type: String, 
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        return /^[0-9]{11}$/.test(v.replace(/\s/g, ''));
      },
      message: props => `${props.value} is not a valid phone number. Must be 11 digits.`
    }
  },
  parentPhoneNumber: { 
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        return !v || /^[0-9]{11}$/.test(v.replace(/\s/g, ''));
      },
      message: props => `${props.value} is not a valid phone number. Must be 11 digits.`
    }
  },
  // Optional fields
  gender: {
    type: String,
    enum: ['ذكر', 'انثى']
  },
  division: {
    type: String,
    enum: ['علمي علوم', 'علمي رياضة', 'أزهر']
  },
  mainCenter: { 
    type: String, 
    required: [true, 'Main center is required'],
    trim: true
  }
}, {
  timestamps: true
});

// Pre-save middleware for logging
studentSchema.pre('save', function(next) {
  console.log('[Student Model] Saving student:', {
    id: this.studentId,
    name: this.fullName,
    center: this.mainCenter,
    gender: this.gender,
    division: this.division,
    isNew: this.isNew
  });
  next();
});

// Post-save middleware for logging
studentSchema.post('save', function(doc) {
  console.log('[Student Model] Student saved successfully:', {
    id: doc.studentId,
    name: doc.fullName,
    center: doc.mainCenter
  });
});

// Pre-update middleware for logging
studentSchema.pre('findOneAndUpdate', function() {
  console.log('[Student Model] Updating student:', this.getFilter());
});

// Post-update middleware for logging
studentSchema.post('findOneAndUpdate', function(doc) {
  console.log('[Student Model] Student updated successfully:', {
    id: doc?.studentId,
    name: doc?.fullName,
    center: doc?.mainCenter
  });
});

module.exports = mongoose.model('Student', studentSchema);
