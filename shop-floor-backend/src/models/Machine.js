import mongoose from "mongoose";

const machineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["RUN", "IDLE", "OFF", "MAINTENANCE", "ERROR"],
      default: "IDLE",
    },
    tenant_id: {
      type: String,
      required: true,
    },
    lastMaintenance: {
      type: Date,
    },
    nextMaintenance: {
      type: Date,
    },
    specifications: {
      type: Map,
      of: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
machineSchema.index({ tenant_id: 1, code: 1 });

const Machine = mongoose.model("Machine", machineSchema);
export default Machine;
