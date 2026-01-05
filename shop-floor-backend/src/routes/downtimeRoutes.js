// routes/downtimeRoutes.js
import express from 'express';
import DowntimeEvent from '../models/Downtime.js';
import Machine from '../models/Machine.js';
import ReasonTree from '../models/ReasonTree.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Get reason tree for downtime selection
router.get('/reasons', protect, async (req, res) => {
  try {
    const reasons = await ReasonTree.find({ 
      tenant_id: req.user.tenant_id,
      isActive: true 
    }).select('code label children');

    res.json({
      success: true,
      data: reasons
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch reasons' 
    });
  }
});

// 2. Start downtime
router.post('/start', protect, requireRole(['operator']), async (req, res) => {
  try {
    const { machineId, reasonCategory, reasonSubCategory, notes } = req.body;

    if (!machineId || !reasonCategory || !reasonSubCategory) {
      return res.status(400).json({ 
        success: false,
        error: 'Machine ID, reason category and sub-category are required' 
      });
    }

    // Verify machine exists
    const machine = await Machine.findOne({
      _id: machineId,
      tenant_id: req.user.tenant_id
    });

    if (!machine) {
      return res.status(404).json({ 
        success: false,
        error: 'Machine not found' 
      });
    }

    const existingDowntime = await DowntimeEvent.findOne({
  machineId,
  tenant_id: req.user.tenant_id,
  $or: [{ endTime: null }, { endTime: { $exists: false } }]
});

if (existingDowntime) {
  return res.status(400).json({
    success: false,
    error: 'This machine already has an active downtime'
  });
}

    // Create downtime event
    const downtime = new DowntimeEvent({
      machineId,
      operatorId: req.user.userId,
      reasonCategory,
      reasonSubCategory,
      startTime: new Date(),
       endTime: null,
      notes,
      tenant_id: req.user.tenant_id,
      isSynced: true
    });

    await downtime.save();

    // Update machine status to OFF (or custom)
    await Machine.findByIdAndUpdate(machineId, { status: 'OFF' });

    res.status(201).json({
      success: true,
      message: 'Downtime started',
      data: downtime
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to start downtime' 
    });
  }
});

// End downtime route
router.post('/:id/end', protect, requireRole(['operator']), async (req, res) => {
  try {
    const downtime = await DowntimeEvent.findOne({
      _id: req.params.id,
      operatorId: req.user.userId,
      tenant_id: req.user.tenant_id,
      $or: [{ endTime: null }, { endTime: { $exists: false } }]
    });

    if (!downtime) {
      return res.status(404).json({
        success: false,
        error: 'Active downtime not found'
      });
    }

    const endTime = new Date();
    const startTime = new Date(downtime.startTime);
    const duration = Math.round((endTime - startTime) / (1000 * 60));

    downtime.endTime = endTime;
    downtime.duration = duration;
    await downtime.save();

    await Machine.findByIdAndUpdate(downtime.machineId, { status: 'IDLE' });

    res.json({
      success: true,
      message: 'Downtime ended',
      data: downtime
    });

  } catch (error) {
    console.error('❌ End downtime error:', error); // ← IMPORTANT
    res.status(500).json({
      success: false,
      error: 'Failed to end downtime'
    });
  }
});

// 4. Get all downtime events
router.get('/', protect, async (req, res) => {
  try {
    const { machineId, startDate, endDate } = req.query;
    let query = { tenant_id: req.user.tenant_id };

    if (machineId) query.machineId = machineId;
    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }

    const downtimes = await DowntimeEvent.find(query)
      .populate('machineId', 'name code type')
      .populate('operatorId', 'firstName lastName email')
      .sort({ startTime: -1 });

    res.json({
      success: true,
      data: downtimes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch downtime events' 
    });
  }
});

// 5. Upload photo for downtime (simplified)
router.post('/:id/photo', protect, requireRole(['operator']), async (req, res) => {
  try {
    const { photoBase64 } = req.body;
    
    if (!photoBase64) {
      return res.status(400).json({ 
        success: false,
        error: 'Photo data is required' 
      });
    }

    // Calculate size (rough estimate)
    const base64Length = photoBase64.length - (photoBase64.includes(',') ? photoBase64.indexOf(',') + 1 : 0);
    const sizeInKB = Math.ceil((base64Length * 3) / 4) / 1024;

    // Check size limit (200KB)
    if (sizeInKB > 200) {
      return res.status(400).json({ 
        success: false,
        error: 'Photo size exceeds 200KB limit' 
      });
    }

    const downtime = await DowntimeEvent.findOneAndUpdate(
      {
        _id: req.params.id,
        operatorId: req.user.userId,
        tenant_id: req.user.tenant_id
      },
      {
        photo: photoBase64,
        photoSize: sizeInKB
      },
      { new: true }
    );

    if (!downtime) {
      return res.status(404).json({ 
        success: false,
        error: 'Downtime not found' 
      });
    }

    res.json({
      success: true,
      message: 'Photo uploaded',
      data: { sizeInKB }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to upload photo' 
    });
  }
});

export default router;