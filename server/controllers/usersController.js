const User = require('../models/User');
const Complaint = require('../models/Complaint');
const { formatUser } = require('../utils/formatUser');

// GET /api/users
exports.listUsers = async (req, res) => {
  try {
    const { role, search } = req.query;
    const filter = {};
    if (role && role !== 'all') filter.role = role;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter).sort({ createdAt: -1 }).limit(200);
    const counts = await Complaint.aggregate([
      { $group: { _id: '$citizenId', count: { $sum: 1 } } }
    ]);
    const countMap = Object.fromEntries(counts.map(c => [String(c._id), c.count]));

    const list = users.map(u => ({
      ...formatUser(u),
      complaintCount: countMap[String(u._id)] || 0
    }));

    res.json({ success: true, total: list.length, users: list });
  } catch (err) {
    console.error('listUsers error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/users/stats
exports.getUserStats = async (req, res) => {
  try {
    const [citizen, officer, admin] = await Promise.all([
      User.countDocuments({ role: 'citizen' }),
      User.countDocuments({ role: 'officer' }),
      User.countDocuments({ role: 'admin' })
    ]);
    res.json({ success: true, stats: { citizen, officer, admin, total: citizen + officer + admin } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/users (admin creates account)
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role, phone, dept, empId } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required.' });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(409).json({ success: false, message: 'Email already in use.' });

    if (role === 'officer' && !dept)
      return res.status(400).json({ success: false, message: 'Department required for officers.' });

    const user = await User.create({
      name, email, password,
      role: role || 'citizen',
      phone: phone || '',
      dept: dept || '',
      empId: empId || '',
      avatar: name.charAt(0).toUpperCase()
    });

    res.status(201).json({ success: true, user: formatUser(user) });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/users/:userId
exports.updateUser = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'dept', 'empId', 'role', 'avatar'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    const user = await User.findOneAndUpdate(
      { $or: [{ userId: req.params.userId }, { _id: req.params.userId }] },
      updates,
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    res.json({ success: true, user: formatUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// DELETE /api/users/:userId
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findOne({
      $or: [{ userId: req.params.userId }, { _id: req.params.userId }]
    });
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    if (String(user._id) === String(req.user.id))
      return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });

    await User.findByIdAndDelete(user._id);
    res.json({ success: true, message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
