const express = require('express');
const router  = express.Router();
const { protect }     = require('../middleware/auth');
const { restrictTo }  = require('../middleware/roles');
const C = require('../controllers/complaintsController');

// Public — anyone can track by CMP ID
router.get('/track/:cmpId', C.trackComplaint);

// All below require login
router.use(protect);

router.route('/')
  .get(C.getComplaints)
  .post(restrictTo('citizen'), C.createComplaint);

router.get('/stats', C.getStats);
router.get('/analytics', C.getAnalytics);

router.route('/:id')
  .get(C.getComplaint)
  .patch(C.updateComplaint)
  .delete(restrictTo('admin'), C.deleteComplaint);

module.exports = router;
