const express = require('express');
const router  = express.Router();
const { protect }   = require('../middleware/auth');
const { register, login, getMe, updateMe, changePassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login',    login);
router.get ('/me',       protect, getMe);
router.patch('/me',      protect, updateMe);
router.patch('/password', protect, changePassword);

module.exports = router;
