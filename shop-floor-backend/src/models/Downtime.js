// downtimeModel.js
import mongoose from 'mongoose';

const downtimeSchema = new mongoose.Schema({
  machineId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Machine',
    required: true 
  },
  operatorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  reasonCategory: { type: String, required: true }, // POWER
  reasonSubCategory: { type: String, required: true }, // GRID
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  duration: Number, // in minutes
  photo: String, // base64 compressed image or URL
  photoSize: Number, // in KB
  notes: String,
  isSynced: { type: Boolean, default: false },
  tenant_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const DowntimeEvent = mongoose.model('DowntimeEvent', downtimeSchema);
export default DowntimeEvent;