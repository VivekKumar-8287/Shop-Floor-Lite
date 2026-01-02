// routes/alertRoutes.js
import express from 'express';
import Alert from '../models/Alert.js';
import { protect, requireRole } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Create alert (simulated or real)
router.post('/', protect, requireRole(['supervisor']), async (req, res) => {
  try {
    const { title, description, priority } = req.body;

    if (!title) {
      return res.status(400).json({ 
        success: false,
        error: 'Title is required' 
      });
    }

    const alert = new Alert({
      title,
      description,
      priority: priority || 'MEDIUM',
      createdBy: req.user.userId,
      status: 'CREATED',
      tenant_id: req.user.tenant_id
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Alert created',
      data: alert
    });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to create alert' 
    });
  }
});

// 2. Get all alerts
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority } = req.query;
    let query = { tenant_id: req.user.tenant_id };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const alerts = await Alert.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .populate('acknowledgedBy', 'firstName lastName email role')
      .populate('clearedBy', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch alerts' 
    });
  }
});

// 3. Acknowledge alert (operator OR supervisor)
router.put('/:id/acknowledge', protect, async (req, res) => {
  try {
    const { notes } = req.body;

    const alert = await Alert.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!alert) {
      return res.status(404).json({ 
        success: false,
        error: 'Alert not found' 
      });
    }

    if (alert.status === 'CLEARED') {
      return res.status(400).json({ 
        success: false,
        error: 'Cannot acknowledge a cleared alert' 
      });
    }

    // Check if this user has already acknowledged
    const alreadyAcknowledged = alert.acknowledgedBy.some(id => 
      id.toString() === req.user.userId.toString()
    );

    if (alreadyAcknowledged) {
      return res.status(400).json({ 
        success: false,
        error: 'You have already acknowledged this alert' 
      });
    }

    // Add user to acknowledgedBy array
    alert.acknowledgedBy.push(req.user.userId);
    
    // Only set status to ACKNOWLEDGED if it's still CREATED
    if (alert.status === 'CREATED') {
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedAt = new Date();
    }
    
    await alert.save();

    // Populate user details for response
    await alert.populate('acknowledgedBy', 'firstName lastName email role');

    res.json({
      success: true,
      message: `Alert ${alert.status === 'ACKNOWLEDGED' ? 'acknowledged' : 'marked as seen'}`,
      data: alert,
      acknowledgedBy: alert.acknowledgedBy.map(user => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role
      }))
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to acknowledge alert' 
    });
  }
});

// 4. Clear alert (supervisor only)
router.put('/:id/clear', protect, requireRole(['supervisor']), async (req, res) => {
  try {
    const { notes } = req.body;

    const alert = await Alert.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!alert) {
      return res.status(404).json({ 
        success: false,
        error: 'Alert not found' 
      });
    }

    if (alert.status === 'CLEARED') {
      return res.status(400).json({ 
        success: false,
        error: 'Alert is already cleared' 
      });
    }

    // Check if at least one operator has acknowledged
    if (alert.acknowledgedBy.length === 0) {
      return res.status(400).json({ 
        success: false,
        error: 'Alert must be acknowledged by at least one operator before clearing' 
      });
    }

    alert.status = 'CLEARED';
    alert.clearedBy = req.user.userId;
    alert.clearedAt = new Date();
    await alert.save();

    res.json({
      success: true,
      message: 'Alert cleared',
      data: alert,
      acknowledgedByCount: alert.acknowledgedBy.length
    });
  } catch (error) {
    console.error('Error clearing alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clear alert' 
    });
  }
});

// 5. Simulate alert creation (for testing)
router.post('/simulate', protect, requireRole(['supervisor']), async (req, res) => {
  try {
    const alerts = [
      { title: 'High Temperature Warning', description: 'Motor temperature exceeds safe limits' },
      { title: 'Low Pressure Alert', description: 'Hydraulic pressure below minimum threshold' },
      { title: 'Vibration Detected', description: 'Unusual vibrations in bearing assembly' },
      { title: 'Maintenance Due', description: 'Scheduled maintenance overdue' },
      { title: 'Safety Guard Open', description: 'Machine safety guard is open during operation' }
    ];

    const randomAlert = alerts[Math.floor(Math.random() * alerts.length)];

    const alert = new Alert({
      title: randomAlert.title,
      description: randomAlert.description,
      priority: ['LOW', 'MEDIUM', 'HIGH'][Math.floor(Math.random() * 3)],
      createdBy: req.user.userId,
      status: 'CREATED',
      tenant_id: req.user.tenant_id
    });

    await alert.save();

    res.json({
      success: true,
      message: 'Test alert created',
      data: alert
    });
  } catch (error) {
    console.error('Error simulating alert:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to simulate alert' 
    });
  }
});

export default router;