// routes/machineRoutes.js
import express from 'express';
import Machine from '../models/Machine.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all machines for dashboard
router.get('/', protect, async (req, res) => {
  try {
    const machines = await Machine.find({ 
      tenant_id: req.user.tenant_id,
      isActive: true 
    });

    res.json({
      success: true,
      data: machines
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch machines' 
    });
  }
});

// Get single machine
router.get('/:id', protect, async (req, res) => {
  try {
    const machine = await Machine.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!machine) {
      return res.status(404).json({ 
        success: false,
        error: 'Machine not found' 
      });
    }

    res.json({
      success: true,
      data: machine
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch machine' 
    });
  }
});

// Update machine status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['RUN', 'IDLE', 'OFF', 'MAINTENANCE', 'ERROR'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status' 
      });
    }

    const machine = await Machine.findOneAndUpdate(
      { 
        _id: req.params.id, 
        tenant_id: req.user.tenant_id 
      },
      { 
        status,
        lastUpdated: new Date()
      },
      { new: true }
    );

    if (!machine) {
      return res.status(404).json({ 
        success: false,
        error: 'Machine not found' 
      });
    }

    res.json({
      success: true,
      message: `Machine status updated to ${status}`,
      data: machine
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update status' 
    });
  }
});

export default router;