# Firebase Push Notifications Setup Guide

## Prerequisites

You need a Firebase project with Cloud Messaging enabled. If you don't have one:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Cloud Messaging in Project Settings

## Step 1: Generate Firebase Service Account Key

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Click on the **Service Accounts** tab
3. Click **Generate New Private Key**
4. Save the downloaded JSON file securely

## Step 2: Add Service Account to Backend

1. Copy the downloaded JSON file to your backend directory:

   ```bash   cp ~/Downloads/serviceAccountKey.json ./serviceAccountKey.json
   ```

2. **Important**: Add the file to `.gitignore` to prevent committing sensitive credentials:
   ```bash
   echo "serviceAccountKey.json" >> .gitignore
   ```

## Step 3: Configure Environment Variable

Add the path to your `.env` file:

```env
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

If your service account file is in a different location, update the path accordingly.

## Step 4: Install Dependencies

```bash
npm install
```

This will install `firebase-admin` and all other dependencies.

## Step 5: Deploy and Test

1. **Start the server locally**:

   ```bash
   npm run dev
   ```

2. **Check logs for Firebase initialization**:
   You should see: `✅ Firebase Admin SDK initialized successfully`

3. **If you see warnings**:
   - `⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set` → Add the env variable
   - `❌ Failed to initialize Firebase Admin SDK` → Check your service account file path

## Step 6: Deploy to Production

### For Render.com (Your Current Platform):

1. Go to your Render dashboard
2. Open your backend service
3. Go to **Environment** tab
4. Add environment variable:

   - **Key**: `FIREBASE_SERVICE_ACCOUNT_PATH`
   - **Value**: `./serviceAccountKey.json`

5. Upload the service account JSON file:
   - In your Render service, go to **Shell** or use **Deploy Hook**
   - Upload `serviceAccountKey.json` to the root directory
   - **OR** encode the JSON content and store it as an environment variable (more secure)

### Alternative: Store Credentials as Environment Variable

Instead of uploading the file, you can store the entire JSON content as an env variable:

1. Copy the contents of `serviceAccountKey.json`
2. In Render, add a new environment variable:

   - **Key**: `FIREBASE_SERVICE_ACCOUNT`
   - **Value**: Paste the entire JSON content

3. Update `src/services/notificationService.js` initialization to:
   ```javascript
   if (process.env.FIREBASE_SERVICE_ACCOUNT) {
     const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
     admin.initializeApp({
       credential: admin.credential.cert(serviceAccount),
     });
   }
   ```

## Testing

### Test FCM Token Registration

```bash
curl -X POST https://sgv-school-backend.onrender.com/api/fcm/register \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-token",
    "userId": "guest",
    "platform": "android",
    "isAuthenticated": false
  }'
```

Expected response:

```json
{
  "success": true,
  "message": "FCM token registered successfully",
  "tokenId": "..."
}
```

### Test News Creation with Notification

1. Create news as admin (requires auth token)
2. Check backend logs for:
   ```
   [News] Sending notification for new news...
   [Notifications] Sending notification for news: Your News Title
   [Notifications] Found X tokens to send to
   [Notifications] Sent: X success, 0 failures
   ```

## Troubleshooting

### "Firebase not configured" Warning

- Check that `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT` is set
- Verify the service account JSON file exists and is valid
- Check file permissions (should be readable by the app)

### "No tokens to send to"

- Make sure devices have registered their FCM tokens
- Check the MongoDB collection `fcmtokens` to see registered tokens
- Ensure the app is calling `/api/fcm/register` on startup

### Notifications Not Received on Devices

- Verify Firebase Cloud Messaging is enabled in Firebase Console
- Check device notification permissions
- Ensure Google Play Services is installed (for Android)
- Check backend logs for send failures
- Verify the service account has FCM permissions

## Security Notes

⚠️ **NEVER commit `serviceAccountKey.json` to Git**
⚠️ **Always add sensitive files to `.gitignore`**
⚠️ **Use environment variables in production**

## Next Steps

Once Firebase is configured:

1. Deploy the backend
2. Open the mobile app on a real device
3. Create news as admin
4. Verify notifications appear on devices!
