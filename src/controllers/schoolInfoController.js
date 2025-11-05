const SchoolInfo = require('../models/SchoolInfo');

// Get school info (public endpoint)
const getSchoolInfo = async (req, res) => {
  try {
    // Get the first (and likely only) school info document
    const schoolInfo = await SchoolInfo.findOne();

    if (!schoolInfo) {
      return res.status(404).json({
        success: false,
        message: 'School information not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schoolInfo
    });
  } catch (error) {
    console.error('Error fetching school info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching school information'
    });
  }
};

// Create or update school info (admin only)
const createOrUpdateSchoolInfo = async (req, res) => {
  try {
    const updateData = req.body;

    // Find existing school info or create new one
    let schoolInfo = await SchoolInfo.findOne();

    if (schoolInfo) {
      // Update existing
      Object.assign(schoolInfo, updateData);
      await schoolInfo.save();
    } else {
      // Create new
      schoolInfo = new SchoolInfo(updateData);
      await schoolInfo.save();
    }

    res.status(200).json({
      success: true,
      data: schoolInfo,
      message: schoolInfo.isNew ? 'School info created successfully' : 'School info updated successfully'
    });
  } catch (error) {
    console.error('Error creating/updating school info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving school information'
    });
  }
};

module.exports = {
  getSchoolInfo,
  createOrUpdateSchoolInfo
};
