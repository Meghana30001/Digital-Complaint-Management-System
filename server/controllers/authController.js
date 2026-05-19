const jwt  = require('jsonwebtoken');
const User = require('../models/User');
const { formatUser } = require('../utils/formatUser');

// Sign a JWT
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// Send token + user in response
const sendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  res.status(statusCode).json({
    success: true,
    token,
    user: formatUser(user)
  });
};

// ── POST /api/auth/register ────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone, dept, empId, adminCode } = req.body;

    // Validate required
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

    // Check email uniqueness
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });

    // Admin access code guard
    if (role === 'admin' && adminCode !== 'ADMIN2024')
      return res.status(403).json({ success: false, message: 'Invalid admin access code.' });

    // Officer must provide dept
    if (role === 'officer' && !dept)
      return res.status(400).json({ success: false, message: 'Department is required for officers.' });

    const user = await User.create({
      name, email: email.trim().toLowerCase(), password,
      role:   role || 'citizen',
      phone:  phone || '',
      dept:   dept  || '',
      empId:  empId || '',
      avatar: name.charAt(0).toUpperCase()
    });

    sendToken(user, 201, res);
  } catch (err) {
    console.error('register error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
};

// ── POST /api/auth/login ────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password are required.' });

    // Include password (select: false by default)
    const user = await User.findOne({ email }).select('+password');
    if (!user)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });

    // Role validation
    if (role && user.role !== role)
      return res.status(403).json({ success: false, message: `This account is not a ${role} account.` });

    sendToken(user, 200, res);
  } catch (err) {
    console.error('login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
};

// ── GET /api/auth/me ────────────────────────────────────────
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── PATCH /api/auth/me ──────────────────────────────────────
exports.updateMe = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'dept', 'empId', 'avatar'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true, runValidators: true });
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── PATCH /api/auth/password ────────────────────────────────
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, message: 'Current and new password are required.' });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });

    const user = await User.findById(req.user.id).select('+password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const match = await user.comparePassword(currentPassword);
    if (!match)
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
