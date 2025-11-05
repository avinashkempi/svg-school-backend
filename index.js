const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const connectDB = require('./src/config/database');
const app = express();
const PORT = process.env.PORT || 5000;
require('dotenv').config()

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:8081', 'http://localhost:3000', 'http://localhost:19006'],
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/events', require('./src/routes/events'));
app.use('/api/school-info', require('./src/routes/schoolInfo'));
app.use('/api/users', require('./src/routes/users'));

app.get('/', (req, res) => {
  res.send('Hello from Express Backend!');
});

// Cron job to delete notifications for past events daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today

    // Find events where date is before today
    const pastEvents = await require('./src/models/Event').find({ date: { $lt: today } });

    if (pastEvents.length > 0) {
      const eventIds = pastEvents.map(event => event._id);

      // Delete notifications for these past events
      const deleteResult = await require('./src/models/Notification').deleteMany({ eventId: { $in: eventIds } });

      console.log(`🗑️ Deleted ${deleteResult.deletedCount} notifications for past events`);
    }
  } catch (error) {
    console.error('❌ Error in cron job:', error);
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
