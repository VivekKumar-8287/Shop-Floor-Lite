import mongoose from "mongoose";

const reasonChildSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const reasonTreeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    children: [reasonChildSchema],
    tenant_id: {
      type: String,
      required: true,
      default: "tenant_123",
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

// Compound index for faster queries
reasonTreeSchema.index({ tenant_id: 1, code: 1 }, { unique: true });

const ReasonTree = mongoose.model("ReasonTree", reasonTreeSchema);

export default ReasonTree;
