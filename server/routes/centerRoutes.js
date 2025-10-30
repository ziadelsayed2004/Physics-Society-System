const express = require('express');
const Center = require('../models/Center');
const Record = require('../models/Record');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/centers - List all centers (accessible to Staff and Admin)
router.get('/', async (req, res) => {
  try {
    const centers = await Center.find()
      .sort({ name: 1 });

    const responseCenters = centers.map(center => ({
      id: center._id,
      name: center.name,
      createdAt: center.createdAt,
      updatedAt: center.updatedAt
    }));

    res.json({
      message: 'Centers retrieved successfully',
      centers: responseCenters
    });
  } catch (error) {
    console.error('Centers retrieval error:', error);
    res.status(500).json({ message: 'Error retrieving centers', error: error.message });
  }
});

// POST /api/centers - Create new center (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center already exists
    const existingCenter = await Center.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    if (existingCenter) {
      return res.status(400).json({ message: 'Center already exists' });
    }

    // Create new center
    const center = await Center.create({
      name: name.trim()
    });

    res.status(201).json({
      message: 'Center created successfully',
      center: {
        id: center._id,
        name: center.name,
        createdAt: center.createdAt
      }
    });
  } catch (error) {
    console.error('Center creation error:', error);
    res.status(500).json({ message: 'Error creating center', error: error.message });
  }
});

// PUT /api/centers/:id - Update center (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    // Validate required fields
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        message: 'Center name is required' 
      });
    }

    // Check if center exists
    const center = await Center.findById(id);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Check if new name already exists (case insensitive)
    const existingCenter = await Center.findOne({ 
      _id: { $ne: id },
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') } 
    });
    if (existingCenter) {
      return res.status(400).json({ message: 'Center name already exists' });
    }

    // Update center
    const updatedCenter = await Center.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Center updated successfully',
      center: {
        id: updatedCenter._id,
        name: updatedCenter.name,
        createdAt: updatedCenter.createdAt,
        updatedAt: updatedCenter.updatedAt
      }
    });
  } catch (error) {
    console.error('Center update error:', error);
    res.status(500).json({ message: 'Error updating center', error: error.message });
  }
});

// DELETE /api/centers/:id - Delete center (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if center exists
    const center = await Center.findById(id);
    if (!center) {
      return res.status(404).json({ message: 'Center not found' });
    }

    // Check if center is being used in records
    const recordsCount = await Record.countDocuments({ center: center.name });
    if (recordsCount > 0) {
      return res.status(400).json({ 
        message: `Cannot delete center. It is being used in ${recordsCount} record(s). Please delete the records first.` 
      });
    }

    // Delete center
    await Center.findByIdAndDelete(id);

    res.json({
      message: 'Center deleted successfully',
      deletedCenter: {
        id: center._id,
        name: center.name
      }
    });
  } catch (error) {
    console.error('Center deletion error:', error);
    res.status(500).json({ message: 'Error deleting center', error: error.message });
  }
});

module.exports = router;