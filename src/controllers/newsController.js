const { validationResult } = require('express-validator');
const News = require('../models/News');

const createNews = async (req, res) => {
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

    const { title, description, creationDate, url, privateNews } = req.body;

    // Create new news
    const news = new News({
      title,
      description,
      creationDate: creationDate || new Date(),
      url,
      privateNews: privateNews !== undefined ? privateNews : false,
      createdBy: req.user.userId
    });
    await news.save();

    res.status(201).json({
      success: true,
      message: 'News created successfully',
      news: {
        id: news._id,
        title: news.title,
        description: news.description,
        creationDate: news.creationDate,
        url: news.url,
        privateNews: news.privateNews,
        createdBy: news.createdBy
      }
    });
  } catch (error) {
    console.error('Create news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during news creation'
    });
  }
};

const getNews = async (req, res) => {
  try {
    let query = {};

    // If user is not authenticated, only show non-private news
    if (!req.user) {
      query.privateNews = false;
    }
    // If user is authenticated, show all news (no filter needed)

    const news = await News.find(query).sort({ creationDate: -1 });

    res.json({
      success: true,
      news: news
    });
  } catch (error) {
    console.error('Get news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during news retrieval'
    });
  }
};

const getNewsById = async (req, res) => {
  try {
    const newsId = req.params.id;

    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // If news is private and user is not authenticated, deny access
    if (news.privateNews && !req.user) {
      return res.status(403).json({
        success: false,
        message: 'This news is private. Please log in to view it.'
      });
    }

    res.json({
      success: true,
      news: {
        id: news._id,
        title: news.title,
        description: news.description,
        creationDate: news.creationDate,
        url: news.url,
        privateNews: news.privateNews,
        createdBy: news.createdBy,
        createdAt: news.createdAt
      }
    });
  } catch (error) {
    console.error('Get news by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during news retrieval'
    });
  }
};

const updateNews = async (req, res) => {
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

    const newsId = req.params.id;
    const { title, description, creationDate, url, privateNews } = req.body;

    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Update fields
    if (title !== undefined) news.title = title;
    if (description !== undefined) news.description = description;
    if (creationDate !== undefined) news.creationDate = creationDate;
    if (url !== undefined) news.url = url;
    if (privateNews !== undefined) news.privateNews = privateNews;

    await news.save();

    res.json({
      success: true,
      message: 'News updated successfully',
      news: {
        id: news._id,
        title: news.title,
        description: news.description,
        creationDate: news.creationDate,
        url: news.url,
        privateNews: news.privateNews,
        createdBy: news.createdBy
      }
    });
  } catch (error) {
    console.error('Update news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during news update'
    });
  }
};

const deleteNews = async (req, res) => {
  try {
    const newsId = req.params.id;

    const news = await News.findById(newsId);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    await News.findByIdAndDelete(newsId);

    res.json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error) {
    console.error('Delete news error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during news deletion'
    });
  }
};

module.exports = {
  createNews,
  getNews,
  getNewsById,
  updateNews,
  deleteNews
};
