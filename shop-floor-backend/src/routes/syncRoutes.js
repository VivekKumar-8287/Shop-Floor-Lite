// routes/syncRoutes.js
import express from 'express';
import DowntimeEvent from '../models/Downtime.js';
import MaintenanceTask from '../models/Maintenance.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Sync offline downtime events
router.post('/downtime', protect, async (req, res) => {
  try {
    const { offlineEvents } = req.body;

    if (!Array.isArray(offlineEvents)) {
      return res.status(400).json({ 
        success: false,
        error: 'offlineEvents must be an array' 
      });
    }

    const syncedEvents = [];
    const errors = [];

    for (const event of offlineEvents) {
      try {
        // Add tenant_id and mark as synced
        const syncedEvent = new DowntimeEvent({
          ...event,
          tenant_id: req.user.tenant_id,
          isSynced: true,
          syncedAt: new Date()
        });

        await syncedEvent.save();
        syncedEvents.push(syncedEvent._id);
      } catch (error) {
        errors.push({
          eventId: event.tempId || 'unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedEvents.length} downtime events`,
      data: {
        syncedCount: syncedEvents.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Sync failed' 
    });
  }
});

// 2. Sync offline maintenance tasks
router.post('/maintenance', protect, async (req, res) => {
  try {
    const { offlineTasks } = req.body;

    if (!Array.isArray(offlineTasks)) {
      return res.status(400).json({ 
        success: false,
        error: 'offlineTasks must be an array' 
      });
    }

    const syncedTasks = [];
    const errors = [];

    for (const task of offlineTasks) {
      try {
        const syncedTask = new MaintenanceTask({
          ...task,
          tenant_id: req.user.tenant_id,
          isSynced: true,
          syncedAt: new Date()
        });

        await syncedTask.save();
        syncedTasks.push(syncedTask._id);
      } catch (error) {
        errors.push({
          taskId: task.tempId || 'unknown',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Synced ${syncedTasks.length} maintenance tasks`,
      data: {
        syncedCount: syncedTasks.length,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Sync failed' 
    });
  }
});

// 3. Get sync status
router.get('/status', protect, async (req, res) => {
  try {
    const pendingDowntime = await DowntimeEvent.countDocuments({
      tenant_id: req.user.tenant_id,
      isSynced: false
    });

    const pendingMaintenance = await MaintenanceTask.countDocuments({
      tenant_id: req.user.tenant_id,
      isSynced: false
    });

    res.json({
      success: true,
      data: {
        pendingSync: {
          downtimeEvents: pendingDowntime,
          maintenanceTasks: pendingMaintenance,
          total: pendingDowntime + pendingMaintenance
        },
        lastSync: new Date().toISOString(),
        networkStatus: 'online'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to get sync status' 
    });
  }
});

// 4. Bulk sync (all offline data)
router.post('/bulk', protect, async (req, res) => {
  try {
    const { downtimeEvents = [], maintenanceTasks = [] } = req.body;

    const results = {
      downtime: { synced: 0, errors: [] },
      maintenance: { synced: 0, errors: [] }
    };

    // Sync downtime events
    for (const event of downtimeEvents) {
      try {
        await new DowntimeEvent({
          ...event,
          tenant_id: req.user.tenant_id,
          isSynced: true
        }).save();
        results.downtime.synced++;
      } catch (error) {
        results.downtime.errors.push(error.message);
      }
    }

    // Sync maintenance tasks
    for (const task of maintenanceTasks) {
      try {
        await new MaintenanceTask({
          ...task,
          tenant_id: req.user.tenant_id,
          isSynced: true
        }).save();
        results.maintenance.synced++;
      } catch (error) {
        results.maintenance.errors.push(error.message);
      }
    }

    res.json({
      success: true,
      message: 'Bulk sync completed',
      data: results
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Bulk sync failed' 
    });
  }
});

export default router;