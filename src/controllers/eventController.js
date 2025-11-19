const { validationResult } = require('express-validator');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

const createEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, date, description, isSchoolEvent } = req.body;

    // Create new event
    const event = new Event({
      title,
      date,
      description,
      isSchoolEvent: isSchoolEvent !== undefined ? isSchoolEvent : false,
      createdBy: req.user.userId
    });
    await event.save();

    // Immediately create a notification for the new event
    const notification = new Notification({
      message: `New event added: ${title} on ${new Date(date).toDateString()}`,
      eventId: event._id
    });
    await notification.save();

    res.status(201).json({
      success: true,
      message: 'Event created and notification sent',
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        description: event.description,
        createdBy: event.createdBy
      },
      notification: {
        id: notification._id,
        message: notification.message,
        eventId: notification.eventId
      }
    });
  } catch (error) {
    console.error('Add event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during event creation'
    });
  }
};

const getEventById = async (req, res) => {
  try {
    const eventId = req.params.id;

    // Find the event and check if it belongs to the user
    const event = await Event.findOne({ _id: eventId, createdBy: req.user.userId });
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or you do not have permission to view it'
      });
    }

    res.json({
      success: true,
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        description: event.description,
        createdBy: event.createdBy,
        createdAt: event.createdAt
      }
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during event retrieval'
    });
  }
};


const getEvent = async (req, res) => {
  try {
    
    const event = await Event.find();

    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during event retrieval'
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const eventId = req.params.id;
    const { title, date, description, isSchoolEvent } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Update the event fields
    if (title !== undefined) event.title = title;
    if (date !== undefined) event.date = date;
    if (description !== undefined) event.description = description;
    if (isSchoolEvent !== undefined) event.isSchoolEvent = isSchoolEvent;

    await event.save();

    res.json({
      success: true,
      message: 'Event updated successfully',
      event: {
        id: event._id,
        title: event.title,
        date: event.date,
        description: event.description,
        createdBy: event.createdBy,
        createdAt: event.createdAt
      }
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during event update'
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.id;

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Delete the event
    await Event.findByIdAndDelete(eventId);

    // Delete associated notifications
    await Notification.deleteMany({ eventId });

    res.json({
      success: true,
      message: 'Event and associated notifications deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during event deletion'
    });
  }
};

module.exports = {
  createEvent,
  getEventById,
  updateEvent,
  deleteEvent,
  getEvent
};
