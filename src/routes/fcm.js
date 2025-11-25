const express = require('express');
const { registerFCMToken, unregisterFCMToken } = require('../controllers/fcmController');

const router = express.Router();

// POST /api/fcm/register - Register a device's FCM token
router.post('/register', registerFCMToken);

// POST /api/fcm/unregister - Unregister a device's FCM token
router.post('/unregister', unregisterFCMToken);

module.exports = router;
