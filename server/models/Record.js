const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  student: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Student', 
    required: [true, 'معرف الطالب مطلوب']
  },
  session: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Session', 
    required: [true, 'معرف الجلسة مطلوب']
  },
  attendance: { 
    type: String, 
    enum: {
      values: ['حضور', 'تعويض حضور', 'غياب'],
      message: 'حالة الحضور غير صحيحة'
    },
    default: 'غياب'
  },
  grade: { 
    type: String,
    validate: {
      validator: function(v) {
        return v === '-' || (!isNaN(v) && parseFloat(v) >= 0 && parseFloat(v) <= 100);
      },
      message: 'الدرجة يجب أن تكون بين 0 و 100 أو "-"'
    },
    default: '-'
  },
  gradeNotes: {
    type: String,
    trim: true
  },
  issue: {
    type: Boolean,
    default: false
  },
  center: { 
    type: String,
    required: [true, 'السنتر / المجموعة مطلوب']
  },
  mainCenter: {
    type: String,
    required: [true, 'السنتر / المجموعة الأساسي مطلوب']
  },
  notes: {
    type: String,
    trim: true
  },
  makeupReason: {
    type: String,
    trim: true,
    required: function() {
      return this.attendance === 'تعويض حضور';
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound index to ensure unique student-session combination
recordSchema.index({ student: 1, session: 1 }, { unique: true });
recordSchema.index({ session: 1, center: 1 });
recordSchema.index({ student: 1, attendance: 1 });
recordSchema.index({ issue: 1 });

// Virtual for isMakeup
recordSchema.virtual('isMakeup').get(function() {
  return this.attendance === 'تعويض حضور';
});

// Middleware to validate makeup attendance
recordSchema.pre('save', function(next) {
  if (this.attendance === 'تعويض حضور' && this.center === this.mainCenter) {
    next(new Error('لا يمكن تسجيل حضور تعويضي في نفس السنتر / المجموعة الأساسي'));
  }
  next();
});

module.exports = mongoose.model('Record', recordSchema);