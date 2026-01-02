// syncModel.js
import mongoose from 'mongoose';

const syncSchema = new mongoose.Schema({
  dataType: { 
    type: String, 
    enum: ['downtime', 'maintenance', 'alert'],
    required: true 
  },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'SYNCED', 'FAILED'], 
    default: 'PENDING' 
  },
  retryCount: { type: Number, default: 0 },
  tenant_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const SyncQuene = mongoose.model('SyncQueue', syncSchema);
export default SyncQuene;
