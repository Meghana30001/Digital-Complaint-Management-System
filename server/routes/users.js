const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/roles');
const C = require('../controllers/usersController');

router.use(protect, restrictTo('admin'));

router.get('/stats', C.getUserStats);
router.route('/')
  .get(C.listUsers)
  .post(C.createUser);
router.route('/:userId')
  .patch(C.updateUser)
  .delete(C.deleteUser);

module.exports = router;
