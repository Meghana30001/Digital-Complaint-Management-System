const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  cmpId:       { type: String, unique: true },   // CMP-XXXXXXX
  title:       { type: String, required: true, trim: true },
  category:    { type: String, required: true },
  dept:        { type: String, required: true },
  description: { type: String, required: true },
  priority:    { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status:      { type: String, enum: ['open', 'in-progress', 'resolved', 'escalated', 'closed'], default: 'open' },
  location:    { type: String, default: '' },

  // References
  citizenId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  officerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  // Citizen info (denormalised for quick display)
  citizenName: { type: String, default: '' },

  remarks:     { type: String, default: '' },
  rating:      { type: Number, min: 1, max: 5, default: null },
  resolvedDate:{ type: Date, default: null },
  attachments: [{ type: String }],  // file URLs

  date:        { type: Date, default: Date.now },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now }
}, { versionKey: false });

// Auto-generate cmpId
complaintSchema.pre('save', async function (next) {
  if (!this.cmpId) {
    const count = await mongoose.model('Complaint').countDocuments();
    const year  = new Date().getFullYear().toString().slice(2);
    this.cmpId  = `CMP-${year}${String(1000000 + count).slice(1)}`;
  }
  this.updatedAt = new Date();
  next();
});

// Text search index
complaintSchema.index({ title: 'text', description: 'text', location: 'text' });

module.exports = mongoose.model('Complaint', complaintSchema);
