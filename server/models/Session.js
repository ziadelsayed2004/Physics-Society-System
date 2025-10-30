const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  weekNumber: { 
    type: Number, 
    required: [true, 'رقم الأسبوع مطلوب'],
    unique: true,
    min: [1, 'رقم الأسبوع يجب أن يكون أكبر من 0']
  },
  sessionType: { 
    type: String, 
    enum: {
      values: ['عادية', 'امتحان شامل'],
      message: 'نوع الجلسة يجب أن يكون إما عادية أو امتحان شامل'
    },
    default: 'عادية',
    required: [true, 'نوع الجلسة مطلوب']
  },
  fullMark: {
    type: Number,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: function() {
      return new Date(this.startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // أسبوع واحد
    }
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// إضافة مؤشر للبحث السريع
// weekNumber already has unique: true on the field definition, avoid duplicate index
sessionSchema.index({ startDate: 1, endDate: 1 });
sessionSchema.index({ isActive: 1 });

// التحقق من التواريخ
sessionSchema.pre('save', function(next) {
  if (this.endDate < this.startDate) {
    next(new Error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية'));
  }
  if (this.sessionType === 'عادية') {
    this.fullMark = 10;
  }
  next();
});

module.exports = mongoose.model('Session', sessionSchema);