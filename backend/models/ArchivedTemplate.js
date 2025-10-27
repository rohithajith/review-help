const mongoose = require('mongoose');

const archivedTemplateSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  archivedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('ArchivedTemplate', archivedTemplateSchema);