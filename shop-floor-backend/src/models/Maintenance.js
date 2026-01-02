import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema({
  machineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Machine",
    required: true,
  },
  title: { type: String, required: true },
  description: String,
  status: {
    type: String,
    enum: ["DUE", "OVERDUE", "DONE"],
    default: "DUE",
  },
  dueDate: Date,
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  completionNotes: String,
  completedAt: Date,
  isSynced: { type: Boolean, default: false },
  tenant_id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const MaintenanceTask = mongoose.model("MaintenanceTask", maintenanceSchema);
export default MaintenanceTask;
