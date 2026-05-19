const Complaint = require('../models/Complaint');

// ── GET /api/complaints ──────────────────────────────────────
// Admin → all | Officer → own dept | Citizen → own complaints
exports.getComplaints = async (req, res) => {
  try {
    let filter = {};
    const { role, id, dept } = req.user;

    if (role === 'citizen')      filter = { citizenId: id };
    else if (role === 'officer') filter = { $or: [{ dept }, { officerId: id }, { officerId: null }] };
    // admin: no filter → all

    // Query params
    const { status, category, priority, search, page = 1, limit = 50 } = req.query;
    if (status)   filter.status   = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (search)   filter.$text    = { $search: search };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Complaint.countDocuments(filter);
    const complaints = await Complaint.find(filter)
      .populate('citizenId', 'name email userId')
      .populate('officerId', 'name userId dept')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    res.json({ success: true, total, page: parseInt(page), results: complaints.length, complaints });
  } catch (err) {
    console.error('getComplaints error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/complaints/stats ────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    let filter = {};
    const { role, id, dept } = req.user;
    if (role === 'citizen')      filter = { citizenId: id };
    else if (role === 'officer') filter = { $or: [{ dept }, { officerId: id }] };

    const [total, open, inProgress, resolved, escalated] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.countDocuments({ ...filter, status: 'open' }),
      Complaint.countDocuments({ ...filter, status: 'in-progress' }),
      Complaint.countDocuments({ ...filter, status: 'resolved' }),
      Complaint.countDocuments({ ...filter, status: 'escalated' })
    ]);

    res.json({ success: true, stats: { total, open, inProgress, resolved, escalated } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/complaints/:id ──────────────────────────────────
exports.getComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ cmpId: req.params.id })
      .populate('citizenId', 'name email userId phone')
      .populate('officerId', 'name userId dept');

    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found.' });

    // Citizens can only view their own
    if (req.user.role === 'citizen' && String(complaint.citizenId._id) !== String(req.user.id))
      return res.status(403).json({ success: false, message: 'Access denied.' });

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/complaints/track/:cmpId (public) ────────────────
exports.trackComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ cmpId: req.params.cmpId })
      .select('cmpId title category dept status priority location date resolvedDate remarks citizenName')
      .populate('officerId', 'name dept');

    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint ID not found.' });

    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/complaints ─────────────────────────────────────
exports.createComplaint = async (req, res) => {
  try {
    const { title, category, dept, description, priority, location } = req.body;

    if (!title || !category || !dept || !description)
      return res.status(400).json({ success: false, message: 'Title, category, department and description are required.' });

    const complaint = await Complaint.create({
      title, category, dept, description,
      priority:    priority || 'medium',
      location:    location || '',
      citizenId:   req.user.id,
      citizenName: req.user.name
    });

    res.status(201).json({ success: true, complaint });
  } catch (err) {
    console.error('createComplaint error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── PATCH /api/complaints/:id ────────────────────────────────
exports.updateComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOne({ cmpId: req.params.id });
    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found.' });

    const { role, id } = req.user;

    // Citizens can only rate resolved complaints
    if (role === 'citizen') {
      if (String(complaint.citizenId) !== String(id))
        return res.status(403).json({ success: false, message: 'Access denied.' });
      if (req.body.rating && complaint.status === 'resolved') {
        complaint.rating = req.body.rating;
        await complaint.save();
        return res.json({ success: true, complaint });
      }
      return res.status(403).json({ success: false, message: 'Citizens can only rate resolved complaints.' });
    }

    // Officers/Admin can update status, remarks, priority
    const allowed = ['status', 'remarks', 'priority'];
    allowed.forEach(k => { if (req.body[k] !== undefined) complaint[k] = req.body[k]; });

    if (role === 'officer') complaint.officerId = id;

    if (req.body.status === 'resolved' && !complaint.resolvedDate) {
      complaint.resolvedDate = new Date();
    }

    await complaint.save();
    res.json({ success: true, complaint });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/complaints/analytics ────────────────────────────
exports.getAnalytics = async (req, res) => {
  try {
    let filter = {};
    const { role, id, dept } = req.user;
    if (role === 'citizen')      filter = { citizenId: id };
    else if (role === 'officer') filter = { $or: [{ dept }, { officerId: id }] };

    const [byDept, byCategory, byStatus] = await Promise.all([
      Complaint.aggregate([
        { $match: filter },
        { $group: {
          _id: '$dept',
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } }
        }},
        { $sort: { total: -1 } }
      ]),
      Complaint.aggregate([
        { $match: filter },
        { $group: { _id: '$category', total: { $sum: 1 } } },
        { $sort: { total: -1 } }
      ]),
      Complaint.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      analytics: {
        byDept: byDept.map(d => ({
          dept: d._id || 'Unknown',
          total: d.total,
          open: d.open,
          inProgress: d.inProgress,
          resolved: d.resolved,
          pending: d.open + d.inProgress
        })),
        byCategory: byCategory.map(c => ({ category: c._id || 'Other', total: c.total })),
        byStatus: Object.fromEntries(byStatus.map(s => [s._id, s.count]))
      }
    });
  } catch (err) {
    console.error('getAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── DELETE /api/complaints/:id (admin only) ──────────────────
exports.deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findOneAndDelete({ cmpId: req.params.id });
    if (!complaint)
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
