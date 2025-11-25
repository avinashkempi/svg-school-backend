const FCMToken = require('../models/FCMToken');
const path = require('path');

// Firebase Admin will be initialized with a warning if credentials are not available
// This allows the app to run without Firebase, but notifications won't work
let admin;
try {
    admin = require('firebase-admin');

    // Check if Firebase is already initialized
    if (!admin.apps.length) {
        let serviceAccount = null;

        // Try to load from environment variable first (for production/Render)
        if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
            console.log('[Firebase] Loading service account from environment variable');
            serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        }
        // Otherwise try to load from file path (for local development)
        else if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
            const absolutePath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
            console.log('[Firebase] Loading service account from file:', absolutePath);
            serviceAccount = require(absolutePath);
        }

        if (serviceAccount) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log('✅ Firebase Admin SDK initialized successfully');
        } else {
            console.warn('⚠️  Firebase credentials not found. Push notifications will not work.');
            console.warn('⚠️  Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
            admin = null; // Set to null if not properly initialized
        }
    }
} catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    console.warn('⚠️  Push notifications will not work until Firebase is properly configured');
    admin = null;
}

/**
 * Send push notification to multiple devices
 * @param {Array} tokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Data payload (optional)
 */
async function sendBatchNotifications(tokens, notification, data = {}) {
    if (!admin) {
        console.warn('[Notifications] Firebase Admin not initialized, skipping notification send');
        return { success: false, error: 'Firebase not configured' };
    }

    if (!tokens || tokens.length === 0) {
        console.log('[Notifications] No tokens to send to');
        return { success: true, successCount: 0, failureCount: 0 };
    }

    try {
        // Firebase supports sending to max 500 tokens at once
        const batchSize = 500;
        const batches = [];

        for (let i = 0; i < tokens.length; i += batchSize) {
            batches.push(tokens.slice(i, i + batchSize));
        }

        let totalSuccess = 0;
        let totalFailure = 0;
        const failedTokens = [];

        for (const batch of batches) {
            const message = {
                notification,
                data,
                tokens: batch,
            };

            const response = await admin.messaging().sendMulticast(message);

            totalSuccess += response.successCount;
            totalFailure += response.failureCount;

            // Remove failed/invalid tokens from database
            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        failedTokens.push(batch[idx]);
                        console.error(`[Notifications] Failed to send to token:`, resp.error?.message || 'Unknown error');
                    }
                });
            }
        }

        // Clean up invalid tokens
        if (failedTokens.length > 0) {
            await FCMToken.deleteMany({ token: { $in: failedTokens } });
            console.log(`[Notifications] Removed ${failedTokens.length} invalid tokens`);
        }

        console.log(`[Notifications] Sent: ${totalSuccess} success, ${totalFailure} failures`);

        return {
            success: true,
            successCount: totalSuccess,
            failureCount: totalFailure,
        };
    } catch (error) {
        console.error('[Notifications] Send error:', error);
        return {
            success: false,
            error: error.message,
        };
    }
}

/**
 * Send notification when news is created
 * @param {Object} newsData - The created news object
 */
async function sendNewsNotification(newsData) {
    try {
        if (!admin) {
            console.warn('[Notifications] Firebase not initialized, skipping news notification');
            return { success: false, error: 'Firebase not configured' };
        }

        const { title, description, privateNews, _id } = newsData;

        console.log(`[Notifications] Sending notification for news: ${title}`);
        console.log(`[Notifications] Private news: ${privateNews}`);

        // Get tokens based on privateNews flag
        let tokenQuery = {};

        if (privateNews) {
            // Private news: only send to authenticated users
            tokenQuery = { isAuthenticated: true };
            console.log('[Notifications] Sending to authenticated users only');
        } else {
            // Public news: send to all users (authenticated + guests)
            console.log('[Notifications] Sending to all users');
        }

        const fcmTokenDocs = await FCMToken.find(tokenQuery);
        const tokens = fcmTokenDocs.map(doc => doc.token);

        console.log(`[Notifications] Found ${tokens.length} tokens to send to`);

        if (tokens.length === 0) {
            console.log('[Notifications] No tokens found, skipping notification send');
            return { success: true, message: 'No tokens to send to' };
        }

        const notification = {
            title: '📰 New News Update',
            body: title,
        };

        const data = {
            type: 'news',
            newsId: _id.toString(),
            title,
            description: description.substring(0, 100),
            privateNews: privateNews.toString(),
        };

        const result = await sendBatchNotifications(tokens, notification, data);

        return result;
    } catch (error) {
        console.error('[Notifications] Error sending news notification:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendBatchNotifications,
    sendNewsNotification,
};
