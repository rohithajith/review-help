const mongoose = require('mongoose');

const reviewTemplateSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  used: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ReviewTemplate', reviewTemplateSchema);