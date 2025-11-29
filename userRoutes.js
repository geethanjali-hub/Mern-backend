const express = require('express');
const router = express.Router();
const userController = require('./userController');
const authMiddleware = require('./authMiddleware');

router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

module.exports = router;
