import mongoose from "mongoose";

const reassignmentSchema = new mongoose.Schema(
  {
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Request",
      required: true
    },

    previousProvider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Provider"
    },

    newProviders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Provider"
      }
    ],

    reason: {
      type: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("Reassignment", reassignmentSchema);
