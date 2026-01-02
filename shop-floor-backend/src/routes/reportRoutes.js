// routes/reportRoutes.js
import express from 'express';
import DowntimeEvent from '../models/Downtime.js';
import MaintenanceTask from '../models/Maintenance.js';
import Alert from '../models/Alert.js';
import Machine from '../models/Machine.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Get KPI summary for current shift
router.get('/summary', protect, async (req, res) => {
  try {
    // Calculate shift times (example: 8-hour shifts)
    const now = new Date();
    const shiftStart = new Date(now);
    shiftStart.setHours(now.getHours() < 8 ? 0 : now.getHours() < 16 ? 8 : 16, 0, 0, 0);
    const shiftEnd = new Date(shiftStart);
    shiftEnd.setHours(shiftStart.getHours() + 8);

    // Total machines
    const totalMachines = await Machine.countDocuments({
      tenant_id: req.user.tenant_id,
      isActive: true
    });

    // Running machines
    const runningMachines = await Machine.countDocuments({
      tenant_id: req.user.tenant_id,
      status: 'RUN'
    });

    // Downtime in current shift
    const downtimeEvents = await DowntimeEvent.find({
      tenant_id: req.user.tenant_id,
      startTime: { $gte: shiftStart, $lte: shiftEnd }
    });

    const totalDowntime = downtimeEvents.reduce((sum, event) => sum + (event.duration || 0), 0);
    const downtimeCount = downtimeEvents.length;

    // Maintenance status
    const overdueTasks = await MaintenanceTask.countDocuments({
      tenant_id: req.user.tenant_id,
      status: 'OVERDUE'
    });

    const pendingTasks = await MaintenanceTask.countDocuments({
      tenant_id: req.user.tenant_id,
      status: 'DUE'
    });

    // Active alerts
    const activeAlerts = await Alert.countDocuments({
      tenant_id: req.user.tenant_id,
      status: { $in: ['CREATED', 'ACKNOWLEDGED'] }
    });

    // Calculate OEE-like metrics
    const shiftDuration = 8 * 60; // 8 hours in minutes
    const availability = totalMachines > 0 
      ? ((shiftDuration * totalMachines - totalDowntime) / (shiftDuration * totalMachines)) * 100 
      : 0;

    res.json({
      success: true,
      data: {
        shift: {
          start: shiftStart,
          end: shiftEnd,
          currentTime: now
        },
        kpis: {
          // Machine status
          totalMachines,
          runningMachines,
          idleMachines: await Machine.countDocuments({ tenant_id: req.user.tenant_id, status: 'IDLE' }),
          downMachines: await Machine.countDocuments({ tenant_id: req.user.tenant_id, status: 'OFF' }),
          
          // Performance metrics
          availability: Math.round(availability),
          downtime: {
            totalMinutes: totalDowntime,
            events: downtimeCount,
            averageDuration: downtimeCount > 0 ? Math.round(totalDowntime / downtimeCount) : 0
          },
          
          // Maintenance
          maintenance: {
            overdueTasks,
            pendingTasks,
            completedTasks: await MaintenanceTask.countDocuments({ tenant_id: req.user.tenant_id, status: 'DONE' })
          },
          
          // Alerts
          alerts: {
            active: activeAlerts,
            created: await Alert.countDocuments({ tenant_id: req.user.tenant_id, status: 'CREATED' }),
            acknowledged: await Alert.countDocuments({ tenant_id: req.user.tenant_id, status: 'ACKNOWLEDGED' })
          }
        },
        topDowntimeReasons: await getTopDowntimeReasons(req.user.tenant_id, shiftStart, shiftEnd)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate report' 
    });
  }
});

// Helper function
async function getTopDowntimeReasons(tenantId, startDate, endDate) {
  const reasons = await DowntimeEvent.aggregate([
    {
      $match: {
        tenant_id: tenantId,
        startTime: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: { category: '$reasonCategory', subCategory: '$reasonSubCategory' },
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    },
    { $sort: { count: -1 } },
    { $limit: 5 }
  ]);

  return reasons;
}

// 2. Get detailed downtime report
router.get('/downtime', protect, async (req, res) => {
  try {
    const { startDate, endDate, machineId } = req.query;
    let query = { tenant_id: req.user.tenant_id };

    if (startDate || endDate) {
      query.startTime = {};
      if (startDate) query.startTime.$gte = new Date(startDate);
      if (endDate) query.startTime.$lte = new Date(endDate);
    }
    if (machineId) query.machineId = machineId;

    const downtime = await DowntimeEvent.find(query)
      .populate('machineId', 'name code')
      .populate('operatorId', 'firstName lastName')
      .sort({ startTime: -1 });

    // Group by reason
    const byReason = downtime.reduce((acc, event) => {
      const key = `${event.reasonCategory} - ${event.reasonSubCategory}`;
      if (!acc[key]) {
        acc[key] = { count: 0, duration: 0, events: [] };
      }
      acc[key].count++;
      acc[key].duration += event.duration || 0;
      acc[key].events.push(event._id);
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        totalEvents: downtime.length,
        totalDuration: downtime.reduce((sum, event) => sum + (event.duration || 0), 0),
        averageDuration: downtime.length > 0 
          ? Math.round(downtime.reduce((sum, event) => sum + (event.duration || 0), 0) / downtime.length) 
          : 0,
        byMachine: await getDowntimeByMachine(req.user.tenant_id, query),
        byReason: Object.entries(byReason).map(([reason, data]) => ({
          reason,
          ...data
        })),
        events: downtime
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate downtime report' 
    });
  }
});

// Helper function
async function getDowntimeByMachine(tenantId, query) {
  const machineDowntime = await DowntimeEvent.aggregate([
    { $match: { ...query, tenant_id: tenantId } },
    {
      $lookup: {
        from: 'machines',
        localField: 'machineId',
        foreignField: '_id',
        as: 'machine'
      }
    },
    { $unwind: '$machine' },
    {
      $group: {
        _id: '$machineId',
        machineName: { $first: '$machine.name' },
        machineCode: { $first: '$machine.code' },
        count: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    },
    { $sort: { totalDuration: -1 } }
  ]);

  return machineDowntime;
}

export default router;