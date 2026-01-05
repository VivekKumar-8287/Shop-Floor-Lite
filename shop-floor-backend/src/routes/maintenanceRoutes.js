// routes/maintenanceRoutes.js
import express from 'express';
import { protect, requireRole } from '../middleware/authMiddleware.js';
import Machine from '../models/Machine.js';
import MaintenanceTask from '../models/Maintenance.js';

const router = express.Router();

// 1. Get all maintenance tasks for a machine
router.get('/machine/:machineId', protect, async (req, res) => {
  try {
    const tasks = await MaintenanceTask.find({
      machineId: req.params.machineId,
      tenant_id: req.user.tenant_id
    }).sort({ dueDate: 1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch maintenance tasks' 
    });
  }
});


// Get ALL maintenance tasks (not filtered by machine)
router.get('/', protect, async (req, res) => {
  try {
    const { status, machineId, limit } = req.query;
    let query = { tenant_id: req.user.tenant_id };
    
    // Add optional filters
    if (status) query.status = status;
    if (machineId) query.machineId = machineId;
    
    let tasksQuery = MaintenanceTask.find(query)
      .populate('machineId', 'name code')
      .populate('completedBy', 'firstName lastName email')
      .sort({ dueDate: 1, createdAt: -1 });
    
    // Add limit if provided
    if (limit) {
      tasksQuery = tasksQuery.limit(parseInt(limit));
    }
    
    const tasks = await tasksQuery;

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch maintenance tasks' 
    });
  }
});

// 2. Create maintenance task (supervisor only)
router.post('/', protect, async (req, res) => {
  try {
    const { machineId, title, description, dueDate } = req.body;

    if (!machineId || !title) {
      return res.status(400).json({ 
        success: false,
        error: 'Machine ID and title are required' 
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

    const task = new MaintenanceTask({
      machineId,
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      status: 'DUE',
      tenant_id: req.user.tenant_id,
      isSynced: true
    });

    await task.save();

    res.status(201).json({
      success: true,
      message: 'Maintenance task created',
      data: task
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to create maintenance task' 
    });
  }
});

// 3. Mark task as complete (operator)
router.put('/:id/complete', protect, requireRole(['operator']), async (req, res) => {
  try {
    const { completionNotes } = req.body;

    const task = await MaintenanceTask.findOne({
      _id: req.params.id,
      tenant_id: req.user.tenant_id
    });

    if (!task) {
      return res.status(404).json({ 
        success: false,
        error: 'Task not found' 
      });
    }

    task.status = 'DONE';
    task.completedBy = req.user.userId;
    task.completionNotes = completionNotes || '';
    task.completedAt = new Date();
    task.isSynced = true;

    await task.save();

    res.json({
      success: true,
      message: 'Task marked as complete',
      data: task
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to complete task' 
    });
  }
});

// 4. Update task status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;

    if (!['DUE', 'OVERDUE', 'DONE'].includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status' 
      });
    }

    const task = await MaintenanceTask.findOneAndUpdate(
      {
        _id: req.params.id,
        tenant_id: req.user.tenant_id
      },
      {
        status,
        isSynced: true
      },
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ 
        success: false,
        error: 'Task not found' 
      });
    }

    res.json({
      success: true,
      message: 'Task status updated',
      data: task
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to update task' 
    });
  }
});

// 5. Get overdue tasks
router.get('/overdue', protect, async (req, res) => {
  try {
    const tasks = await MaintenanceTask.find({
      tenant_id: req.user.tenant_id,
      status: 'OVERDUE'
    })
    .populate('machineId', 'name code')
    .sort({ dueDate: 1 });

    res.json({
      success: true,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch overdue tasks' 
    });
  }
});

export default router;