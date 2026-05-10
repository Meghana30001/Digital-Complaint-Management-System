const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: [true, 'Name is required'], trim: true },
  email:     { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
  password:  { type: String, required: [true, 'Password is required'], minlength: 6, select: false },
  role:      { type: String, enum: ['citizen', 'officer', 'admin'], default: 'citizen' },
  phone:     { type: String, default: '' },
  dept:      { type: String, default: '' },      // for officers
  empId:     { type: String, default: '' },      // for officers
  avatar:    { type: String, default: '' },      // first letter of name
  userId:    { type: String, unique: true },     // USR-XXXX format
  createdAt: { type: Date, default: Date.now }
}, { versionKey: false });

// Auto-generate userId before saving
userSchema.pre('save', async function (next) {
  // Generate userId
  if (!this.userId) {
    const count = await mongoose.model('User').countDocuments();
    this.userId = 'USR-' + String(1000 + count).padStart(4, '0');
  }
  // Hash password only if modified
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Instance method: compare passwords
userSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
