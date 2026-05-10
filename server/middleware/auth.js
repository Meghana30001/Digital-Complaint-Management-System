const jwt  = require('jsonwebtoken');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token)
      return res.status(401).json({ success: false, message: 'Not authenticated. Please log in.' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id);

    if (!user)
      return res.status(401).json({ success: false, message: 'User no longer exists.' });

    req.user = { id: user._id, userId: user.userId, name: user.name, role: user.role, dept: user.dept };
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token. Please log in again.' });
  }
};

// Optional protect — attaches user if token exists, does NOT block
exports.optionalProtect = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token   = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user    = await User.findById(decoded.id);
      if (user) req.user = { id: user._id, userId: user.userId, name: user.name, role: user.role, dept: user.dept };
    }
  } catch (_) { /* ignore */ }
  next();
};
