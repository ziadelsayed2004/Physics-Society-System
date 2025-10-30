const mongoose = require('mongoose');

const centerSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true 
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Center', centerSchema);
