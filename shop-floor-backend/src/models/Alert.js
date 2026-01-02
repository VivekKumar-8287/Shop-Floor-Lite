// models/Alert.js
import mongoose from 'mongoose';

const alertSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  priority: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  status: {
    type: String,
    enum: ['CREATED', 'ACKNOWLEDGED', 'CLEARED'],
    default: 'CREATED'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  acknowledgedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  acknowledgedAt: {
    type: Date
  },
  clearedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clearedAt: {
    type: Date
  },
  tenant_id: {
  type: String,
  required: true
}
}, {
  timestamps: true
});

// Add indexes for better query performance
alertSchema.index({ tenant_id: 1, status: 1 });
alertSchema.index({ tenant_id: 1, createdAt: -1 });
alertSchema.index({ tenant_id: 1, priority: 1 });

const Alert = mongoose.model('Alert', alertSchema);

export default Alert;