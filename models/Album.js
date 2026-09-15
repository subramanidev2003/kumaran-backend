const mongoose = require('mongoose');

const AlbumSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['baby', 'wed', 'maternity', 'events', 'puberty']
  },
  coverImage: {
    type: String,
    required: true
  },
  gallery: [{
    type: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Album', AlbumSchema);
